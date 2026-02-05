import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  MoreVertical,
  Eye,
  FileDown,
  ArrowRightLeft,
  Trash2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import {
  useQuotations,
  useQuotationWithItems,
  useConvertToSale,
  useDeleteQuotation,
  Quotation,
} from "@/hooks/useQuotations";
import { generateQuotationPDF } from "./QuotationPDF";
import { useNavigate } from "react-router-dom";
import { ConvertToSaleDialog } from "./ConvertToSaleDialog";

export const QuotationsList = () => {
  const { data: quotations, isLoading } = useQuotations();
  const convertToSale = useConvertToSale();
  const deleteQuotation = useDeleteQuotation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);
  
  // Convert to Sale dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [quotationToConvert, setQuotationToConvert] = useState<{ id: string; quotation_no: string } | null>(null);

  const { data: selectedQuotation } = useQuotationWithItems(selectedQuotationId);

  const filteredQuotations = quotations?.filter((q) => {
    const query = searchQuery.toLowerCase();
    return (
      q.quotation_no?.toLowerCase().includes(query) ||
      q.customer_name?.toLowerCase().includes(query) ||
      q.company_name?.toLowerCase().includes(query)
    );
  });

  const handleDownloadPDF = async (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    // Wait for data to load then download
    setTimeout(() => {
      if (selectedQuotation) {
        // Map DB items to QuotationItem interface with backward compatibility
        const mappedItems = (selectedQuotation.items || []).map((item: any) => ({
          ...item,
          description: item.description || "",
          unit: item.unit || "Pcs",
        }));
        // Cast quotation to expected type with mapped items
        const quotationWithItems = {
          ...selectedQuotation,
          items: mappedItems,
        } as Quotation;
        const doc = generateQuotationPDF(quotationWithItems, mappedItems);
        doc.save(`Quotation-${selectedQuotation.quotation_no}.pdf`);
      }
    }, 500);
  };

  const handleConvertClick = (quotation: { id: string; quotation_no: string }) => {
    setQuotationToConvert(quotation);
    setConvertDialogOpen(true);
  };

  const handleConvertConfirm = async (employeeName: string) => {
    if (!quotationToConvert) return;
    
    const orderId = await convertToSale.mutateAsync({
      quotationId: quotationToConvert.id,
      employeeName,
    });
    if (orderId) {
      setConvertDialogOpen(false);
      setQuotationToConvert(null);
      navigate("/sales");
    }
  };

  const handleDeleteClick = (quotationId: string) => {
    setQuotationToDelete(quotationId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (quotationToDelete) {
      await deleteQuotation.mutateAsync(quotationToDelete);
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Converted":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            Converted
          </Badge>
        );
      case "Sent":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            Sent
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground">Draft</Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Quotations</h2>
          <p className="text-sm text-muted-foreground">
            {filteredQuotations?.length || 0} quotations
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by Quotation No, Customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations?.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-semibold text-primary">
                      {quotation.quotation_no}
                    </TableCell>
                    <TableCell>
                      {format(new Date(quotation.quotation_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{quotation.customer_name}</TableCell>
                    <TableCell>{quotation.company_name || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{Number(quotation.grand_total).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(quotation.id)}
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          {quotation.status !== "Converted" && (
                            <DropdownMenuItem
                              onClick={() => handleConvertClick({ id: quotation.id, quotation_no: quotation.quotation_no })}
                              disabled={convertToSale.isPending}
                            >
                              <ArrowRightLeft className="mr-2 h-4 w-4" />
                              Convert to Sale
                            </DropdownMenuItem>
                          )}
                          {quotation.status === "Converted" && (
                            <DropdownMenuItem
                              onClick={() => navigate("/sales")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Sale (#{quotation.converted_order_id})
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(quotation.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredQuotations || filteredQuotations.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No quotations found. Create your first quotation.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The quotation will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Sale Dialog */}
      <ConvertToSaleDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        onConfirm={handleConvertConfirm}
        isConverting={convertToSale.isPending}
        quotationNo={quotationToConvert?.quotation_no || ""}
      />
    </div>
  );
};
