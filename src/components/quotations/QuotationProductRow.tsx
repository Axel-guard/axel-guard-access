import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { QuotationItem } from "@/hooks/useQuotations";

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

export const QuotationProductRow = ({
  index,
  item,
  products,
  onUpdate,
  onRemove,
  canRemove,
}: QuotationProductRowProps) => {
  const handleProductChange = (productCode: string) => {
    const product = products.find((p) => p.product_code === productCode);
    if (product) {
      onUpdate(index, "product_code", product.product_code);
      onUpdate(index, "product_name", product.product_name);
      // Auto-calculate amount
      const newAmount = item.quantity * item.unit_price;
      onUpdate(index, "amount", newAmount);
    }
  };

  const handleQuantityChange = (value: string) => {
    const qty = parseFloat(value) || 0;
    onUpdate(index, "quantity", qty);
    onUpdate(index, "amount", qty * item.unit_price);
  };

  const handlePriceChange = (value: string) => {
    const price = parseFloat(value) || 0;
    onUpdate(index, "unit_price", price);
    onUpdate(index, "amount", item.quantity * price);
  };

  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="p-2 text-center font-medium">{index + 1}</td>
      <td className="p-2">
        <Select value={item.product_code} onValueChange={handleProductChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.product_code}>
                {product.product_name} ({product.product_code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-2">
        <Input
          value={item.hsn_sac}
          onChange={(e) => onUpdate(index, "hsn_sac", e.target.value)}
          placeholder="HSN/SAC"
          className="w-24"
        />
      </td>
      <td className="p-2">
        <Input
          type="number"
          min="1"
          step="1"
          value={item.quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          className="w-20 text-center"
        />
      </td>
      <td className="p-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.unit_price}
          onChange={(e) => handlePriceChange(e.target.value)}
          className="w-28 text-right"
        />
      </td>
      <td className="p-2 text-right font-medium">
        ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>
      <td className="p-2 text-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
};
