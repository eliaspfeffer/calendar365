import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Invite from "./pages/Invite";
import PublicShare from "./pages/PublicShare";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { LegalLinks } from "./components/legal/LegalLinks";
import { LegalModal } from "./components/legal/LegalModal";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const isLegalRoute = location.pathname === "/imprint" || location.pathname === "/privacy";
  const backgroundLocation = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;
  const routesLocation = (backgroundLocation as never) ?? (isLegalRoute ? ({ pathname: "/" } as never) : location);

  return (
    <>
      <LegalLinks />
      <Routes location={routesLocation}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/invite/:token" element={<Invite />} />
        <Route path="/s/:slug" element={<PublicShare />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {isLegalRoute && (
        <Routes>
          <Route path="/imprint" element={<LegalModal kind="imprint" />} />
          <Route path="/privacy" element={<LegalModal kind="privacy" />} />
        </Routes>
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
