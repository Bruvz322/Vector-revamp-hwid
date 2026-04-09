import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Product, PricingPlan } from '@/lib/types';
import { Plus, Edit, Trash2, Loader2, Package, Save, X } from 'lucide-react';

interface PricingPlanDraft {
  id: string;
  name: string;
  price: string;
  duration_days: string;
  payment_url: string;
  is_lifetime: boolean;
}

function generateId() {
  return crypto.randomUUID();
}

const emptyPlan: PricingPlanDraft = {
  id: '',
  name: '',
  price: '',
  duration_days: '',
  payment_url: '',
  is_lifetime: false,
};

const emptyProduct: Partial<Product> = {
  name: '',
  description: '',
  image_url: '',
  is_active: true,
  is_maintenance: false,
  week_price: null,
  month_price: null,
  lifetime_price: null,
  week_payment_url: '',
  month_payment_url: '',
  lifetime_payment_url: '',
  build_version: '',
  download_url: '',
  driver_url: '',
  global_compensation_hours: 2,
  is_manual_payment_only: false,
  discord_required_message: '',
};

export default function ProductManagement() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PricingPlanDraft[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data as Product[]);
    setIsLoading(false);
  };

  const loadPricingPlans = async (productId: string) => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', `pricing_plans_${productId}`)
      .maybeSingle();

    if (data?.value) {
      try {
        const plans = JSON.parse(data.value) as PricingPlan[];
        setPricingPlans(plans.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price.toString(),
          duration_days: p.duration_days.toString(),
          payment_url: p.payment_url,
          is_lifetime: p.is_lifetime,
        })));
        return;
      } catch { /* fall through */ }
    }
    setPricingPlans([]);
  };

  const openEditor = async (product?: Product) => {
    if (product) {
      setEditProduct(product);
      setEditingId(product.id);
      await loadPricingPlans(product.id);
    } else {
      setEditProduct({ ...emptyProduct });
      setEditingId(null);
      setPricingPlans([]);
    }
    setShowEditor(true);
  };

  const addPlan = () => {
    setPricingPlans([...pricingPlans, { ...emptyPlan, id: generateId() }]);
  };

  const removePlan = (id: string) => {
    setPricingPlans(pricingPlans.filter((p) => p.id !== id));
  };

  const updatePlan = (id: string, field: keyof PricingPlanDraft, value: string | boolean) => {
    setPricingPlans(pricingPlans.map((p) =>
      p.id === id ? { ...p, [field]: value, ...(field === 'is_lifetime' && value === true ? { duration_days: '0' } : {}) } : p
    ));
  };

  const saveProduct = async () => {
    if (!editProduct.name) {
      toast({ title: 'Product name required', variant: 'destructive' });
      return;
    }
    setIsSaving(true);

    try {
      const productData = {
        name: editProduct.name,
        description: editProduct.description || null,
        image_url: editProduct.image_url || null,
        is_active: editProduct.is_active ?? true,
        is_maintenance: editProduct.is_maintenance ?? false,
        week_price: editProduct.week_price || null,
        month_price: editProduct.month_price || null,
        lifetime_price: editProduct.lifetime_price || null,
        week_payment_url: editProduct.week_payment_url || null,
        month_payment_url: editProduct.month_payment_url || null,
        lifetime_payment_url: editProduct.lifetime_payment_url || null,
        build_version: editProduct.build_version || null,
        download_url: editProduct.download_url || null,
        driver_url: editProduct.driver_url || null,
        global_compensation_hours: editProduct.global_compensation_hours ?? 2,
        is_manual_payment_only: editProduct.is_manual_payment_only ?? false,
        discord_required_message: editProduct.discord_required_message || null,
      };

      let productId = editingId;

      if (editingId) {
        await supabase.from('products').update(productData).eq('id', editingId);
      } else {
        const { data } = await supabase.from('products').insert(productData).select().single();
        if (data) productId = data.id;
      }

      // Save pricing plans
      if (productId) {
        const plans: PricingPlan[] = pricingPlans
          .filter((p) => p.name && p.price)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: parseFloat(p.price) || 0,
            duration_days: parseInt(p.duration_days) || 0,
            payment_url: p.payment_url,
            is_lifetime: p.is_lifetime,
          }));

        await supabase.from('site_settings').upsert(
          {
            key: `pricing_plans_${productId}`,
            value: JSON.stringify(plans),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
      }

      toast({ title: editingId ? 'Product updated' : 'Product created' });
      setShowEditor(false);
      fetchProducts();
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from('products').delete().eq('id', id);
    await supabase.from('site_settings').delete().eq('key', `pricing_plans_${id}`);
    toast({ title: 'Product deleted' });
    fetchProducts();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Products ({products.length})</h2>
        <Button onClick={() => openEditor()} className="gap-2">
          <Plus className="w-4 h-4" /> New Product
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <GlowCard key={product.id} className="animate-fade-in">
            <GlowCardHeader>
              <GlowCardTitle className="flex items-center justify-between text-base">
                <span className="truncate">{product.name}</span>
                <div className="flex gap-1 shrink-0">
                  {product.is_active ? <Badge variant="outline" className="text-green-400">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                  {product.is_maintenance && <Badge variant="outline" className="text-yellow-400">Maint.</Badge>}
                </div>
              </GlowCardTitle>
            </GlowCardHeader>
            <GlowCardContent>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description || 'No description'}</p>
              <div className="text-xs text-muted-foreground mb-3">
                Version: {product.build_version || '—'}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditor(product)} className="gap-1">
                  <Edit className="w-3 h-3" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteProduct(product.id)} className="gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            </GlowCardContent>
          </GlowCard>
        ))}
      </div>

      {/* Product Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Product' : 'New Product'}</DialogTitle>
            <DialogDescription>Configure product details, pricing plans, and loader settings.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editProduct.name || ''} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input value={editProduct.image_url || ''} onChange={(e) => setEditProduct({ ...editProduct, image_url: e.target.value })} placeholder="https://..." className="bg-secondary/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editProduct.description || ''} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} className="bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label>Discord Required Message</Label>
                <Input value={editProduct.discord_required_message || ''} onChange={(e) => setEditProduct({ ...editProduct, discord_required_message: e.target.value })} className="bg-secondary/50" />
              </div>
            </div>

            {/* Pricing Plans */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pricing Plans</h3>
                <Button size="sm" variant="outline" onClick={addPlan} className="gap-1">
                  <Plus className="w-3 h-3" /> Add Plan
                </Button>
              </div>

              {pricingPlans.length === 0 && (
                <p className="text-sm text-muted-foreground italic py-2">No pricing plans yet. Add one to get started.</p>
              )}

              {pricingPlans.map((plan) => (
                <div key={plan.id} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{plan.name || 'Untitled Plan'}</span>
                    <Button size="sm" variant="ghost" onClick={() => removePlan(plan.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Plan Name</Label>
                      <Input
                        value={plan.name}
                        onChange={(e) => updatePlan(plan.id, 'name', e.target.value)}
                        placeholder="e.g. Daily, 3 Months, Yearly"
                        className="bg-secondary/50 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Price ($)</Label>
                      <Input
                        type="number"
                        value={plan.price}
                        onChange={(e) => updatePlan(plan.id, 'price', e.target.value)}
                        placeholder="9.99"
                        className="bg-secondary/50 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duration (days)</Label>
                      <Input
                        type="number"
                        value={plan.duration_days}
                        onChange={(e) => updatePlan(plan.id, 'duration_days', e.target.value)}
                        placeholder="30"
                        disabled={plan.is_lifetime}
                        className="bg-secondary/50 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Payment URL</Label>
                      <Input
                        value={plan.payment_url}
                        onChange={(e) => updatePlan(plan.id, 'payment_url', e.target.value)}
                        placeholder="https://..."
                        className="bg-secondary/50 h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plan.is_lifetime}
                      onCheckedChange={(v) => updatePlan(plan.id, 'is_lifetime', v)}
                    />
                    <Label className="text-xs cursor-pointer">Lifetime plan (no expiration)</Label>
                  </div>
                </div>
              ))}
            </div>

            {/* Legacy Pricing (kept for backward compatibility) */}
            <details className="group">
              <summary className="text-sm font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors">
                Legacy Pricing (Week/Month/Lifetime)
              </summary>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Week Price</Label>
                  <Input type="number" value={editProduct.week_price || ''} onChange={(e) => setEditProduct({ ...editProduct, week_price: parseFloat(e.target.value) || null })} className="bg-secondary/50" />
                  <Input value={editProduct.week_payment_url || ''} onChange={(e) => setEditProduct({ ...editProduct, week_payment_url: e.target.value })} placeholder="Payment URL" className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Month Price</Label>
                  <Input type="number" value={editProduct.month_price || ''} onChange={(e) => setEditProduct({ ...editProduct, month_price: parseFloat(e.target.value) || null })} className="bg-secondary/50" />
                  <Input value={editProduct.month_payment_url || ''} onChange={(e) => setEditProduct({ ...editProduct, month_payment_url: e.target.value })} placeholder="Payment URL" className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Lifetime Price</Label>
                  <Input type="number" value={editProduct.lifetime_price || ''} onChange={(e) => setEditProduct({ ...editProduct, lifetime_price: parseFloat(e.target.value) || null })} className="bg-secondary/50" />
                  <Input value={editProduct.lifetime_payment_url || ''} onChange={(e) => setEditProduct({ ...editProduct, lifetime_payment_url: e.target.value })} placeholder="Payment URL" className="bg-secondary/50" />
                </div>
              </div>
            </details>

            {/* Loader Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Loader Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Build Version</Label>
                  <Input value={editProduct.build_version || ''} onChange={(e) => setEditProduct({ ...editProduct, build_version: e.target.value })} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Compensation Hours</Label>
                  <Input type="number" value={editProduct.global_compensation_hours ?? 2} onChange={(e) => setEditProduct({ ...editProduct, global_compensation_hours: parseInt(e.target.value) || 0 })} className="bg-secondary/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Download URL</Label>
                <Input value={editProduct.download_url || ''} onChange={(e) => setEditProduct({ ...editProduct, download_url: e.target.value })} placeholder="https://..." className="bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label>Driver Download URL</Label>
                <Input value={editProduct.driver_url || ''} onChange={(e) => setEditProduct({ ...editProduct, driver_url: e.target.value })} placeholder="https://..." className="bg-secondary/50" />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Toggles</h3>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <Label>Active</Label>
                <Switch checked={editProduct.is_active ?? true} onCheckedChange={(v) => setEditProduct({ ...editProduct, is_active: v })} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <Label>Maintenance Mode</Label>
                <Switch checked={editProduct.is_maintenance ?? false} onCheckedChange={(v) => setEditProduct({ ...editProduct, is_maintenance: v })} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <Label>Manual Payment Only</Label>
                <Switch checked={editProduct.is_manual_payment_only ?? false} onCheckedChange={(v) => setEditProduct({ ...editProduct, is_manual_payment_only: v })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancel</Button>
            <Button onClick={saveProduct} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
