import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

import CurrentMonthSalesPage from "./pages/CurrentMonthSales";
import LeadsPage from "./pages/Leads";
import InventoryPage from "./pages/Inventory";
import QualityCheckPage from "./pages/QualityCheck";
import DispatchPage from "./pages/Dispatch";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import BalancePaymentsPage from "./pages/BalancePayments";
import PricingPage from "./pages/Pricing";
import { DashboardLayout } from "./components/layout/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Index />} />
            <Route path="current-month-sales" element={<CurrentMonthSalesPage />} />
            
            <Route path="balance-payments" element={<BalancePaymentsPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="quality-check" element={<QualityCheckPage />} />
            <Route path="dispatch" element={<DispatchPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
