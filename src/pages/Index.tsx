import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeCard } from "@/components/dashboard/EmployeeCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { PaymentChart } from "@/components/dashboard/PaymentChart";
import { SalesTable } from "@/components/dashboard/SalesTable";
import { ShoppingCart, DollarSign, CheckCircle, Wallet } from "lucide-react";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-1 flex-col">
        <DashboardHeader onMenuToggle={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Page Title */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
              <p className="text-muted-foreground">Current Month Sales Summary</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Sales"
                value="18"
                icon={ShoppingCart}
                variant="primary"
                trend={{ value: "12%", positive: true }}
              />
              <StatCard
                title="Total Revenue"
                value="₹6,84,797"
                icon={DollarSign}
                variant="info"
                trend={{ value: "8%", positive: true }}
              />
              <StatCard
                title="Received"
                value="₹3,64,903"
                icon={CheckCircle}
                variant="success"
                trend={{ value: "15%", positive: true }}
              />
              <StatCard
                title="Balance"
                value="₹3,19,894"
                icon={Wallet}
                variant="warning"
                trend={{ value: "3%", positive: false }}
              />
            </div>

            {/* Employee Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <EmployeeCard
                name="Akash Parashar"
                initials="AP"
                revenue="₹3,16,358"
                sales={5}
                balance="₹2,44,850"
                color="blue"
              />
              <EmployeeCard
                name="Smruti Ranjan Nayak"
                initials="SN"
                revenue="₹1,85,349"
                sales={7}
                balance="₹5,460"
                color="emerald"
              />
              <EmployeeCard
                name="Mandeep Samal"
                initials="MS"
                revenue="₹1,83,090"
                sales={6}
                balance="₹69,584"
                color="amber"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              <SalesChart />
              <PaymentChart />
            </div>

            {/* Sales Table */}
            <SalesTable />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
