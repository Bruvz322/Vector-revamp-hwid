import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  loadRoleDefinitions, saveRoleDefinitions,
  loadUserRolesMap, saveUserRolesMap,
  PERMISSIONS, ROLE_COLOR_MAP,
  type RoleDefinition, type Permission,
} from '@/lib/roles';
import { Shield, Plus, Trash2, Search, Loader2, Save, X, UserPlus, Edit } from 'lucide-react';

const COLOR_OPTIONS = ['red', 'purple', 'blue', 'green', 'orange', 'yellow', 'pink', 'cyan'];

export default function RoleManager() {
  const { user, refreshRoles } = useAuth();
  const { toast } = useToast();

  const [roles, setRoles] = useState<Record<string, RoleDefinition>>({});
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Role editor
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('blue');
  const [rolePerms, setRolePerms] = useState<Permission[]>([]);

  // User assignment
  const [assignEmail, setAssignEmail] = useState('');
  const [foundUser, setFoundUser] = useState<{ id: string; email: string; is_admin: boolean } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [defs, map] = await Promise.all([loadRoleDefinitions(), loadUserRolesMap()]);
    setRoles(defs);
    setUserRolesMap(map);
    setIsLoading(false);
  };

  const openCreateRole = () => {
    setEditingKey(null);
    setRoleId('');
    setRoleName('');
    setRoleColor('blue');
    setRolePerms([]);
    setShowRoleDialog(true);
  };

  const openEditRole = (key: string) => {
    const role = roles[key];
    if (!role || key === 'owner') return;
    setEditingKey(key);
    setRoleId(key);
    setRoleName(role.name);
    setRoleColor(role.color);
    setRolePerms([...role.permissions]);
    setShowRoleDialog(true);
  };

  const togglePerm = (perm: Permission) => {
    setRolePerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const saveRole = async () => {
    if (!roleName.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const key = editingKey || roleId.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || key === 'owner') {
      toast({ title: 'Invalid role ID', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const updated = {
      ...roles,
      [key]: { id: key, name: roleName.trim(), permissions: rolePerms, color: roleColor, is_system: roles[key]?.is_system || false },
    };

    const ok = await saveRoleDefinitions(updated, user!.id);
    if (ok) {
      setRoles(updated);
      setShowRoleDialog(false);
      await refreshRoles();
      toast({ title: 'Role saved' });
    } else {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const deleteRole = async (key: string) => {
    if (roles[key]?.is_system) return;
    const updated = { ...roles };
    delete updated[key];

    // Remove role from all users
    const updatedMap = { ...userRolesMap };
    for (const uid of Object.keys(updatedMap)) {
      updatedMap[uid] = updatedMap[uid].filter(r => r !== key);
      if (updatedMap[uid].length === 0) delete updatedMap[uid];
    }

    setIsSaving(true);
    const [r1, r2] = await Promise.all([
      saveRoleDefinitions(updated, user!.id),
      saveUserRolesMap(updatedMap, user!.id),
    ]);
    if (r1 && r2) {
      setRoles(updated);
      setUserRolesMap(updatedMap);
      await refreshRoles();
      toast({ title: 'Role deleted' });
    }
    setIsSaving(false);
  };

  const searchUser = async () => {
    if (!assignEmail.trim()) return;
    setIsSearching(true);
    setFoundUser(null);
    const { data } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .ilike('email', `%${assignEmail}%`)
      .maybeSingle();
    if (data) {
      setFoundUser(data as { id: string; email: string; is_admin: boolean });
    } else {
      toast({ title: 'User not found', variant: 'destructive' });
    }
    setIsSearching(false);
  };

  const toggleUserRole = async (userId: string, roleKey: string) => {
    if (roleKey === 'owner') return;
    const current = userRolesMap[userId] || [];
    const updated = current.includes(roleKey)
      ? current.filter(r => r !== roleKey)
      : [...current, roleKey];

    const newMap = { ...userRolesMap };
    if (updated.length === 0) {
      delete newMap[userId];
    } else {
      newMap[userId] = updated;
    }

    const ok = await saveUserRolesMap(newMap, user!.id);
    if (ok) {
      setUserRolesMap(newMap);
      await refreshRoles();
      toast({ title: 'Roles updated' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const assignableRoles = Object.entries(roles).filter(([k]) => k !== 'owner');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Role Definitions */}
      <GlowCard className="lg:col-span-2 animate-fade-in">
        <GlowCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <GlowCardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Definitions
              </GlowCardTitle>
              <GlowCardDescription>Create and manage staff roles and their permissions</GlowCardDescription>
            </div>
            <Button onClick={openCreateRole}>
              <Plus className="w-4 h-4 mr-2" />
              New Role
            </Button>
          </div>
        </GlowCardHeader>
        <GlowCardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(roles).map(([key, role]) => (
              <div key={key} className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={ROLE_COLOR_MAP[role.color] || ROLE_COLOR_MAP.gray}>
                    {role.name}
                  </Badge>
                  <div className="flex gap-1">
                    {key !== 'owner' && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRole(key)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        {!role.is_system && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRole(key)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map(p => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {PERMISSIONS[p]}
                    </span>
                  ))}
                </div>
                {key === 'owner' && (
                  <p className="text-xs text-muted-foreground">Cannot be assigned or edited</p>
                )}
              </div>
            ))}
          </div>
        </GlowCardContent>
      </GlowCard>

      {/* Assign Roles */}
      <GlowCard className="lg:col-span-2 animate-fade-in">
        <GlowCardHeader>
          <GlowCardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Assign Roles to Users
          </GlowCardTitle>
          <GlowCardDescription>Search for a user by email and assign roles</GlowCardDescription>
        </GlowCardHeader>
        <GlowCardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Search by email..."
              value={assignEmail}
              onChange={e => setAssignEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUser()}
              className="flex-1 bg-secondary/50"
            />
            <Button onClick={searchUser} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>

          {foundUser && (
            <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{foundUser.email}</p>
                  <p className="text-xs text-muted-foreground">ID: {foundUser.id.slice(0, 8)}...</p>
                </div>
                {foundUser.is_admin && (
                  <Badge variant="outline" className={ROLE_COLOR_MAP.red}>Owner</Badge>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Toggle roles:</Label>
                <div className="flex flex-wrap gap-2">
                  {assignableRoles.map(([key, role]) => {
                    const hasRole = (userRolesMap[foundUser.id] || []).includes(key);
                    return (
                      <Button
                        key={key}
                        variant={hasRole ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleUserRole(foundUser.id, key)}
                        className="gap-1"
                      >
                        {hasRole && <X className="w-3 h-3" />}
                        {role.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Currently assigned users */}
          {Object.keys(userRolesMap).length > 0 && (
            <div className="border-t border-border pt-4 space-y-2">
              <Label className="text-sm text-muted-foreground">Users with roles:</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(userRolesMap).map(([uid, roleIds]) => (
                  <UserRoleRow key={uid} userId={uid} roleIds={roleIds} roles={roles} onToggle={toggleUserRole} />
                ))}
              </div>
            </div>
          )}
        </GlowCardContent>
      </GlowCard>

      {/* Role Editor Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingKey ? 'Edit Role' : 'Create Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingKey && (
              <div className="space-y-2">
                <Label>Role ID (lowercase, no spaces)</Label>
                <Input
                  value={roleId}
                  onChange={e => setRoleId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="e.g. support"
                  className="bg-secondary/50 font-mono"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Support" className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setRoleColor(c)}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-all ${ROLE_COLOR_MAP[c]} ${
                      roleColor === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PERMISSIONS) as [Permission, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 p-2 rounded bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <Checkbox checked={rolePerms.includes(key)} onCheckedChange={() => togglePerm(key)} />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={saveRole} className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {editingKey ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserRoleRow({
  userId,
  roleIds,
  roles,
  onToggle,
}: {
  userId: string;
  roleIds: string[];
  roles: Record<string, RoleDefinition>;
  onToggle: (uid: string, role: string) => void;
}) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('users').select('email').eq('id', userId).maybeSingle();
      if (data) setEmail(data.email);
    };
    fetch();
  }, [userId]);

  return (
    <div className="flex items-center justify-between p-2 rounded bg-secondary/20">
      <span className="text-sm truncate">{email || userId.slice(0, 12) + '...'}</span>
      <div className="flex gap-1 flex-wrap">
        {roleIds.map(rId => {
          const role = roles[rId];
          return (
            <Badge
              key={rId}
              variant="outline"
              className={`cursor-pointer text-xs ${ROLE_COLOR_MAP[role?.color || 'gray']}`}
              onClick={() => onToggle(userId, rId)}
            >
              {role?.name || rId}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
