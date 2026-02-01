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
} from "@/lib/excelParser";

// Column mappings for Leads based on user's Excel format
// Customer Code, Customer Name, Mobile, Alternate Mobile, Location, Company Name, GST Number, Email, Status, Created At
const COLUMN_MAPPINGS: Record<string, string[]> = {
  customer_code: ["customer code", "customer_code", "cust code", "code"],
  customer_name: ["customer name", "customer_name", "name", "client name"],
  mobile_number: ["mobile", "mobile number", "mobile_number", "phone", "contact", "phone number"],
  alternate_mobile: ["alternate mobile", "alternate_mobile", "alt mobile", "alternate", "secondary mobile"],
  location: ["location", "city", "place", "area"],
  company_name: ["company name", "company_name", "company", "firm name", "business name"],
  gst_number: ["gst number", "gst_number", "gst", "gstin", "gst no"],
  email: ["email", "email id", "email address", "mail"],
  status: ["status", "lead status"],
  created_at: ["created at", "created_at", "date", "created date"],
};

const DATE_COLUMNS = ["created_at"];

export const LeadsUploadDialog = () => {
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
      if (!mappedColumns.includes("customer_code")) {
        throw new Error("Could not find Customer Code column.");
      }
      if (!mappedColumns.includes("customer_name")) {
        throw new Error("Could not find Customer Name column.");
      }
      if (!mappedColumns.includes("mobile_number")) {
        throw new Error("Could not find Mobile column.");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Processing records..." });

      // Transform data
      const transformedData: any[] = [];
      const seenCodes = new Set<string>();

      for (const row of jsonData) {
        const record = row as Record<string, any>;
        const transformed: Record<string, any> = {};

        for (const [excelCol, schemaCol] of Object.entries(columnMap)) {
          transformed[schemaCol] = cleanValue(record[excelCol], schemaCol, DATE_COLUMNS);
        }

        // Skip if no customer code
        if (!transformed.customer_code) continue;

        const codeKey = String(transformed.customer_code).trim();
        if (seenCodes.has(codeKey)) {
          const existingIndex = transformedData.findIndex(
            (t) => String(t.customer_code).trim() === codeKey
          );
          if (existingIndex >= 0) {
            transformedData.splice(existingIndex, 1);
          }
        }
        seenCodes.add(codeKey);

        // Set defaults
        transformed.status = transformed.status || "New";

        transformedData.push(transformed);
      }

      setProgress({ current: 0, total: transformedData.length, status: "Uploading to database..." });

      // Upload in batches
      const batchSize = 100;
      let uploaded = 0;

      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);

        const { error } = await supabase.from("leads").upsert(
          batch.map((item) => ({
            ...item,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "customer_code" }
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

      await queryClient.invalidateQueries({ queryKey: ["leads"] });

      toast({
        title: "Import Successful",
        description: `Successfully imported ${transformedData.length} leads.`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import leads data",
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
            Upload Leads Excel
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
                  id="leads-excel-upload"
                />
                <label
                  htmlFor="leads-excel-upload"
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
                  Customer Code, Customer Name, Mobile, Alternate Mobile, Location, Company Name, GST Number, Email, Status
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Required Columns
                </h4>
                <p className="text-xs text-muted-foreground">
                  <strong>Customer Code</strong>, <strong>Customer Name</strong>, <strong>Mobile</strong>
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
