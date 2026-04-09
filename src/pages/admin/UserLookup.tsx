import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { loadAccountLocks, saveAccountLocks, type AccountLock } from '@/lib/roles';
import type { User, HwidHistory, Subscription, Product } from '@/lib/types';
import {
  Search, Loader2, Shield, ShieldOff, RotateCcw, Fingerprint,
  Monitor, Clock, ArrowRight, Lock, Unlock, Cpu, HardDrive, CircuitBoard, MemoryStick
} from 'lucide-react';

const HWID_CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Cpu }> = {
  motherboard: { label: 'Motherboard', icon: CircuitBoard },
  cpu: { label: 'CPU', icon: Cpu },
  gpu: { label: 'GPU', icon: Monitor },
  disk: { label: 'Disk', icon: HardDrive },
  ram: { label: 'RAM', icon: MemoryStick },
  bios: { label: 'BIOS', icon: Fingerprint },
  network: { label: 'Network', icon: Monitor },
};

function parseHwid(hwid: string): { category: string; value: string } {
  const colonIndex = hwid.indexOf(':');
  if (colonIndex > 0) {
    return {
      category: hwid.substring(0, colonIndex).toLowerCase(),
      value: hwid.substring(colonIndex + 1),
    };
  }
  return { category: 'unknown', value: hwid };
}

function getCategoryDisplay(category: string) {
  const config = HWID_CATEGORY_CONFIG[category];
  return {
    label: config?.label || category.charAt(0).toUpperCase() + category.slice(1),
    Icon: config?.icon || Fingerprint,
  };
}

function HwidDiffView({ oldHwids, newHwids }: { oldHwids: string[]; newHwids: string[] }) {
  const oldMap = new Map<string, string>();
  const newMap = new Map<string, string>();

  oldHwids.forEach((h) => {
    const { category, value } = parseHwid(h);
    oldMap.set(category, value);
  });
  newHwids.forEach((h) => {
    const { category, value } = parseHwid(h);
    newMap.set(category, value);
  });

  const allCategories = new Set([...oldMap.keys(), ...newMap.keys()]);

  return (
    <div className="space-y-1 font-mono text-sm">
      {Array.from(allCategories).map((cat) => {
        const oldVal = oldMap.get(cat);
        const newVal = newMap.get(cat);
        const { label } = getCategoryDisplay(cat);
        const changed = oldVal !== newVal;

        return (
          <div key={cat} className="flex items-center gap-2 py-1.5 px-3 rounded bg-secondary/30">
            <span className="w-28 text-muted-foreground font-medium shrink-0">{label}</span>
            {changed ? (
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                {oldVal && (
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 line-through truncate">{oldVal}</span>
                )}
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                {newVal && (
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 truncate">{newVal}</span>
                )}
                {!newVal && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 italic">removed</span>}
              </div>
            ) : (
              <span className="text-muted-foreground truncate">{oldVal || '—'}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UserLookup() {
  const { user: currentUser, hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [hwidHistory, setHwidHistory] = useState<HwidHistory[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accountLock, setAccountLock] = useState<AccountLock | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [productPlans, setProductPlans] = useState<Record<string, any[]>>({});
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [isBlacklisting, setIsBlacklisting] = useState(false);
  const [isResettingHwid, setIsResettingHwid] = useState(false);
  const [isTogglingLua, setIsTogglingLua] = useState(false);
  const [grantProductId, setGrantProductId] = useState('');
  const [grantType, setGrantType] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const searchUser = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setFoundUser(null);
    setAccountLock(null);

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .or(`email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(1)
        .maybeSingle();

      if (!userData) {
        toast({ title: 'User not found', variant: 'destructive' });
        setIsSearching(false);
        return;
      }

      setFoundUser(userData as User);

      const [hwidRes, subRes, prodRes, locks] = await Promise.all([
        supabase.from('hwid_history').select('*').eq('user_id', userData.id).order('recorded_at', { ascending: false }),
        supabase.from('subscriptions').select('*, product:products(*)').eq('user_id', userData.id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('is_active', true),
        loadAccountLocks(),
      ]);

      setHwidHistory((hwidRes.data || []) as HwidHistory[]);
      setSubscriptions((subRes.data || []) as Subscription[]);
      setProducts((prodRes.data || []) as Product[]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productIds = (prodRes.data || []).map((p: any) => p.id);
      if (productIds.length > 0) {
        const { data: settings } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', productIds.map((id: string) => `pricing_plans_${id}`));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plans: Record<string, any[]> = {};
        if (settings) {
          for (const s of settings) {
            const productId = s.key.replace('pricing_plans_', '');
            try { plans[productId] = JSON.parse(s.value); } catch { /* skip */ }
          }
        }
        setProductPlans(plans);
      }

      setAccountLock(locks[userData.id] || null);
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, toast]);

  const resetHwid = async () => {
    if (!foundUser || !currentUser) return;
    setIsResettingHwid(true);
    try {
      await supabase.from('users').update({ current_hwid: null, hwid_reset_count: (foundUser.hwid_reset_count || 0) + 1 }).eq('id', foundUser.id);
      await supabase.from('audit_logs').insert({
        action_type: 'hwid_reset', action_category: 'admin',
        user_id: foundUser.id, admin_id: currentUser.id,
        details: { reset_count: (foundUser.hwid_reset_count || 0) + 1 },
      });
      setFoundUser({ ...foundUser, current_hwid: null, hwid_reset_count: foundUser.hwid_reset_count + 1 });
      toast({ title: 'Auth HWID reset' });
    } catch {
      toast({ title: 'Reset failed', variant: 'destructive' });
    } finally {
      setIsResettingHwid(false);
    }
  };

  const toggleBlacklist = async () => {
    if (!foundUser || !currentUser) return;
    setIsBlacklisting(true);
    try {
      const newState = !foundUser.is_blacklisted;
      await supabase.from('users').update({
        is_blacklisted: newState,
        blacklist_reason: newState ? blacklistReason : null,
      }).eq('id', foundUser.id);
      await supabase.from('audit_logs').insert({
        action_type: newState ? 'blacklist' : 'unblacklist', action_category: 'admin',
        user_id: foundUser.id, admin_id: currentUser.id,
        details: { reason: blacklistReason },
      });
      setFoundUser({ ...foundUser, is_blacklisted: newState, blacklist_reason: newState ? blacklistReason : null });
      setShowBlacklist(false);
      setBlacklistReason('');
      toast({ title: newState ? 'User blacklisted' : 'User unblacklisted' });
    } catch {
      toast({ title: 'Action failed', variant: 'destructive' });
    } finally {
      setIsBlacklisting(false);
    }
  };

  const toggleLua = async () => {
    if (!foundUser || !currentUser) return;
    setIsTogglingLua(true);
    try {
      const newState = !foundUser.lua_api_access;
      await supabase.from('users').update({ lua_api_access: newState }).eq('id', foundUser.id);
      setFoundUser({ ...foundUser, lua_api_access: newState });
      toast({ title: `LUA API ${newState ? 'enabled' : 'disabled'}` });
    } catch {
      toast({ title: 'Failed', variant: 'destructive' });
    } finally {
      setIsTogglingLua(false);
    }
  };

const grantProduct = async () => {
  if (!foundUser || !grantProductId || !grantType) return;
  setIsGranting(true);
  try {
    const plans = productPlans[grantProductId] || [];
    const matchedPlan = plans.find((p) => p.name === grantType);

    const isLifetime = matchedPlan ? matchedPlan.is_lifetime : grantType === 'lifetime';
    const durationDays = isLifetime ? null : (matchedPlan ? matchedPlan.duration_days : grantType === 'week' ? 7 : 30);
    const now = new Date();

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', foundUser.id)
      .eq('product_id', grantProductId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub) {
      let newExpiry: string | null = null;
      if (!isLifetime && durationDays) {
        const additionalMs = durationDays * 24 * 60 * 60 * 1000;
        if (existingSub.expires_at && !existingSub.is_lifetime) {
          const currentExpiry = new Date(existingSub.expires_at);
          // Stack on top of current expiry if still active, otherwise stack from now
          const base = currentExpiry > now ? currentExpiry : now;
          newExpiry = new Date(base.getTime() + additionalMs).toISOString();
        } else {
          newExpiry = new Date(now.getTime() + additionalMs).toISOString();
        }
      }

      await supabase
        .from('subscriptions')
        .update({
          expires_at: isLifetime ? null : newExpiry,
          is_lifetime: isLifetime || existingSub.is_lifetime,
          is_locked: false,
          subscription_type: grantType,
          updated_at: now.toISOString(),
        })
        .eq('id', existingSub.id);
    } else {
      await supabase.from('subscriptions').insert({
        user_id: foundUser.id,
        product_id: grantProductId,
        subscription_type: grantType,
        is_lifetime: isLifetime,
        starts_at: now.toISOString(),
        expires_at: isLifetime ? null : new Date(now.getTime() + (durationDays! * 24 * 60 * 60 * 1000)).toISOString(),
      });
    }

    toast({ title: 'Product granted' });
    setGrantProductId('');
    setGrantType('');
  } catch {
    toast({ title: 'Grant failed', variant: 'destructive' });
  } finally {
    setIsGranting(false);
  }
};

  const toggleAccountLock = async () => {
    if (!foundUser || !currentUser) return;
    setIsLocking(true);
    try {
      const locks = await loadAccountLocks();
      if (accountLock) {
        delete locks[foundUser.id];
        await saveAccountLocks(locks, currentUser.id);
        setAccountLock(null);
        toast({ title: 'Account unlocked' });
      } else {
        const newLock: AccountLock = {
          user_id: foundUser.id,
          old_hwids: hwidHistory.length > 0 ? hwidHistory.slice(-5).map((h) => h.hwid) : [],
          attempted_hwids: foundUser.current_hwid ? [foundUser.current_hwid] : [],
          locked_at: new Date().toISOString(),
          reason: 'HWID Mismatch - Manual Lock',
        };
        locks[foundUser.id] = newLock;
        await saveAccountLocks(locks, currentUser.id);
        setAccountLock(newLock);
        toast({ title: 'Account locked' });
      }
    } catch {
      toast({ title: 'Lock action failed', variant: 'destructive' });
    } finally {
      setIsLocking(false);
    }
  };

  // Group HWIDs by category
  const hwidByCategory = hwidHistory.reduce<Record<string, { values: { value: string; date: string }[] }>>((acc, entry) => {
    const { category, value } = parseHwid(entry.hwid);
    if (!acc[category]) acc[category] = { values: [] };
    acc[category].values.push({ value, date: entry.recorded_at });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Search */}
      <GlowCard className="animate-fade-in">
        <GlowCardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search by email or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              className="bg-secondary/50"
            />
            <Button onClick={searchUser} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </GlowCardContent>
      </GlowCard>

      {foundUser && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Account Lock Alert */}
          {accountLock && (
            <GlowCard className="animate-fade-in lg:col-span-2 border-destructive/50">
              <GlowCardHeader>
                <GlowCardTitle className="flex items-center gap-2 text-destructive">
                  <Lock className="w-5 h-5" /> Account Locked — HWID Mismatch
                </GlowCardTitle>
                <GlowCardDescription>
                  Locked at {new Date(accountLock.locked_at).toLocaleString()} — {accountLock.reason}
                </GlowCardDescription>
              </GlowCardHeader>
              <GlowCardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">HWID Changes (Diff)</Label>
                  <HwidDiffView oldHwids={accountLock.old_hwids} newHwids={accountLock.attempted_hwids} />
                </div>
                <Button variant="outline" onClick={toggleAccountLock} disabled={isLocking} className="gap-2">
                  {isLocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  Unlock Account
                </Button>
              </GlowCardContent>
            </GlowCard>
          )}

          {/* User Info */}
          <GlowCard className="animate-fade-in">
            <GlowCardHeader>
              <GlowCardTitle className="flex items-center justify-between">
                <span>{foundUser.username || foundUser.email}</span>
                <div className="flex gap-2">
                  {foundUser.is_blacklisted && <Badge variant="destructive">Blacklisted</Badge>}
                  {foundUser.is_admin && <Badge className="bg-red-500/20 text-red-400">Owner</Badge>}
                  {accountLock && <Badge variant="destructive">Locked</Badge>}
                </div>
              </GlowCardTitle>
            </GlowCardHeader>
            <GlowCardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Email:</span> {foundUser.email}</div>
                <div><span className="text-muted-foreground">Username:</span> {foundUser.username || '—'}</div>
                <div><span className="text-muted-foreground">Last Login:</span> {foundUser.last_login_at ? new Date(foundUser.last_login_at).toLocaleString() : '—'}</div>
                <div><span className="text-muted-foreground">Last IP:</span> {foundUser.last_login_ip || '—'}</div>
                <div><span className="text-muted-foreground">LUA API:</span> {foundUser.lua_api_access ? 'Enabled' : 'Disabled'}</div>
                <div><span className="text-muted-foreground">HWID Resets:</span> {foundUser.hwid_reset_count}</div>
                <div><span className="text-muted-foreground">Auth HWID:</span> <span className="font-mono text-xs">{foundUser.current_hwid || 'None'}</span></div>
                <div><span className="text-muted-foreground">Created:</span> {new Date(foundUser.created_at).toLocaleDateString()}</div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                {hasPermission('blacklist') && (
                  <Button size="sm" variant={foundUser.is_blacklisted ? 'default' : 'destructive'} onClick={() => foundUser.is_blacklisted ? toggleBlacklist() : setShowBlacklist(true)}>
                    {foundUser.is_blacklisted ? <><ShieldOff className="w-3 h-3 mr-1" />Unblacklist</> : <><Shield className="w-3 h-3 mr-1" />Blacklist</>}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={resetHwid} disabled={isResettingHwid}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset Auth HWID
                </Button>
                <Button size="sm" variant="outline" onClick={toggleLua} disabled={isTogglingLua}>
                  {foundUser.lua_api_access ? 'Disable LUA' : 'Enable LUA'}
                </Button>
                {!accountLock && (
                  <Button size="sm" variant="destructive" onClick={toggleAccountLock} disabled={isLocking} className="gap-1">
                    <Lock className="w-3 h-3" /> Lock Account
                  </Button>
                )}
              </div>
            </GlowCardContent>
          </GlowCard>

          {/* Fingerprint */}
          <GlowCard className="animate-fade-in">
            <GlowCardHeader>
              <GlowCardTitle className="flex items-center gap-2"><Fingerprint className="w-5 h-5" /> Fingerprint</GlowCardTitle>
            </GlowCardHeader>
            <GlowCardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Browser:</span> <span className="font-mono text-xs break-all">{foundUser.browser_fingerprint?.slice(0, 16) || '—'}...</span></div>
                <div><span className="text-muted-foreground">Platform:</span> {foundUser.platform || '—'}</div>
                <div><span className="text-muted-foreground">Screen:</span> {foundUser.screen_resolution || '—'}</div>
                <div><span className="text-muted-foreground">Timezone:</span> {foundUser.timezone || '—'}</div>
                <div><span className="text-muted-foreground">Language:</span> {foundUser.language || '—'}</div>
                <div><span className="text-muted-foreground">Agent:</span> <span className="font-mono text-xs break-all">{foundUser.user_agent?.slice(0, 40) || '—'}...</span></div>
              </div>
            </GlowCardContent>
          </GlowCard>

          {/* HWIDs (full width) */}
          <GlowCard className="animate-fade-in lg:col-span-2">
            <GlowCardHeader>
              <GlowCardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5" /> Hardware Identifiers</GlowCardTitle>
              <GlowCardDescription>All HWIDs collected from this account, grouped by component</GlowCardDescription>
            </GlowCardHeader>
            <GlowCardContent>
              {Object.keys(hwidByCategory).length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(hwidByCategory).map(([category, data]) => {
                    const { label, Icon } = getCategoryDisplay(category);
                    return (
                      <div key={category} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">{label}</span>
                          <Badge variant="outline" className="ml-auto text-xs">{data.values.length}</Badge>
                        </div>
                        <div className="space-y-1.5">
                          {data.values.map((v, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <code className="font-mono bg-secondary/50 px-2 py-1 rounded truncate max-w-[200px]">{v.value}</code>
                              <span className="text-muted-foreground shrink-0 ml-2">{new Date(v.date).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No HWIDs recorded yet.</p>
              )}
            </GlowCardContent>
          </GlowCard>

          {/* Grant Product */}
          <GlowCard className="animate-fade-in">
            <GlowCardHeader>
              <GlowCardTitle>Grant Product</GlowCardTitle>
            </GlowCardHeader>
            <GlowCardContent className="space-y-3">
              <select
                value={grantProductId}
                onChange={(e) => { setGrantProductId(e.target.value); setGrantType(''); }}
                className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm"
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={grantType}
                onChange={(e) => setGrantType(e.target.value)}
                className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm"
                disabled={!grantProductId}
              >
                <option value="">Select duration...</option>
                {grantProductId && (productPlans[grantProductId]?.length > 0
                  ? productPlans[grantProductId].map((plan) => (
                      <option key={plan.id} value={plan.name}>{plan.name}</option>
                    ))
                  : (
                    <>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="lifetime">Lifetime</option>
                    </>
                  )
                )}
              </select>
              <Button onClick={grantProduct} disabled={isGranting || !grantProductId || !grantType} className="w-full">
                {isGranting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Grant
              </Button>
            </GlowCardContent>
          </GlowCard>

          {/* Subscriptions */}
          <GlowCard className="animate-fade-in">
            <GlowCardHeader>
              <GlowCardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Subscriptions</GlowCardTitle>
            </GlowCardHeader>
            <GlowCardContent>
              {subscriptions.length > 0 ? (
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border text-sm">
                      <div>
                        <span className="font-medium">{sub.product?.name || 'Unknown'}</span>
                        <span className="text-muted-foreground ml-2">{sub.subscription_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sub.is_lifetime ? (
                          <Badge className="bg-green-500/20 text-green-400">Lifetime</Badge>
                        ) : sub.expires_at && new Date(sub.expires_at) < new Date() ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No subscriptions.</p>
              )}
            </GlowCardContent>
          </GlowCard>
        </div>
      )}

      {/* Blacklist Dialog */}
      <Dialog open={showBlacklist} onOpenChange={setShowBlacklist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist User</DialogTitle>
            <DialogDescription>Provide a reason for blacklisting this user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for blacklisting..."
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBlacklist(false)}>Cancel</Button>
              <Button variant="destructive" onClick={toggleBlacklist} disabled={isBlacklisting}>
                {isBlacklisting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Confirm Blacklist
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
