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

// Column mappings for QC Report based on user's Excel format
// S. No, QC Date, Serial Number, Device Type, SD Connect, All Channels, Network, GPS, SIM Slot, Online, Camera Quality, Monitor, Final Status, IP Address, Checked By
const COLUMN_MAPPINGS: Record<string, string[]> = {
  serial_number: ["serial number", "serial_number", "serial", "sr no", "s no", "s. no", "sno"],
  product_name: ["device type", "device_type", "model", "model name", "product", "device"],
  qc_date: ["qc date", "qc_date", "date", "test date", "check date"],
  sd_connect: ["sd connect", "sd_connect", "sd card", "sd"],
  all_channels: ["all channels", "all_channels", "channels"],
  network_test: ["network", "network_test", "network test"],
  gps_test: ["gps", "gps_test", "gps test"],
  sim_slot: ["sim slot", "sim_slot", "sim"],
  online_test: ["online", "online_test", "online test"],
  camera_quality: ["camera quality", "camera_quality", "camera"],
  monitor_test: ["monitor", "monitor_test", "monitor test", "display"],
  qc_result: ["final status", "final_status", "status", "result", "qc result"],
  ip_address: ["ip address", "ip_address", "ip"],
  checked_by: ["checked by", "checked_by", "inspector", "operator", "tested by"],
};

const DATE_COLUMNS = ["qc_date"];

export const QCReportUploadDialog = () => {
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
      if (!mappedColumns.includes("serial_number")) {
        throw new Error("Could not find Serial Number column.");
      }

      setProgress({ current: 0, total: jsonData.length, status: "Processing records..." });

      // Transform data
      const transformedData: any[] = [];
      const seenSerials = new Set<string>();

      for (const row of jsonData) {
        const record = row as Record<string, any>;
        const transformed: Record<string, any> = {};

        for (const [excelCol, schemaCol] of Object.entries(columnMap)) {
          transformed[schemaCol] = cleanValue(record[excelCol], schemaCol, DATE_COLUMNS);
        }

        // Skip if no serial number
        if (!transformed.serial_number) continue;

        const serialKey = String(transformed.serial_number).trim();
        if (seenSerials.has(serialKey)) {
          const existingIndex = transformedData.findIndex(
            (t) => String(t.serial_number).trim() === serialKey
          );
          if (existingIndex >= 0) {
            transformedData.splice(existingIndex, 1);
          }
        }
        seenSerials.add(serialKey);

        // Set defaults
        transformed.status = "In Stock";
        transformed.qc_result = transformed.qc_result || "Pending";
        transformed.product_name = transformed.product_name || "Unknown Device";

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

      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });

      toast({
        title: "Import Successful",
        description: `Successfully imported ${transformedData.length} QC records.`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import QC data",
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
          Upload QC Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload QC Report Excel
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
                  id="qc-excel-upload"
                />
                <label
                  htmlFor="qc-excel-upload"
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
                  S. No, QC Date, Serial Number, Device Type, SD Connect, All Channels, Network, GPS, SIM Slot, Online, Camera Quality, Monitor, Final Status, IP Address, Checked By
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Required Columns
                </h4>
                <p className="text-xs text-muted-foreground">
                  <strong>Serial Number</strong>
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
