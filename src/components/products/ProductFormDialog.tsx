import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  category: string;
  weight_kg: number | null;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  mode: "add" | "edit";
}

export const ProductFormDialog = ({
  open,
  onOpenChange,
  product,
  mode,
}: ProductFormDialogProps) => {
  const [formData, setFormData] = useState({
    product_code: "",
    product_name: "",
    category: "",
    weight_kg: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (mode === "edit" && product) {
      setFormData({
        product_code: product.product_code || "",
        product_name: product.product_name || "",
        category: product.category || "",
        weight_kg: product.weight_kg?.toString() || "",
      });
    } else {
      setFormData({
        product_code: "",
        product_name: "",
        category: "",
        weight_kg: "",
      });
    }
  }, [mode, product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_code.trim() || !formData.product_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Product Code and Product Name are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const category = formData.category.trim() || "General";
      const data = {
        product_code: formData.product_code.trim(),
        product_name: formData.product_name.trim(),
        category,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : 0,
        product_type: category.toLowerCase() === "services" ? "service" : "physical",
        updated_at: new Date().toISOString(),
      };

      if (mode === "add") {
        const { error } = await supabase.from("products").insert([data]);
        if (error) throw error;
        toast({
          title: "Product Added",
          description: `${data.product_name} has been added successfully.`,
        });
      } else {
        const { error } = await supabase
          .from("products")
          .update(data)
          .eq("id", product?.id);
        if (error) throw error;
        toast({
          title: "Product Updated",
          description: `${data.product_name} has been updated successfully.`,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["products-database"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} product`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add New Product" : "Edit Product"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product_code">Product Code *</Label>
            <Input
              id="product_code"
              value={formData.product_code}
              onChange={(e) =>
                setFormData({ ...formData, product_code: e.target.value })
              }
              placeholder="e.g., AXGBC"
              disabled={mode === "edit"}
              className={mode === "edit" ? "bg-muted" : ""}
            />
            {mode === "edit" && (
              <p className="text-xs text-muted-foreground">
                Product code cannot be changed
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product_name">Product Name *</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) =>
                setFormData({ ...formData, product_name: e.target.value })
              }
              placeholder="e.g., 2 MP Heavy Duty Bullet Camera"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g., Cameras"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight_kg">Weight (kg)</Label>
            <Input
              id="weight_kg"
              type="number"
              step="0.01"
              min="0"
              value={formData.weight_kg}
              onChange={(e) =>
                setFormData({ ...formData, weight_kg: e.target.value })
              }
              placeholder="e.g., 0.5"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "add" ? "Add Product" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
