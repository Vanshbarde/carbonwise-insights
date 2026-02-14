import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Trash2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface MachineWithEmission {
  id: string;
  machine_name: string;
  machine_type: string;
  energy_source: string;
  active_units: number;
  runtime_hours: number;
  daily_consumption: number;
  temperature: number | null;
  sound_level: number | null;
  maintenance_frequency: string | null;
  created_at: string;
  emissions: { daily_emission: number; monthly_emission: number; yearly_emission: number }[];
}

export default function Machines() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<MachineWithEmission[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadMachines();
  }, [user]);

  const loadMachines = async () => {
    const { data } = await supabase
      .from('machines')
      .select('*, emissions(daily_emission, monthly_emission, yearly_emission)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setMachines((data as MachineWithEmission[]) || []);
    setLoading(false);
  };

  const deleteMachine = async (id: string) => {
    await supabase.from('machines').delete().eq('id', id);
    setMachines(prev => prev.filter(m => m.id !== id));
    toast({ title: 'Machine deleted' });
  };

  const exportCSV = () => {
    const headers = ['Machine Name', 'Type', 'Energy Source', 'Units', 'Runtime (h)', 'Consumption (kWh)', 'Daily CO₂ (kg)', 'Monthly CO₂ (kg)'];
    const rows = filtered.map(m => [
      m.machine_name, m.machine_type, m.energy_source, m.active_units,
      m.runtime_hours, m.daily_consumption,
      m.emissions[0]?.daily_emission?.toFixed(1) || '0',
      m.emissions[0]?.monthly_emission?.toFixed(0) || '0',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'machines.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = machines.filter(m =>
    m.machine_name.toLowerCase().includes(search.toLowerCase()) ||
    m.machine_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Machine History</h1>
            <p className="text-muted-foreground text-sm mt-1">{machines.length} machines registered</p>
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search machines..." className="pl-9" />
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-muted-foreground">No machines found. Add your first machine to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium text-foreground">{m.machine_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm text-foreground">{m.machine_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm text-foreground">{m.energy_source}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily CO₂</p>
                    <p className="text-sm font-mono text-primary">{m.emissions[0]?.daily_emission?.toFixed(1) || '—'} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly CO₂</p>
                    <p className="text-sm font-mono text-chart-blue">{m.emissions[0]?.monthly_emission?.toFixed(0) || '—'} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Runtime</p>
                    <p className="text-sm text-foreground">{m.runtime_hours}h/day</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteMachine(m.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
