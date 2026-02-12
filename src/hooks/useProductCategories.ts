import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  product_name: string;
  category: string;
}

export const useProductCategories = () => {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("product_name, category")
        .order("category", { ascending: true })
        .order("product_name", { ascending: true });

      if (error) throw error;

      const products = data as Product[];
      const categories: string[] = [];
      const productsByCategory: Record<string, string[]> = {};

      products.forEach((p) => {
        const cat = p.category || "Uncategorized";
        if (!productsByCategory[cat]) {
          productsByCategory[cat] = [];
          categories.push(cat);
        }
        productsByCategory[cat].push(p.product_name);
      });

      return { categories: categories.sort(), productsByCategory };
    },
  });
};
