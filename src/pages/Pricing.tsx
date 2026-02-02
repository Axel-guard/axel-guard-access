import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Download, Save, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  readExcelFile,
  isValidExcelFile,
  findMatchingColumn,
  cleanValue,
} from "@/lib/excelParser";
import { cn } from "@/lib/utils";

interface ProductWithPricing {
  id: string;
  product_code: string;
  product_name: string;
  category: string;
  pricing?: {
    id: string;
    qty_0_10: number | null;
    qty_10_50: number | null;
    qty_50_100: number | null;
    qty_100_plus: number | null;
  };
}

// Column mappings for Pricing Excel
const COLUMN_MAPPINGS: Record<string, string[]> = {
  product_code: ["product code", "product_code", "code", "sku", "item code"],
  qty_0_10: ["0-10", "qty 0-10", "qty_0_10", "1-10", "qty 1-10"],
  qty_10_50: ["10-50", "qty 10-50", "qty_10_50", "11-50"],
  qty_50_100: ["50-100", "qty 50-100", "qty_50_100", "51-100"],
  qty_100_plus: ["100+", "qty 100+", "qty_100_plus", "100 plus", "above 100"],
};

const useProductsWithPricing = () => {
  return useQuery({
    queryKey: ["products-with-pricing"],
    queryFn: async () => {
      // Fetch all products
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("id, product_code, product_name, category")
        .order("category", { ascending: true })
        .order("product_code", { ascending: true });

      if (prodError) throw prodError;

      // Fetch all pricing
      const { data: pricing, error: priceError } = await supabase
        .from("product_pricing")
        .select("*");

      if (priceError) throw priceError;

      // Merge products with their pricing
      const pricingMap = new Map(pricing?.map(p => [p.product_code, p]));
      
      return (products || []).map(prod => ({
        ...prod,
        pricing: pricingMap.get(prod.product_code) || null,
      })) as ProductWithPricing[];
    },
  });
};

const PricingPage = () => {
  const { data: products, isLoading } = useProductsWithPricing();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, number>>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get unique categories
  const categories = useMemo(() => {
    if (!products) return ["All Products"];
    const cats = [...new Set(products.map(p => p.category))].sort();
    return ["All Products", ...cats];
  }, [products]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesCategory = selectedCategory === "All Products" || p.category === selectedCategory;
      const matchesSearch = 
        p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, ProductWithPricing[]> = {};
    filteredProducts.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const handlePriceChange = (productCode: string, field: string, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value) || 0;
    setEditedPrices(prev => ({
      ...prev,
      [productCode]: {
        ...prev[productCode],
        [field]: numValue,
      },
    }));
  };

  const getDisplayPrice = (product: ProductWithPricing, field: string) => {
    if (editedPrices[product.product_code]?.[field] !== undefined) {
      return editedPrices[product.product_code][field];
    }
    return product.pricing?.[field as keyof typeof product.pricing] ?? 0;
  };

  const saveAllPricing = async () => {
    setIsSaving(true);
    try {
      const updates: any[] = [];
      
      for (const [productCode, prices] of Object.entries(editedPrices)) {
        updates.push({
          product_code: productCode,
          qty_0_10: prices.qty_0_10 ?? 0,
          qty_10_50: prices.qty_10_50 ?? 0,
          qty_50_100: prices.qty_50_100 ?? 0,
          qty_100_plus: prices.qty_100_plus ?? 0,
          updated_at: new Date().toISOString(),
        });
      }

      if (updates.length > 0) {
        const { error } = await supabase
          .from("product_pricing")
          .upsert(updates, { onConflict: "product_code" });

        if (error) throw error;
      }

      setEditedPrices({});
      await queryClient.invalidateQueries({ queryKey: ["products-with-pricing"] });
      
      toast({
        title: "Success",
        description: `Saved ${updates.length} pricing updates.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save pricing",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadExcel = () => {
    if (!products) return;
    
    // Create CSV content
    const headers = ["Product Code", "Product Name", "Category", "0-10 QTY", "10-50 QTY", "50-100 QTY", "100+ QTY"];
    const rows = products.map(p => [
      p.product_code,
      p.product_name,
      p.category,
      p.pricing?.qty_0_10 ?? 0,
      p.pricing?.qty_10_50 ?? 0,
      p.pricing?.qty_50_100 ?? 0,
      p.pricing?.qty_100_plus ?? 0,
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pricing_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Pricing data exported successfully.",
    });
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, status: "Reading file..." });

    try {
      const jsonData = await readExcelFile(file);

      if (jsonData.length === 0) {
        throw new Error("No data found in the Excel file");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Mapping columns..." });

      const excelColumns = Object.keys(jsonData[0] as object);
      const columnMap: Record<string, string> = {};

      for (const excelCol of excelColumns) {
        const schemaCol = findMatchingColumn(excelCol, COLUMN_MAPPINGS);
        if (schemaCol) {
          columnMap[excelCol] = schemaCol;
        }
      }

      const mappedColumns = Object.values(columnMap);
      if (!mappedColumns.includes("product_code")) {
        throw new Error("Could not find Product Code column.");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Processing records..." });

      const transformedData: any[] = [];
      const seenCodes = new Set<string>();

      for (const row of jsonData) {
        const record = row as Record<string, any>;
        const transformed: Record<string, any> = {};

        for (const [excelCol, schemaCol] of Object.entries(columnMap)) {
          const value = record[excelCol];
          if (["qty_0_10", "qty_10_50", "qty_50_100", "qty_100_plus"].includes(schemaCol)) {
            transformed[schemaCol] = value ? parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0 : 0;
          } else {
            transformed[schemaCol] = cleanValue(value, schemaCol, []);
          }
        }

        if (!transformed.product_code || String(transformed.product_code).trim() === "") {
          continue;
        }

        transformed.product_code = String(transformed.product_code).trim();

        if (seenCodes.has(transformed.product_code)) {
          const existingIndex = transformedData.findIndex(
            (t) => t.product_code === transformed.product_code
          );
          if (existingIndex >= 0) {
            transformedData.splice(existingIndex, 1);
          }
        }
        seenCodes.add(transformed.product_code);

        transformedData.push(transformed);
      }

      if (transformedData.length === 0) {
        throw new Error("No valid pricing data found in the Excel file.");
      }

      setProgress({ current: 0, total: transformedData.length, status: "Uploading to database..." });

      const batchSize = 100;
      let uploaded = 0;

      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);

        const { error } = await supabase.from("product_pricing").upsert(
          batch.map((item) => ({
            ...item,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "product_code" }
        );

        if (error) {
          console.error("Batch upload error:", error);
          throw new Error(`Failed to upload batch: ${error.message}`);
        }

        uploaded += batch.length;
        setProgress({
          current: uploaded,
          total: transformedData.length,
          status: `Uploaded ${uploaded} of ${transformedData.length} records...`,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["products-with-pricing"] });

      toast({
        title: "Import Successful",
        description: `Successfully imported ${transformedData.length} pricing records.`,
      });

      setUploadOpen(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import pricing data",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0, status: "" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isValidExcelFile(file)) {
        toast({
          title: "Invalid File",
          description: "Please upload an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
        return;
      }
      processExcelFile(file);
    }
  };

  const hasChanges = Object.keys(editedPrices).length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Product Pricing Management</h1>
            <p className="text-sm text-muted-foreground">Set quantity-based pricing for all products</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={downloadExcel}>
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          <Button 
            className="gap-2 bg-green-600 hover:bg-green-700" 
            onClick={saveAllPricing}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Pricing
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by Product Name, Code, or Category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            className={cn(
              "gap-1.5",
              selectedCategory === cat && "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => setSelectedCategory(cat)}
          >
            <Tag className="h-3 w-3" />
            {cat}
          </Button>
        ))}
        
        {/* Upload Excel Button in tabs area */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 ml-auto">
              <Upload className="h-3 w-3" />
              Upload Excel
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload Pricing Excel
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {!isProcessing ? (
                <>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pricing-excel-upload"
                    />
                    <label
                      htmlFor="pricing-excel-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <span className="text-sm font-medium">Click to upload Excel file</span>
                      <span className="text-xs text-muted-foreground">
                        Supports .xlsx and .xls files
                      </span>
                    </label>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Expected Columns
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Product Code, 0-10, 10-50, 50-100, 100+
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Required
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      <strong>Product Code</strong> (must match existing products)
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-8 space-y-4">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{progress.status}</p>
                    {progress.total > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {progress.current} / {progress.total} records
                      </p>
                    )}
                  </div>
                  {progress.total > 0 && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products grouped by category */}
      <div className="space-y-6">
        {Object.entries(groupedProducts).map(([category, prods]) => (
          <div key={category} className="rounded-lg overflow-hidden border border-border">
            {/* Category Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-white" />
              <span className="font-semibold text-white">
                {category} ({prods.length})
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">
                      Product Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">
                      0-10 QTY<br /><span className="text-[10px] normal-case">(₹)</span>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">
                      10-50 QTY<br /><span className="text-[10px] normal-case">(₹)</span>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">
                      50-100 QTY<br /><span className="text-[10px] normal-case">(₹)</span>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">
                      100+ QTY<br /><span className="text-[10px] normal-case">(₹)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {prods.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-primary">
                        {product.product_code}
                      </td>
                      <td className="px-4 py-3 text-sm text-primary hover:underline cursor-pointer">
                        {product.product_name}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Input
                          type="number"
                          value={getDisplayPrice(product, "qty_0_10")}
                          onChange={(e) => handlePriceChange(product.product_code, "qty_0_10", e.target.value)}
                          className="w-24 mx-auto text-center h-8 text-sm"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Input
                          type="number"
                          value={getDisplayPrice(product, "qty_10_50")}
                          onChange={(e) => handlePriceChange(product.product_code, "qty_10_50", e.target.value)}
                          className="w-24 mx-auto text-center h-8 text-sm"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Input
                          type="number"
                          value={getDisplayPrice(product, "qty_50_100")}
                          onChange={(e) => handlePriceChange(product.product_code, "qty_50_100", e.target.value)}
                          className="w-24 mx-auto text-center h-8 text-sm"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Input
                          type="number"
                          value={getDisplayPrice(product, "qty_100_plus")}
                          onChange={(e) => handlePriceChange(product.product_code, "qty_100_plus", e.target.value)}
                          className="w-24 mx-auto text-center h-8 text-sm"
                          min={0}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {Object.keys(groupedProducts).length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No products found matching your search.
          </div>
        )}
      </div>

      {/* Floating Save Button when changes exist */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg"
            onClick={saveAllPricing}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Save {Object.keys(editedPrices).length} Changes
          </Button>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
