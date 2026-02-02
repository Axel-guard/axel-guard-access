import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowUp, ArrowDown, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
import { PricingSlider } from "@/components/pricing/PricingSlider";

interface ProductPricing {
  id: string;
  product_code: string;
  qty_0_10: number | null;
  qty_10_50: number | null;
  qty_50_100: number | null;
  qty_100_plus: number | null;
  created_at: string | null;
  updated_at: string | null;
  product?: {
    product_name: string;
    category: string;
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

const usePricing = () => {
  return useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_pricing")
        .select(`
          *,
          product:products!product_pricing_product_code_fkey(product_name, category)
        `)
        .order("product_code", { ascending: true });

      if (error) throw error;
      return data as ProductPricing[];
    },
  });
};

const PricingPage = () => {
  const { data: pricing, isLoading } = usePricing();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"product_code" | "qty_0_10">("product_code");
  const [sortDesc, setSortDesc] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredPricing = pricing
    ?.filter(
      (item) =>
        item.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product?.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product?.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let valA: any, valB: any;
      if (sortField === "product_code") {
        valA = a.product_code.toLowerCase();
        valB = b.product_code.toLowerCase();
      } else {
        valA = a[sortField] ?? 0;
        valB = b[sortField] ?? 0;
      }
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });

  const handleSort = (field: "product_code" | "qty_0_10") => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(false);
    }
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
            transformed[schemaCol] = value ? parseFloat(String(value).replace(/[^\d.-]/g, '')) || null : null;
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

      await queryClient.invalidateQueries({ queryKey: ["pricing"] });

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

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "-";
    return `₹${price.toLocaleString("en-IN")}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Slider at Top */}
      <div className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm -mx-6 -mt-6 px-6 pt-4 pb-2 mb-4">
        <PricingSlider />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 space-y-6 overflow-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Product Pricing Table</h1>
            <p className="text-muted-foreground">Manage product pricing tiers</p>
          </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
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
                      <CheckCircle className="h-4 w-4 text-success" />
                      Expected Columns
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Product Code, 0-10, 10-50, 50-100, 100+
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      Required Columns
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

      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Pricing Tiers</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search pricing..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 -ml-3 font-medium"
                      onClick={() => handleSort("product_code")}
                    >
                      Product Code
                      {sortField === "product_code" && (
                        sortDesc ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 font-medium"
                      onClick={() => handleSort("qty_0_10")}
                    >
                      0-10 Qty
                      {sortField === "qty_0_10" && (
                        sortDesc ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">10-50 Qty</TableHead>
                  <TableHead className="text-right">50-100 Qty</TableHead>
                  <TableHead className="text-right">100+ Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPricing?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_code}</TableCell>
                    <TableCell>{item.product?.product_name || "-"}</TableCell>
                    <TableCell>{item.product?.category || "-"}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.qty_0_10)}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.qty_10_50)}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.qty_50_100)}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.qty_100_plus)}</TableCell>
                  </TableRow>
                ))}
                {(!filteredPricing || filteredPricing.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No pricing records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default PricingPage;
