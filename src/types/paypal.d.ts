declare global {
  interface Window {
    paypal?: {
      Buttons: (options: Record<string, unknown>) => { render: (container: HTMLElement) => void };
    };
  }
}

export {};

