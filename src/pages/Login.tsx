import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Loader2, Shield, Zap, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Animated orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-primary/5 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-primary/10 rounded-tl-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-primary/10 rounded-br-3xl" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <GlowCard>
          <GlowCardHeader className="text-center">
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="relative">
                <img 
                  src="https://i.imgur.com/ut5E3rs.png" 
                  alt="Logo" 
                  className="w-16 h-16 rounded-lg glow relative z-10"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 rounded-lg animate-pulse-glow" />
              </div>
            </motion.div>
            <GlowCardTitle className="text-2xl glow-text">Welcome Back</GlowCardTitle>
            <GlowCardDescription>
              Sign in to access your account
            </GlowCardDescription>
          </GlowCardHeader>
          
          <GlowCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary/50 border-border focus:border-primary transition-all duration-300"
                />
              </motion.div>
              
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-secondary/50 border-border focus:border-primary transition-all duration-300"
                />
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Feature badges */}
            <motion.div
              className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3 h-3 text-primary" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-primary" />
                <span>Fast</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="w-3 h-3 text-primary" />
                <span>Encrypted</span>
              </div>
            </motion.div>
          </GlowCardContent>
        </GlowCard>
      </motion.div>
    </div>
  );
}
