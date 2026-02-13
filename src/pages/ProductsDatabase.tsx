import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Plus,
  Package,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { ProductsUploadDialog } from "@/components/products/ProductsUploadDialog";
import { ProductsExport } from "@/components/products/ProductsExport";

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  category: string;
  weight_kg: number | null;
  product_type: string;
  renewal_applicable: boolean;
}

const useProductsDatabase = () => {
  return useQuery({
    queryKey: ["products-database"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, product_code, product_name, category, weight_kg, product_type, renewal_applicable")
        .order("category", { ascending: true })
        .order("product_code", { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
  });
};

const ProductsDatabase = () => {
  const { data: products, isLoading } = useProductsDatabase();
  const [searchTerm, setSearchTerm] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.product_code.toLowerCase().includes(term) ||
        p.product_name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach((p) => {
      const cat = p.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts]);

  // Sort categories alphabetically
  const sortedCategories = useMemo(() => {
    return Object.keys(groupedProducts).sort();
  }, [groupedProducts]);

  // Initialize all categories as open when data loads
  useMemo(() => {
    if (sortedCategories.length > 0 && openCategories.size === 0) {
      setOpenCategories(new Set(sortedCategories));
    }
  }, [sortedCategories]);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleAddProduct = () => {
    setFormMode("add");
    setSelectedProduct(null);
    setFormDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setFormMode("edit");
    setSelectedProduct(product);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-database"] });
      toast({
        title: "Product Deleted",
        description: "The product has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Products Database</h1>
            <p className="text-sm text-muted-foreground">
              {products?.length || 0} products in catalog
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProductsExport products={products || []} />
          <ProductsUploadDialog />
          <Button
            className="gap-2 bg-green-600 hover:bg-green-700"
            onClick={handleAddProduct}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by Product Name, Code, or Category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Products by Category */}
      <div className="space-y-3">
        {sortedCategories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/25 p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold text-foreground">No products found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm
                ? "Try a different search term"
                : "Add your first product to get started"}
            </p>
          </div>
        ) : (
          sortedCategories.map((category) => {
            const categoryProducts = groupedProducts[category];
            const isOpen = openCategories.has(category);

            return (
              <Collapsible
                key={category}
                open={isOpen}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-medium transition-colors",
                      "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Package className="h-4 w-4" />
                    <span>
                      {category} ({categoryProducts.length})
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 overflow-hidden rounded-lg border bg-card shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-semibold">Product Code</TableHead>
                          <TableHead className="font-semibold">Product Name</TableHead>
                          <TableHead className="text-center font-semibold">
                            Weight (kg)
                          </TableHead>
                          <TableHead className="text-center font-semibold">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryProducts.map((product) => (
                          <TableRow key={product.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              {product.product_code}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {product.product_name}
                                {product.product_type === "service" && (
                                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                    Service
                                  </Badge>
                                )}
                                {product.renewal_applicable && (
                                  <Badge variant="outline" className="text-xs border-warning/30 text-warning">
                                    Renewal
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {product.product_type === "service" ? "—" : (product.weight_kg ?? 0)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-8 gap-1.5 bg-primary hover:bg-primary/90"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 gap-1.5"
                                  onClick={() => handleDeleteClick(product)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <ProductFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        product={selectedProduct}
        mode={formMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{productToDelete?.product_name}</strong>? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                productToDelete && deleteProductMutation.mutate(productToDelete.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductsDatabase;
