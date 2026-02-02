import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Calculator, Truck } from "lucide-react";
import { useProductsByCategory } from "@/hooks/useProducts";

const COURIER_COMPANIES = [
  "Trackon",
  "Porter",
  "SM Express",
  "India Post",
  "Tirupati",
  "Fedex",
  "DHL",
  "Self Pickup",
  "DTDC",
  "Professional Courier",
  "Self Deliver",
  "Other",
];

const COURIER_MODES = [
  { value: "surface", label: "Surface", rate: 90 },
  { value: "air", label: "Air", rate: 110 },
  { value: "priority", label: "Priority next day", rate: 150 },
  { value: "bus", label: "Bus", rate: 70 },
];

interface ProductRow {
  id: string;
  category: string;
  productCode: string;
  quantity: number;
  weightPerUnit: number;
  totalWeight: number;
}

export const CourierCalculator = () => {
  const { data: productsByCategory, isLoading: productsLoading } = useProductsByCategory();
  
  const [courierCompany, setCourierCompany] = useState("");
  const [courierMode, setCourierMode] = useState("");
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { id: "1", category: "", productCode: "", quantity: 1, weightPerUnit: 0, totalWeight: 0 }
  ]);

  // Get rate based on courier mode
  const ratePerKg = useMemo(() => {
    const mode = COURIER_MODES.find(m => m.value === courierMode);
    return mode?.rate || 0;
  }, [courierMode]);

  // Calculate totals
  const calculations = useMemo(() => {
    const totalWeight = productRows.reduce((sum, row) => sum + row.totalWeight, 0);
    const baseCost = totalWeight * ratePerKg;
    const fuelCharge = baseCost * 0.10; // 10% fuel charge
    const totalCost = baseCost + fuelCharge;

    return {
      totalWeight,
      baseCost,
      fuelCharge,
      totalCost,
    };
  }, [productRows, ratePerKg]);

  // Get products for selected category
  const getProductsForCategory = useCallback((category: string) => {
    if (!productsByCategory || !category) return [];
    return productsByCategory[category] || [];
  }, [productsByCategory]);

  // Get all categories
  const categories = useMemo(() => {
    if (!productsByCategory) return [];
    return Object.keys(productsByCategory);
  }, [productsByCategory]);

  // Handle category change
  const handleCategoryChange = (rowId: string, category: string) => {
    setProductRows(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, category, productCode: "", weightPerUnit: 0, totalWeight: 0 }
        : row
    ));
  };

  // Handle product change
  const handleProductChange = (rowId: string, productCode: string) => {
    const row = productRows.find(r => r.id === rowId);
    if (!row) return;

    const products = getProductsForCategory(row.category);
    const product = products.find(p => p.product_code === productCode);
    const weightPerUnit = product?.weight_kg || 0;
    const totalWeight = weightPerUnit * row.quantity;

    setProductRows(prev => prev.map(r => 
      r.id === rowId 
        ? { ...r, productCode, weightPerUnit, totalWeight }
        : r
    ));
  };

  // Handle quantity change
  const handleQuantityChange = (rowId: string, quantity: number) => {
    setProductRows(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, quantity, totalWeight: row.weightPerUnit * quantity }
        : row
    ));
  };

  // Add product row
  const addProductRow = () => {
    const newId = (productRows.length + 1).toString();
    setProductRows(prev => [
      ...prev, 
      { id: newId, category: "", productCode: "", quantity: 1, weightPerUnit: 0, totalWeight: 0 }
    ]);
  };

  // Remove product row
  const removeProductRow = (rowId: string) => {
    if (productRows.length <= 1) return;
    setProductRows(prev => prev.filter(row => row.id !== rowId));
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-card border-l-4 border-l-primary">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Calculator className="h-5 w-5 text-primary" />
            Courier Cost Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Courier Company */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Courier Company <span className="text-destructive">*</span>
              </Label>
              <Select value={courierCompany} onValueChange={setCourierCompany}>
                <SelectTrigger className="border-primary/30 focus:border-primary">
                  <SelectValue placeholder="Select Courier" />
                </SelectTrigger>
                <SelectContent>
                  {COURIER_COMPANIES.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Courier Mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Courier Mode <span className="text-destructive">*</span>
              </Label>
              <Select value={courierMode} onValueChange={setCourierMode}>
                <SelectTrigger className="border-primary/30 focus:border-primary">
                  <SelectValue placeholder="Select Mode" />
                </SelectTrigger>
                <SelectContent>
                  {COURIER_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label} (₹{mode.rate}/kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Selection */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Select Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
            <div className="col-span-2">Category</div>
            <div className="col-span-4">Product</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Weight (kg)</div>
            <div className="col-span-2">Total Weight</div>
          </div>

          {/* Product Rows */}
          {productRows.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
              {/* Category */}
              <div className="col-span-2">
                <Select 
                  value={row.category} 
                  onValueChange={(val) => handleCategoryChange(row.id, val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product */}
              <div className="col-span-4">
                <Select 
                  value={row.productCode} 
                  onValueChange={(val) => handleProductChange(row.id, val)}
                  disabled={!row.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={row.category ? "Select Product" : "Select Category First"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getProductsForCategory(row.category).map((product) => (
                      <SelectItem key={product.product_code} value={product.product_code}>
                        {product.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="col-span-2">
                <Input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => handleQuantityChange(row.id, parseInt(e.target.value) || 1)}
                  className="text-center"
                />
              </div>

              {/* Weight per unit */}
              <div className="col-span-2">
                <Input
                  type="number"
                  value={row.weightPerUnit}
                  readOnly
                  className="bg-muted/50 text-center"
                />
              </div>

              {/* Total Weight */}
              <div className="col-span-1">
                <Input
                  type="text"
                  value={row.totalWeight.toFixed(2)}
                  readOnly
                  className="bg-muted/50 text-center"
                />
              </div>

              {/* Remove Button */}
              <div className="col-span-1 flex justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeProductRow(row.id)}
                  disabled={productRows.length <= 1}
                  className="h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add Product Button */}
          <Button
            onClick={addProductRow}
            className="gap-2 bg-success text-white hover:bg-success/90"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <Card className="overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Courier Cost Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Total Weight */}
            <div className="space-y-1">
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide">
                Total Weight
              </p>
              <p className="text-2xl font-bold text-success">
                {calculations.totalWeight.toFixed(2)} kg
              </p>
            </div>

            {/* Rate per kg */}
            <div className="space-y-1">
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide">
                Rate per kg
              </p>
              <p className="text-2xl font-bold">
                ₹{ratePerKg}
              </p>
            </div>

            {/* Base Cost */}
            <div className="space-y-1">
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide">
                Base Cost
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(calculations.baseCost)}
              </p>
            </div>

            {/* Fuel Charge */}
            <div className="space-y-1">
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide">
                Fuel Charge (10%)
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(calculations.fuelCharge)}
              </p>
            </div>

            {/* Total Cost */}
            <div className="space-y-1">
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide">
                Total Cost
              </p>
              <p className="text-2xl font-bold text-warning">
                {formatCurrency(calculations.totalCost)}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
