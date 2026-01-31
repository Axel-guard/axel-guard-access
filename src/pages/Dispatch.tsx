import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";

const DispatchPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dispatch</h1>
        <p className="text-muted-foreground">Manage order dispatches and tracking</p>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Dispatch Management</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track and manage order dispatches
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Dispatch management features including barcode scanning, courier tracking,
            and delivery status will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DispatchPage;
