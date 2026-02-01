import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Clock, ClipboardCheck } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { QCReportUploadDialog } from "@/components/inventory/QCReportUploadDialog";
import { QCTable } from "@/components/qc/QCTable";
import { QCFilters } from "@/components/qc/QCFilters";
import { QCExport } from "@/components/qc/QCExport";
import type { InventoryItem } from "@/hooks/useInventory";

const QualityCheckPage = () => {
  const { data: inventory, isLoading } = useInventory();
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [qcFilter, setQcFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [checkedByFilter, setCheckedByFilter] = useState("all");

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

  // Filter inventory for QC data
  const filteredQCData = useMemo(() => {
    if (!inventory) return [];
    
    return inventory.filter((item) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        item.serial_number.toLowerCase().includes(searchLower) ||
        item.product_name.toLowerCase().includes(searchLower) ||
        (item.checked_by?.toLowerCase() || "").includes(searchLower) ||
        (item.ip_address?.toLowerCase() || "").includes(searchLower);

      // QC filter
      const matchesQC = qcFilter === "all" || item.qc_result === qcFilter;

      // Product filter
      const matchesProduct = productFilter === "all" || item.product_name === productFilter;

      // Checked by filter
      const matchesCheckedBy = checkedByFilter === "all" || item.checked_by === checkedByFilter;

      return matchesSearch && matchesQC && matchesProduct && matchesCheckedBy;
    });
  }, [inventory, searchTerm, qcFilter, productFilter, checkedByFilter]);

  // Calculate QC stats
  const qcStats = useMemo(() => {
    if (!inventory) return { total: 0, pass: 0, fail: 0, pending: 0 };
    
    const total = inventory.length;
    const pass = inventory.filter(i => i.qc_result === "Pass" || i.qc_result === "QC Pass").length;
    const fail = inventory.filter(i => i.qc_result === "Fail" || i.qc_result === "QC Fail").length;
    const pending = inventory.filter(i => i.qc_result === "Pending" || !i.qc_result).length;
    
    return { total, pass, fail, pending };
  }, [inventory]);

  const handleClearFilters = () => {
    setQcFilter("all");
    setProductFilter("all");
    setCheckedByFilter("all");
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

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Checked"
          value={String(qcStats.total)}
          icon={ClipboardCheck}
          variant="primary"
        />
        <StatCard
          title="QC Pass"
          value={String(qcStats.pass)}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="QC Fail"
          value={String(qcStats.fail)}
          icon={XCircle}
          variant="danger"
        />
        <StatCard
          title="Pending"
          value={String(qcStats.pending)}
          icon={Clock}
          variant="warning"
        />
      </div>

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
          <QCTable data={filteredQCData} />
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityCheckPage;
