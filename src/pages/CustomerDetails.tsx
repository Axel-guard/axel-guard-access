import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, User, Building2, Phone, Hash } from "lucide-react";
import {
  useCustomerSearch,
  useCustomerSuggestions,
  CustomerProfile,
  CustomerSuggestion,
} from "@/hooks/useCustomerDetails";
import { CustomerProfileHeader } from "@/components/customer/CustomerProfileHeader";
import { CustomerTabs } from "@/components/customer/CustomerTabs";
import { cn } from "@/lib/utils";

const CustomerDetailsPage = () => {
  const location = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: customer, isLoading, isError } = useCustomerSearch(activeSearch);
  const { data: suggestions = [] } = useCustomerSuggestions(searchInput);

  // Auto-load customer when navigated here with preloadCode state
  useEffect(() => {
    const code = (location.state as { preloadCode?: string } | null)?.preloadCode;
    if (code) {
      setSearchInput(code);
      setActiveSearch(code);
      setShowDropdown(false);
    }
  }, [location.state]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = () => {
    if (searchInput.trim()) {
      setActiveSearch(searchInput.trim());
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowDropdown(false);
  };

  const handleSelectSuggestion = (s: CustomerSuggestion) => {
    setSearchInput(s.customer_code);
    setActiveSearch(s.customer_code);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setShowDropdown(e.target.value.trim().length >= 2);
  };

  const visibleSuggestions = showDropdown && suggestions.length > 0 ? suggestions : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Details</h1>
        <p className="text-muted-foreground">
          Search by Name, Company, Mobile Number, or Customer Code
        </p>
      </div>

      {/* Search Card with autocomplete */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
              <Input
                ref={inputRef}
                placeholder="Search by Name, Company, Mobile, or Customer Code…"
                value={searchInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchInput.trim().length >= 2 && suggestions.length > 0)
                    setShowDropdown(true);
                }}
                className="pl-10 h-11"
                autoComplete="off"
              />

              {/* Suggestion dropdown */}
              {visibleSuggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden"
                >
                  {visibleSuggestions.map((s) => (
                    <button
                      key={s.customer_code}
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevents input blur
                        handleSelectSuggestion(s);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0",
                        "flex items-start gap-3"
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {s.customer_name}
                          </span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0 font-mono shrink-0">
                            {s.customer_code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          {s.company_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {s.company_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {s.mobile_number}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSearch} className="h-11 px-6 shrink-0">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
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
            <h3 className="text-lg font-semibold text-foreground mb-2">Search for a Customer</h3>
            <p className="text-muted-foreground max-w-md">
              Start typing to see suggestions. Select one or press Search to find a customer by
              name, company, mobile number, or customer code.
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
            <h3 className="text-lg font-semibold text-foreground mb-2">No Records Found</h3>
            <p className="text-muted-foreground max-w-md">
              No customer found matching "{activeSearch}". Try searching by company name or mobile
              number.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Customer Profile */}
      {customer && !isLoading && (
        <>
          <CustomerProfileHeader customer={customer} />
          <CustomerTabs
            customerCode={customer.customer_code}
            customer={customer}
            mobileNumber={customer.mobile_number}
          />
        </>
      )}
    </div>
  );
};

export default CustomerDetailsPage;
