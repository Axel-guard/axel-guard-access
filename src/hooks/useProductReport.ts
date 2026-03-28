import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths } from "date-fns";

export interface ProductReportItem {
  rank: number;
  productName: string;
  category: string;
  totalRevenue: number;
  totalQuantity: number;
  totalOrders: number;
  avgUnitPrice: number;
  revenueContributionPct: number;
}

export interface CategoryData {
  category: string;
  revenue: number;
  quantity: number;
  productCount: number;
  contributionPct: number;
}

export interface ProductReportSummary {
  totalRevenue: number;
  totalQuantitySold: number;
  totalOrders: number;
  totalProducts: number;
  topProduct: string | null;
  topCategory: string | null;
}

export type ProductDateFilter = "this-month" | "last-3-months" | "this-year" | "all" | "custom";

interface UseProductReportOptions {
  dateFilter: ProductDateFilter;
  customStartDate?: Date;
  customEndDate?: Date;
  categoryFilter?: string;
}

export const useProductReport = (options: UseProductReportOptions) => {
  return useQuery({
    queryKey: ["product-report", options],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      switch (options.dateFilter) {
        case "this-month":
          startDate = startOfMonth(now);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "last-3-months":
          startDate = startOfMonth(subMonths(now, 2));
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "this-year": {
          const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
          startDate = new Date(fy, 3, 1);
          endDate = new Date(fy + 1, 3, 1);
          break;
        }
        case "custom":
          startDate = options.customStartDate || null;
          endDate = options.customEndDate || null;
          break;
      }

      // Step 1: get order_ids in date range
      let salesQuery = supabase.from("sales").select("order_id");
      if (startDate) salesQuery = salesQuery.gte("sale_date", startDate.toISOString());
      if (endDate) salesQuery = salesQuery.lt("sale_date", endDate.toISOString());
      const { data: salesData } = await salesQuery;
      const orderIds = (salesData || []).map((s: any) => s.order_id).filter(Boolean);

      if (orderIds.length === 0) {
        return {
          products: [],
          categories: [],
          summary: {
            totalRevenue: 0,
            totalQuantitySold: 0,
            totalOrders: 0,
            totalProducts: 0,
            topProduct: null,
            topCategory: null,
          },
        };
      }

      // Step 2: fetch sale_items for those orders (paginated)
      const allItems: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("sale_items")
          .select("order_id, product_name, quantity, unit_price")
          .in("order_id", orderIds)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allItems.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Step 3: fetch product categories
      const { data: productData } = await supabase.from("products").select("product_name, category");
      const categoryMap: Record<string, string> = {};
      (productData || []).forEach((p: any) => {
        categoryMap[p.product_name] = p.category || "Other";
      });

      // Step 4: aggregate by product
      const productAgg: Record<string, {
        revenue: number;
        quantity: number;
        orders: Set<string>;
        priceSum: number;
        priceCount: number;
      }> = {};

      allItems.forEach((item: any) => {
        const name = item.product_name || "Unknown";
        if (!productAgg[name]) {
          productAgg[name] = { revenue: 0, quantity: 0, orders: new Set(), priceSum: 0, priceCount: 0 };
        }
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unit_price) || 0;
        productAgg[name].revenue += qty * price;
        productAgg[name].quantity += qty;
        productAgg[name].orders.add(item.order_id);
        productAgg[name].priceSum += price;
        productAgg[name].priceCount += 1;
      });

      const totalRevenue = Object.values(productAgg).reduce((s, a) => s + a.revenue, 0);

      let products: ProductReportItem[] = Object.entries(productAgg)
        .map(([name, agg]) => ({
          rank: 0,
          productName: name,
          category: categoryMap[name] || "Other",
          totalRevenue: agg.revenue,
          totalQuantity: agg.quantity,
          totalOrders: agg.orders.size,
          avgUnitPrice: agg.priceCount > 0 ? agg.priceSum / agg.priceCount : 0,
          revenueContributionPct: totalRevenue > 0 ? (agg.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      // Apply category filter if provided
      if (options.categoryFilter && options.categoryFilter !== "all") {
        products = products.filter(p => p.category === options.categoryFilter);
      }

      // Step 5: category aggregation (uses ALL products before category filter)
      const categoryAgg: Record<string, { revenue: number; quantity: number; productNames: Set<string> }> = {};
      Object.entries(productAgg).forEach(([name, agg]) => {
        const cat = categoryMap[name] || "Other";
        if (!categoryAgg[cat]) categoryAgg[cat] = { revenue: 0, quantity: 0, productNames: new Set() };
        categoryAgg[cat].revenue += agg.revenue;
        categoryAgg[cat].quantity += agg.quantity;
        categoryAgg[cat].productNames.add(name);
      });

      const categories: CategoryData[] = Object.entries(categoryAgg)
        .map(([cat, agg]) => ({
          category: cat,
          revenue: agg.revenue,
          quantity: agg.quantity,
          productCount: agg.productNames.size,
          contributionPct: totalRevenue > 0 ? (agg.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      const totalOrdersCount = new Set(allItems.map((i: any) => i.order_id)).size;

      return {
        products,
        categories,
        summary: {
          totalRevenue,
          totalQuantitySold: Object.values(productAgg).reduce((s, a) => s + a.quantity, 0),
          totalOrders: totalOrdersCount,
          totalProducts: Object.keys(productAgg).length,
          topProduct: products[0]?.productName || null,
          topCategory: categories[0]?.category || null,
        },
      };
    },
  });
};
