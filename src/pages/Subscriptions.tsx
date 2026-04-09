import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import AuthLayout from '@/components/layout/AuthLayout';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Lock, Infinity as InfinityIcon, AlertTriangle } from 'lucide-react';
import type { Subscription, Product } from '@/lib/types';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface SubscriptionWithProduct extends Subscription {
  product: Product;
}

export default function Subscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchSubscriptions();
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`*, product:products(*)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubscriptions(data as unknown as SubscriptionWithProduct[]);
    }
    setIsLoading(false);
  };

  const getTimeRemaining = (sub: SubscriptionWithProduct) => {
    if (sub.is_lifetime) return null;
    if (!sub.expires_at) return null;
    if (sub.is_paused) return 'Paused';

    const expiresAt = new Date(sub.expires_at);
    const compensationMs = sub.compensation_hours * 60 * 60 * 1000;
    const adjustedExpiry = new Date(expiresAt.getTime() + compensationMs);
    const diff = adjustedExpiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const isExpired = (sub: SubscriptionWithProduct) => {
    if (sub.is_lifetime) return false;
    if (!sub.expires_at) return false;
    const expiresAt = new Date(sub.expires_at);
    const compensationMs = sub.compensation_hours * 60 * 60 * 1000;
    const adjustedExpiry = new Date(expiresAt.getTime() + compensationMs);
    return adjustedExpiry.getTime() <= now.getTime();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold glow-text">My Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage your active products</p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="relative">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full animate-pulse-glow" />
            </div>
          </div>
        ) : subscriptions.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlowCard>
              <GlowCardContent className="py-12 text-center">
                <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">You don&apos;t have any subscriptions yet</p>
                <Link to="/dashboard"><Button>Browse Products</Button></Link>
              </GlowCardContent>
            </GlowCard>
          </motion.div>
        ) : (
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {subscriptions.map((sub) => {
              const expired = isExpired(sub);
              const timeRemaining = getTimeRemaining(sub);
              
              return (
                <motion.div key={sub.id} variants={itemVariants}>
                  <GlowCard className={`${expired || sub.is_locked ? 'opacity-75' : ''} group`}>
                    <GlowCardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <GlowCardTitle className="text-lg">{sub.product.name}</GlowCardTitle>
                        <div className="flex flex-col gap-1 items-end">
                          {sub.is_lifetime ? (
                            <Badge className="bg-primary/20 text-primary border-primary/50">
                              <InfinityIcon className="w-3 h-3 mr-1" />
                              Lifetime
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="capitalize">{sub.subscription_type}</Badge>
                          )}
                          {sub.is_paused && (
                            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Paused</Badge>
                          )}
                          {sub.is_locked && (
                            <Badge variant="destructive">
                              <Lock className="w-3 h-3 mr-1" />Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                      <GlowCardDescription className="line-clamp-2">
                        {sub.product.description || 'No description'}
                      </GlowCardDescription>
                    </GlowCardHeader>

                    {sub.product.image_url && (
                      <div className="px-6 pb-4">
                        <div className="aspect-video rounded-lg overflow-hidden border border-border/50 bg-secondary">
                          <img
                            src={sub.product.image_url}
                            alt={sub.product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            crossOrigin="anonymous"
                          />
                        </div>
                      </div>
                    )}

                    <GlowCardContent className="pt-0 space-y-4">
                      {!sub.is_lifetime && (
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                          <div className="text-sm text-muted-foreground mb-1">Time Remaining</div>
                          <div className={`text-2xl font-mono font-bold ${
                            expired ? 'text-destructive' : 'text-primary glow-text'
                          }`}>
                            {timeRemaining}
                          </div>
                          {sub.compensation_hours > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              +{sub.compensation_hours}h compensation applied
                            </div>
                          )}
                        </div>
                      )}

                      {(expired || sub.is_locked) && (
                        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-destructive">
                                {sub.is_locked ? 'Product Locked' : 'Subscription Expired'}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Please renew your subscription or contact support on Discord for manual payment options.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {sub.product.is_maintenance && (
                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                          <div className="text-sm text-yellow-500">
                            This product is under maintenance. Your subscription time is paused.
                          </div>
                        </div>
                      )}
                    </GlowCardContent>
                  </GlowCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
}
