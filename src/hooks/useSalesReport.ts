import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientSalesReport {
  rank: number;
  customerName: string;
  companyName: string | null;
  customerCode: string;
  totalOrders: number;
  totalPurchaseValue: number;
  lastOrderDate: string;
  contactNumber: string | null;
  email: string | null;
}

export interface SalesReportSummary {
  totalClients: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface TopClientHighlight {
  name: string;
  value: number;
  orderCount?: number;
}

interface UseSalesReportOptions {
  dateFilter: "this-month" | "last-3-months" | "this-year" | "all" | "custom";
  customStartDate?: Date;
  customEndDate?: Date;
  searchQuery?: string;
}

// Sales Report Hook - Aggregates client data from sales and leads
export const useSalesReport = (options: UseSalesReportOptions) => {
  return useQuery({
    queryKey: ["sales-report", options],
    queryFn: async () => {
      // Calculate date boundaries based on filter
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      switch (options.dateFilter) {
        case "this-month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "last-3-months":
          startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "this-year":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear() + 1, 0, 1);
          break;
        case "custom":
          startDate = options.customStartDate || null;
          endDate = options.customEndDate || null;
          break;
        case "all":
        default:
          // No date filter
          break;
      }

      // Fetch all sales with pagination
      const allSales: any[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        let query = supabase
          .from("sales")
          .select("*")
          .range(from, from + pageSize - 1);

        if (startDate) {
          query = query.gte("sale_date", startDate.toISOString());
        }
        if (endDate) {
          query = query.lt("sale_date", endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length === 0) break;

        allSales.push(...data);

        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Fetch leads for contact information
      const allLeads: any[] = [];
      from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("leads")
          .select("customer_code, customer_name, mobile_number, email, company_name")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allLeads.push(...data);

        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Create lookup map for leads by customer_code
      const leadsByCode = allLeads.reduce((acc, lead) => {
        acc[lead.customer_code] = lead;
        return acc;
      }, {} as Record<string, any>);

      // Aggregate sales by customer
      const customerAggregates = allSales.reduce((acc, sale) => {
        const code = sale.customer_code;
        if (!acc[code]) {
          acc[code] = {
            customerCode: code,
            customerName: sale.customer_name || "Unknown",
            companyName: sale.company_name || null,
            totalOrders: 0,
            totalPurchaseValue: 0,
            lastOrderDate: sale.sale_date,
            contactNumber: sale.customer_contact || null,
            email: null,
          };
        }

        acc[code].totalOrders++;
        acc[code].totalPurchaseValue += Number(sale.total_amount) || 0;

        // Update last order date if more recent
        if (new Date(sale.sale_date) > new Date(acc[code].lastOrderDate)) {
          acc[code].lastOrderDate = sale.sale_date;
        }

        // Try to get better customer name
        if (!acc[code].customerName || acc[code].customerName === "Unknown") {
          acc[code].customerName = sale.customer_name || sale.company_name || "Unknown";
        }

        return acc;
      }, {} as Record<string, any>);

      // Enrich with lead data
      Object.keys(customerAggregates).forEach((code) => {
        const lead = leadsByCode[code];
        if (lead) {
          if (!customerAggregates[code].contactNumber) {
            customerAggregates[code].contactNumber = lead.mobile_number;
          }
          customerAggregates[code].email = lead.email;
          if (!customerAggregates[code].companyName) {
            customerAggregates[code].companyName = lead.company_name;
          }
          if (customerAggregates[code].customerName === "Unknown") {
            customerAggregates[code].customerName = lead.customer_name;
          }
        }
      });

      // Convert to array and sort by total purchase value (descending)
      let clientReports: ClientSalesReport[] = Object.values(customerAggregates)
        .sort((a: any, b: any) => b.totalPurchaseValue - a.totalPurchaseValue)
        .map((client: any, index: number) => ({
          rank: index + 1,
          customerName: client.customerName,
          companyName: client.companyName,
          customerCode: client.customerCode,
          totalOrders: client.totalOrders,
          totalPurchaseValue: client.totalPurchaseValue,
          lastOrderDate: client.lastOrderDate,
          contactNumber: client.contactNumber,
          email: client.email,
        }));

      // Apply search filter if provided
      if (options.searchQuery && options.searchQuery.trim()) {
        const query = options.searchQuery.toLowerCase().trim();
        clientReports = clientReports.filter(
          (client) =>
            client.customerName.toLowerCase().includes(query) ||
            (client.companyName && client.companyName.toLowerCase().includes(query)) ||
            (client.contactNumber && client.contactNumber.includes(query)) ||
            client.customerCode.toLowerCase().includes(query)
        );
        // Re-rank after filtering
        clientReports = clientReports.map((client, index) => ({
          ...client,
          rank: index + 1,
        }));
      }

      // Calculate summary
      const summary: SalesReportSummary = {
        totalClients: clientReports.length,
        totalRevenue: clientReports.reduce((sum, c) => sum + c.totalPurchaseValue, 0),
        totalOrders: clientReports.reduce((sum, c) => sum + c.totalOrders, 0),
        averageOrderValue:
          clientReports.length > 0
            ? clientReports.reduce((sum, c) => sum + c.totalPurchaseValue, 0) /
              clientReports.reduce((sum, c) => sum + c.totalOrders, 0)
            : 0,
      };

      // Find top highlights
      const topByValue = clientReports[0] || null;
      const topByOrders = [...clientReports].sort((a, b) => b.totalOrders - a.totalOrders)[0] || null;

      const highlights = {
        topClient: topByValue
          ? { name: topByValue.customerName, value: topByValue.totalPurchaseValue }
          : null,
        highestRevenue: topByValue
          ? { name: topByValue.customerName, value: topByValue.totalPurchaseValue }
          : null,
        mostRepeatOrders: topByOrders
          ? { name: topByOrders.customerName, value: topByOrders.totalOrders, orderCount: topByOrders.totalOrders }
          : null,
      };

      return {
        summary,
        clientReports,
        highlights,
      };
    },
  });
};
