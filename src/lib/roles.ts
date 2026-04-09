import { supabase } from '@/integrations/supabase/client';

export const PERMISSIONS = {
  user_search: 'User Search',
  blacklist: 'Blacklist',
  bans: 'Bans',
  debug_logs: 'Debug Logs',
  register: 'Register',
  site_settings: 'Site Settings',
  products: 'Products',
  audit_logs: 'Audit Logs',
  api_keys: 'API Keys',
  hwid_review: 'HWID Review',
  role_manager: 'Role Manager',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: Permission[];
  color: string;
  is_system: boolean;
}

export interface AccountLock {
  user_id: string;
  old_hwids: string[];
  attempted_hwids: string[];
  locked_at: string;
  reason: string;
}

export const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  owner: {
    id: 'owner',
    name: 'Owner',
    permissions: Object.keys(PERMISSIONS) as Permission[],
    color: 'red',
    is_system: true,
  },
  management: {
    id: 'management',
    name: 'Management',
    permissions: ['user_search', 'blacklist', 'bans', 'debug_logs', 'register', 'site_settings'],
    color: 'purple',
    is_system: true,
  },
  head_moderator: {
    id: 'head_moderator',
    name: 'Head Moderator',
    permissions: ['user_search', 'blacklist', 'bans', 'register'],
    color: 'blue',
    is_system: true,
  },
  moderator: {
    id: 'moderator',
    name: 'Moderator',
    permissions: ['user_search', 'blacklist', 'register'],
    color: 'green',
    is_system: true,
  },
  hwid: {
    id: 'hwid',
    name: 'HWID',
    permissions: ['hwid_review'],
    color: 'orange',
    is_system: true,
  },
};

export type UserRolesMap = Record<string, string[]>;

export async function loadRoleDefinitions(): Promise<Record<string, RoleDefinition>> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'role_definitions')
    .maybeSingle();

  if (data?.value) {
    try {
      const parsed = JSON.parse(data.value) as Record<string, RoleDefinition>;
      return { ...DEFAULT_ROLES, ...parsed };
    } catch {
      return { ...DEFAULT_ROLES };
    }
  }
  return { ...DEFAULT_ROLES };
}

export async function saveRoleDefinitions(
  roles: Record<string, RoleDefinition>,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      {
        key: 'role_definitions',
        value: JSON.stringify(roles),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  return !error;
}

export async function loadUserRolesMap(): Promise<UserRolesMap> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'user_roles_map')
    .maybeSingle();

  if (data?.value) {
    try {
      return JSON.parse(data.value) as UserRolesMap;
    } catch {
      return {};
    }
  }
  return {};
}

export async function saveUserRolesMap(
  map: UserRolesMap,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      {
        key: 'user_roles_map',
        value: JSON.stringify(map),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  return !error;
}

export async function loadAccountLocks(): Promise<Record<string, AccountLock>> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'account_locks')
    .maybeSingle();

  if (data?.value) {
    try {
      return JSON.parse(data.value) as Record<string, AccountLock>;
    } catch {
      return {};
    }
  }
  return {};
}

export async function saveAccountLocks(
  locks: Record<string, AccountLock>,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      {
        key: 'account_locks',
        value: JSON.stringify(locks),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  return !error;
}

export function getUserPermissions(
  userRoles: string[],
  roleDefinitions: Record<string, RoleDefinition>
): Set<Permission> {
  const permissions = new Set<Permission>();
  for (const roleId of userRoles) {
    const role = roleDefinitions[roleId];
    if (role) {
      for (const perm of role.permissions) {
        permissions.add(perm);
      }
    }
  }
  return permissions;
}

export function checkPermission(
  userRoles: string[],
  roleDefinitions: Record<string, RoleDefinition>,
  permission: Permission
): boolean {
  return getUserPermissions(userRoles, roleDefinitions).has(permission);
}

export function getRoleColor(roleId: string, roleDefinitions: Record<string, RoleDefinition>): string {
  return roleDefinitions[roleId]?.color || 'gray';
}

export function getRoleName(roleId: string, roleDefinitions: Record<string, RoleDefinition>): string {
  return roleDefinitions[roleId]?.name || roleId;
}

export const ROLE_COLOR_MAP: Record<string, string> = {
  red: 'bg-red-500/20 text-red-400 border-red-500/50',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  green: 'bg-green-500/20 text-green-400 border-green-500/50',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  pink: 'bg-pink-500/20 text-pink-400 border-pink-500/50',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
  gray: 'bg-muted text-muted-foreground border-border',
};
