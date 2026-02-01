import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import type { InventoryItem } from "@/hooks/useInventory";
import { format } from "date-fns";

interface QCExportProps {
  data: InventoryItem[];
}

export const QCExport = ({ data }: QCExportProps) => {
  const handleExport = () => {
    const exportData = data.map((item) => ({
      "Serial Number": item.serial_number,
      "Device Type": item.product_name,
      "QC Date": item.qc_date ? format(new Date(item.qc_date), "dd/MM/yyyy") : "",
      "Final Status": item.qc_result || "Pending",
      "SD Connect": item.sd_connect || "",
      "All Channels": item.all_channels || "",
      "Network": item.network_test || "",
      "GPS": item.gps_test || "",
      "SIM Slot": item.sim_slot || "",
      "Online": item.online_test || "",
      "Camera Quality": item.camera_quality || "",
      "Monitor": item.monitor_test || "",
      "IP Address": item.ip_address || "",
      "Checked By": item.checked_by || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "QC Reports");

    const fileName = `QC_Reports_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Button variant="outline" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      Export QC
    </Button>
  );
};
