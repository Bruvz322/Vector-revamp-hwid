import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/layout/AuthLayout';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Lock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoaderPage() {
  const [loaderUrl, setLoaderUrl] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLoaderSettings();
  }, []);

  const fetchLoaderSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .in('key', ['loader_url', 'loader_locked']);

    if (data) {
      const urlSetting = data.find(s => s.key === 'loader_url');
      const lockedSetting = data.find(s => s.key === 'loader_locked');
      setLoaderUrl(urlSetting?.value || null);
      setIsLocked(lockedSetting?.value === 'true');
    }
    setIsLoading(false);
  };

  const handleDownload = () => {
    if (loaderUrl && !isLocked) {
      window.open(loaderUrl, '_blank');
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold glow-text">Loader</h1>
          <p className="text-muted-foreground mt-1">Download the latest version of our loader</p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="relative">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full animate-pulse-glow" />
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlowCard>
              <GlowCardHeader className="text-center">
                <motion.div
                  className="flex justify-center mb-4"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <div className={`p-6 rounded-full relative ${isLocked ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                    {isLocked ? (
                      <Lock className="w-12 h-12 text-destructive" />
                    ) : (
                      <Download className="w-12 h-12 text-primary" />
                    )}
                    {!isLocked && <div className="absolute inset-0 rounded-full animate-pulse-glow" />}
                  </div>
                </motion.div>
                <GlowCardTitle className="text-2xl">
                  {isLocked ? 'Loader Currently Locked' : 'Download Loader'}
                </GlowCardTitle>
                <GlowCardDescription>
                  {isLocked 
                    ? 'The loader is currently unavailable. Please check back later or contact support.'
                    : 'Click the button below to download the latest version of our loader.'
                  }
                </GlowCardDescription>
              </GlowCardHeader>
              <GlowCardContent className="text-center space-y-4">
                {isLocked ? (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Downloads are temporarily disabled</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      An administrator has locked the loader. This could be due to maintenance or updates.
                    </p>
                  </div>
                ) : loaderUrl ? (
                  <Button onClick={handleDownload} size="lg" className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
                    <Download className="w-5 h-5" />
                    Download Loader (.exe)
                  </Button>
                ) : (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-sm text-yellow-500">
                      No loader URL has been configured yet. Please contact an administrator.
                    </p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-4 border-t border-border/50">
                  <p>By downloading, you agree to our terms of service.</p>
                  <p className="mt-1">Having issues? Join our Discord for support.</p>
                </div>
              </GlowCardContent>
            </GlowCard>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
}
