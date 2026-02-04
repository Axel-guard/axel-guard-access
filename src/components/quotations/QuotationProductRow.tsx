import { Button } from "@/components/ui/button";
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
import { useMemo } from "react";

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
  // Group products by category for easier selection
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    
    products.forEach((product) => {
      const category = product.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    
    // Sort categories alphabetically
    const sortedCategories = Object.keys(grouped).sort();
    return sortedCategories.map((category) => ({
      category,
      products: grouped[category].sort((a, b) => 
        a.product_name.localeCompare(b.product_name)
      ),
    }));
  }, [products]);

  // Helper to get numeric value for calculations
  const getNumericValue = (value: number | string): number => {
    if (typeof value === "string") {
      return parseFloat(value) || 0;
    }
    return value || 0;
  };

  const handleProductChange = (productCode: string) => {
    const product = products.find((p) => p.product_code === productCode);
    if (product) {
      onUpdate(index, "product_code", product.product_code);
      onUpdate(index, "product_name", product.product_name);
      // Recalculate amount with current values
      const qty = getNumericValue(item.quantity);
      const price = getNumericValue(item.unit_price);
      onUpdate(index, "amount", qty * price);
    }
  };

  const handleQuantityChange = (value: string) => {
    // Allow empty string for full editability
    if (value === "") {
      onUpdate(index, "quantity", "");
      onUpdate(index, "amount", 0);
      return;
    }
    const qty = parseFloat(value);
    if (!isNaN(qty)) {
      onUpdate(index, "quantity", qty);
      const price = getNumericValue(item.unit_price);
      onUpdate(index, "amount", qty * price);
    }
  };

  const handlePriceChange = (value: string) => {
    // Allow empty string for full editability
    if (value === "") {
      onUpdate(index, "unit_price", "");
      onUpdate(index, "amount", 0);
      return;
    }
    const price = parseFloat(value);
    if (!isNaN(price)) {
      onUpdate(index, "unit_price", price);
      const qty = getNumericValue(item.quantity);
      onUpdate(index, "amount", qty * price);
    }
  };

  // Get the selected product name for display (without category)
  const selectedProduct = products.find((p) => p.product_code === item.product_code);
  const displayValue = selectedProduct ? selectedProduct.product_name : "";

  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="p-2 text-center font-medium">{index + 1}</td>
      <td className="p-2">
        <Select value={item.product_code} onValueChange={handleProductChange}>
          <SelectTrigger className="w-full min-w-[200px]">
            <SelectValue placeholder="Select product">
              {displayValue || "Select product"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {productsByCategory.map(({ category, products: categoryProducts }) => (
              <SelectGroup key={category}>
                <SelectLabel className="font-semibold text-primary bg-muted/50 px-2 py-1.5">
                  {category}
                </SelectLabel>
                {categoryProducts.map((product) => (
                  <SelectItem 
                    key={product.id} 
                    value={product.product_code}
                    className="pl-6"
                  >
                    {product.product_name}
                  </SelectItem>
                ))}
              </SelectGroup>
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
          placeholder="Enter qty"
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
          placeholder="Enter price"
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
