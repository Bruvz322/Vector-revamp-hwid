import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Link, Loader2, Copy, Check, Trash2, Clock } from 'lucide-react';
import type { SignupLink } from '@/lib/types';

// Simple hash function for password
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export default function RegisterUser() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Manual registration
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Signup links
  const [signupLinks, setSignupLinks] = useState<SignupLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    fetchSignupLinks();
  }, []);

  const fetchSignupLinks = async () => {
    const { data, error } = await supabase
      .from('signup_links')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setSignupLinks(data as SignupLink[]);
    }
    setIsLoadingLinks(false);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Required Fields',
        description: 'Email and password are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      // Check if email exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Email Exists',
          description: 'A user with this email already exists.',
          variant: 'destructive',
        });
        setIsCreating(false);
        return;
      }

      const passwordHash = await hashPassword(password);

      const { error } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          username: username || null,
          password_hash: passwordHash,
          is_admin: isAdmin,
        });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create user.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'User created successfully.',
        });
        setEmail('');
        setUsername('');
        setPassword('');
        setIsAdmin(false);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }

    setIsCreating(false);
  };

  const generateSignupLink = async () => {
    if (!user) return;
    
    setIsGeneratingLink(true);

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data, error } = await supabase
      .from('signup_links')
      .insert({
        token,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate signup link.',
        variant: 'destructive',
      });
    } else {
      setSignupLinks(prev => [data as SignupLink, ...prev]);
      toast({
        title: 'Success',
        description: 'Signup link generated.',
      });
    }

    setIsGeneratingLink(false);
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/signup?token=${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
    toast({
      title: 'Copied',
      description: 'Signup link copied to clipboard.',
    });
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase
      .from('signup_links')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete link.',
        variant: 'destructive',
      });
    } else {
      setSignupLinks(prev => prev.filter(l => l.id !== id));
      toast({
        title: 'Deleted',
        description: 'Signup link deleted.',
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Manual Registration */}
      <GlowCard className="animate-fade-in">
        <GlowCardHeader>
          <GlowCardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Manual Registration
          </GlowCardTitle>
          <GlowCardDescription>
            Create a new user account directly
          </GlowCardDescription>
        </GlowCardHeader>
        <GlowCardContent>
          <form onSubmit={createUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Optional username"
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="bg-secondary/50"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <Label htmlFor="isAdmin" className="cursor-pointer">Make Admin</Label>
              <Switch
                id="isAdmin"
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Create User
            </Button>
          </form>
        </GlowCardContent>
      </GlowCard>

      {/* Signup Links */}
      <GlowCard className="animate-fade-in">
        <GlowCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <GlowCardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                One-Time Signup Links
              </GlowCardTitle>
              <GlowCardDescription>
                Generate invite links for new users
              </GlowCardDescription>
            </div>
            <Button onClick={generateSignupLink} disabled={isGeneratingLink}>
              {isGeneratingLink ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link className="w-4 h-4" />
              )}
              Generate
            </Button>
          </div>
        </GlowCardHeader>
        <GlowCardContent>
          {isLoadingLinks ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : signupLinks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No signup links generated yet
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {signupLinks.map((link) => (
                <div
                  key={link.id}
                  className={`p-3 rounded-lg bg-secondary/30 border border-border ${
                    link.is_used || isExpired(link.expires_at) ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {link.is_used ? (
                          <Badge variant="outline" className="text-green-500 border-green-500/50">
                            <Check className="w-3 h-3 mr-1" />
                            Used
                          </Badge>
                        ) : isExpired(link.expires_at) ? (
                          <Badge variant="outline" className="text-destructive border-destructive/50">
                            <Clock className="w-3 h-3 mr-1" />
                            Expired
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-primary border-primary/50">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-xs mt-2 truncate">
                        {link.token}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {formatDate(link.expires_at)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!link.is_used && !isExpired(link.expires_at) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyLink(link.token)}
                        >
                          {copiedLink === link.token ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLink(link.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlowCardContent>
      </GlowCard>
    </div>
  );
}
