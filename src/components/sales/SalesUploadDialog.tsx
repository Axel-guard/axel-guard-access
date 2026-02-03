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
  normalizeColumnName,
} from "@/lib/excelParser";

// Expanded column mappings for flexible matching
const COLUMN_MAPPINGS: Record<string, string[]> = {
  order_id: ["order id", "order_id", "order no", "order number", "orderid", "order", "id", "sr no", "s no", "sno", "srno"],
  sale_date: ["sale date", "sale_date", "saledate", "date", "order date", "invoice date"],
  customer_code: ["customer code", "customer_code", "customercode", "cust code", "custcode", "cust id", "customer id"],
  customer_name: ["customer name", "customer_name", "customername", "name", "cust name", "custname", "party name", "party"],
  customer_contact: ["mobile", "mobile number", "phone", "contact", "mobile_number", "phone number", "cell", "mob", "contact no"],
  location: ["location", "city", "address", "area", "state", "place", "delivery location"],
  total_amount: ["total amount", "total_amount", "totalamount", "total", "amount", "grand total", "net amount", "invoice amount", "bill amount"],
  final_amount: ["final amount", "final_amount", "finalamount", "final", "net amount", "payable", "receivable"],
};

const DATE_COLUMNS = ["sale_date"];

export const SalesUploadDialog = () => {
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

      console.log("Excel columns found:", excelColumns);

      for (const excelCol of excelColumns) {
        const schemaCol = findMatchingColumn(excelCol, COLUMN_MAPPINGS);
        if (schemaCol) {
          columnMap[excelCol] = schemaCol;
        }
      }

      console.log("Column mapping:", columnMap);

      // Check for required columns - order_id is the only required field
      const mappedColumns = Object.values(columnMap);
      if (!mappedColumns.includes("order_id")) {
        // Try to find any column that might be order_id
        const possibleOrderCols = excelColumns.filter(col => {
          const normalized = normalizeColumnName(col);
          return normalized.includes("order") || normalized.includes("id") || normalized.includes("no") || normalized.includes("sr");
        });
        
        if (possibleOrderCols.length > 0) {
          columnMap[possibleOrderCols[0]] = "order_id";
          console.log("Auto-mapped first ID-like column:", possibleOrderCols[0]);
        } else {
          throw new Error("Could not find 'Order ID' column. Please ensure your Excel has an Order ID, Order No, or similar column.");
        }
      }

      setProgress({ current: 0, total: jsonData.length, status: "Processing records..." });

      // Transform ALL data - allow duplicates, skip invalid rows
      const transformedData: any[] = [];
      const skippedRows: { row: number; reason: string }[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        try {
          const record = jsonData[i] as Record<string, any>;
          const transformed: Record<string, any> = {};

          // Extract values using column mapping
          for (const [excelCol, schemaCol] of Object.entries(columnMap)) {
            const rawValue = record[excelCol];
            if (schemaCol === "total_amount" || schemaCol === "final_amount") {
              transformed[schemaCol] = parseNumber(rawValue) || 0;
            } else {
              transformed[schemaCol] = cleanValue(rawValue, schemaCol, DATE_COLUMNS);
            }
          }

          // Skip if no order_id (only required field)
          if (!transformed.order_id && transformed.order_id !== 0) {
            skippedRows.push({ row: i + 2, reason: "Missing Order ID" });
            continue;
          }

          // Normalize order_id: trim spaces, ensure string (accept numeric or text)
          const normalizedOrderId = String(transformed.order_id).trim();
          if (!normalizedOrderId) {
            skippedRows.push({ row: i + 2, reason: "Empty Order ID" });
            continue;
          }
          transformed.order_id = normalizedOrderId;

          // Map final_amount to total_amount if total_amount is missing
          if (!transformed.total_amount && transformed.final_amount) {
            transformed.total_amount = transformed.final_amount;
          }

          // Set required defaults
          transformed.customer_code = transformed.customer_code || `CUST-${Date.now()}-${i}`;
          transformed.employee_name = transformed.employee_name || "Imported";
          transformed.sale_type = "Without";
          transformed.subtotal = transformed.total_amount || 0;
          transformed.gst_amount = 0;
          transformed.courier_cost = 0;
          transformed.amount_received = 0;
          transformed.balance_amount = transformed.total_amount || 0;
          transformed.sale_date = transformed.sale_date || new Date().toISOString().split("T")[0];

          // Store location in remarks if present
          if (transformed.location) {
            transformed.remarks = `Location: ${transformed.location}`;
          }

          // Remove non-schema fields
          delete transformed.final_amount;
          delete transformed.location;

          transformedData.push(transformed);
        } catch (rowError: any) {
          console.error(`Error processing row ${i + 2}:`, rowError);
          skippedRows.push({ row: i + 2, reason: rowError.message || "Processing error" });
        }
      }

      if (transformedData.length === 0) {
        throw new Error(`No valid records found. ${skippedRows.length} rows skipped. Please ensure your Excel has Order ID column with data.`);
      }

      setProgress({ current: 0, total: transformedData.length, status: "Uploading to database..." });

      // Upload records one by one to avoid batch failures
      let uploaded = 0;
      let successCount = 0;
      let errorCount = 0;
      const failedRecords: { orderId: string; reason: string }[] = [];

      for (let i = 0; i < transformedData.length; i++) {
        const record = transformedData[i];

        try {
          const { error: insertError } = await supabase
            .from("sales")
            .insert(record);

          if (insertError) {
            console.error("Insert error for", record.order_id, ":", insertError);
            errorCount++;
            failedRecords.push({ orderId: record.order_id, reason: insertError.message });
          } else {
            successCount++;
          }
        } catch (err: any) {
          errorCount++;
          failedRecords.push({ orderId: record.order_id, reason: err.message || "Unknown error" });
        }

        uploaded++;
        if (uploaded % 50 === 0 || uploaded === transformedData.length) {
          setProgress({
            current: uploaded,
            total: transformedData.length,
            status: `Processed ${uploaded} of ${transformedData.length} records...`,
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
      await queryClient.invalidateQueries({ queryKey: ["all-sales"] });

      // Build result message
      let description = `Successfully imported ${successCount} records.`;
      if (skippedRows.length > 0) {
        description += ` ${skippedRows.length} rows skipped (no Order ID).`;
      }
      if (errorCount > 0) {
        description += ` ${errorCount} failed.`;
        console.log("Failed records:", failedRecords.slice(0, 10));
      }

      toast({
        title: successCount > 0 ? "Import Complete" : "Import Failed",
        description,
        variant: successCount === 0 ? "destructive" : errorCount > 0 ? "destructive" : "default",
      });

      if (successCount > 0) {
        setOpen(false);
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import sales data",
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
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Sales Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Sales Database Excel
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
                  id="sales-excel-upload"
                />
                <label
                  htmlFor="sales-excel-upload"
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
                  Flexible Import
                </h4>
                <p className="text-xs text-muted-foreground">
                  Auto-detects columns: Order ID (required), Sale Date, Customer Name, Mobile, Location, Total Amount
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Data Cleaning
                </h4>
                <p className="text-xs text-muted-foreground">
                  Auto removes ₹ symbols, commas. Accepts multiple date formats. Invalid rows are skipped.
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
