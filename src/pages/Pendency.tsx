import { useState } from "react";
import { usePendency } from "@/hooks/usePendency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CreditCard,
  Truck,
  MapPin,
  ClipboardCheck,
  AlertCircle,
  RefreshCw,
  Layers,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

type Category = "all" | "balancePayment" | "dispatchPending" | "trackingPending" | "qcPending" | "pendingTickets";

const categoryConfig = {
  balancePayment: { title: "Balance Payment", icon: CreditCard, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", route: "/balance-payments" },
  dispatchPending: { title: "Dispatch", icon: Truck, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30", route: "/dispatch?status=pending" },
  trackingPending: { title: "Tracking", icon: MapPin, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30", route: "/dispatch" },
  qcPending: { title: "QC", icon: ClipboardCheck, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30", route: "/quality-check" },
  pendingTickets: { title: "Tickets", icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30", route: "/tasks" },
} as const;

const categories: (keyof typeof categoryConfig)[] = ["balancePayment", "dispatchPending", "trackingPending", "qcPending", "pendingTickets"];

const PendencyPage = () => {
  const { counts, isLoading } = usePendency();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Category>("all");

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["all-dispatch-sales"] });
    queryClient.invalidateQueries({ queryKey: ["shipments"] });
    queryClient.invalidateQueries({ queryKey: ["dispatch-sale-items"] });
    queryClient.invalidateQueries({ queryKey: ["dispatch-inventory-status"] });
    queryClient.invalidateQueries({ queryKey: ["pendency-qc"] });
    queryClient.invalidateQueries({ queryKey: ["pendency-tickets"] });
  };

  const totalPending = counts
    ? categories.reduce((sum, c) => sum + counts[c], 0)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const visibleCategories = activeTab === "all"
    ? categories
    : [activeTab as keyof typeof categoryConfig];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Pendency Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalPending} Pending | Synced with live module data
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Category)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
            <Layers className="h-4 w-4" />
            All ({totalPending})
          </TabsTrigger>
          {categories.map((key) => {
            const cfg = categoryConfig[key];
            const Icon = cfg.icon;
            const count = counts?.[key] || 0;
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5 text-xs sm:text-sm">
                <Icon className="h-4 w-4" />
                {cfg.title} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Card Grid */}
        <TabsContent value={activeTab} className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {visibleCategories.map((key) => {
              const cfg = categoryConfig[key];
              const count = counts?.[key] || 0;
              const Icon = cfg.icon;

              return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${count > 0 ? "border-border" : "border-border/50 opacity-60"}`}
                  onClick={() => navigate(cfg.route)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${cfg.bgColor}`}>
                        <Icon className={`h-6 w-6 ${cfg.color}`} />
                      </div>
                      {count > 0 && (
                        <Badge variant="destructive" className="text-xs px-2">Pending</Badge>
                      )}
                    </div>
                    <p className={`text-3xl sm:text-4xl font-bold ${count > 0 ? cfg.color : "text-muted-foreground"}`}>
                      {count}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                      {cfg.title} Pending
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PendencyPage;
