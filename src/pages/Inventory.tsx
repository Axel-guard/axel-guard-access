import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Package, Search, Box, Truck, AlertTriangle } from "lucide-react";
import { useInventory, useInventorySummary } from "@/hooks/useInventory";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { InventoryUploadDialog } from "@/components/inventory/InventoryUploadDialog";
import { QCReportUploadDialog } from "@/components/inventory/QCReportUploadDialog";
import { InventoryEditDialog } from "@/components/inventory/InventoryEditDialog";
import { InventoryExport } from "@/components/inventory/InventoryExport";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import type { InventoryItem } from "@/hooks/useInventory";

const InventoryPage = () => {
  const { data: inventory, isLoading } = useInventory();
  const { data: summary } = useInventorySummary();
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qcFilter, setQcFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  
  // Edit dialog
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    if (!inventory) return [];
    const products = [...new Set(inventory.map((i) => i.product_name))];
    return products.sort();
  }, [inventory]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    
    return inventory.filter((item) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        item.serial_number.toLowerCase().includes(searchLower) ||
        item.product_name.toLowerCase().includes(searchLower) ||
        (item.customer_name?.toLowerCase() || "").includes(searchLower) ||
        (item.customer_city?.toLowerCase() || "").includes(searchLower) ||
        (item.order_id?.toLowerCase() || "").includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      // QC filter
      const matchesQC = qcFilter === "all" || item.qc_result === qcFilter;

      // Product filter
      const matchesProduct = productFilter === "all" || item.product_name === productFilter;

      return matchesSearch && matchesStatus && matchesQC && matchesProduct;
    });
  }, [inventory, searchTerm, statusFilter, qcFilter, productFilter]);

  // Calculate low stock (items with QC Pending or Fail)
  const lowStockCount = useMemo(() => {
    if (!inventory) return 0;
    return inventory.filter(
      (i) => i.qc_result === "Pending" || i.qc_result === "Fail"
    ).length;
  }, [inventory]);

  const handleEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditDialogOpen(true);
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setQcFilter("all");
    setProductFilter("all");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">
            Serial number tracking for all devices
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <InventoryUploadDialog />
          <QCReportUploadDialog />
          {filteredInventory.length > 0 && (
            <InventoryExport data={filteredInventory} />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Items"
          value={String(summary?.totalItems || 0)}
          icon={Box}
          variant="primary"
        />
        <StatCard
          title="In Stock"
          value={String(summary?.inStock || 0)}
          icon={Package}
          variant="success"
        />
        <StatCard
          title="Dispatched"
          value={String(summary?.dispatched || 0)}
          icon={Truck}
          variant="info"
        />
        <StatCard
          title="QC Issues"
          value={String(lowStockCount)}
          icon={AlertTriangle}
          variant={lowStockCount > 0 ? "warning" : "success"}
        />
      </div>

      {/* Search, Filter, and Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">
                Inventory Items ({filteredInventory.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search serial, product, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-72"
                />
              </div>
            </div>
            <InventoryFilters
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              qcFilter={qcFilter}
              setQcFilter={setQcFilter}
              products={uniqueProducts}
              productFilter={productFilter}
              setProductFilter={setProductFilter}
              onClearFilters={handleClearFilters}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <InventoryTable data={filteredInventory} onEdit={handleEdit} />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <InventoryEditDialog
        item={editItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
};

export default InventoryPage;
