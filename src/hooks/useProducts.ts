import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  product_code: string;
  product_name: string;
  category: string;
  weight_kg: number;
  created_at: string;
}

export interface ProductPricing {
  id: string;
  product_code: string;
  qty_0_10: number | null;
  qty_10_50: number | null;
  qty_50_100: number | null;
  qty_100_plus: number | null;
}

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
  });
};

export const useProductsByCategory = () => {
  return useQuery({
    queryKey: ["products-by-category"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      
      // Group by category
      const grouped = (data as Product[]).reduce((acc, product) => {
        if (!acc[product.category]) {
          acc[product.category] = [];
        }
        acc[product.category].push(product);
        return acc;
      }, {} as Record<string, Product[]>);

      return grouped;
    },
  });
};

export const useProductPricing = () => {
  return useQuery({
    queryKey: ["product-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_pricing")
        .select("*");

      if (error) throw error;
      return data as ProductPricing[];
    },
  });
};
