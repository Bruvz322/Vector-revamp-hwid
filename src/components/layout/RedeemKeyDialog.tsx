import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

const EDGE_FUNCTION_NAME = 'hwid-api';

interface RedeemKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RedeemKeyDialog({ open, onOpenChange }: RedeemKeyDialogProps) {
  // TODO: `apiKey` is a placeholder. Swap this for whatever your auth context
  // actually exposes to authenticate calls to the edge function — the same
  // token your app already sends as `Authorization: Bearer <token>` for the
  // other protected endpoints (user/products, download/:id, etc.).
  const { apiKey } = useAuth() as { apiKey?: string };

  const [keyValue, setKeyValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRedeem = async () => {
    if (!keyValue.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        `${EDGE_FUNCTION_NAME}/keys/redeem`,
        {
          body: { key: keyValue.trim() },
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
        }
      );

      if (error || data?.error) {
        setResult({
          type: 'error',
          message: data?.error || error?.message || 'Failed to redeem key.',
        });
        return;
      }

      setResult({
        type: 'success',
        message: `Redeemed ${data.product_name} (${data.subscription_type})${
          data.expires_at
            ? ` — expires ${new Date(data.expires_at).toLocaleDateString()}`
            : ' — lifetime access'
        }.`,
      });
      setKeyValue('');
    } catch {
      setResult({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    onOpenChange(next);
    if (!next) {
      setKeyValue('');
      setResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Redeem Product Key
          </DialogTitle>
          <DialogDescription>
            Enter your key below to add the product to your account.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="VECTOR-XXXXX-XXXXX-XXXXX-XXXXX"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value.toUpperCase())}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRedeem();
          }}
          autoFocus
        />

        {result && (
          <div
            className={`flex items-start gap-2 text-sm rounded-md p-3 ${
              result.type === 'success'
                ? 'bg-green-500/10 text-green-500'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {result.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleRedeem} disabled={loading || !keyValue.trim()} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Redeem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
