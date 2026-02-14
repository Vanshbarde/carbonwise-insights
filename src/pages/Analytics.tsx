import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['hsl(160,84%,39%)', 'hsl(200,80%,50%)', 'hsl(30,90%,55%)', 'hsl(0,72%,51%)', 'hsl(185,70%,50%)'];
const tooltipStyle = { backgroundColor: 'hsl(220,18%,13%)', border: '1px solid hsl(220,15%,20%)', borderRadius: '8px', color: 'hsl(210,20%,92%)' };

export default function Analytics() {
  const { user } = useAuth();
  const [emissionOverTime, setEmissionOverTime] = useState<any[]>([]);
  const [energyByMachine, setEnergyByMachine] = useState<any[]>([]);
  const [sourceDist, setSourceDist] = useState<any[]>([]);
  const [beforeAfter, setBeforeAfter] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    const { data: machines } = await supabase.from('machines').select('*').eq('user_id', user!.id);
    const { data: emissions } = await supabase.from('emissions').select('*, machines(machine_name)').eq('user_id', user!.id);

    if (machines && emissions) {
      // Emission over time
      const timeMap: Record<string, number> = {};
      emissions.forEach(e => {
        const date = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        timeMap[date] = (timeMap[date] || 0) + Number(e.daily_emission);
      });
      setEmissionOverTime(Object.entries(timeMap).map(([date, co2]) => ({ date, co2 })));

      // Energy by machine
      setEnergyByMachine(machines.map(m => ({
        name: m.machine_name.length > 12 ? m.machine_name.slice(0, 12) + '…' : m.machine_name,
        consumption: Number(m.daily_consumption),
      })));

      // Source distribution
      const sourceMap: Record<string, number> = {};
      machines.forEach(m => { sourceMap[m.energy_source] = (sourceMap[m.energy_source] || 0) + 1; });
      setSourceDist(Object.entries(sourceMap).map(([name, value]) => ({ name, value })));

      // Before vs After
      setBeforeAfter(emissions.map(e => ({
        name: (e as any).machines?.machine_name?.slice(0, 10) || 'Machine',
        before: Number(e.daily_emission),
        after: Number(e.predicted_emission_after_maintenance || e.daily_emission * 0.82),
      })));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Interactive emission and energy analytics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">CO₂ Emission Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={emissionOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
                <XAxis dataKey="date" stroke="hsl(215,15%,55%)" fontSize={11} />
                <YAxis stroke="hsl(215,15%,55%)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="co2" stroke="hsl(160,84%,39%)" strokeWidth={2} dot={{ fill: 'hsl(160,84%,39%)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bar chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Energy Consumption per Machine</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={energyByMachine}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
                <XAxis dataKey="name" stroke="hsl(215,15%,55%)" fontSize={10} />
                <YAxis stroke="hsl(215,15%,55%)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="consumption" fill="hsl(200,80%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pie chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Energy Source Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={sourceDist} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {sourceDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Before vs After */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Before vs After Maintenance</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={beforeAfter}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
                <XAxis dataKey="name" stroke="hsl(215,15%,55%)" fontSize={10} />
                <YAxis stroke="hsl(215,15%,55%)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="before" fill="hsl(0,72%,51%)" name="Before" radius={[4, 4, 0, 0]} />
                <Bar dataKey="after" fill="hsl(160,84%,39%)" name="After" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
