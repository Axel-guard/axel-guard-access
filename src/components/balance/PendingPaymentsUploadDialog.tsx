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

// Column mappings for Pending Payments (Sales) based on user's Excel format
const COLUMN_MAPPINGS: Record<string, string[]> = {
  order_id: ["order id", "order_id", "order no", "order number"],
  customer_code: ["cust code", "customer code", "customer_code", "code"],
  customer_name: ["customer name", "customer_name", "name"],
  company_name: ["company name", "company_name", "company"],
  sale_date: ["date", "sale date", "order date", "sale_date"],
  employee_name: ["employee", "employee_name", "salesperson", "sales person"],
  customer_contact: ["contact", "customer_contact", "phone", "mobile"],
  total_amount: ["total amount", "total_amount", "total", "amount"],
  amount_received: ["received", "amount_received", "paid"],
  balance_amount: ["balance", "balance_amount", "due"],
};

const DATE_COLUMNS = ["sale_date"];

export const PendingPaymentsUploadDialog = () => {
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

      const excelColumns = Object.keys(jsonData[0] as object);
      const columnMap: Record<string, string> = {};

      for (const excelCol of excelColumns) {
        const schemaCol = findMatchingColumn(excelCol, COLUMN_MAPPINGS);
        if (schemaCol) {
          columnMap[excelCol] = schemaCol;
        }
      }

      const mappedColumns = Object.values(columnMap);
      if (!mappedColumns.includes("order_id")) {
        throw new Error("Could not find Order ID column.");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Processing records..." });

      const transformedData: any[] = [];

      for (const row of jsonData) {
        const record = row as Record<string, any>;
        const transformed: Record<string, any> = {};

        for (const [excelCol, schemaCol] of Object.entries(columnMap)) {
          if (["total_amount", "amount_received", "balance_amount"].includes(schemaCol)) {
            transformed[schemaCol] = parseNumber(record[excelCol]);
          } else {
            transformed[schemaCol] = cleanValue(record[excelCol], schemaCol, DATE_COLUMNS);
          }
        }

        if (!transformed.order_id) continue;

        // Set defaults
        transformed.sale_type = transformed.sale_type || "With";
        transformed.subtotal = transformed.total_amount || 0;
        transformed.gst_amount = 0;
        transformed.courier_cost = 0;
        transformed.sale_date = transformed.sale_date || new Date().toISOString().split("T")[0];
        transformed.employee_name = transformed.employee_name || "Unknown";
        transformed.customer_code = transformed.customer_code || "UNKNOWN";

        transformedData.push(transformed);
      }

      setProgress({ current: 0, total: transformedData.length, status: "Uploading to database..." });

      const batchSize = 100;
      let uploaded = 0;

      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);

        const { error } = await supabase.from("sales").upsert(batch, {
          onConflict: "order_id",
          ignoreDuplicates: false,
        });

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

      await queryClient.invalidateQueries({ queryKey: ["sales"] });

      toast({
        title: "Import Successful",
        description: `Successfully imported ${transformedData.length} pending payment records.`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data",
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
          Upload Pending Payments
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Pending Payments Excel
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
                  id="pending-excel-upload"
                />
                <label
                  htmlFor="pending-excel-upload"
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
                  Order ID, Cust Code, Date, Customer Name, Company Name, Employee, Contact, Total Amount, Received, Balance
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Required Columns
                </h4>
                <p className="text-xs text-muted-foreground">
                  <strong>Order ID</strong>
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
