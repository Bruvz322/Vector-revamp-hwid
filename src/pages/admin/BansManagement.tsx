import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Ban, Monitor, Globe, Plus, Trash2, RefreshCw, X } from 'lucide-react';
import type { BannedHwid, BannedIp } from '@/lib/types';

interface HwidEntry {
  label: string;
  value: string;
}

export default function BansManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [bannedHwids, setBannedHwids] = useState<BannedHwid[]>([]);
  const [bannedIps, setBannedIps] = useState<BannedIp[]>([]);
  const [isLoadingHwids, setIsLoadingHwids] = useState(true);
  const [isLoadingIps, setIsLoadingIps] = useState(true);

  const [showHwidDialog, setShowHwidDialog] = useState(false);
  const [showIpDialog, setShowIpDialog] = useState(false);

  // Multiple HWID entries for banning
  const [hwidEntries, setHwidEntries] = useState<HwidEntry[]>([{ label: '', value: '' }]);
  const [hwidReason, setHwidReason] = useState('');

  const [newIp, setNewIp] = useState('');
  const [ipReason, setIpReason] = useState('');

  const [isBanning, setIsBanning] = useState(false);

  useEffect(() => {
    fetchBannedHwids();
    fetchBannedIps();
  }, []);

  const fetchBannedHwids = async () => {
    setIsLoadingHwids(true);
    const { data, error } = await supabase
      .from('banned_hwids')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBannedHwids(data as BannedHwid[]);
    }
    setIsLoadingHwids(false);
  };

  const fetchBannedIps = async () => {
    setIsLoadingIps(true);
    const { data, error } = await supabase
      .from('banned_ips')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBannedIps(data as BannedIp[]);
    }
    setIsLoadingIps(false);
  };

  const addHwidEntry = () => {
    setHwidEntries(prev => [...prev, { label: '', value: '' }]);
  };

  const removeHwidEntry = (index: number) => {
    if (hwidEntries.length <= 1) return;
    setHwidEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateHwidEntry = (index: number, field: 'label' | 'value', val: string) => {
    setHwidEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: val } : e));
  };

  const banHwids = async () => {
    const validEntries = hwidEntries.filter(e => e.value.trim());
    if (validEntries.length === 0) {
      toast({ title: 'Required', description: 'At least one HWID value is required.', variant: 'destructive' });
      return;
    }

    setIsBanning(true);

    const inserts = validEntries.map(entry => ({
      hwid: entry.label.trim() ? `${entry.label.trim()}:${entry.value.trim()}` : entry.value.trim(),
      reason: hwidReason || null,
      banned_by: user?.id,
    }));

    let successCount = 0;
    let dupeCount = 0;

    for (const insert of inserts) {
      const { error } = await supabase.from('banned_hwids').insert(insert);
      if (error) {
        if (error.code === '23505') dupeCount++;
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast({ title: 'Success', description: `${successCount} HWID(s) banned successfully.${dupeCount > 0 ? ` ${dupeCount} already existed.` : ''}` });
      setShowHwidDialog(false);
      setHwidEntries([{ label: '', value: '' }]);
      setHwidReason('');
      fetchBannedHwids();
    } else if (dupeCount > 0) {
      toast({ title: 'Already Banned', description: 'All provided HWIDs are already banned.', variant: 'destructive' });
    } else {
      toast({ title: 'Error', description: 'Failed to ban HWIDs.', variant: 'destructive' });
    }

    setIsBanning(false);
  };

  const banIp = async () => {
    if (!newIp.trim()) {
      toast({ title: 'Required', description: 'IP address is required.', variant: 'destructive' });
      return;
    }

    setIsBanning(true);
    const { error } = await supabase
      .from('banned_ips')
      .insert({
        ip_address: newIp.trim(),
        reason: ipReason || null,
        banned_by: user?.id,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already Banned', description: 'This IP is already banned.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to ban IP.', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Success', description: 'IP banned successfully.' });
      setShowIpDialog(false);
      setNewIp('');
      setIpReason('');
      fetchBannedIps();
    }
    setIsBanning(false);
  };

  const unbanHwid = async (id: string) => {
    const { error } = await supabase.from('banned_hwids').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to unban HWID.', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'HWID unbanned.' });
      setBannedHwids(prev => prev.filter(h => h.id !== id));
    }
  };

  const unbanIp = async (id: string) => {
    const { error } = await supabase.from('banned_ips').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to unban IP.', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'IP unbanned.' });
      setBannedIps(prev => prev.filter(i => i.id !== id));
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleString();

  const parseHwid = (hwid: string) => {
    const colonIdx = hwid.indexOf(':');
    if (colonIdx > 0) {
      return { label: hwid.slice(0, colonIdx), value: hwid.slice(colonIdx + 1) };
    }
    return { label: null, value: hwid };
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="hwid" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="hwid" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Monitor className="w-4 h-4" />
            Banned HWIDs ({bannedHwids.length})
          </TabsTrigger>
          <TabsTrigger value="ip" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Globe className="w-4 h-4" />
            Banned IPs ({bannedIps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hwid">
          <GlowCard>
            <GlowCardHeader>
              <div className="flex items-center justify-between">
                <GlowCardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Banned HWIDs
                </GlowCardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchBannedHwids}>
                    <RefreshCw className={`w-4 h-4 ${isLoadingHwids ? 'animate-spin' : ''}`} />
                  </Button>
                  <Dialog open={showHwidDialog} onOpenChange={(open) => {
                    setShowHwidDialog(open);
                    if (!open) setHwidEntries([{ label: '', value: '' }]);
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Ban HWID
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Ban HWIDs</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">
                          Add one or more HWIDs to ban. Use labels like <code className="bg-secondary px-1 rounded">motherboard</code>, <code className="bg-secondary px-1 rounded">disk</code>, etc.
                        </p>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {hwidEntries.map((entry, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <div className="w-28 shrink-0">
                                <Input
                                  value={entry.label}
                                  onChange={e => updateHwidEntry(i, 'label', e.target.value)}
                                  placeholder="type"
                                  className="bg-secondary/50 text-xs h-9"
                                />
                              </div>
                              <div className="flex-1">
                                <Input
                                  value={entry.value}
                                  onChange={e => updateHwidEntry(i, 'value', e.target.value)}
                                  placeholder="HWID value"
                                  className="bg-secondary/50 font-mono text-xs h-9"
                                />
                              </div>
                              {hwidEntries.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeHwidEntry(i)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={addHwidEntry} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Another HWID
                        </Button>
                        <div className="space-y-2">
                          <Label>Reason</Label>
                          <Textarea
                            value={hwidReason}
                            onChange={e => setHwidReason(e.target.value)}
                            placeholder="Reason for banning (optional)"
                            className="bg-secondary/50"
                          />
                        </div>
                        <Button onClick={banHwids} className="w-full" disabled={isBanning}>
                          {isBanning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          <Ban className="w-4 h-4 mr-2" />
                          Ban {hwidEntries.filter(e => e.value.trim()).length} HWID(s)
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </GlowCardHeader>
            <GlowCardContent>
              {isLoadingHwids ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : bannedHwids.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No banned HWIDs</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {bannedHwids.map(ban => {
                    const parsed = parseHwid(ban.hwid);
                    return (
                      <div key={ban.id} className="p-3 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {parsed.label && (
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider shrink-0">
                                  {parsed.label}
                                </Badge>
                              )}
                              <p className="font-mono text-sm break-all">{parsed.value}</p>
                            </div>
                            {ban.reason && (
                              <p className="text-sm text-muted-foreground mt-1">Reason: {ban.reason}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Banned on {formatDate(ban.created_at)}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => unbanHwid(ban.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlowCardContent>
          </GlowCard>
        </TabsContent>

        <TabsContent value="ip">
          <GlowCard>
            <GlowCardHeader>
              <div className="flex items-center justify-between">
                <GlowCardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Banned IPs
                </GlowCardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchBannedIps}>
                    <RefreshCw className={`w-4 h-4 ${isLoadingIps ? 'animate-spin' : ''}`} />
                  </Button>
                  <Dialog open={showIpDialog} onOpenChange={setShowIpDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Ban IP
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ban IP Address</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>IP Address *</Label>
                          <Input
                            value={newIp}
                            onChange={e => setNewIp(e.target.value)}
                            placeholder="e.g., 192.168.1.1"
                            className="bg-secondary/50 font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reason</Label>
                          <Textarea
                            value={ipReason}
                            onChange={e => setIpReason(e.target.value)}
                            placeholder="Reason for banning (optional)"
                            className="bg-secondary/50"
                          />
                        </div>
                        <Button onClick={banIp} className="w-full" disabled={isBanning}>
                          {isBanning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          <Ban className="w-4 h-4 mr-2" />
                          Ban IP
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </GlowCardHeader>
            <GlowCardContent>
              {isLoadingIps ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : bannedIps.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No banned IPs</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {bannedIps.map(ban => (
                    <div key={ban.id} className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm">{ban.ip_address}</p>
                          {ban.reason && (
                            <p className="text-sm text-muted-foreground mt-1">Reason: {ban.reason}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Banned on {formatDate(ban.created_at)}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => unbanIp(ban.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlowCardContent>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
