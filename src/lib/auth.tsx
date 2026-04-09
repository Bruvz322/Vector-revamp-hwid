import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collectFingerprint, getClientIP } from './fingerprint';
import {
  loadRoleDefinitions,
  loadUserRolesMap,
  loadAccountLocks,
  checkPermission,
  type RoleDefinition,
  type UserRolesMap,
  type AccountLock,
  type Permission,
  ROLE_COLOR_MAP,
} from './roles';
import type { User, Session } from './types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isStaff: boolean;
  lockedInfo: AccountLock | null;
  roleDefinitions: Record<string, RoleDefinition>;
  userRolesMap: UserRolesMap;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  updateShowEmail: (show: boolean) => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  userRoleLabels: { label: string; color: string; colorClass: string }[];
}

const AuthContext = createContext<AuthContextType | null>(null);

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function logAudit(
  actionType: string,
  actionCategory: string,
  userId: string | null,
  details: Record<string, unknown>,
  ipAddress: string,
  userAgent: string
) {
  try {
    await supabase.from('audit_logs').insert({
      action_type: actionType,
      action_category: actionCategory,
      user_id: userId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (e) {
    console.error('Failed to log audit:', e);
  }
}

function computeUserRoles(
  userId: string,
  isAdmin: boolean,
  rolesMap: UserRolesMap
): string[] {
  const roles: string[] = [];
  if (isAdmin) roles.push('owner');
  const assigned = rolesMap[userId] || [];
  for (const r of assigned) {
    if (!roles.includes(r)) roles.push(r);
  }
  return roles;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roleDefinitions, setRoleDefinitions] = useState<Record<string, RoleDefinition>>({});
  const [userRolesMap, setUserRolesMap] = useState<UserRolesMap>({});
  const [lockedInfo, setLockedInfo] = useState<AccountLock | null>(null);

  const loadRolesData = async (userId: string) => {
    const [defs, rolesMap, locks] = await Promise.all([
      loadRoleDefinitions(),
      loadUserRolesMap(),
      loadAccountLocks(),
    ]);
    setRoleDefinitions(defs);
    setUserRolesMap(rolesMap);
    setLockedInfo(locks[userId] || null);
  };

  const checkSession = async () => {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (sessionError || !sessionData) {
        localStorage.removeItem('session_token');
        setIsLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionData.user_id)
        .maybeSingle();

      if (userError || !userData) {
        localStorage.removeItem('session_token');
        setIsLoading(false);
        return;
      }

      if (userData.is_blacklisted) {
        localStorage.removeItem('session_token');
        setIsLoading(false);
        return;
      }

      setSession(sessionData as Session);
      setUser(userData as User);
      await loadRolesData(userData.id);
    } catch {
      localStorage.removeItem('session_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const passwordHash = await hashPassword(password);
      const [fingerprint, clientIP] = await Promise.all([collectFingerprint(), getClientIP()]);

      const { data: bannedIP } = await supabase
        .from('banned_ips')
        .select('*')
        .eq('ip_address', clientIP)
        .maybeSingle();

      if (bannedIP) {
        await logAudit('login_blocked_banned_ip', 'security', null, { email, ip: clientIP }, clientIP, fingerprint.userAgent);
        return { error: 'Your IP address has been banned.' };
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('password_hash', passwordHash)
        .maybeSingle();

      if (userError || !userData) {
        await logAudit('login_failed', 'auth', null, { email, reason: 'invalid_credentials' }, clientIP, fingerprint.userAgent);
        return { error: 'Invalid email or password' };
      }

      if (userData.is_blacklisted) {
        await logAudit('login_blocked_blacklisted', 'security', userData.id, { email }, clientIP, fingerprint.userAgent);
        return { error: `Account blacklisted: ${userData.blacklist_reason || 'No reason provided'}` };
      }

      const sessionToken = generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: sessionData, error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userData.id,
          session_token: sessionToken,
          ip_address: clientIP,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        return { error: 'Failed to create session' };
      }

      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          last_login_ip: clientIP,
          browser_fingerprint: fingerprint.fingerprint,
          user_agent: fingerprint.userAgent,
          screen_resolution: fingerprint.screenResolution,
          timezone: fingerprint.timezone,
          language: fingerprint.language,
          platform: fingerprint.platform,
          last_fingerprint_data: {
            colorDepth: fingerprint.colorDepth,
            deviceMemory: fingerprint.deviceMemory,
            hardwareConcurrency: fingerprint.hardwareConcurrency,
            touchSupport: fingerprint.touchSupport,
            cookieEnabled: fingerprint.cookieEnabled,
            doNotTrack: fingerprint.doNotTrack,
            canvas: fingerprint.canvas,
            webglVendor: fingerprint.webglVendor,
            webglRenderer: fingerprint.webglRenderer,
            fonts: fingerprint.fonts,
            plugins: fingerprint.plugins,
            audioContext: fingerprint.audioContext,
          },
        })
        .eq('id', userData.id);

      await logAudit('login_success', 'auth', userData.id, { email }, clientIP, fingerprint.userAgent);

      localStorage.setItem('session_token', sessionToken);
      setSession(sessionData as Session);

      const { data: updatedUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.id)
        .single();

      setUser(updatedUser as User);
      await loadRolesData(userData.id);

      return { error: null };
    } catch {
      return { error: 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    const sessionToken = localStorage.getItem('session_token');
    if (user) {
      const clientIP = await getClientIP();
      await logAudit('logout', 'auth', user.id, {}, clientIP, navigator.userAgent);
    }
    if (sessionToken) {
      await supabase.from('user_sessions').delete().eq('session_token', sessionToken);
    }
    localStorage.removeItem('session_token');
    setUser(null);
    setSession(null);
    setRoleDefinitions({});
    setUserRolesMap({});
    setLockedInfo(null);
  };

  const refreshUser = async () => {
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
    if (data) setUser(data as User);
  };

  const refreshRoles = useCallback(async () => {
    if (!user) return;
    await loadRolesData(user.id);
  }, [user]);

  const updateShowEmail = async (show: boolean) => {
    if (!user) return;
    await supabase.from('users').update({ show_email: show }).eq('id', user.id);
    setUser({ ...user, show_email: show });
  };

  const currentRoles = user ? computeUserRoles(user.id, user.is_admin, userRolesMap) : [];
  const isStaff = currentRoles.length > 0;

  const hasPermissionFn = useCallback(
    (perm: Permission) => {
      if (!user) return false;
      const roles = computeUserRoles(user.id, user.is_admin, userRolesMap);
      return checkPermission(roles, roleDefinitions, perm);
    },
    [user, userRolesMap, roleDefinitions]
  );

  const roleLabels = currentRoles.map(rId => {
    const def = roleDefinitions[rId];
    const color = def?.color || 'gray';
    return {
      label: def?.name || rId,
      color,
      colorClass: ROLE_COLOR_MAP[color] || ROLE_COLOR_MAP.gray,
    };
  });

  return (
    <AuthContext.Provider
      value={{
        user, session, isLoading, isStaff, lockedInfo,
        roleDefinitions, userRolesMap,
        login, logout, refreshUser, refreshRoles, updateShowEmail,
        hasPermission: hasPermissionFn,
        userRoleLabels: roleLabels,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
