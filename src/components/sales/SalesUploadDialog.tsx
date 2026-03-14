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
  parseNumber,
  parseDate,
} from "@/lib/excelParser";

// Direct column name mapping (case-insensitive, trimmed)
const getColumnValue = (row: Record<string, any>, ...possibleNames: string[]): any => {
  for (const key of Object.keys(row)) {
    const normalized = key.toLowerCase().trim();
    for (const name of possibleNames) {
      if (normalized === name.toLowerCase().trim()) {
        return row[key];
      }
    }
  }
  return undefined;
};

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

      setProgress({ current: 0, total: jsonData.length, status: "Grouping orders..." });

      // Group rows by Order ID
      const orderGroups = new Map<string, Record<string, any>[]>();

      for (const row of jsonData) {
        const rawRow = row as Record<string, any>;
        const orderId = String(
          getColumnValue(rawRow, "Order ID", "order_id", "Order No", "OrderID") ?? ""
        ).trim();

        if (!orderId) continue;

        if (!orderGroups.has(orderId)) {
          orderGroups.set(orderId, []);
        }
        orderGroups.get(orderId)!.push(rawRow);
      }

      const totalOrders = orderGroups.size;
      setProgress({ current: 0, total: totalOrders, status: `Processing ${totalOrders} orders...` });

      // First, delete existing orders that will be replaced (Safe Replace strategy)
      const orderIds = Array.from(orderGroups.keys());
      
      // Delete in batches of 50
      for (let i = 0; i < orderIds.length; i += 50) {
        const batch = orderIds.slice(i, i + 50);
        // Delete sale_items first (foreign key)
        await supabase.from("sale_items").delete().in("order_id", batch);
        // Delete payment_history
        await supabase.from("payment_history").delete().in("order_id", batch);
        // Delete sales
        await supabase.from("sales").delete().in("order_id", batch);
      }

      let successCount = 0;
      let errorCount = 0;
      let processed = 0;

      for (const [orderId, rows] of orderGroups) {
        try {
          const firstRow = rows[0];

          // Extract order-level data from first row
          const saleDate = parseDate(getColumnValue(firstRow, "Sale Date", "sale_date", "Date")) 
            || new Date().toISOString().split("T")[0];
          const customerCode = String(getColumnValue(firstRow, "Customer Code", "customer_code", "Cust Code") ?? "").trim() || "UNKNOWN";
          const customerName = String(getColumnValue(firstRow, "Customer Name", "customer_name", "Name") ?? "").trim() || null;
          const companyName = String(getColumnValue(firstRow, "Company Name", "company_name") ?? "").trim() || null;
          const employeeName = String(getColumnValue(firstRow, "Employee", "employee_name", "Employee Name") ?? "").trim() || "Imported";
          const customerContact = String(getColumnValue(firstRow, "Contact", "customer_contact", "Mobile", "Phone") ?? "").trim() || null;
          const saleType = String(getColumnValue(firstRow, "Sale Type", "sale_type") ?? "Without").trim();

          // Financial data (same across all rows of an order)
          const subtotal = parseNumber(getColumnValue(firstRow, "Subtotal", "Sub Total")) || 0;
          const courierCost = parseNumber(getColumnValue(firstRow, "Courier Cost", "Courier")) || 0;
          const gstAmount = parseNumber(getColumnValue(firstRow, "GST Amount", "GST")) || 0;
          const totalAmount = parseNumber(getColumnValue(firstRow, "Total Amount", "Total")) || 0;
          const amountReceived = parseNumber(getColumnValue(firstRow, "Amount Received", "Received")) || 0;
          const balanceAmount = parseNumber(getColumnValue(firstRow, "Balance Amount", "Balance")) || 0;
          const account = String(getColumnValue(firstRow, "Account", "account_received") ?? "").trim() || null;

          // Insert sale record
          const { error: saleError } = await supabase.from("sales").insert({
            order_id: orderId,
            sale_date: saleDate,
            customer_code: customerCode,
            customer_name: customerName || undefined,
            company_name: companyName || undefined,
            employee_name: employeeName,
            customer_contact: customerContact || undefined,
            sale_type: saleType === "With" ? "With" : "Without",
            subtotal,
            courier_cost: courierCost,
            gst_amount: gstAmount,
            total_amount: totalAmount || subtotal,
            amount_received: amountReceived,
            balance_amount: balanceAmount,
            account_received: account || undefined,
          });

          if (saleError) {
            console.error(`Sale insert error for ${orderId}:`, saleError);
            errorCount++;
            processed++;
            continue;
          }

          // Insert sale items for each row that has product data
          const saleItems: { order_id: string; product_name: string; quantity: number; unit_price: number }[] = [];

          for (const row of rows) {
            const productName = String(getColumnValue(row, "Product Name", "product_name") ?? "").trim();
            const productCode = String(getColumnValue(row, "Product Code", "product_code") ?? "").trim();
            const quantity = parseNumber(getColumnValue(row, "Quantity", "Qty")) || 0;
            const unitPrice = parseNumber(getColumnValue(row, "Unit Price", "Rate", "Price")) || 0;

            // Include row if it has any product info or quantity
            if (productName || productCode || quantity > 0) {
              saleItems.push({
                order_id: orderId,
                product_name: productName || productCode || "Unknown Product",
                quantity: quantity || 1,
                unit_price: unitPrice,
              });
            }
          }

          if (saleItems.length > 0) {
            const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);
            if (itemsError) {
              console.error(`Sale items error for ${orderId}:`, itemsError);
            }
          }

          // Insert payment history if payment data exists
          const paymentDate = parseDate(getColumnValue(firstRow, "Payment Date", "payment_date"));
          const paymentAmount = parseNumber(getColumnValue(firstRow, "Payment Amount", "payment_amount"));
          const paymentReference = String(getColumnValue(firstRow, "Payment Reference", "payment_reference") ?? "").trim() || null;

          if (paymentDate && paymentAmount && paymentAmount > 0) {
            await supabase.from("payment_history").insert({
              order_id: orderId,
              payment_date: paymentDate,
              amount: paymentAmount,
              account_received: account || "Cash",
              payment_reference: paymentReference || undefined,
            });
          }

          successCount++;
        } catch (err: any) {
          console.error(`Error processing order ${orderId}:`, err);
          errorCount++;
        }

        processed++;
        if (processed % 10 === 0 || processed === totalOrders) {
          setProgress({
            current: processed,
            total: totalOrders,
            status: `Processed ${processed} of ${totalOrders} orders...`,
          });
        }
      }

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
      await queryClient.invalidateQueries({ queryKey: ["all-sales"] });
      await queryClient.invalidateQueries({ queryKey: ["all-sales-balance"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["current-month-sales"] });
      await queryClient.invalidateQueries({ queryKey: ["payment-history-with-sales"] });

      let description = `Successfully imported ${successCount} orders with product line items.`;
      if (errorCount > 0) {
        description += ` ${errorCount} orders failed.`;
      }

      toast({
        title: successCount > 0 ? "Import Complete" : "Import Failed",
        description,
        variant: successCount === 0 ? "destructive" : undefined,
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
                  Multi-Product Orders
                </h4>
                <p className="text-xs text-muted-foreground">
                  Groups rows by Order ID. Each product becomes a line item. Payment history is auto-created.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Safe Replace
                </h4>
                <p className="text-xs text-muted-foreground">
                  Existing orders with matching IDs are replaced. Other records are preserved.
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
                    {progress.current} / {progress.total} orders
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
