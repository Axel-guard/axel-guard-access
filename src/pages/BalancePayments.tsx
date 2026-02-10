import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText, Clock, History } from "lucide-react";
import { PendingPaymentsTable } from "@/components/balance/PendingPaymentsTable";
import { PaymentHistoryTable } from "@/components/balance/PaymentHistoryTable";

const BalancePaymentsPage = () => {
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Balance Payments</h1>
          <p className="text-muted-foreground">Auto-synced from Sales Database</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2 bg-success hover:bg-success/90">
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <FileText className="h-4 w-4" />
            View Balance Report
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-border px-4 pt-4">
              <TabsList className="h-auto bg-transparent p-0 gap-6">
                <TabsTrigger
                  value="pending"
                  className="relative rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Pending Payments
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="relative rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <History className="mr-2 h-4 w-4" />
                  Payment History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="m-0">
              <PendingPaymentsTable />
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <PaymentHistoryTable />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalancePaymentsPage;
