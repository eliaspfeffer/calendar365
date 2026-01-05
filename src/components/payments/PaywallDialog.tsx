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
  const [isRendering, setIsRendering] = useState(false);
  const paypalClientId = (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined)?.trim() ?? "";

  const canPay = useMemo(() => isSupabaseConfigured && Boolean(paypalClientId), [paypalClientId]);

  useEffect(() => {
    if (!open) return;
    if (!canPay) return;
    if (!containerRef.current) return;
    if (isRendering) return;

    let cancelled = false;
    setIsRendering(true);

    (async () => {
      try {
        await loadPayPalSdk(paypalClientId);
        if (cancelled) return;
        if (!window.paypal?.Buttons) throw new Error("PayPal SDK not available");
        if (!containerRef.current) return;

        containerRef.current.innerHTML = "";

        window.paypal.Buttons({
          createOrder: async () => {
            const { data, error } = await supabase.functions.invoke("paypal-create-order", { body: {} });
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
            toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
          },
        }).render(containerRef.current);
      } catch (err) {
        console.error(err);
        toast({
          title: "Payments not configured",
          description: "Missing PayPal/Supabase configuration.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();

    return () => {
      cancelled = true;
      setIsRendering(false);
    };
  }, [open, canPay, paypalClientId, toast, onPaid, onOpenChange, isRendering]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Support the app</AlertDialogTitle>
          <AlertDialogDescription>
            This took a lot of work to do this, please support me with 4 USD (less than a coffee) to be able to use it
            more intense ☕️
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-4 space-y-3">
          {canPay ? (
            <div ref={containerRef} />
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
