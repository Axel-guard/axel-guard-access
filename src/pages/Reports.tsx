import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryReportSection } from "@/components/reports/InventoryReportSection";
import { DispatchReportSection } from "@/components/reports/DispatchReportSection";
import { QCReportSection } from "@/components/reports/QCReportSection";
import { SalesReportSection } from "@/components/reports/SalesReportSection";
import { EmployeePerformanceSection } from "@/components/reports/EmployeePerformanceSection";
import { QuarterlyReportSection } from "@/components/reports/QuarterlyReportSection";
import { useSearchParams } from "react-router-dom";
import { Package, Truck, ClipboardCheck, BarChart3, TrendingUp, Target, Calendar } from "lucide-react";

const ReportsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "sales";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Real-time data insights and analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-6 bg-muted/50">
          <TabsTrigger value="sales" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Sales</span>
          </TabsTrigger>
          <TabsTrigger value="employee" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Employee</span>
          </TabsTrigger>
          <TabsTrigger value="quarterly" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Quarterly</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="dispatch" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Dispatch</span>
          </TabsTrigger>
          <TabsTrigger value="qc" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">QC</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <SalesReportSection />
        </TabsContent>

        <TabsContent value="employee" className="mt-6">
          <EmployeePerformanceSection />
        </TabsContent>

        <TabsContent value="quarterly" className="mt-6">
          <QuarterlyReportSection />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryReportSection />
        </TabsContent>

        <TabsContent value="dispatch" className="mt-6">
          <DispatchReportSection />
        </TabsContent>

        <TabsContent value="qc" className="mt-6">
          <QCReportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
