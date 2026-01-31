import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeCard } from "@/components/dashboard/EmployeeCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { PaymentChart } from "@/components/dashboard/PaymentChart";
import { SalesTable } from "@/components/dashboard/SalesTable";
import { InventoryStatusChart } from "@/components/dashboard/InventoryStatusChart";
import { CourierChart } from "@/components/dashboard/CourierChart";
import { ProductCategoryChart } from "@/components/dashboard/ProductCategoryChart";
import { ShoppingCart, DollarSign, CheckCircle, Wallet, Package, Truck } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useSales";
import { useInventorySummary } from "@/hooks/useInventory";
import { useShipmentsSummary } from "@/hooks/useShipments";
import { Skeleton } from "@/components/ui/skeleton";
const Index = () => {
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground">Current Month Sales Summary</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          title="Total Sales"
          value={String(summary?.totalSales || 0)}
          icon={ShoppingCart}
          variant="primary"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue || 0)}
          icon={DollarSign}
          variant="info"
        />
        <StatCard
          title="Received"
          value={formatCurrency(summary?.totalReceived || 0)}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Balance"
          value={formatCurrency(summary?.totalBalance || 0)}
          icon={Wallet}
          variant="warning"
        />
        <StatCard
          title="In Stock"
          value={String(inventorySummary?.inStock || 0)}
          icon={Package}
          variant="info"
        />
        <StatCard
          title="Shipments"
          value={String(shipmentsSummary?.totalShipments || 0)}
          icon={Truck}
          variant="success"
        />
      </div>

      {/* Employee Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {summary?.employeeStats &&
          Object.entries(summary.employeeStats).map(([name, stats]) => (
            <EmployeeCard
              key={name}
              name={name}
              initials={name
                .split(" ")
                .map((n) => n[0])
                .join("")}
              revenue={formatCurrency(stats.revenue)}
              sales={stats.sales}
              balance={formatCurrency(stats.balance)}
              color={employeeColors[name] || "blue"}
            />
          ))}
        {(!summary?.employeeStats || Object.keys(summary.employeeStats).length === 0) && (
          <>
            <EmployeeCard
              name="Akash Parashar"
              initials="AP"
              revenue="₹0"
              sales={0}
              balance="₹0"
              color="blue"
            />
            <EmployeeCard
              name="Smruti Ranjan Nayak"
              initials="SN"
              revenue="₹0"
              sales={0}
              balance="₹0"
              color="emerald"
            />
            <EmployeeCard
              name="Mandeep Samal"
              initials="MS"
              revenue="₹0"
              sales={0}
              balance="₹0"
              color="amber"
            />
          </>
        )}
      </div>

      {/* Charts Grid - Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SalesChart />
        <PaymentChart />
      </div>

      {/* Charts Grid - Row 2: New charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <InventoryStatusChart />
        <CourierChart />
        <ProductCategoryChart />
      </div>

      {/* Sales Table */}
      <SalesTable />
    </div>
  );
};

export default Index;
