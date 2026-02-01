import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  readExcelFile,
  isValidExcelFile,
  findMatchingColumn,
  cleanValue,
  parseNumber,
} from "@/lib/excelParser";

// Column mappings for Products/Pricing based on user's Excel format
// Product Code, Product Name, Category, 0-10 Qty, 10-50 Qty, 50-100 Qty, 100+ Qty
const COLUMN_MAPPINGS: Record<string, string[]> = {
  product_code: ["product code", "product_code", "code", "item code", "sku"],
  product_name: ["product name", "product_name", "name", "item name", "description", "product"],
  category: ["category", "type", "product category", "group"],
  qty_0_10: ["0-10 qty", "0 10 qty", "qty 0 10", "0-10", "qty0-10"],
  qty_10_50: ["10-50 qty", "10 50 qty", "qty 10 50", "10-50", "qty10-50"],
  qty_50_100: ["50-100 qty", "50 100 qty", "qty 50 100", "50-100", "qty50-100"],
  qty_100_plus: ["100+ qty", "100 qty", "qty 100", "100+", "qty100+", "100 plus"],
};

export const ProductsUploadDialog = () => {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processExcelFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, status: "Reading file..." });

    try {
      const jsonData = await readExcelFile(file);

      if (jsonData.length === 0) {
        throw new Error("No data found in the Excel file");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Mapping columns..." });

      // Get Excel columns and create mapping
      const excelColumns = Object.keys(jsonData[0] as object);
      const columnMap: Record<string, string> = {};

      for (const excelCol of excelColumns) {
        const schemaCol = findMatchingColumn(excelCol, COLUMN_MAPPINGS);
        if (schemaCol) {
          columnMap[excelCol] = schemaCol;
        }
      }

      // Check for required columns
      const mappedColumns = Object.values(columnMap);
      if (!mappedColumns.includes("product_code")) {
        throw new Error("Could not find Product Code column.");
      }
      if (!mappedColumns.includes("product_name")) {
        throw new Error("Could not find Product Name column.");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Processing records..." });

      // Transform data - separate products and pricing
      const productsData: any[] = [];
      const pricingData: any[] = [];
      const seenCodes = new Set<string>();

      for (const row of jsonData) {
        const record = row as Record<string, any>;
        const product: Record<string, any> = {};
        const pricing: Record<string, any> = {};

        for (const [excelCol, schemaCol] of Object.entries(columnMap)) {
          if (["product_code", "product_name", "category"].includes(schemaCol)) {
            product[schemaCol] = cleanValue(record[excelCol], schemaCol);
          } else if (schemaCol.startsWith("qty_")) {
            pricing[schemaCol] = parseNumber(record[excelCol]);
          }
        }

        // Skip if no product code
        if (!product.product_code) continue;

        const codeKey = String(product.product_code).trim();
        if (seenCodes.has(codeKey)) continue;
        seenCodes.add(codeKey);

        // Set defaults
        product.category = product.category || "General";
        pricing.product_code = product.product_code;

        productsData.push(product);
        pricingData.push(pricing);
      }

      setProgress({ current: 0, total: productsData.length, status: "Uploading products..." });

      // Upload products
      const batchSize = 100;
      let uploaded = 0;

      for (let i = 0; i < productsData.length; i += batchSize) {
        const batch = productsData.slice(i, i + batchSize);

        const { error } = await supabase.from("products").upsert(
          batch.map((item) => ({
            ...item,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "product_code" }
        );

        if (error) {
          console.error("Products batch upload error:", error);
          throw new Error(`Failed to upload products: ${error.message}`);
        }

        uploaded += batch.length;
        setProgress({
          current: uploaded,
          total: productsData.length,
          status: `Uploaded ${uploaded} of ${productsData.length} products...`,
        });
      }

      // Upload pricing
      setProgress({ current: 0, total: pricingData.length, status: "Uploading pricing..." });
      uploaded = 0;

      for (let i = 0; i < pricingData.length; i += batchSize) {
        const batch = pricingData.slice(i, i + batchSize);

        const { error } = await supabase.from("product_pricing").upsert(
          batch.map((item) => ({
            ...item,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "product_code" }
        );

        if (error) {
          console.error("Pricing batch upload error:", error);
          // Don't throw, pricing is optional
        }

        uploaded += batch.length;
      }

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product-pricing"] });

      toast({
        title: "Import Successful",
        description: `Successfully imported ${productsData.length} products with pricing.`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import products data",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0, status: "" });
    }
  }, [queryClient, toast]);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Products & Pricing Excel
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
                  id="products-excel-upload"
                />
                <label
                  htmlFor="products-excel-upload"
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
                  <CheckCircle className="h-4 w-4 text-success" />
                  Expected Columns
                </h4>
                <p className="text-xs text-muted-foreground">
                  Product Code, Product Name, Category, 0-10 Qty, 10-50 Qty, 50-100 Qty, 100+ Qty
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Required Columns
                </h4>
                <p className="text-xs text-muted-foreground">
                  <strong>Product Code</strong>, <strong>Product Name</strong>
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
  );
};
