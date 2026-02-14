import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Factory, ArrowRight, BarChart3, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Factory className="w-7 h-7 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">CarbonTrack</h1>
            </div>

            <h2 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Industrial Carbon<br />
              <span className="gradient-text">Emission Monitoring</span>
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Track, analyze, and reduce your industrial carbon footprint with AI-powered insights,
              real-time monitoring, and comprehensive reporting.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link to="/register">
                <Button className="gradient-primary text-primary-foreground font-semibold h-12 px-8 text-base">
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="h-12 px-8 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: BarChart3, title: 'Real-time Analytics', desc: 'Interactive charts tracking CO₂ emissions, energy consumption, and trends over time.' },
            { icon: Zap, title: 'AI Recommendations', desc: 'Smart suggestions to reduce emissions, improve efficiency, and cut energy costs.' },
            { icon: Shield, title: 'Compliance Reports', desc: 'Generate comprehensive PDF reports with all emission data, charts, and predictions.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="glass-card rounded-xl p-6 glow-green"
            >
              <f.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
