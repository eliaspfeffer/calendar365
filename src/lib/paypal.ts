let paypalSdkLoading: Promise<void> | null = null;

function paypalSdkSrc(clientId: string) {
  const url = new URL("https://www.paypal.com/sdk/js");
  url.searchParams.set("client-id", clientId);
  url.searchParams.set("currency", "USD");
  url.searchParams.set("intent", "capture");
  return url.toString();
}

export function loadPayPalSdk(clientId: string) {
  if (typeof window === "undefined") return Promise.resolve();
  if (!clientId) return Promise.reject(new Error("Missing PayPal client id"));
  if ((window as unknown as { paypal?: unknown }).paypal) return Promise.resolve();
  if (paypalSdkLoading) return paypalSdkLoading;

  paypalSdkLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load PayPal SDK")));
      return;
    }

    const script = document.createElement("script");
    script.src = paypalSdkSrc(clientId);
    script.async = true;
    script.defer = true;
    script.dataset.paypalSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PayPal SDK"));
    document.head.appendChild(script);
  });

  return paypalSdkLoading;
}

