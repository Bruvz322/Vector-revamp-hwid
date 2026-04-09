import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bug, Ban, RefreshCw, User, Monitor, AlertTriangle } from 'lucide-react';
import type { DebugLog, User as UserType } from '@/lib/types';

interface DebugLogWithUser extends DebugLog {
  matched_user?: UserType | null;
}

export default function DebugLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<DebugLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<DebugLogWithUser | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [banningHwid, setBanningHwid] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('debug_logs')
      .select(`
        *,
        matched_user:users(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data as unknown as DebugLogWithUser[]);
    }
    setIsLoading(false);
  };

  const banHwid = async (hwid: string) => {
    setBanningHwid(hwid);

    // Check if already banned
    const { data: existing } = await supabase
      .from('banned_hwids')
      .select('id')
      .eq('hwid', hwid)
      .maybeSingle();

    if (existing) {
      toast({
        title: 'Already Banned',
        description: 'This HWID is already banned.',
        variant: 'destructive',
      });
      setBanningHwid(null);
      return;
    }

    const { error } = await supabase
      .from('banned_hwids')
      .insert({
        hwid,
        reason: 'Banned from debug log',
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to ban HWID.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'HWID has been banned.',
      });
    }

    setBanningHwid(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const openLogDetails = (log: DebugLogWithUser) => {
    setSelectedLog(log);
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <GlowCardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Debug Logs ({logs.length})
        </GlowCardTitle>
        <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <GlowCard>
          <GlowCardContent className="py-12 text-center">
            <Bug className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No debug logs recorded yet.</p>
          </GlowCardContent>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <GlowCard key={log.id} className="animate-fade-in">
              <GlowCardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {log.log_type}
                      </Badge>
                      {log.is_banned && (
                        <Badge variant="destructive">
                          <Ban className="w-3 h-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                      {log.matched_user && (
                        <Badge className="bg-primary/20 text-primary">
                          <User className="w-3 h-3 mr-1" />
                          Matched User
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">IP Address</span>
                        <p className="font-mono text-xs">{log.ip_address || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">HWIDs Sent</span>
                        <p>{log.hwid_list?.length || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Matched HWID</span>
                        <p className="font-mono text-xs truncate">{log.matched_hwid || 'None'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time</span>
                        <p className="text-xs">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                    {log.matched_user && (
                      <div className="mt-2 p-2 rounded bg-secondary/30 text-sm">
                        <span className="text-muted-foreground">Matched User: </span>
                        <span className="font-medium">{log.matched_user.email}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openLogDetails(log)}>
                    View Details
                  </Button>
                </div>
              </GlowCardContent>
            </GlowCard>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Debug Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Log Type</span>
                  <p className="font-medium capitalize">{selectedLog.log_type}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Timestamp</span>
                  <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">IP Address</span>
                  <p className="font-mono">{selectedLog.ip_address || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p>{selectedLog.is_banned ? 'Banned' : 'Active'}</p>
                </div>
              </div>

              {selectedLog.matched_user && (
                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Matched User</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <span className="ml-2">{selectedLog.matched_user.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">HWID Match:</span>
                      <span className="ml-2 font-mono text-xs">{selectedLog.matched_hwid || 'None'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="w-4 h-4" />
                  <span className="font-medium">HWID List ({selectedLog.hwid_list?.length || 0})</span>
                </div>
                {selectedLog.hwid_list && selectedLog.hwid_list.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedLog.hwid_list.map((hwid, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded bg-secondary/50">
                        <span className="font-mono text-xs break-all flex-1 mr-2">{hwid}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => banHwid(hwid)}
                          disabled={banningHwid === hwid}
                        >
                          {banningHwid === hwid ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Ban className="w-4 h-4" />
                          )}
                          Ban
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No HWIDs in this log</p>
                )}
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Additional Details</span>
                  </div>
                  <pre className="p-3 rounded bg-secondary/50 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
