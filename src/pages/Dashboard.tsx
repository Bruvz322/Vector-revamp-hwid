import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import AuthLayout from '@/components/layout/AuthLayout';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Product, PricingPlan, Subscription } from '@/lib/types';
import { Package, ShoppingCart, Loader2, Wrench, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productPlans, setProductPlans] = useState<Record<string, PricingPlan[]>>({});
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);

      const [prodRes, subRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('subscriptions').select('*').eq('user_id', user.id),
        supabase.from('site_settings').select('key, value').like('key', 'pricing_plans_%'),
      ]);

      if (prodRes.data) setProducts(prodRes.data as Product[]);
      if (subRes.data) setSubscriptions(subRes.data as Subscription[]);

      const plans: Record<string, PricingPlan[]> = {};
      if (settingsRes.data) {
        for (const setting of settingsRes.data) {
          const productId = setting.key.replace('pricing_plans_', '');
          if (setting.value) {
            try {
              plans[productId] = JSON.parse(setting.value);
            } catch { /* skip */ }
          }
        }
      }
      setProductPlans(plans);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const addToCart = async (productId: string, planId?: string, planName?: string) => {
    if (!user) return;
    setAddingToCart(planId || productId);

    try {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Already in cart', variant: 'destructive' });
        setAddingToCart(null);
        return;
      }

      await supabase.from('cart_items').insert({
        user_id: user.id,
        product_id: productId,
        subscription_type: planName || 'month',
        plan_id: planId || null,
      });
      toast({ title: 'Added to cart' });
    } catch {
      toast({ title: 'Failed to add', variant: 'destructive' });
    } finally {
      setAddingToCart(null);
    }
  };

  const hasSubscription = (productId: string) => {
    return subscriptions.some(
      (s) => s.product_id === productId && (s.is_lifetime || (s.expires_at && new Date(s.expires_at) > new Date()))
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold glow-text">Products</h1>
          <p className="text-muted-foreground mt-1">Browse available products and plans</p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full animate-pulse-glow" />
            </div>
          </div>
        ) : products.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlowCard>
              <GlowCardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products available</p>
              </GlowCardContent>
            </GlowCard>
          </motion.div>
        ) : (
          <motion.div
            className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {products.map((product) => {
              const plans = productPlans[product.id] || [];
              const owned = hasSubscription(product.id);

              const pricingOptions: { id: string; name: string; price: number; label: string }[] = [];
              if (plans.length > 0) {
                plans.forEach((p) => {
                  pricingOptions.push({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    label: p.is_lifetime ? p.name : `${p.name} (${p.duration_days}d)`,
                  });
                });
              } else {
                if (product.week_price) pricingOptions.push({ id: 'week', name: 'week', price: product.week_price, label: 'Weekly' });
                if (product.month_price) pricingOptions.push({ id: 'month', name: 'month', price: product.month_price, label: 'Monthly' });
                if (product.lifetime_price) pricingOptions.push({ id: 'lifetime', name: 'lifetime', price: product.lifetime_price, label: 'Lifetime' });
              }

              return (
                <motion.div key={product.id} variants={itemVariants}>
                  <GlowCard className="flex flex-col h-full group">
                    <GlowCardHeader>
                      {product.image_url && (
                        <div className="overflow-hidden rounded-lg mb-3">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-40 object-cover rounded-lg transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <GlowCardTitle className="flex items-center justify-between">
                        <span>{product.name}</span>
                        <div className="flex gap-1">
                          {owned && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Owned</Badge>
                          )}
                          {product.is_maintenance && (
                            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 gap-1">
                              <Wrench className="w-3 h-3" />Maintenance
                            </Badge>
                          )}
                        </div>
                      </GlowCardTitle>
                      {product.description && (
                        <GlowCardDescription className="line-clamp-2">{product.description}</GlowCardDescription>
                      )}
                    </GlowCardHeader>
                    <GlowCardContent className="flex-1 flex flex-col justify-end space-y-4">
                      {pricingOptions.length > 0 ? (
                        <div className="space-y-2">
                          {pricingOptions.map((opt) => (
                            <div key={opt.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/20 transition-all duration-300">
                              <div>
                                <span className="text-sm font-medium">{opt.label}</span>
                                <span className="text-primary font-bold ml-2 glow-text">${opt.price.toFixed(2)}</span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addToCart(product.id, opt.id, opt.name)}
                                disabled={owned || addingToCart === opt.id || product.is_maintenance}
                                className="gap-1 transition-all duration-300"
                              >
                                {addingToCart === opt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No pricing available</p>
                      )}

                      {product.build_version && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> v{product.build_version}
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
