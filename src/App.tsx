import { useEffect } from "react";
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
import EmployeeManagementPage from "./pages/EmployeeManagement";
import BulkQCApprovalsPage from "./pages/BulkQCApprovals";
import TasksPage from "./pages/Tasks";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { toast } from "sonner";

// Configure QueryClient with retry limits and timeouts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 30000,
      // Global error handler for queries
      meta: {
        errorMessage: "Failed to load data",
      },
    },
  },
});

const App = () => {
  // Global unhandled rejection handler — prevents blank white screen
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[Global] Unhandled rejection:", event.reason);
      // Don't toast for auth refresh errors (they're expected when offline)
      const msg = String(event.reason?.message || event.reason || "");
      if (!msg.includes("Failed to fetch") && !msg.includes("refresh_token")) {
        toast.error("An unexpected error occurred. Please try again.");
      }
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
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
                <Route path="tasks" element={<TasksPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="products" element={<ProductsDatabase />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route
                  path="employee-management"
                  element={
                    <ProtectedRoute requireMasterAdmin>
                      <EmployeeManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="bulk-qc-approvals"
                  element={
                    <ProtectedRoute requireMasterAdmin>
                      <BulkQCApprovalsPage />
                    </ProtectedRoute>
                  }
                />
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
};

export default App;
