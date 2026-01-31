import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, ClipboardCheck, BarChart3 } from "lucide-react";

const InventoryPage = () => {
  const sections = [
    {
      title: "Inventory Stock",
      description: "View and manage all devices in stock",
      icon: Package,
      color: "bg-primary",
    },
    {
      title: "Dispatch",
      description: "Barcode scanning workflow for device dispatch",
      icon: Truck,
      color: "bg-info",
    },
    {
      title: "Quality Check",
      description: "QC workflow with pass/fail testing",
      icon: ClipboardCheck,
      color: "bg-warning",
    },
    {
      title: "Reports",
      description: "Statistics and visualizations",
      icon: BarChart3,
      color: "bg-success",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <p className="text-muted-foreground">Manage your device inventory</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <Card
            key={section.title}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          >
            <CardHeader className="flex-row items-center gap-4 space-y-0">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${section.color}`}
              >
                <section.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to access {section.title.toLowerCase()} features
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Full inventory management features including Excel upload, barcode scanning,
            quality checks, and dispatch tracking will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;
