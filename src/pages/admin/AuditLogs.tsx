import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, FileText, ShoppingCart, UserPlus, AlertTriangle, Shield, LogIn } from 'lucide-react';
import type { AuditLog, User } from '@/lib/types';

interface AuditLogWithUser extends AuditLog {
  user: User | null;
  admin: User | null;
}

const categoryIcons: Record<string, React.ElementType> = {
  auth: LogIn,
  purchase: ShoppingCart,
  registration: UserPlus,
  security: AlertTriangle,
  admin: Shield,
};

const categoryColors: Record<string, string> = {
  auth: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
  purchase: 'bg-green-500/20 text-green-500 border-green-500/50',
  registration: 'bg-purple-500/20 text-purple-500 border-purple-500/50',
  security: 'bg-red-500/20 text-red-500 border-red-500/50',
  admin: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users!audit_logs_user_id_fkey(*),
        admin:users!audit_logs_admin_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filter !== 'all') {
      query = query.eq('action_category', filter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setLogs(data as unknown as AuditLogWithUser[]);
    }
    setIsLoading(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getActionDescription = (log: AuditLog): string => {
    const details = log.details as Record<string, unknown> || {};
    
    switch (log.action_type) {
      case 'login_success':
        return `User logged in${details.email ? ` (${details.email})` : ''}`;
      case 'login_failed':
        return `Failed login attempt${details.email ? ` for ${details.email}` : ''}`;
      case 'login_blocked_banned_ip':
        return `Login blocked - IP banned${details.email ? ` (${details.email})` : ''}`;
      case 'login_blocked_blacklisted':
        return `Login blocked - User blacklisted${details.email ? ` (${details.email})` : ''}`;
      case 'logout':
        return 'User logged out';
      case 'purchase':
        return `Purchase: ${details.product_name || 'Unknown product'}`;
      case 'registration':
        return `New user registered${details.email ? `: ${details.email}` : ''}`;
      case 'user_blacklisted':
        return `User blacklisted${details.reason ? `: ${details.reason}` : ''}`;
      case 'hwid_banned':
        return `HWID banned${details.hwid ? `: ${(details.hwid as string).substring(0, 20)}...` : ''}`;
      case 'ip_banned':
        return `IP banned${details.ip ? `: ${details.ip}` : ''}`;
      case 'product_created':
        return `Product created${details.name ? `: ${details.name}` : ''}`;
      case 'product_updated':
        return `Product updated${details.name ? `: ${details.name}` : ''}`;
      case 'subscription_granted':
        return `Subscription granted${details.product_name ? `: ${details.product_name}` : ''}`;
      default:
        return log.action_type.replace(/_/g, ' ');
    }
  };

  const Icon = (category: string) => categoryIcons[category] || FileText;

  return (
    <div className="space-y-6">
      <GlowCard>
        <GlowCardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <GlowCardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Audit Logs ({logs.length})
            </GlowCardTitle>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40 bg-secondary/50">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="purchase">Purchases</SelectItem>
                  <SelectItem value="registration">Registrations</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="admin">Admin Actions</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchLogs}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </GlowCardHeader>
        <GlowCardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">No audit logs found</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.map((log) => {
                const IconComponent = Icon(log.action_category);
                return (
                  <div key={log.id} className="p-3 rounded-lg bg-secondary/30 border border-border animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${categoryColors[log.action_category] || 'bg-muted'}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={categoryColors[log.action_category]}>
                            {log.action_category}
                          </Badge>
                          <span className="text-sm font-medium">{getActionDescription(log)}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{formatDate(log.created_at)}</span>
                          {log.user && (
                            <span>User: {log.user.email}</span>
                          )}
                          {log.ip_address && (
                            <span className="font-mono">IP: {log.ip_address}</span>
                          )}
                        </div>
                        {log.user_agent && (
                          <p className="text-xs text-muted-foreground mt-1 truncate" title={log.user_agent}>
                            {log.user_agent.substring(0, 80)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlowCardContent>
      </GlowCard>
    </div>
  );
}
