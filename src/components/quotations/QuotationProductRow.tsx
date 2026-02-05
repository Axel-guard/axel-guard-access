import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { QuotationItem } from "@/hooks/useQuotations";
import { useMemo, useState } from "react";

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
  const [showDescription, setShowDescription] = useState(!!item.description);

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
    // Always update the value directly - allow any input
    onUpdate(index, "quantity", value);
    // Calculate amount
    const qty = parseFloat(value) || 0;
    const price = getNumericValue(item.unit_price);
    onUpdate(index, "amount", qty * price);
  };

  const handlePriceChange = (value: string) => {
    // Always update the value directly - allow any input
    onUpdate(index, "unit_price", value);
    // Calculate amount
    const price = parseFloat(value) || 0;
    const qty = getNumericValue(item.quantity);
    onUpdate(index, "amount", qty * price);
  };

  // Get the selected product name for display (without category)
  const selectedProduct = products.find((p) => p.product_code === item.product_code);
  const displayValue = selectedProduct ? selectedProduct.product_name : "";

  return (
    <>
      <tr className="border-b hover:bg-muted/30">
        <td className="p-2 text-center font-medium">{index + 1}</td>
        <td className="p-2">
          <div className="space-y-1">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShowDescription(!showDescription)}
            >
              {showDescription ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDescription ? "Hide Description" : "Add Description"}
            </Button>
          </div>
        </td>
        <td className="p-2">
          <Input
            type="number"
            min="1"
            step="1"
            value={item.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder="Qty"
            className="w-16 text-center"
          />
        </td>
        <td className="p-2">
          <Input
            value={item.unit || "Pcs"}
            onChange={(e) => onUpdate(index, "unit", e.target.value)}
            placeholder="Unit"
            className="w-16 text-center"
          />
        </td>
        <td className="p-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unit_price}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="Price"
            className="w-24 text-right"
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
      {showDescription && (
        <tr className="bg-muted/20">
          <td></td>
          <td colSpan={6} className="p-2">
            <Textarea
              value={item.description || ""}
              onChange={(e) => onUpdate(index, "description", e.target.value)}
              placeholder="Enter description/notes (e.g., Model no, specifications, custom notes)"
              rows={2}
              className="text-sm"
            />
          </td>
        </tr>
      )}
    </>
  );
};
