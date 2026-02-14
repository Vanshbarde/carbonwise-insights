import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Factory, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const INDUSTRY_TYPES = [
  'Manufacturing', 'Energy & Utilities', 'Mining', 'Chemical', 'Automotive',
  'Construction', 'Food & Beverage', 'Pharmaceutical', 'Textile', 'Other',
];

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: '', email: '', password: '', phone: '',
    address: '', industryType: '', employees: '', annualBudget: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.email || !form.password) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signUp(form.email, form.password, { full_name: form.companyName });

      // Wait for auth then create company
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('companies').insert({
          user_id: user.id,
          company_name: form.companyName,
          email: form.email,
          phone: form.phone || null,
          address: form.address || null,
          industry_type: form.industryType || null,
          employees: form.employees ? parseInt(form.employees) : null,
          annual_energy_budget: form.annualBudget ? parseFloat(form.annualBudget) : null,
        });
      }

      toast({ title: 'Account created!', description: 'You can now log in.' });
      navigate('/login');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary flex-col justify-center px-16">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
              <Factory className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-primary-foreground">CarbonTrack</h1>
          </div>
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">
            Monitor. Reduce.<br />Sustain.
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Advanced industrial carbon emission monitoring with AI-powered insights and predictive analytics.
          </p>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
            <p className="text-muted-foreground mt-1">Register your company to start tracking emissions</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Company Name *</Label>
                <Input value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Acme Industries" className="mt-1" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="admin@company.com" className="mt-1" />
              </div>
              <div>
                <Label>Password *</Label>
                <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 6 characters" className="mt-1" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 234 567 8900" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label>Company Address</Label>
                <Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Industrial Ave" className="mt-1" />
              </div>
              <div>
                <Label>Industry Type</Label>
                <Select value={form.industryType} onValueChange={v => update('industryType', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Number of Employees</Label>
                <Input type="number" value={form.employees} onChange={e => update('employees', e.target.value)} placeholder="100" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label>Annual Energy Budget (Optional)</Label>
                <Input type="number" value={form.annualBudget} onChange={e => update('annualBudget', e.target.value)} placeholder="$ amount" className="mt-1" />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
              {loading ? 'Creating...' : 'Create Account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
