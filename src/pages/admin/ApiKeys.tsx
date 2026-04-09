import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Key, Loader2, Copy, Check, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ApiKey } from '@/lib/types';

// Simple hash function
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return 'hwid_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export default function ApiKeys() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, [user]);

  const fetchApiKeys = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApiKeys(data as ApiKey[]);
    }
    setIsLoading(false);
  };

  const createApiKey = async () => {
    if (!user) return;
    
    setIsCreating(true);

    const key = generateApiKey();
    const keyHash = await hashKey(key);
    const keyPrefix = key.substring(0, 12) + '...';

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: keyName || 'API Key',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API key.',
        variant: 'destructive',
      });
    } else {
      setApiKeys(prev => [data as ApiKey, ...prev]);
      setNewKey(key);
      setKeyName('');
    }

    setIsCreating(false);
  };

  const deleteApiKey = async (id: string) => {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete API key.',
        variant: 'destructive',
      });
    } else {
      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast({
        title: 'Deleted',
        description: 'API key deleted.',
      });
    }
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard.',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <GlowCard className="animate-fade-in">
        <GlowCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <GlowCardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </GlowCardTitle>
              <GlowCardDescription>
                Manage API keys for loader authentication
              </GlowCardDescription>
            </div>
            <Dialog open={showDialog} onOpenChange={(open) => {
              setShowDialog(open);
              if (!open) {
                setNewKey(null);
                setKeyName('');
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate API Key</DialogTitle>
                </DialogHeader>
                {newKey ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-500">Save this key now!</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            This is the only time you&apos;ll see this key. Store it securely.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded bg-secondary/50 font-mono text-sm break-all">
                      {newKey}
                    </div>
                    <Button onClick={() => copyKey(newKey)} className="w-full">
                      {copiedKey === newKey ? (
                        <Check className="w-4 h-4 mr-2" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      Copy Key
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowDialog(false);
                      setNewKey(null);
                    }} className="w-full">
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Key Name (optional)</Label>
                      <Input
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder="e.g., Production Key"
                        className="bg-secondary/50"
                      />
                    </div>
                    <Button onClick={createApiKey} className="w-full" disabled={isCreating}>
                      {isCreating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Key className="w-4 h-4 mr-2" />
                      )}
                      Generate Key
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </GlowCardHeader>
        <GlowCardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="py-8 text-center">
              <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No API keys generated yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a key to authenticate your loader
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="p-4 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{key.name || 'API Key'}</h4>
                      <p className="font-mono text-sm text-muted-foreground mt-1">
                        {key.key_prefix}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Created: {formatDate(key.created_at)}</span>
                        {key.last_used_at && (
                          <span>Last used: {formatDate(key.last_used_at)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteApiKey(key.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlowCardContent>
      </GlowCard>

      {/* API Documentation */}
      <GlowCard className="animate-fade-in">
        <GlowCardHeader>
          <GlowCardTitle>API Endpoints</GlowCardTitle>
          <GlowCardDescription>
            Use these endpoints with your API key in the Authorization header
          </GlowCardDescription>
        </GlowCardHeader>
        <GlowCardContent>
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded bg-secondary/50 font-mono">
              Authorization: Bearer YOUR_API_KEY
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Available Endpoints:</h4>
              <div className="space-y-3">
                <div className="p-3 rounded bg-secondary/30">
                  <code className="text-primary">GET /api/user/check</code>
                  <p className="text-muted-foreground mt-1">Check if user is blacklisted</p>
                </div>
                <div className="p-3 rounded bg-secondary/30">
                  <code className="text-primary">GET /api/user/products</code>
                  <p className="text-muted-foreground mt-1">Get user&apos;s products and access</p>
                </div>
                <div className="p-3 rounded bg-secondary/30">
                  <code className="text-primary">POST /api/user/hwid</code>
                  <p className="text-muted-foreground mt-1">Send/Write HWID</p>
                </div>
                <div className="p-3 rounded bg-secondary/30">
                  <code className="text-primary">GET /api/download/:productId</code>
                  <p className="text-muted-foreground mt-1">Get download URL for product</p>
                </div>
                <div className="p-3 rounded bg-secondary/30">
                  <code className="text-primary">POST /api/debug/log</code>
                  <p className="text-muted-foreground mt-1">Send debug/attempt logs</p>
                </div>
                <div className="p-3 rounded bg-secondary/30">
                  <code className="text-primary">POST /api/maintenance/:productId</code>
                  <p className="text-muted-foreground mt-1">Set product maintenance mode</p>
                </div>
              </div>
            </div>
          </div>
        </GlowCardContent>
      </GlowCard>
    </div>
  );
}
