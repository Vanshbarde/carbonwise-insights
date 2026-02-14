import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { calculateEmissions, predictEmissionAfterMaintenance, generateSuggestions, AISuggestion } from '@/lib/emission-calculator';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Lightbulb, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AddMachine() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ daily: number; monthly: number; yearly: number; predicted: number } | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [form, setForm] = useState({
    machineName: '', machineType: '', energySource: '',
    activeUnits: '1', runtimeHours: '', dailyConsumption: '',
    temperature: '', soundLevel: '', maintenanceDuration: '', maintenanceFrequency: '',
  });

  useEffect(() => {
    if (user) {
      supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data) setCompanyId(data.id);
      });
    }
  }, [user]);

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user) {
      toast({ title: 'Error', description: 'Company not found. Please complete registration.', variant: 'destructive' });
      return;
    }
    if (!form.machineName || !form.machineType || !form.energySource || !form.runtimeHours || !form.dailyConsumption) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: machine, error: machineErr } = await supabase.from('machines').insert({
        company_id: companyId,
        user_id: user.id,
        machine_name: form.machineName,
        machine_type: form.machineType,
        energy_source: form.energySource,
        active_units: parseInt(form.activeUnits),
        runtime_hours: parseFloat(form.runtimeHours),
        daily_consumption: parseFloat(form.dailyConsumption),
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        sound_level: form.soundLevel ? parseFloat(form.soundLevel) : null,
        maintenance_duration: form.maintenanceDuration ? parseInt(form.maintenanceDuration) : null,
        maintenance_frequency: form.maintenanceFrequency || null,
      }).select().single();

      if (machineErr) throw machineErr;

      const emissions = calculateEmissions(form.energySource, parseFloat(form.dailyConsumption), parseInt(form.activeUnits));
      const predicted = predictEmissionAfterMaintenance(emissions.daily);

      await supabase.from('emissions').insert({
        machine_id: machine.id,
        user_id: user.id,
        daily_emission: emissions.daily,
        monthly_emission: emissions.monthly,
        yearly_emission: emissions.yearly,
        predicted_emission_after_maintenance: predicted,
      });

      setResult({ ...emissions, predicted });

      const aiSuggestions = generateSuggestions({
        temperature: form.temperature ? parseFloat(form.temperature) : undefined,
        sound_level: form.soundLevel ? parseFloat(form.soundLevel) : undefined,
        runtime_hours: parseFloat(form.runtimeHours),
        daily_consumption: parseFloat(form.dailyConsumption),
        energy_source: form.energySource,
        daily_emission: emissions.daily,
      });
      setSuggestions(aiSuggestions);

      toast({ title: 'Machine added!', description: `${form.machineName} has been registered with emission data.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const suggestionIcon = (type: string) => {
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-chart-orange" />;
    if (type === 'success') return <CheckCircle className="w-4 h-4 text-primary" />;
    return <Lightbulb className="w-4 h-4 text-chart-blue" />;
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Machine</h1>
          <p className="text-muted-foreground text-sm mt-1">Register a new machine and calculate its carbon footprint</p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Machine Name *</Label>
                <Input value={form.machineName} onChange={e => update('machineName', e.target.value)} placeholder="CNC Mill #1" className="mt-1" />
              </div>
              <div>
                <Label>Machine Type *</Label>
                <Select value={form.machineType} onValueChange={v => update('machineType', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {['Heavy', 'Light', 'Motors', 'Heating'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Energy Source *</Label>
                <Select value={form.energySource} onValueChange={v => update('energySource', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {['Electricity', 'Fuel', 'Coal', 'Natural Gas', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Active Units *</Label>
                <Input type="number" min="1" value={form.activeUnits} onChange={e => update('activeUnits', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Runtime per Day (Hours) *</Label>
                <Input type="number" step="0.5" value={form.runtimeHours} onChange={e => update('runtimeHours', e.target.value)} placeholder="8" className="mt-1" />
              </div>
              <div>
                <Label>Daily Consumption (kWh) *</Label>
                <Input type="number" value={form.dailyConsumption} onChange={e => update('dailyConsumption', e.target.value)} placeholder="250" className="mt-1" />
              </div>
              <div>
                <Label>Temperature (°C)</Label>
                <Input type="number" value={form.temperature} onChange={e => update('temperature', e.target.value)} placeholder="75" className="mt-1" />
              </div>
              <div>
                <Label>Sound Level (dB)</Label>
                <Input type="number" value={form.soundLevel} onChange={e => update('soundLevel', e.target.value)} placeholder="80" className="mt-1" />
              </div>
              <div>
                <Label>Maintenance Duration (days)</Label>
                <Input type="number" value={form.maintenanceDuration} onChange={e => update('maintenanceDuration', e.target.value)} placeholder="3" className="mt-1" />
              </div>
              <div>
                <Label>Maintenance Frequency</Label>
                <Select value={form.maintenanceFrequency} onValueChange={v => update('maintenanceFrequency', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>
                    {['Monthly', 'Quarterly', 'Yearly'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Adding...' : 'Add Machine & Calculate Emissions'}
            </Button>
          </form>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { label: 'Daily CO₂', value: `${result.daily.toFixed(1)} kg`, color: 'text-primary' },
                { label: 'Monthly CO₂', value: `${result.monthly.toFixed(0)} kg`, color: 'text-chart-blue' },
                { label: 'Yearly CO₂', value: `${result.yearly.toFixed(0)} kg`, color: 'text-chart-orange' },
                { label: 'After Maintenance', value: `${result.predicted.toFixed(1)} kg/day`, color: 'text-chart-cyan' },
              ].map(item => (
                <div key={item.label} className="stat-card">
                  <p className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-chart-orange" />
                <h3 className="text-lg font-semibold text-foreground">AI Recommendations</h3>
              </div>
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    {suggestionIcon(s.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                      <p className="text-xs text-primary font-mono mt-1 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> {s.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
