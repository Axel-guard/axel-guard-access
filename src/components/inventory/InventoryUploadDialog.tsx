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
import * as XLSX from "xlsx";

// Semantic column mapping - maps various column name variations to our schema
// Order matters - more specific matches should come first
const COLUMN_MAPPINGS: Record<string, string[]> = {
  serial_number: ["serial number", "serial_number", "serial", "sr no", "sr.no", "s.no", "sno", "serial no", "device serial", "imei", "device_id", "device id", "sl no", "sl.no", "slno"],
  product_name: ["model name", "product_name", "product name", "product", "item name", "item", "device name", "device", "model", "description"],
  status: ["status", "inventory status", "stock status", "availability", "state"],
  qc_result: ["qc result", "qc_result", "qc", "quality check", "quality", "test result", "qc status", "quality status"],
  in_date: ["in date", "in_date", "inward date", "received date", "entry date", "purchase date", "date added", "added date", "inward", "receipt date"],
  dispatch_date: ["dispatch date", "dispatch_date", "shipped date", "ship date", "sent date", "outward date", "delivery date", "out date"],
  customer_code: ["customer code", "customer_code", "cust code", "client code", "customer id", "client id", "cust_code"],
  customer_name: ["customer name", "customer_name", "client name", "buyer name", "buyer", "consignee"],
  customer_city: ["customer city", "customer_city", "city", "location", "place", "destination", "customer location", "ship to city"],
  order_id: ["order id", "order_id", "order no", "order number", "sales order", "so number", "invoice", "invoice no"],
  category: ["category", "product category", "type", "item category", "product type", "group", "item type"],
  qc_date: ["qc date", "qc_date", "quality check date", "test date", "checked date", "inspection date"],
  sd_connect: ["sd_connect", "sd connect", "sd card", "sd status", "memory card"],
  all_channels: ["all_channels", "all channels", "channels", "channel test", "video channels"],
  network_test: ["network_test", "network test", "network", "connectivity", "network status", "wifi test"],
  gps_test: ["gps_test", "gps test", "gps", "gps status", "location test"],
  sim_slot: ["sim_slot", "sim slot", "sim", "sim card", "sim status"],
  online_test: ["online_test", "online test", "online", "online status", "cloud test"],
  camera_quality: ["camera_quality", "camera quality", "camera", "video quality", "image quality"],
  monitor_test: ["monitor_test", "monitor test", "monitor", "display test", "screen test"],
  ip_address: ["ip_address", "ip address", "ip", "device ip", "network ip"],
  checked_by: ["checked_by", "checked by", "inspector", "tested by", "quality inspector", "qc person", "operator"],
};

// Helper to normalize column names for matching
const normalizeColumnName = (name: string): string => {
  return name.toLowerCase().trim().replace(/[_\-\.]/g, " ").replace(/\s+/g, " ");
};

// Find the best matching schema column for an Excel column
// Uses strict exact matching first, then partial matching
const findMatchingColumn = (excelColumn: string): string | null => {
  const normalized = normalizeColumnName(excelColumn);
  
  // First pass: exact match only
  for (const [schemaColumn, variations] of Object.entries(COLUMN_MAPPINGS)) {
    for (const variation of variations) {
      if (normalized === variation) {
        return schemaColumn;
      }
    }
  }
  
  // Second pass: starts with or ends with match
  for (const [schemaColumn, variations] of Object.entries(COLUMN_MAPPINGS)) {
    for (const variation of variations) {
      if (normalized.startsWith(variation) || normalized.endsWith(variation)) {
        return schemaColumn;
      }
    }
  }
  
  return null;
};

// Parse date from various formats
const parseDate = (value: any): string | null => {
  if (!value) return null;
  
  // Handle Excel serial dates
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  
  // Handle string dates
  if (typeof value === "string") {
    const dateStr = value.trim();
    
    // Try common formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // D/M/YY or D/M/YYYY
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        try {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split("T")[0];
          }
        } catch {
          continue;
        }
      }
    }
    
    // Try direct parsing
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
    } catch {
      return null;
    }
  }
  
  return null;
};

// Clean and normalize values
const cleanValue = (value: any, columnType: string): any => {
  if (value === undefined || value === null || value === "") return null;
  
  const dateColumns = ["in_date", "dispatch_date", "qc_date"];
  if (dateColumns.includes(columnType)) {
    return parseDate(value);
  }
  
  // Clean string values
  if (typeof value === "string") {
    return value.trim() || null;
  }
  
  return value;
};

interface InventoryUploadDialogProps {
  onUploadComplete?: () => void;
}

export const InventoryUploadDialog = ({ onUploadComplete }: InventoryUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processExcelFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, status: "Reading file..." });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      if (jsonData.length === 0) {
        throw new Error("No data found in the Excel file");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Mapping columns..." });

      // Get Excel columns and create mapping
      const excelColumns = Object.keys(jsonData[0] as object);
      const columnMap: Record<string, string> = {};
      
      for (const excelCol of excelColumns) {
        const schemaCol = findMatchingColumn(excelCol);
        if (schemaCol) {
          columnMap[excelCol] = schemaCol;
        }
      }

      // Check for required columns
      const mappedColumns = Object.values(columnMap);
      if (!mappedColumns.includes("serial_number")) {
        throw new Error("Could not find Serial Number column. Please ensure your Excel has a column for serial numbers.");
      }
      if (!mappedColumns.includes("product_name")) {
        throw new Error("Could not find Product Name column. Please ensure your Excel has a column for product names.");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Processing records..." });

      // Transform data
      const transformedData: any[] = [];
      const seenSerials = new Set<string>();

      for (const row of jsonData) {
        const record = row as Record<string, any>;
        const transformed: Record<string, any> = {};
        
        for (const [excelCol, schemaCol] of Object.entries(columnMap)) {
          transformed[schemaCol] = cleanValue(record[excelCol], schemaCol);
        }

        // Skip if no serial number
        if (!transformed.serial_number) continue;
        
        // Handle duplicates - keep last occurrence
        const serialKey = String(transformed.serial_number).trim();
        if (seenSerials.has(serialKey)) {
          // Remove previous duplicate
          const existingIndex = transformedData.findIndex(
            (t) => String(t.serial_number).trim() === serialKey
          );
          if (existingIndex >= 0) {
            transformedData.splice(existingIndex, 1);
          }
        }
        seenSerials.add(serialKey);

        // Set defaults
        transformed.status = transformed.status || "In Stock";
        transformed.qc_result = transformed.qc_result || "Pending";

        transformedData.push(transformed);
      }

      setProgress({ current: 0, total: transformedData.length, status: "Uploading to database..." });

      // Upload in batches
      const batchSize = 100;
      let uploaded = 0;

      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);
        
        const { error } = await supabase.from("inventory").upsert(
          batch.map((item) => ({
            ...item,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "serial_number" }
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

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });

      toast({
        title: "Import Successful",
        description: `Successfully imported ${transformedData.length} inventory records.`,
      });

      setOpen(false);
      onUploadComplete?.();
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import inventory data",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0, status: "" });
    }
  }, [queryClient, toast, onUploadComplete]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
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
            Upload Inventory Excel
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
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
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
                  Smart Column Detection
                </h4>
                <p className="text-xs text-muted-foreground">
                  Automatically detects columns like Serial Number, Product Name, Status, 
                  QC Result, In Date, Customer, City, and more - even with different naming conventions.
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Required Columns
                </h4>
                <p className="text-xs text-muted-foreground">
                  Your Excel must have at least: <strong>Serial Number</strong> and <strong>Product Name</strong>
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
