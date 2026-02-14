import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data) setCompany(data);
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!company) return;
    setLoading(true);
    const { error } = await supabase.from('companies').update({
      company_name: company.company_name,
      phone: company.phone,
      address: company.address,
      industry_type: company.industry_type,
      employees: company.employees,
    }).eq('id', company.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved!' });
    }
    setLoading(false);
  };

  if (!company) return <DashboardLayout><div className="text-muted-foreground">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your company profile</p>
        </div>

        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Company Name</Label>
              <Input value={company.company_name} onChange={e => setCompany({ ...company, company_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={company.email} disabled className="mt-1 opacity-50" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={company.phone || ''} onChange={e => setCompany({ ...company, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Industry</Label>
              <Input value={company.industry_type || ''} onChange={e => setCompany({ ...company, industry_type: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Employees</Label>
              <Input type="number" value={company.employees || ''} onChange={e => setCompany({ ...company, employees: parseInt(e.target.value) || null })} className="mt-1" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={company.address || ''} onChange={e => setCompany({ ...company, address: e.target.value })} className="mt-1" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="gradient-primary text-primary-foreground gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
