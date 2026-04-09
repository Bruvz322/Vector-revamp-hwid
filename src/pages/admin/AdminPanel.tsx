import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import AuthLayout from '@/components/layout/AuthLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Package, FileText, UserPlus, Key, Bug, Ban, Settings, ClipboardList, Shield } from 'lucide-react';
import UserLookup from './UserLookup';
import ProductManagement from './ProductManagement';
import DebugLogs from './DebugLogs';
import RegisterUser from './RegisterUser';
import ApiKeys from './ApiKeys';
import BansManagement from './BansManagement';
import AuditLogs from './AuditLogs';
import SiteSettings from './SiteSettings';
import RoleManager from './RoleManager';
import type { Permission } from '@/lib/roles';

interface TabConfig {
  value: string;
  label: string;
  icon: React.ElementType;
  permissions: Permission[];
}

const TAB_CONFIG: TabConfig[] = [
  { value: 'users', label: 'Users', icon: Users, permissions: ['user_search', 'blacklist', 'hwid_review'] },
  { value: 'products', label: 'Products', icon: Package, permissions: ['products'] },
  { value: 'bans', label: 'Bans', icon: Ban, permissions: ['bans'] },
  { value: 'audit', label: 'Audit', icon: ClipboardList, permissions: ['audit_logs'] },
  { value: 'debug', label: 'Debug', icon: Bug, permissions: ['debug_logs'] },
  { value: 'register', label: 'Register', icon: UserPlus, permissions: ['register'] },
  { value: 'api', label: 'API', icon: Key, permissions: ['api_keys'] },
  { value: 'settings', label: 'Settings', icon: Settings, permissions: ['site_settings'] },
  { value: 'roles', label: 'Roles', icon: Shield, permissions: ['role_manager'] },
];

export default function AdminPanel() {
  const { hasPermission } = useAuth();

  const visibleTabs = TAB_CONFIG.filter(tab =>
    tab.permissions.some(p => hasPermission(p))
  );

  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.value || 'users');

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.value === activeTab)) {
      setActiveTab(visibleTabs[0].value);
    }
  }, [visibleTabs, activeTab]);

  return (
    <AuthLayout requireStaff>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-text">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage users, products, and system settings</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 flex flex-wrap gap-1 h-auto">
            {visibleTabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="users" className="mt-6"><UserLookup /></TabsContent>
          <TabsContent value="products" className="mt-6"><ProductManagement /></TabsContent>
          <TabsContent value="bans" className="mt-6"><BansManagement /></TabsContent>
          <TabsContent value="audit" className="mt-6"><AuditLogs /></TabsContent>
          <TabsContent value="debug" className="mt-6"><DebugLogs /></TabsContent>
          <TabsContent value="register" className="mt-6"><RegisterUser /></TabsContent>
          <TabsContent value="api" className="mt-6"><ApiKeys /></TabsContent>
          <TabsContent value="settings" className="mt-6"><SiteSettings /></TabsContent>
          <TabsContent value="roles" className="mt-6"><RoleManager /></TabsContent>
        </Tabs>
      </div>
    </AuthLayout>
  );
}
