import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import AuthLayout from '@/components/layout/AuthLayout';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Loader2, ShoppingCart, ExternalLink } from 'lucide-react';
import type { CartItem, Product, ProductPaymentMethod, PricingPlan } from '@/lib/types';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ProductWithMethods extends Product {
  payment_methods: ProductPaymentMethod[];
}

interface CartItemWithProduct extends CartItem {
  product: ProductWithMethods;
}

export default function Cart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [productPlans, setProductPlans] = useState<Record<string, PricingPlan[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) fetchCart();
  }, [user]);

  const fetchCart = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('cart_items')
      .select(`*, product:products(*, payment_methods:product_payment_methods(*))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const cartItems = data as unknown as CartItemWithProduct[];
      setItems(cartItems);

      const productIds = [...new Set(cartItems.map((i) => i.product_id))];
      if (productIds.length > 0) {
        const { data: settings } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', productIds.map((id) => `pricing_plans_${id}`));

        const plans: Record<string, PricingPlan[]> = {};
        if (settings) {
          for (const s of settings) {
            const productId = s.key.replace('pricing_plans_', '');
            try { plans[productId] = JSON.parse(s.value); } catch { /* skip */ }
          }
        }
        setProductPlans(plans);

        const defaults: Record<string, string> = {};
        cartItems.forEach((item) => {
          const methods = item.product.payment_methods?.filter((m) => m.is_active) || [];
          if (methods.length > 0) {
            defaults[item.id] = methods[0].id;
          } else if (getPaymentUrlWithPlans(item, plans)) {
            defaults[item.id] = 'legacy';
          }
        });
        setSelectedMethods(defaults);
      }
    }
    setIsLoading(false);
  };

  const getPlanForItem = (item: CartItemWithProduct, plans?: Record<string, PricingPlan[]>): PricingPlan | null => {
    const planMap = plans ?? productPlans;
    if (!item.plan_id) return null;
    const productPlanList = planMap[item.product_id] || [];
    return productPlanList.find((p) => p.id === item.plan_id) || null;
  };

  const getPrice = (item: CartItemWithProduct): number => {
    const plan = getPlanForItem(item);
    if (plan) return plan.price;
    const product = item.product;
    switch (item.subscription_type) {
      case 'week': return product.week_price || 0;
      case 'month': return product.month_price || 0;
      case 'lifetime': return product.lifetime_price || 0;
      default: return 0;
    }
  };

  const getPaymentUrlWithPlans = (item: CartItemWithProduct, plans: Record<string, PricingPlan[]>): string | null => {
    const plan = getPlanForItem(item, plans);
    if (plan) return plan.payment_url || null;
    const product = item.product;
    switch (item.subscription_type) {
      case 'week': return product.week_payment_url;
      case 'month': return product.month_payment_url;
      case 'lifetime': return product.lifetime_payment_url;
      default: return null;
    }
  };

  const getPaymentUrl = (item: CartItemWithProduct): string | null => {
    return getPaymentUrlWithPlans(item, productPlans);
  };

  const getPlanLabel = (item: CartItemWithProduct): string => {
    const plan = getPlanForItem(item);
    if (plan) return plan.name;
    return item.subscription_type;
  };

  const removeFromCart = async (itemId: string) => {
    setRemovingId(itemId);
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to remove item.', variant: 'destructive' });
    } else {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast({ title: 'Removed', description: 'Item removed from cart.' });
    }
    setRemovingId(null);
  };

  const total = items.reduce((sum, item) => sum + getPrice(item), 0);

  const handleCheckout = async (item: CartItemWithProduct) => {
    const selectedMethodId = selectedMethods[item.id];
    let paymentUrl: string | null = null;

    if (selectedMethodId === 'legacy') {
      paymentUrl = getPaymentUrl(item);
    } else {
      const method = item.product.payment_methods?.find((m) => m.id === selectedMethodId);
      paymentUrl = method?.redirect_url || null;
    }

    if (paymentUrl) {
      await supabase.from('audit_logs').insert({
        action_type: 'purchase_attempt',
        action_category: 'purchase',
        user_id: user?.id,
        details: {
          product_id: item.product_id,
          product_name: item.product.name,
          subscription_type: item.subscription_type,
          plan_id: item.plan_id || null,
          plan_label: getPlanLabel(item),
          price: getPrice(item),
          payment_method: selectedMethodId,
        },
      });
      window.open(paymentUrl, '_blank');
    } else {
      toast({ title: 'Payment Not Available', description: 'Payment is not configured for this product. Please contact support.', variant: 'destructive' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold glow-text">Shopping Cart</h1>
          <p className="text-muted-foreground mt-1">Review and complete your purchase</p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="relative">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full animate-pulse-glow" />
            </div>
          </div>
        ) : items.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlowCard>
              <GlowCardContent className="py-12 text-center">
                <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Your cart is empty</p>
                <Link to="/dashboard"><Button>Browse Products</Button></Link>
              </GlowCardContent>
            </GlowCard>
          </motion.div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div className="lg:col-span-2 space-y-4" variants={containerVariants} initial="hidden" animate="show">
              {items.map((item) => {
                const methods = item.product.payment_methods?.filter((m) => m.is_active) || [];
                const legacyUrl = getPaymentUrl(item);
                const hasPaymentOptions = methods.length > 0 || legacyUrl;

                return (
                  <motion.div key={item.id} variants={itemVariants}>
                    <GlowCard>
                      <GlowCardContent className="p-4">
                        <div className="flex gap-4">
                          {item.product.image_url && (
                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-border/50 bg-secondary shrink-0">
                              <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg">{item.product.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">Duration: {getPlanLabel(item)}</p>
                            <p className="text-xl font-bold text-primary mt-2 glow-text">${getPrice(item).toFixed(2)}</p>

                            {hasPaymentOptions && (
                              <div className="mt-3">
                                <label className="text-xs text-muted-foreground">Payment Method</label>
                                <Select
                                  value={selectedMethods[item.id] || ''}
                                  onValueChange={(value) => setSelectedMethods((prev) => ({ ...prev, [item.id]: value }))}
                                >
                                  <SelectTrigger className="bg-secondary/50 h-8 mt-1 border-border/50">
                                    <SelectValue placeholder="Select payment" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {methods.map((method) => (
                                      <SelectItem key={method.id} value={method.id}>
                                        <span className="capitalize">{method.method_name}</span>
                                      </SelectItem>
                                    ))}
                                    {legacyUrl && methods.length > 0 && <SelectItem value="legacy">Default Payment</SelectItem>}
                                    {legacyUrl && methods.length === 0 && <SelectItem value="legacy">Pay Now</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button variant="outline" size="icon" onClick={() => removeFromCart(item.id)} disabled={removingId === item.id} className="border-border/50 hover:border-destructive/50 hover:text-destructive transition-all">
                              {removingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" onClick={() => handleCheckout(item)} disabled={!hasPaymentOptions} className="gap-1 shadow-md shadow-primary/20">
                              <ExternalLink className="w-4 h-4" />Pay
                            </Button>
                          </div>
                        </div>
                      </GlowCardContent>
                    </GlowCard>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlowCard className="sticky top-24">
                <GlowCardHeader><GlowCardTitle>Order Summary</GlowCardTitle></GlowCardHeader>
                <GlowCardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-2">{item.product.name} ({getPlanLabel(item)})</span>
                      <span>${getPrice(item).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border/50 pt-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span className="text-primary glow-text">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select a payment method and click &quot;Pay&quot; on each item to complete your purchase. After payment, your subscription will be activated.
                  </p>
                </GlowCardContent>
              </GlowCard>
            </motion.div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
