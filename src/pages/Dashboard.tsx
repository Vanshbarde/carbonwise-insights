import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Factory, Zap, Cloud, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalMachines: number;
  totalDailyEnergy: number;
  totalCO2: number;
  monthlyEstimate: number;
  maintenanceAlerts: number;
}

const CHART_COLORS = ['hsl(160,84%,39%)', 'hsl(200,80%,50%)', 'hsl(30,90%,55%)', 'hsl(0,72%,51%)', 'hsl(185,70%,50%)'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalMachines: 0, totalDailyEnergy: 0, totalCO2: 0, monthlyEstimate: 0, maintenanceAlerts: 0 });
  const [emissionTrend, setEmissionTrend] = useState<any[]>([]);
  const [sourceDistribution, setSourceDistribution] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const { data: machines } = await supabase.from('machines').select('*').eq('user_id', user!.id);
    const { data: emissions } = await supabase.from('emissions').select('*').eq('user_id', user!.id);

    if (machines && emissions) {
      const totalDailyEnergy = machines.reduce((sum, m) => sum + Number(m.daily_consumption), 0);
      const totalCO2 = emissions.reduce((sum, e) => sum + Number(e.daily_emission), 0);
      const maintenanceAlerts = machines.filter(m => m.sound_level && Number(m.sound_level) > 85).length;

      setStats({
        totalMachines: machines.length,
        totalDailyEnergy,
        totalCO2,
        monthlyEstimate: totalCO2 * 30,
        maintenanceAlerts,
      });

      // Source distribution
      const sourceMap: Record<string, number> = {};
      machines.forEach(m => {
        sourceMap[m.energy_source] = (sourceMap[m.energy_source] || 0) + Number(m.daily_consumption);
      });
      setSourceDistribution(Object.entries(sourceMap).map(([name, value]) => ({ name, value })));

      // Emission trend (group by date)
      const trendMap: Record<string, number> = {};
      emissions.forEach(e => {
        const date = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        trendMap[date] = (trendMap[date] || 0) + Number(e.daily_emission);
      });
      setEmissionTrend(Object.entries(trendMap).map(([date, emission]) => ({ date, emission })));
    }
  };

  const statCards = [
    { label: 'Total Machines', value: stats.totalMachines, icon: Factory, color: 'text-chart-blue' },
    { label: 'Daily Energy (kWh)', value: stats.totalDailyEnergy.toFixed(0), icon: Zap, color: 'text-chart-orange' },
    { label: 'Daily CO₂ (kg)', value: stats.totalCO2.toFixed(1), icon: Cloud, color: 'text-primary' },
    { label: 'Monthly CO₂ (kg)', value: stats.monthlyEstimate.toFixed(0), icon: TrendingUp, color: 'text-chart-cyan' },
    { label: 'Maintenance Alerts', value: stats.maintenanceAlerts, icon: AlertTriangle, color: 'text-chart-orange' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time carbon emission monitoring</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="stat-card"
            >
              <div className="flex items-center justify-between mb-3">
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold font-mono text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-card rounded-xl p-5"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">CO₂ Emission Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={emissionTrend}>
                <defs>
                  <linearGradient id="emissionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160,84%,39%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
                <XAxis dataKey="date" stroke="hsl(215,15%,55%)" fontSize={11} />
                <YAxis stroke="hsl(215,15%,55%)" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(220,18%,13%)', border: '1px solid hsl(220,15%,20%)', borderRadius: '8px', color: 'hsl(210,20%,92%)' }} />
                <Area type="monotone" dataKey="emission" stroke="hsl(160,84%,39%)" fill="url(#emissionGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-xl p-5"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">Energy Source Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sourceDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {sourceDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(220,18%,13%)', border: '1px solid hsl(220,15%,20%)', borderRadius: '8px', color: 'hsl(210,20%,92%)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {sourceDistribution.map((item, i) => (
                <span key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {item.name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
