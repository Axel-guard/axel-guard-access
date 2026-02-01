import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface QCFiltersProps {
  qcFilter: string;
  setQcFilter: (value: string) => void;
  products: string[];
  productFilter: string;
  setProductFilter: (value: string) => void;
  checkedByList: string[];
  checkedByFilter: string;
  setCheckedByFilter: (value: string) => void;
  onClearFilters: () => void;
}

export const QCFilters = ({
  qcFilter,
  setQcFilter,
  products,
  productFilter,
  setProductFilter,
  checkedByList,
  checkedByFilter,
  setCheckedByFilter,
  onClearFilters,
}: QCFiltersProps) => {
  const hasActiveFilters = qcFilter !== "all" || productFilter !== "all" || checkedByFilter !== "all";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={qcFilter} onValueChange={setQcFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="QC Result" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Results</SelectItem>
          <SelectItem value="Pass">Pass</SelectItem>
          <SelectItem value="QC Pass">QC Pass</SelectItem>
          <SelectItem value="Fail">Fail</SelectItem>
          <SelectItem value="QC Fail">QC Fail</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      <Select value={productFilter} onValueChange={setProductFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Device Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Devices</SelectItem>
          {products.map((product) => (
            <SelectItem key={product} value={product}>
              {product.length > 25 ? `${product.slice(0, 25)}...` : product}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={checkedByFilter} onValueChange={setCheckedByFilter}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Checked By" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Inspectors</SelectItem>
          {checkedByList.map((person) => (
            <SelectItem key={person} value={person}>
              {person}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9 px-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};
