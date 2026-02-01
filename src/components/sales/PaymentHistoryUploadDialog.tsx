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

// Column mappings for Payment History based on user's Excel format
// Order ID, Cust Code, Customer Name, Company Name, Payment Date, Amount, Account, Payment Reference
const COLUMN_MAPPINGS: Record<string, string[]> = {
  order_id: ["order id", "order_id", "order no", "order number", "invoice"],
  payment_date: ["payment date", "payment_date", "date", "paid date"],
  amount: ["amount", "payment amount", "paid amount", "value"],
  account_received: ["account", "account_received", "bank", "payment mode", "mode"],
  payment_reference: ["payment reference", "payment_reference", "reference", "ref", "txn id", "transaction id"],
};

const DATE_COLUMNS = ["payment_date"];

export const PaymentHistoryUploadDialog = () => {
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
      if (!mappedColumns.includes("order_id")) {
        throw new Error("Could not find Order ID column.");
      }
      if (!mappedColumns.includes("amount")) {
        throw new Error("Could not find Amount column.");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Processing records..." });

      // Transform data
      const transformedData: any[] = [];

      for (const row of jsonData) {
        const record = row as Record<string, any>;
        const transformed: Record<string, any> = {};

        for (const [excelCol, schemaCol] of Object.entries(columnMap)) {
          if (schemaCol === "amount") {
            transformed[schemaCol] = parseNumber(record[excelCol]);
          } else {
            transformed[schemaCol] = cleanValue(record[excelCol], schemaCol, DATE_COLUMNS);
          }
        }

        // Skip if no order_id or amount
        if (!transformed.order_id || !transformed.amount) continue;

        // Set defaults
        transformed.account_received = transformed.account_received || "Cash";
        transformed.payment_date = transformed.payment_date || new Date().toISOString().split("T")[0];

        transformedData.push(transformed);
      }

      setProgress({ current: 0, total: transformedData.length, status: "Validating order IDs..." });

      // Get all unique order_ids from the upload
      const orderIds = [...new Set(transformedData.map((d) => d.order_id))];

      // Fetch existing order_ids from sales table
      const { data: existingSales, error: salesError } = await supabase
        .from("sales")
        .select("order_id")
        .in("order_id", orderIds);

      if (salesError) {
        throw new Error(`Failed to validate order IDs: ${salesError.message}`);
      }

      const existingOrderIds = new Set((existingSales || []).map((s) => s.order_id));

      // Filter out payments for non-existent orders
      const validPayments = transformedData.filter((p) => existingOrderIds.has(p.order_id));
      const skippedCount = transformedData.length - validPayments.length;

      if (validPayments.length === 0) {
        throw new Error(
          `None of the ${transformedData.length} order IDs in the file exist in the sales table. Please ensure you're uploading payments for existing orders.`
        );
      }

      setProgress({ current: 0, total: validPayments.length, status: "Uploading to database..." });

      // Upload in batches
      const batchSize = 100;
      let uploaded = 0;

      for (let i = 0; i < validPayments.length; i += batchSize) {
        const batch = validPayments.slice(i, i + batchSize);

        const { error } = await supabase.from("payment_history").insert(batch);

        if (error) {
          console.error("Batch upload error:", error);
          throw new Error(`Failed to upload batch: ${error.message}`);
        }

        uploaded += batch.length;
        setProgress({
          current: uploaded,
          total: validPayments.length,
          status: `Uploaded ${uploaded} of ${validPayments.length} records...`,
        });
      }

      const skippedMessage = skippedCount > 0 ? ` (${skippedCount} skipped - order IDs not found)` : "";

      await queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });

      toast({
        title: "Import Successful",
        description: `Successfully imported ${validPayments.length} payment records${skippedMessage}.`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import payment data",
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
          Upload Payments
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Payment History Excel
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
                  id="payment-excel-upload"
                />
                <label
                  htmlFor="payment-excel-upload"
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
                  Order ID, Cust Code, Customer Name, Company Name, Payment Date, Amount, Account, Payment Reference
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Required Columns
                </h4>
                <p className="text-xs text-muted-foreground">
                  <strong>Order ID</strong>, <strong>Amount</strong>
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
