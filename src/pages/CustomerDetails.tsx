import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, Building2, Phone, MapPin, Mail, Hash } from "lucide-react";
import { useCustomerSearch, CustomerProfile } from "@/hooks/useCustomerDetails";
import { CustomerProfileHeader } from "@/components/customer/CustomerProfileHeader";
import { CustomerTabs } from "@/components/customer/CustomerTabs";

const CustomerDetailsPage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const { data: customer, isLoading, isError } = useCustomerSearch(activeSearch);

  const handleSearch = () => {
    setActiveSearch(searchInput.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Details</h1>
        <p className="text-muted-foreground">Search and view complete customer information</p>
      </div>

      {/* Search Card */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter Customer Code, Mobile Number, or Name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="pl-10 h-11"
              />
            </div>
            <Button onClick={handleSearch} className="h-11 px-6">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {/* No Search Yet */}
      {!activeSearch && !isLoading && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Search for a Customer
            </h3>
            <p className="text-muted-foreground max-w-md">
              Enter a customer code, mobile number, or name to view their complete profile,
              order history, account ledger, and support tickets.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Not Found */}
      {activeSearch && !isLoading && !customer && (
        <Card className="shadow-card border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Records Found
            </h3>
            <p className="text-muted-foreground max-w-md">
              No customer found matching "{activeSearch}". Please check the customer code
              or try searching with a different value.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Customer Found - Show Profile & Tabs */}
      {customer && !isLoading && (
        <>
          <CustomerProfileHeader customer={customer} />
          <CustomerTabs customerCode={customer.customer_code} customer={customer} />
        </>
      )}
    </div>
  );
};

export default CustomerDetailsPage;
