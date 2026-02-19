import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { QuotationItem } from "@/hooks/useQuotations";
import { useMemo, useRef, useCallback } from "react";

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  category: string;
}

interface QuotationProductRowProps {
  index: number;
  item: QuotationItem;
  products: Product[];
  onUpdate: (index: number, field: keyof QuotationItem, value: any) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

const TAX_OPTIONS = [
  { label: "None", value: "0" },
  { label: "5%", value: "5" },
  { label: "12%", value: "12" },
  { label: "18%", value: "18" },
  { label: "28%", value: "28" },
];

const UNIT_OPTIONS = ["Pcs", "Nos", "Set", "Kit", "Box", "Pair", "Lot"];

export const QuotationProductRow = ({
  index,
  item,
  products,
  onUpdate,
  onRemove,
  canRemove,
}: QuotationProductRowProps) => {
  const firstInputRef = useRef<HTMLInputElement>(null);

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    products.forEach((product) => {
      const category = product.category || "Other";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(product);
    });
    return Object.keys(grouped)
      .sort()
      .map((category) => ({
        category,
        products: grouped[category].sort((a, b) =>
          a.product_name.localeCompare(b.product_name)
        ),
      }));
  }, [products]);

  const getNum = (v: number | string): number =>
    typeof v === "string" ? parseFloat(v) || 0 : v || 0;

  const lineAmount = getNum(item.quantity) * getNum(item.unit_price);
  const taxPercent = getNum(item.tax_percent ?? 0);
  const taxAmount = lineAmount * (taxPercent / 100);
  const finalAmount = lineAmount + taxAmount;

  const handleProductChange = useCallback(
    (productCode: string) => {
      const product = products.find((p) => p.product_code === productCode);
      if (product) {
        onUpdate(index, "product_code", product.product_code);
        onUpdate(index, "product_name", product.product_name);
        // Recalculate amount
        const qty = getNum(item.quantity);
        const price = getNum(item.unit_price);
        onUpdate(index, "amount", qty * price);
      }
    },
    [products, index, onUpdate, item.quantity, item.unit_price]
  );

  const handleQuantityChange = useCallback(
    (value: string) => {
      onUpdate(index, "quantity", value);
      const qty = parseFloat(value) || 0;
      const price = getNum(item.unit_price);
      onUpdate(index, "amount", qty * price);
    },
    [index, onUpdate, item.unit_price]
  );

  const handlePriceChange = useCallback(
    (value: string) => {
      onUpdate(index, "unit_price", value);
      const price = parseFloat(value) || 0;
      const qty = getNum(item.quantity);
      onUpdate(index, "amount", qty * price);
    },
    [index, onUpdate, item.quantity]
  );

  const selectedProduct = products.find(
    (p) => p.product_code === item.product_code
  );

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      {/* # */}
      <td className="px-2 py-2 text-center text-sm font-medium text-muted-foreground w-10">
        {index + 1}
      </td>

      {/* Item (Product Select) */}
      <td className="px-2 py-2 min-w-[180px]">
        <Select value={item.product_code} onValueChange={handleProductChange}>
          <SelectTrigger className="h-9 text-sm border-muted">
            <SelectValue placeholder="Select item">
              {selectedProduct?.product_name || "Select item"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {productsByCategory.map(({ category, products: catProducts }) => (
              <SelectGroup key={category}>
                <SelectLabel className="font-semibold text-primary bg-muted/50 px-2 py-1">
                  {category}
                </SelectLabel>
                {catProducts.map((product) => (
                  <SelectItem
                    key={product.id}
                    value={product.product_code}
                    className="pl-6 text-sm"
                  >
                    {product.product_name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Serial No */}
      <td className="px-2 py-2 min-w-[100px]">
        <Input
          ref={firstInputRef}
          value={item.serial_no || ""}
          onChange={(e) => onUpdate(index, "serial_no", e.target.value)}
          placeholder="—"
          className="h-9 text-sm text-center border-muted"
        />
      </td>

      {/* Description */}
      <td className="px-2 py-2 min-w-[140px]">
        <Input
          value={item.description || ""}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          placeholder="—"
          className="h-9 text-sm border-muted"
        />
      </td>

      {/* Model No */}
      <td className="px-2 py-2 min-w-[110px]">
        <Input
          value={item.model_no || ""}
          onChange={(e) => onUpdate(index, "model_no", e.target.value)}
          placeholder="—"
          className="h-9 text-sm text-center border-muted"
        />
      </td>

      {/* Qty */}
      <td className="px-2 py-2 w-[80px]">
        <Input
          type="number"
          min="1"
          step="1"
          value={item.quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          placeholder="Qty"
          className="h-9 text-sm text-center border-muted"
        />
      </td>

      {/* Unit */}
      <td className="px-2 py-2 w-[90px]">
        <Select
          value={item.unit || "Pcs"}
          onValueChange={(v) => onUpdate(index, "unit", v)}
        >
          <SelectTrigger className="h-9 text-sm border-muted">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((u) => (
              <SelectItem key={u} value={u} className="text-sm">
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Price/Unit */}
      <td className="px-2 py-2 w-[100px]">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.unit_price}
          onChange={(e) => handlePriceChange(e.target.value)}
          placeholder="Price"
          className="h-9 text-sm text-right border-muted"
        />
      </td>

      {/* Tax % */}
      <td className="px-2 py-2 w-[90px]">
        <Select
          value={String(item.tax_percent ?? 0)}
          onValueChange={(v) =>
            onUpdate(index, "tax_percent", parseFloat(v) || 0)
          }
        >
          <SelectTrigger className="h-9 text-sm border-muted">
            <SelectValue placeholder="Tax" />
          </SelectTrigger>
          <SelectContent>
            {TAX_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-sm">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Tax Amount (computed) */}
      <td className="px-2 py-2 text-right text-sm font-medium w-[100px] text-muted-foreground">
        ₹{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>

      {/* Amount (final) */}
      <td className="px-2 py-2 text-right text-sm font-semibold w-[110px]">
        ₹{finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>

      {/* Action */}
      <td className="px-2 py-2 text-center w-10">
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
};
