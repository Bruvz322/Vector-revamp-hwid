import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Download, Link, Clock, Save, Lock, ShieldOff } from 'lucide-react';

export default function SiteSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [loaderUrl, setLoaderUrl] = useState('');
  const [loaderLocked, setLoaderLocked] = useState(false);
  const [discordLink, setDiscordLink] = useState('');
  const [globalCompensation, setGlobalCompensation] = useState('2');
  const [apiLocked, setApiLocked] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('site_settings').select('*');

    if (!error && data) {
      for (const setting of data) {
        switch (setting.key) {
          case 'loader_url':
            setLoaderUrl(setting.value || '');
            break;
          case 'loader_locked':
            setLoaderLocked(setting.value === 'true');
            break;
          case 'discord_link':
            setDiscordLink(setting.value || '');
            break;
          case 'global_compensation_hours':
            setGlobalCompensation(setting.value || '2');
            break;
          case 'api_locked':
            setApiLocked(setting.value === 'true');
            break;
        }
      }
    }
    setIsLoading(false);
  };

  const saveSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          key,
          value,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    return !error;
  };

  const saveAllSettings = async () => {
    setIsSaving(true);

    const results = await Promise.all([
      saveSetting('loader_url', loaderUrl),
      saveSetting('loader_locked', loaderLocked.toString()),
      saveSetting('discord_link', discordLink),
      saveSetting('global_compensation_hours', globalCompensation),
      saveSetting('api_locked', apiLocked.toString()),
    ]);

    if (results.every(r => r)) {
      toast({ title: 'Success', description: 'Settings saved successfully.' });
    } else {
      toast({ title: 'Error', description: 'Some settings failed to save.', variant: 'destructive' });
    }

    setIsSaving(false);
  };

  const toggleLoaderLock = async () => {
    const newValue = !loaderLocked;
    setLoaderLocked(newValue);

    const success = await saveSetting('loader_locked', newValue.toString());
    if (success) {
      toast({
        title: newValue ? 'Loader Locked' : 'Loader Unlocked',
        description: newValue
          ? 'Users can no longer download the loader.'
          : 'Users can now download the loader.',
      });
    }
  };

  const toggleApiLock = async () => {
    const newValue = !apiLocked;
    setApiLocked(newValue);

    const success = await saveSetting('api_locked', newValue.toString());
    if (success) {
      toast({
        title: newValue ? 'API Locked' : 'API Unlocked',
        description: newValue
          ? 'API access restricted to the website only.'
          : 'External API access has been restored.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Loader Settings */}
        <GlowCard className="animate-fade-in">
          <GlowCardHeader>
            <GlowCardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Loader Settings
            </GlowCardTitle>
            <GlowCardDescription>Configure the loader download</GlowCardDescription>
          </GlowCardHeader>
          <GlowCardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Loader Download URL</Label>
              <Input
                value={loaderUrl}
                onChange={e => setLoaderUrl(e.target.value)}
                placeholder="https://example.com/loader.exe"
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">Direct download link to the loader executable</p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
              <div>
                <Label className="cursor-pointer">Lock Loader Downloads</Label>
                <p className="text-xs text-muted-foreground mt-1">When enabled, users cannot download the loader</p>
              </div>
              <Switch checked={loaderLocked} onCheckedChange={toggleLoaderLock} />
            </div>
          </GlowCardContent>
        </GlowCard>

        {/* API Security */}
        <GlowCard className="animate-fade-in">
          <GlowCardHeader>
            <GlowCardTitle className="flex items-center gap-2">
              <ShieldOff className="w-5 h-5" />
              API Security
            </GlowCardTitle>
            <GlowCardDescription>Control external API access</GlowCardDescription>
          </GlowCardHeader>
          <GlowCardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
              <div>
                <Label className="cursor-pointer">Lock API Down</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, only the website can use the API. All external API calls will be blocked.
                </p>
              </div>
              <Switch checked={apiLocked} onCheckedChange={toggleApiLock} />
            </div>
            {apiLocked && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <Lock className="w-4 h-4" />
                  <span className="font-medium">API is currently locked</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  External loaders and API consumers cannot make requests.
                </p>
              </div>
            )}
          </GlowCardContent>
        </GlowCard>

        {/* Discord Settings */}
        <GlowCard className="animate-fade-in">
          <GlowCardHeader>
            <GlowCardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Discord Settings
            </GlowCardTitle>
            <GlowCardDescription>Configure Discord integration</GlowCardDescription>
          </GlowCardHeader>
          <GlowCardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Discord Invite Link</Label>
              <Input
                value={discordLink}
                onChange={e => setDiscordLink(e.target.value)}
                placeholder="https://discord.gg/yourserver"
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">Invite link shown in the navbar</p>
            </div>
          </GlowCardContent>
        </GlowCard>

        {/* Compensation Settings */}
        <GlowCard className="animate-fade-in">
          <GlowCardHeader>
            <GlowCardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Compensation Settings
            </GlowCardTitle>
            <GlowCardDescription>Default compensation for maintenance</GlowCardDescription>
          </GlowCardHeader>
          <GlowCardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Compensation Hours</Label>
              <Input
                type="number"
                value={globalCompensation}
                onChange={e => setGlobalCompensation(e.target.value)}
                placeholder="2"
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">Hours added to subscriptions after maintenance ends</p>
            </div>
          </GlowCardContent>
        </GlowCard>

        {/* Save Button */}
        <GlowCard className="md:col-span-2 animate-fade-in">
          <GlowCardHeader>
            <GlowCardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Save Changes
            </GlowCardTitle>
            <GlowCardDescription>Apply all setting changes</GlowCardDescription>
          </GlowCardHeader>
          <GlowCardContent>
            <Button onClick={saveAllSettings} className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save All Settings
            </Button>
          </GlowCardContent>
        </GlowCard>
      </div>
    </div>
  );
}
