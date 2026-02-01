import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InventoryItem } from "@/hooks/useInventory";
import { format } from "date-fns";

interface InventoryExportProps {
  data: InventoryItem[];
}

export const InventoryExport = ({ data }: InventoryExportProps) => {
  const { toast } = useToast();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return "";
    }
  };

  const prepareExportData = () => {
    return data.map((item) => ({
      "Serial Number": item.serial_number,
      "Product Name": item.product_name,
      Status: item.status,
      "QC Result": item.qc_result,
      "In Date": formatDate(item.in_date),
      "Dispatch Date": formatDate(item.dispatch_date),
      "Customer Code": item.customer_code || "",
      "Customer Name": item.customer_name || "",
      "Customer City": item.customer_city || "",
      "Order ID": item.order_id || "",
    }));
  };

  const exportToExcel = () => {
    try {
      const exportData = prepareExportData();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
        wch: Math.max(
          key.length,
          ...exportData.map((row) => String((row as any)[key] || "").length)
        ),
      }));
      worksheet["!cols"] = colWidths;

      const fileName = `Inventory_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} records to Excel`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export to Excel",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFontSize(16);
      doc.text("Inventory Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);
      doc.text(`Total Records: ${data.length}`, 14, 28);

      const tableData = data.map((item) => [
        item.serial_number,
        item.product_name.substring(0, 30),
        item.status,
        item.qc_result,
        formatDate(item.in_date),
        formatDate(item.dispatch_date),
        item.customer_name || "-",
        item.customer_city || "-",
      ]);

      autoTable(doc, {
        head: [
          [
            "Serial No",
            "Product",
            "Status",
            "QC",
            "In Date",
            "Dispatch",
            "Customer",
            "City",
          ],
        ],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      const fileName = `Inventory_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`;
      doc.save(fileName);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} records to PDF`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export to PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
