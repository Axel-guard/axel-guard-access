import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import SalesPage from "./pages/Sales";
import CurrentMonthSalesPage from "./pages/CurrentMonthSales";
import LeadsPage from "./pages/Leads";
import InventoryPage from "./pages/Inventory";
import QualityCheckPage from "./pages/QualityCheck";
import DispatchPage from "./pages/Dispatch";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import BalancePaymentsPage from "./pages/BalancePayments";
import PricingPage from "./pages/Pricing";
import ProductsDatabase from "./pages/ProductsDatabase";
import UserManagement from "./pages/UserManagement";
import RenewalPage from "./pages/Renewal";
import QuotationsPage from "./pages/Quotations";
import QuotationApprovalsPage from "./pages/QuotationApprovals";
import CustomerDetailsPage from "./pages/CustomerDetails";
import { DashboardLayout } from "./components/layout/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Index />} />
              <Route path="current-month-sales" element={<CurrentMonthSalesPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="quotation-approvals" element={<QuotationApprovalsPage />} />
              <Route path="balance-payments" element={<BalancePaymentsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="customer-details" element={<CustomerDetailsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="quality-check" element={<QualityCheckPage />} />
              <Route path="dispatch" element={<DispatchPage />} />
              <Route path="renewal" element={<RenewalPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="products" element={<ProductsDatabase />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route
                path="user-management"
                element={
                  <ProtectedRoute requireMasterAdmin>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
