import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface InventoryFiltersProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  qcFilter: string;
  setQcFilter: (value: string) => void;
  products: string[];
  productFilter: string;
  setProductFilter: (value: string) => void;
  onClearFilters: () => void;
}

export const InventoryFilters = ({
  statusFilter,
  setStatusFilter,
  qcFilter,
  setQcFilter,
  products,
  productFilter,
  setProductFilter,
  onClearFilters,
}: InventoryFiltersProps) => {
  const hasActiveFilters = statusFilter !== "all" || qcFilter !== "all" || productFilter !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="In Stock">In Stock</SelectItem>
          <SelectItem value="Dispatched">Dispatched</SelectItem>
          <SelectItem value="QC Pending">QC Pending</SelectItem>
          <SelectItem value="Defective">Defective</SelectItem>
        </SelectContent>
      </Select>

      <Select value={qcFilter} onValueChange={setQcFilter}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="QC Result" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All QC</SelectItem>
          <SelectItem value="Pass">Pass</SelectItem>
          <SelectItem value="Fail">Fail</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      <Select value={productFilter} onValueChange={setProductFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Product" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <SelectItem value="all">All Products</SelectItem>
          {products.map((product) => (
            <SelectItem key={product} value={product}>
              {product.length > 25 ? product.substring(0, 25) + "..." : product}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
};
