import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Loader2, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function Signup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) { setIsValidating(false); return; }

      const { data, error } = await supabase
        .from('signup_links')
        .select('*')
        .eq('token', token)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        setIsValidToken(false);
      } else {
        setIsValidToken(true);
      }
      setIsValidating(false);
    };
    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!agreedToTos) { setError('You must agree to the Terms of Service'); return; }

    setIsLoading(true);

    try {
      const passwordHash = await hashPassword(password);

      const { data: existingUser } = await supabase
        .from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();

      if (existingUser) { setError('An account with this email already exists'); setIsLoading(false); return; }

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ email: email.toLowerCase(), username, password_hash: passwordHash })
        .select().single();

      if (createError) { setError('Failed to create account'); setIsLoading(false); return; }

      await supabase.from('signup_links').update({ is_used: true, used_by: newUser.id }).eq('token', token);
      setSuccess(true);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="absolute inset-0 rounded-full animate-pulse-glow" />
        </div>
      </div>
    );
  }

  if (!token || !isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10">
          <GlowCard className="w-full max-w-md">
            <GlowCardContent className="pt-6 text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid or Expired Link</h2>
              <p className="text-muted-foreground mb-4">
                This signup link is invalid or has expired. Please contact an administrator for a new invite.
              </p>
              <Button variant="outline" onClick={() => navigate('/login')}>Back to Login</Button>
            </GlowCardContent>
          </GlowCard>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10">
          <GlowCard className="w-full max-w-md">
            <GlowCardContent className="pt-6 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Account Created!</h2>
              <p className="text-muted-foreground">Redirecting to login...</p>
            </GlowCardContent>
          </GlowCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <motion.div
        className="absolute top-1/4 right-1/3 w-48 h-48 rounded-full bg-primary/5 blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <GlowCard>
          <GlowCardHeader className="text-center">
            <motion.div className="flex justify-center mb-4" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="relative">
                <img src="https://i.imgur.com/ut5E3rs.png" alt="Logo" className="w-16 h-16 rounded-lg glow relative z-10" crossOrigin="anonymous" />
                <div className="absolute inset-0 rounded-lg animate-pulse-glow" />
              </div>
            </motion.div>
            <GlowCardTitle className="text-2xl glow-text">Create Account</GlowCardTitle>
            <GlowCardDescription>Complete your registration</GlowCardDescription>
          </GlowCardHeader>
          
          <GlowCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { id: 'email', type: 'email', label: 'Email', placeholder: 'Enter your email', value: email, onChange: setEmail, delay: 0.3 },
                { id: 'username', type: 'text', label: 'Username', placeholder: 'Choose a username', value: username, onChange: setUsername, delay: 0.35 },
                { id: 'password', type: 'password', label: 'Password', placeholder: 'Create a password', value: password, onChange: setPassword, delay: 0.4 },
                { id: 'confirmPassword', type: 'password', label: 'Confirm Password', placeholder: 'Confirm your password', value: confirmPassword, onChange: setConfirmPassword, delay: 0.45 },
              ].map((field) => (
                <motion.div key={field.id} className="space-y-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: field.delay }}>
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <Input
                    id={field.id}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    required
                    className="bg-secondary/50 border-border focus:border-primary transition-all duration-300"
                  />
                </motion.div>
              ))}

              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm">
                  {error}
                </motion.div>
              )}

              <div className="flex items-start gap-3">
                <Checkbox id="tos" checked={agreedToTos} onCheckedChange={(checked) => setAgreedToTos(checked === true)} className="mt-0.5" />
                <label htmlFor="tos" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  I have read and agree to the{' '}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="text-primary underline hover:text-primary/80 transition-colors">Terms of Service</button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[80vh] bg-card border-border/50">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />Terms of Service
                        </DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[60vh] pr-4">
                        <div className="space-y-4 text-sm text-muted-foreground">
                          {[
                            { title: '1. Acceptance of Terms', body: 'By creating an account and using this service, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service.' },
                            { title: '2. Account Responsibility', body: 'You are responsible for maintaining the security of your account credentials. You agree not to share your account with others. Each account is tied to hardware identifiers (HWID) for security purposes.' },
                            { title: '3. Hardware Identification', body: 'Our service collects hardware identifiers from your device for authentication and security purposes. If a mismatch is detected, your account may be locked automatically. You must contact support to resolve any HWID-related locks.' },
                            { title: '4. Prohibited Conduct', body: 'You agree not to: attempt to bypass security measures, share or resell access, use the service for any illegal purpose, reverse-engineer any part of the software, or misrepresent your identity.' },
                            { title: '5. Account Termination', body: 'We reserve the right to suspend, lock, or terminate your account at any time for violations of these terms or at our sole discretion. Blacklisted accounts will lose access to all services.' },
                            { title: '6. Subscriptions & Refunds', body: 'All subscription purchases are final unless otherwise stated. Compensation time may be granted at our discretion during service maintenance periods.' },
                            { title: '7. Limitation of Liability', body: 'The service is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use or inability to use the service.' },
                            { title: '8. Changes to Terms', body: 'We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms.' },
                          ].map((section) => (
                            <section key={section.title}>
                              <h3 className="font-semibold text-foreground mb-2">{section.title}</h3>
                              <p>{section.body}</p>
                            </section>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !agreedToTos}>
                {isLoading ? (<><Loader2 className="animate-spin" />Creating account...</>) : ('Create Account')}
              </Button>
            </form>
          </GlowCardContent>
        </GlowCard>
      </motion.div>
    </div>
  );
}
