import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadPayPalSdk } from "@/lib/paypal";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: Record<string, unknown>) => { render: (container: HTMLElement) => void };
    };
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
};

export function PaywallDialog({ open, onOpenChange, onPaid }: Props) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [amountInput, setAmountInput] = useState("4");
  const [isUnlockingFree, setIsUnlockingFree] = useState(false);
  const paypalClientId = (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined)?.trim() ?? "";

  const canPay = useMemo(() => isSupabaseConfigured && Boolean(paypalClientId), [paypalClientId]);

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

        window.paypal.Buttons({
          createOrder: async () => {
            const { data, error } = await supabase.functions.invoke("paypal-create-order", {
              body: { amountCents },
            });
            if (error) throw error;
            const orderId = (data as { orderId?: string } | null | undefined)?.orderId;
            if (!orderId) throw new Error("Missing order id");
            return orderId;
          },
          onApprove: async (data: unknown) => {
            const orderId = (data as { orderID?: string } | null | undefined)?.orderID;
            if (!orderId) throw new Error("Missing order id");
            const { error } = await supabase.functions.invoke("paypal-capture-order", { body: { orderId } });
            if (error) throw error;
            toast({ title: "Thanks for supporting me!", description: "Unlocked: unlimited notes." });
            onPaid();
            onOpenChange(false);
          },
          onError: (err: unknown) => {
            console.error("PayPal error", err);
            const message =
              (err as { message?: unknown } | null | undefined)?.message && typeof (err as { message?: unknown }).message === "string"
                ? (err as { message: string }).message
                : "Please try again.";
            toast({ title: "Payment failed", description: message, variant: "destructive" });
          },
        }).render(containerRef.current);
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
  }, [open, canPay, paypalClientId, toast, onPaid, onOpenChange, amountCents]);

  useEffect(() => {
    if (!open) return;
    setIsUnlockingFree(false);
  }, [open]);

  const unlockForFree = async () => {
    if (isUnlockingFree) return;
    setIsUnlockingFree(true);
    try {
      const { error } = await supabase.functions.invoke("entitlement-grant-free", { body: {} });
      if (error) throw error;
      toast({ title: "Unlocked", description: "Unlimited notes enabled." });
      onPaid();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      const message =
        (err as { message?: unknown } | null | undefined)?.message && typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Please try again.";
      toast({ title: "Couldn’t unlock", description: message, variant: "destructive" });
      setIsUnlockingFree(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Support the app</AlertDialogTitle>
          <AlertDialogDescription>
            This took a lot of work to do this. If you want, you can support me with a one-time payment (suggested: 4
            USD, less than a coffee) ☕️ You can choose any amount — even 0 USD.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Amount (USD)</Label>
            <Input
              id="pay-amount"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="4.00"
            />
            <div className="text-xs text-muted-foreground">Current: ${amountValue}</div>
          </div>

          {canPay ? (
            <>
              {amountCents <= 0 ? (
                <button
                  type="button"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  onClick={unlockForFree}
                  disabled={isUnlockingFree}
                >
                  Unlock for free
                </button>
              ) : (
                <div ref={containerRef} />
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Payments are not set up yet. Add `VITE_PAYPAL_CLIENT_ID` and configure Supabase + PayPal secrets.
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
