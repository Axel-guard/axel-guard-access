import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, History, ShoppingCart, Wallet, Ticket } from "lucide-react";
import { CustomerProfile } from "@/hooks/useCustomerDetails";
import { CustomerBasicTab } from "./tabs/CustomerBasicTab";
import { CustomerHistoryTab } from "./tabs/CustomerHistoryTab";
import { CustomerOrdersTab } from "./tabs/CustomerOrdersTab";
import { CustomerLedgerTab } from "./tabs/CustomerLedgerTab";
import { CustomerTicketsTab } from "./tabs/CustomerTicketsTab";

interface CustomerTabsProps {
  customerCode: string;
  customer: CustomerProfile;
}

export const CustomerTabs = ({ customerCode, customer }: CustomerTabsProps) => {
  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50">
        <TabsTrigger
          value="basic"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Basic</span>
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
        </TabsTrigger>
        <TabsTrigger
          value="orders"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg"
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Orders</span>
        </TabsTrigger>
        <TabsTrigger
          value="ledger"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-amber-600 data-[state=active]:text-white rounded-lg"
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Account Ledger</span>
        </TabsTrigger>
        <TabsTrigger
          value="tickets"
          className="flex items-center gap-2 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-lg"
        >
          <Ticket className="h-4 w-4" />
          <span className="hidden sm:inline">Tickets</span>
        </TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <TabsContent value="basic">
          <CustomerBasicTab customer={customer} />
        </TabsContent>
        <TabsContent value="history">
          <CustomerHistoryTab customerCode={customerCode} />
        </TabsContent>
        <TabsContent value="orders">
          <CustomerOrdersTab customerCode={customerCode} />
        </TabsContent>
        <TabsContent value="ledger">
          <CustomerLedgerTab customerCode={customerCode} />
        </TabsContent>
        <TabsContent value="tickets">
          <CustomerTicketsTab customerCode={customerCode} />
        </TabsContent>
      </div>
    </Tabs>
  );
};
