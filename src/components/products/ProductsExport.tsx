import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  category: string;
  weight_kg: number | null;
}

interface ProductsExportProps {
  products: Product[];
}

export const ProductsExport = ({ products }: ProductsExportProps) => {
  const { toast } = useToast();

  const handleExport = () => {
    if (!products || products.length === 0) {
      toast({
        title: "No Data",
        description: "No products to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for export
    const exportData = products.map((p) => ({
      "Product Code": p.product_code,
      "Product Name": p.product_name,
      "Category": p.category,
      "Weight (kg)": p.weight_kg ?? 0,
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // Product Code
      { wch: 40 }, // Product Name
      { wch: 20 }, // Category
      { wch: 12 }, // Weight
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Products");

    // Generate filename with date
    const filename = `products_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);

    toast({
      title: "Export Successful",
      description: `Exported ${products.length} products to Excel.`,
    });
  };

  return (
    <Button variant="outline" className="gap-2" onClick={handleExport}>
      <Download className="h-4 w-4" />
      Download Excel
    </Button>
  );
};
