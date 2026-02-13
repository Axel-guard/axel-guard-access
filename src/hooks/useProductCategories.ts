import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  product_name: string;
  category: string;
  product_type: string;
}

export const useProductCategories = () => {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("product_name, category, product_type, renewal_applicable")
        .order("category", { ascending: true })
        .order("product_name", { ascending: true });

      if (error) throw error;

      const products = data as (Product & { renewal_applicable: boolean })[];
      const categories: string[] = [];
      const productsByCategory: Record<string, string[]> = {};
      const productTypes: Record<string, string> = {};
      const renewalApplicable: Record<string, boolean> = {};

      products.forEach((p) => {
        const cat = p.category || "Uncategorized";
        if (!productsByCategory[cat]) {
          productsByCategory[cat] = [];
          categories.push(cat);
        }
        productsByCategory[cat].push(p.product_name);
        productTypes[p.product_name] = p.product_type || "physical";
        renewalApplicable[p.product_name] = p.renewal_applicable ?? false;
      });

      return { categories: categories.sort(), productsByCategory, productTypes, renewalApplicable };
    },
  });
};
