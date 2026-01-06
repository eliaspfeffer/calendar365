import { useEffect, useMemo, useRef, useState } from "react";
import { HeartHandshake, Sparkles, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { loadPayPalSdk } from "@/lib/paypal";
import { toHelpfulEdgeFunctionError } from "@/lib/supabaseEdgeErrors";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked?: () => void;
};

const presetAmounts = ["4", "10", "25"];

export function DonateDialog({ open, onOpenChange, onUnlocked }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [amountInput, setAmountInput] = useState("4");
  const [isUnlockingFree, setIsUnlockingFree] = useState(false);
  const paypalClientId = (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined)?.trim() ?? "";

  const canPay = useMemo(
    () => isSupabaseConfigured && Boolean(paypalClientId) && Boolean(user),
    [paypalClientId, user],
  );

  const amountCents = useMemo(() => {
    const normalized = amountInput.replace(",", ".").trim();
    if (!normalized) return 0;
    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.round(parsed * 100);
  }, [amountInput]);

  const amountValue = useMemo(() => (amountCents / 100).toFixed(2), [amountCents]);

  useEffect(() => {
    if (!open) return;
    setIsUnlockingFree(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!canPay) return;
    if (!containerRef.current) return;

    if (amountCents <= 0) {
      containerRef.current.innerHTML = "";
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadPayPalSdk(paypalClientId);
        if (cancelled) return;
        if (!window.paypal?.Buttons) throw new Error("PayPal SDK not available");
        if (!containerRef.current) return;

        containerRef.current.innerHTML = "";

        window.paypal
          .Buttons({
            createOrder: async () => {
              const { data, error } = await supabase.functions.invoke("paypal-create-order", {
                body: { amountCents },
              });
              if (error) throw new Error(await toHelpfulEdgeFunctionError(error));
              const orderId = (data as { orderId?: string } | null | undefined)?.orderId;
              if (!orderId) throw new Error("Missing order id");
              return orderId;
            },
            onApprove: async (data: unknown) => {
              const orderId = (data as { orderID?: string } | null | undefined)?.orderID;
              if (!orderId) throw new Error("Missing order id");
              const { error } = await supabase.functions.invoke("paypal-capture-order", { body: { orderId } });
              if (error) throw new Error(await toHelpfulEdgeFunctionError(error));
              toast({ title: "Thank you!", description: "Premium unlocked (unlimited notes)." });
              onUnlocked?.();
              onOpenChange(false);
            },
            onError: (err: unknown) => {
              console.error("PayPal error", err);
              const message = (err as { message?: unknown } | null | undefined)?.message;
              toast({
                title: "Payment failed",
                description: typeof message === "string" && message.trim() ? message.trim() : "Please try again.",
                variant: "destructive",
              });
            },
          })
          .render(containerRef.current);
      } catch (err) {
        console.error(err);
        toast({
          title: "Payments not configured",
          description:
            (err as { message?: unknown } | null | undefined)?.message && typeof (err as { message?: unknown }).message === "string"
              ? (err as { message: string }).message
              : "Missing PayPal/Supabase configuration.",
          variant: "destructive",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, canPay, paypalClientId, toast, onUnlocked, onOpenChange, amountCents]);

  const unlockForFree = async () => {
    if (isUnlockingFree) return;
    setIsUnlockingFree(true);
    try {
      const { error } = await supabase.functions.invoke("entitlement-grant-free", { body: {} });
      if (error) throw new Error(await toHelpfulEdgeFunctionError(error));
      toast({ title: "Unlocked", description: "Premium unlocked (unlimited notes)." });
      onUnlocked?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      const message = (err as { message?: unknown } | null | undefined)?.message;
      toast({
        title: "Couldn’t unlock",
        description: typeof message === "string" && message.trim() ? message.trim() : "Please try again.",
        variant: "destructive",
      });
      setIsUnlockingFree(false);
    }
  };

  const signIn = () => {
    onOpenChange(false);
    navigate("/auth");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-primary/15 via-background to-background p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <DialogTitle className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <HeartHandshake className="h-5 w-5" />
                  </span>
                  Donate & unlock Premium
                </DialogTitle>
                <DialogDescription>
                  Support the project with a one-time donation. After checkout, Premium is unlocked automatically (unlimited notes).
                </DialogDescription>
              </div>
              <div className="hidden items-center gap-1 rounded-full border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground sm:flex">
                <Sparkles className="h-3.5 w-3.5" /> One-time
              </div>
            </div>

            <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Unlock Premium (lifetime)
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Unlimited notes
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Helps fund improvements
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-6 pt-4">
          {!user ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Sign in to donate and unlock Premium on your account.</div>
              <Button onClick={signIn} className="w-full">
                Sign in
              </Button>
            </div>
          ) : !canPay ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Payments are not set up yet. Add `VITE_PAYPAL_CLIENT_ID` and configure Supabase + PayPal secrets.
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="donate-amount">Amount (USD)</Label>
                  <div className="flex items-center gap-2">
                    {presetAmounts.map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        size="sm"
                        variant={amountInput.trim() === amt ? "secondary" : "outline"}
                        onClick={() => setAmountInput(amt)}
                      >
                        ${amt}
                      </Button>
                    ))}
                  </div>
                </div>
                <Input
                  id="donate-amount"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="4.00"
                />
                <div className="text-xs text-muted-foreground">Current: ${amountValue}</div>
              </div>

              {amountCents <= 0 ? (
                <Button type="button" className="w-full" onClick={unlockForFree} disabled={isUnlockingFree}>
                  Unlock Premium
                </Button>
              ) : (
                <div ref={containerRef} className="min-h-10" />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

