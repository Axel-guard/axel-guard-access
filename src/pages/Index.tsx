import { useState } from "react";
import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard";
import { EmployeePerformanceCard } from "@/components/dashboard/EmployeePerformanceCard";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";
import { DateFilterDropdown } from "@/components/dashboard/DateFilterDropdown";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { PaymentChart } from "@/components/dashboard/PaymentChart";
import { SalesTable } from "@/components/dashboard/SalesTable";
import { InventoryAlertCard } from "@/components/dashboard/InventoryAlertCard";
import { CourierChart } from "@/components/dashboard/CourierChart";
import { ProductCategoryChart } from "@/components/dashboard/ProductCategoryChart";
import { ShoppingCart, DollarSign, CheckCircle, Wallet, Package, Truck } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useSales";
import { useInventorySummary } from "@/hooks/useInventory";
import { useShipmentsSummary } from "@/hooks/useShipments";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [dateFilter, setDateFilter] = useState("this-month");
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: inventorySummary } = useInventorySummary();
  const { data: shipmentsSummary } = useShipmentsSummary();

  const employeeColors: Record<string, "blue" | "emerald" | "amber"> = {
    "Akash Parashar": "blue",
    "Smruti Ranjan Nayak": "emerald",
    "Mandeep Samal": "amber",
  };

  const formatCurrency = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString()}`;
  };

  // Get current month name for display
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-[14px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{currentMonthName} Summary</p>
        </div>
        <DateFilterDropdown value={dateFilter} onValueChange={setDateFilter} />
      </div>

      {/* Quick Actions */}
      <QuickActionsBar />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <PremiumStatCard
          title="Total Sales"
          value={String(summary?.totalSales || 0)}
          icon={ShoppingCart}
          variant="primary"
          trend={{ value: 12, positive: true }}
        />
        <PremiumStatCard
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue || 0)}
          icon={DollarSign}
          variant="info"
          trend={{ value: 8, positive: true }}
        />
        <PremiumStatCard
          title="Received"
          value={formatCurrency(summary?.totalReceived || 0)}
          icon={CheckCircle}
          variant="success"
          trend={{ value: 15, positive: true }}
        />
        <PremiumStatCard
          title="Balance"
          value={formatCurrency(summary?.totalBalance || 0)}
          icon={Wallet}
          variant="warning"
          trend={{ value: 5, positive: false }}
        />
        <PremiumStatCard
          title="In Stock"
          value={String(inventorySummary?.inStock || 0)}
          icon={Package}
          variant="info"
          subtitle="Live inventory"
        />
        <PremiumStatCard
          title="Shipments"
          value={String(shipmentsSummary?.totalShipments || 0)}
          icon={Truck}
          variant="success"
          subtitle="This month"
        />
      </div>

      {/* Employee Performance Cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Employee Performance</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {summary?.employeeStats &&
            Object.entries(summary.employeeStats).map(([name, stats]) => (
              <EmployeePerformanceCard
                key={name}
                name={name}
                initials={name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
                revenue={formatCurrency(stats.revenue)}
                sales={stats.sales}
                balance={formatCurrency(stats.balance)}
                target={500000}
                color={employeeColors[name] || "blue"}
              />
            ))}
          {(!summary?.employeeStats || Object.keys(summary.employeeStats).length === 0) && (
            <>
              <EmployeePerformanceCard
                name="Akash Parashar"
                initials="AP"
                revenue="₹0"
                sales={0}
                balance="₹0"
                target={500000}
                color="blue"
              />
              <EmployeePerformanceCard
                name="Smruti Ranjan Nayak"
                initials="SN"
                revenue="₹0"
                sales={0}
                balance="₹0"
                target={500000}
                color="emerald"
              />
              <EmployeePerformanceCard
                name="Mandeep Samal"
                initials="MS"
                revenue="₹0"
                sales={0}
                balance="₹0"
                target={500000}
                color="amber"
              />
            </>
          )}
        </div>
      </div>

      {/* Charts Grid - 2x2 Layout */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Analytics</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <SalesChart />
          <PaymentChart />
        </div>
      </div>

      {/* Second Row Charts + Inventory */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CourierChart />
        <ProductCategoryChart />
        <InventoryAlertCard />
      </div>

      {/* Sales Table */}
      <SalesTable />
    </div>
  );
};

export default Index;
