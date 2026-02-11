import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, List } from "lucide-react";
import { QuotationForm } from "./QuotationForm";
import { QuotationsList } from "./QuotationsList";
import { ConvertToSaleForm } from "./ConvertToSaleForm";

export const QuotationModule = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [convertingQuotationId, setConvertingQuotationId] = useState<string | null>(null);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  const handleFormSuccess = () => {
    setEditingQuotationId(null);
    setActiveTab("list");
  };

  const handleConvertToSale = (quotationId: string) => {
    setConvertingQuotationId(quotationId);
    setActiveTab("convert");
  };

  const handleEditQuotation = (quotationId: string) => {
    setEditingQuotationId(quotationId);
    setActiveTab("edit");
  };

  const handleConvertBack = () => {
    setConvertingQuotationId(null);
    setActiveTab("list");
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {activeTab !== "convert" && activeTab !== "edit" && (
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">All Quotations</span>
                <span className="sm:hidden">List</span>
              </TabsTrigger>
              <TabsTrigger value="create" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Quotation</span>
                <span className="sm:hidden">New</span>
              </TabsTrigger>
            </TabsList>
          )}

          {activeTab === "list" && (
            <Button
              onClick={() => setActiveTab("create")}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Quotation
            </Button>
          )}
        </div>

        <TabsContent value="list" className="mt-6">
          <QuotationsList
            onConvertToSale={handleConvertToSale}
            onEditQuotation={handleEditQuotation}
          />
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <QuotationForm onSuccess={handleFormSuccess} />
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          {editingQuotationId && (
            <QuotationForm
              editQuotationId={editingQuotationId}
              onSuccess={handleFormSuccess}
            />
          )}
        </TabsContent>

        <TabsContent value="convert" className="mt-6">
          {convertingQuotationId && (
            <ConvertToSaleForm
              quotationId={convertingQuotationId}
              onBack={handleConvertBack}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
