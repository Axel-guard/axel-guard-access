import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Clock, ClipboardCheck } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { Skeleton } from "@/components/ui/skeleton";
import { ClickableStatCard } from "@/components/dashboard/ClickableStatCard";
import { QCReportUploadDialog } from "@/components/inventory/QCReportUploadDialog";
import { QCTable } from "@/components/qc/QCTable";
import { QCFilters } from "@/components/qc/QCFilters";
import { QCExport } from "@/components/qc/QCExport";
import { QCUpdateDialog } from "@/components/qc/QCUpdateDialog";
import type { InventoryItem } from "@/hooks/useInventory";

type CardFilter = "all" | "pass" | "fail" | "pending";

const QualityCheckPage = () => {
  const { data: inventory, isLoading } = useInventory();
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [qcFilter, setQcFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [checkedByFilter, setCheckedByFilter] = useState("all");
  
  // Card filter state (for clickable cards)
  const [activeCardFilter, setActiveCardFilter] = useState<CardFilter>("all");
  
  // QC Update Dialog state
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  // Get unique values for filters
  const uniqueProducts = useMemo(() => {
    if (!inventory) return [];
    const products = [...new Set(inventory.map((i) => i.product_name))];
    return products.sort();
  }, [inventory]);

  const uniqueCheckedBy = useMemo(() => {
    if (!inventory) return [];
    const checkers = [...new Set(inventory.filter(i => i.checked_by).map((i) => i.checked_by!))];
    return checkers.sort();
  }, [inventory]);

  // Calculate QC stats
  const qcStats = useMemo(() => {
    if (!inventory) return { total: 0, pass: 0, fail: 0, pending: 0 };
    
    const total = inventory.length;
    const pass = inventory.filter(i => {
      const result = i.qc_result?.toLowerCase() || "";
      return result.includes("pass");
    }).length;
    const fail = inventory.filter(i => {
      const result = i.qc_result?.toLowerCase() || "";
      return result.includes("fail");
    }).length;
    const pending = inventory.filter(i => {
      const result = i.qc_result?.toLowerCase() || "";
      return result === "pending" || !i.qc_result;
    }).length;
    
    return { total, pass, fail, pending };
  }, [inventory]);

  // Filter inventory for QC data
  const filteredQCData = useMemo(() => {
    if (!inventory) return [];
    
    return inventory.filter((item) => {
      // Card filter (from clickable cards)
      if (activeCardFilter !== "all") {
        const result = item.qc_result?.toLowerCase() || "";
        if (activeCardFilter === "pass" && !result.includes("pass")) return false;
        if (activeCardFilter === "fail" && !result.includes("fail")) return false;
        if (activeCardFilter === "pending" && !(result === "pending" || !item.qc_result)) return false;
      }
      
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        item.serial_number.toLowerCase().includes(searchLower) ||
        item.product_name.toLowerCase().includes(searchLower) ||
        (item.checked_by?.toLowerCase() || "").includes(searchLower) ||
        (item.ip_address?.toLowerCase() || "").includes(searchLower);

      // QC dropdown filter (in addition to card filter)
      let matchesQC = true;
      if (qcFilter !== "all") {
        matchesQC = item.qc_result === qcFilter || 
                   (qcFilter === "Pass" && item.qc_result?.toLowerCase().includes("pass")) ||
                   (qcFilter === "Fail" && item.qc_result?.toLowerCase().includes("fail")) ||
                   (qcFilter === "Pending" && (!item.qc_result || item.qc_result === "Pending"));
      }

      // Product filter
      const matchesProduct = productFilter === "all" || item.product_name === productFilter;

      // Checked by filter
      const matchesCheckedBy = checkedByFilter === "all" || item.checked_by === checkedByFilter;

      return matchesSearch && matchesQC && matchesProduct && matchesCheckedBy;
    });
  }, [inventory, searchTerm, qcFilter, productFilter, checkedByFilter, activeCardFilter]);

  const handleClearFilters = () => {
    setQcFilter("all");
    setProductFilter("all");
    setCheckedByFilter("all");
    setActiveCardFilter("all");
  };

  const handleCardClick = (filter: CardFilter) => {
    setActiveCardFilter(filter === activeCardFilter ? "all" : filter);
    // Reset dropdown filter when card is clicked
    setQcFilter("all");
  };

  const handleRowClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setUpdateDialogOpen(true);
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
          <h1 className="text-2xl font-bold text-foreground">Quality Check</h1>
          <p className="text-muted-foreground">
            QC reports and device testing results
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <QCReportUploadDialog />
          {filteredQCData.length > 0 && (
            <QCExport data={filteredQCData} />
          )}
        </div>
      </div>

      {/* Clickable Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ClickableStatCard
          title="Total Checked"
          value={String(qcStats.total)}
          icon={ClipboardCheck}
          variant="primary"
          isActive={activeCardFilter === "all"}
          onClick={() => handleCardClick("all")}
        />
        <ClickableStatCard
          title="QC Pass"
          value={String(qcStats.pass)}
          icon={CheckCircle}
          variant="success"
          isActive={activeCardFilter === "pass"}
          onClick={() => handleCardClick("pass")}
        />
        <ClickableStatCard
          title="QC Fail"
          value={String(qcStats.fail)}
          icon={XCircle}
          variant="danger"
          isActive={activeCardFilter === "fail"}
          onClick={() => handleCardClick("fail")}
        />
        <ClickableStatCard
          title="Pending"
          value={String(qcStats.pending)}
          icon={Clock}
          variant="warning"
          isActive={activeCardFilter === "pending"}
          onClick={() => handleCardClick("pending")}
        />
      </div>

      {/* Filter indicator */}
      {activeCardFilter !== "all" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing:</span>
          <span className="font-medium text-primary capitalize">{activeCardFilter}</span>
          <span className="text-muted-foreground">records</span>
          <button
            onClick={() => setActiveCardFilter("all")}
            className="text-primary hover:underline ml-2"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Search, Filter, and Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">
                QC Reports ({filteredQCData.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search serial, product, inspector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-72"
                />
              </div>
            </div>
            <QCFilters
              qcFilter={qcFilter}
              setQcFilter={setQcFilter}
              products={uniqueProducts}
              productFilter={productFilter}
              setProductFilter={setProductFilter}
              checkedByList={uniqueCheckedBy}
              checkedByFilter={checkedByFilter}
              setCheckedByFilter={setCheckedByFilter}
              onClearFilters={handleClearFilters}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <QCTable data={filteredQCData} onRowClick={handleRowClick} />
        </CardContent>
      </Card>

      {/* QC Update Dialog */}
      <QCUpdateDialog
        item={selectedItem}
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
      />
    </div>
  );
};

export default QualityCheckPage;
