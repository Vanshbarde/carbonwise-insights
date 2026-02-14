import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Download, FileText, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateEmissions, predictEmissionAfterMaintenance, generateSuggestions } from '@/lib/emission-calculator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import html2canvas from 'html2canvas';

const COLORS = ['hsl(160,84%,39%)', 'hsl(200,80%,50%)', 'hsl(30,90%,55%)', 'hsl(0,72%,51%)'];

export default function Reports() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [emissions, setEmissions] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [compRes, machRes, emisRes, repRes] = await Promise.all([
      supabase.from('companies').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('machines').select('*').eq('user_id', user!.id),
      supabase.from('emissions').select('*, machines(machine_name, energy_source)').eq('user_id', user!.id),
      supabase.from('reports').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ]);
    setCompany(compRes.data);
    setMachines(machRes.data || []);
    setEmissions(emisRes.data || []);
    setReports(repRes.data || []);
  };

  const generatePDF = async () => {
    if (!company || machines.length === 0) {
      toast({ title: 'No data', description: 'Add machines first to generate a report.', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(20, 27, 38);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('CarbonTrack Report', 14, 25);
      doc.setFontSize(10);
      doc.setTextColor(150, 160, 175);
      doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - 14, 25, { align: 'right' });

      // Company Details
      doc.setTextColor(30, 40, 55);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Company Details', 14, 55);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const companyInfo = [
        ['Company Name', company.company_name],
        ['Email', company.email],
        ['Phone', company.phone || 'N/A'],
        ['Industry', company.industry_type || 'N/A'],
        ['Employees', company.employees?.toString() || 'N/A'],
        ['Address', company.address || 'N/A'],
      ];
      autoTable(doc, {
        startY: 60,
        head: [['Field', 'Value']],
        body: companyInfo,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [20, 27, 38], fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });

      // Machine Details
      const machineBody = machines.map(m => {
        const emis = emissions.find(e => (e as any).machines?.machine_name === m.machine_name);
        return [
          m.machine_name, m.machine_type, m.energy_source,
          m.active_units, `${m.runtime_hours}h`, `${m.daily_consumption} kWh`,
          emis ? `${Number(emis.daily_emission).toFixed(1)} kg` : 'N/A',
          emis ? `${Number(emis.monthly_emission).toFixed(0)} kg` : 'N/A',
        ];
      });

      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Machine Details & Emissions', 14, 20);

      autoTable(doc, {
        startY: 25,
        head: [['Machine', 'Type', 'Source', 'Units', 'Runtime', 'Consumption', 'Daily CO₂', 'Monthly CO₂']],
        body: machineBody,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [20, 27, 38], fontStyle: 'bold' },
        styles: { fontSize: 8 },
      });

      // Summary
      const totalDaily = emissions.reduce((s, e) => s + Number(e.daily_emission), 0);
      const totalMonthly = totalDaily * 30;
      const totalYearly = totalDaily * 365;

      const summaryY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Emission Summary', 14, summaryY);

      autoTable(doc, {
        startY: summaryY + 5,
        head: [['Metric', 'Value']],
        body: [
          ['Total Daily CO₂', `${totalDaily.toFixed(1)} kg`],
          ['Total Monthly CO₂', `${totalMonthly.toFixed(0)} kg`],
          ['Total Yearly CO₂', `${totalYearly.toFixed(0)} kg`],
          ['Total Machines', machines.length.toString()],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });

      // AI Suggestions
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Recommendations', 14, 20);

      const allSuggestions = machines.flatMap(m => {
        const emis = emissions.find(e => (e as any).machines?.machine_name === m.machine_name);
        return generateSuggestions({
          temperature: m.temperature ? Number(m.temperature) : undefined,
          sound_level: m.sound_level ? Number(m.sound_level) : undefined,
          runtime_hours: Number(m.runtime_hours),
          daily_consumption: Number(m.daily_consumption),
          energy_source: m.energy_source,
          daily_emission: emis ? Number(emis.daily_emission) : 0,
        }).map(s => [m.machine_name, s.title, s.description, s.impact]);
      });

      autoTable(doc, {
        startY: 25,
        head: [['Machine', 'Recommendation', 'Details', 'Impact']],
        body: allSuggestions,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: [20, 27, 38], fontStyle: 'bold' },
        styles: { fontSize: 8 },
        columnStyles: { 2: { cellWidth: 50 }, 3: { cellWidth: 35 } },
      });

      // Capture charts
      if (chartRef.current) {
        try {
          const canvas = await html2canvas(chartRef.current, { backgroundColor: '#1a1f2e', scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          doc.addPage();
          doc.setFontSize(14);
          doc.text('Emission Charts', 14, 20);
          const imgWidth = pageWidth - 28;
          const imgHeight = (canvas.height / canvas.width) * imgWidth;
          doc.addImage(imgData, 'PNG', 14, 25, imgWidth, Math.min(imgHeight, 220));
        } catch (e) {
          // Charts capture failed, continue without
        }
      }

      // Before vs After
      const bvaY = 25;
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Before vs After Maintenance Predictions', 14, 20);

      const bvaBody = machines.map(m => {
        const emis = emissions.find(e => (e as any).machines?.machine_name === m.machine_name);
        const daily = emis ? Number(emis.daily_emission) : 0;
        const predicted = predictEmissionAfterMaintenance(daily);
        return [m.machine_name, `${daily.toFixed(1)} kg`, `${predicted.toFixed(1)} kg`, `${(daily - predicted).toFixed(1)} kg (${((1 - predicted / daily) * 100).toFixed(0)}%)`];
      });

      autoTable(doc, {
        startY: bvaY,
        head: [['Machine', 'Current Daily', 'After Maintenance', 'Reduction']],
        body: bvaBody,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [20, 27, 38], fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });

      // Save
      const fileName = `CarbonTrack_Report_${Date.now()}.pdf`;
      doc.save(fileName);

      // Save report record
      await supabase.from('reports').insert({
        company_id: company.id,
        user_id: user!.id,
        report_name: fileName,
        report_file_url: fileName,
      });

      await loadData();
      toast({ title: 'Report generated!', description: 'PDF downloaded successfully.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const energyData = machines.map(m => ({
    name: m.machine_name.length > 10 ? m.machine_name.slice(0, 10) + '…' : m.machine_name,
    value: Number(m.daily_consumption),
  }));

  const sourceMap: Record<string, number> = {};
  machines.forEach(m => { sourceMap[m.energy_source] = (sourceMap[m.energy_source] || 0) + 1; });
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">Generate and download emission reports</p>
          </div>
          <Button onClick={generatePDF} disabled={generating} className="gradient-primary text-primary-foreground font-semibold gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Download Report'}
          </Button>
        </div>

        {/* Chart preview for PDF capture */}
        <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Energy Consumption by Machine</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
                <XAxis dataKey="name" stroke="hsl(215,15%,55%)" fontSize={10} />
                <YAxis stroke="hsl(215,15%,55%)" fontSize={11} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {energyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Source Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name }) => name}>
                  {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Past reports */}
        {reports.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Report History</h3>
            <div className="space-y-2">
              {reports.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <FileText className="w-4 h-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{r.report_name || 'Report'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
