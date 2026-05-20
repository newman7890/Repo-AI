import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Welcome from "./pages/Welcome";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

// Lazy-load non-landing routes so the initial bundle stays small
const Index = lazy(() => import("./pages/Index"));
const FaceSwap = lazy(() => import("./pages/FaceSwap"));
const DesignerStudio = lazy(() => import("./pages/DesignerStudio"));
const VideoStudio = lazy(() => import("./pages/VideoStudio"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Withdraw = lazy(() => import("./pages/Withdraw"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/face-swap" element={<ProtectedRoute><FaceSwap /></ProtectedRoute>} />
              <Route path="/designer" element={<ProtectedRoute><DesignerStudio /></ProtectedRoute>} />
              <Route path="/referrals" element={<AdminRoute><Referrals /></AdminRoute>} />
              <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
