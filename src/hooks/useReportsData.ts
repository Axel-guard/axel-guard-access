import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModelInventoryReport {
  modelName: string;
  inStock: number;
  dispatched: number;
  qcPass: number;
  qcFail: number;
  qcPending: number;
  total: number;
}

export interface DispatchOrderReport {
  orderId: string;
  customerName: string;
  orderDate: string;
  totalItems: number;
  dispatched: number;
  remaining: number;
  status: "Completed" | "Pending";
  lastDispatchDate: string | null;
}

export interface QCReportItem {
  date: string | null;
  serialNumber: string;
  productName: string;
  sdConnectivity: string | null;
  networkQC: string | null;
  gpsQC: string | null;
  finalQCStatus: string;
  inspector: string | null;
}

// Inventory Report Hook
export const useInventoryReport = () => {
  return useQuery({
    queryKey: ["inventory-report"],
    queryFn: async () => {
      // Fetch all inventory records
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from("inventory")
          .select("*")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData.push(...data);
        
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Calculate summary
      const totalDevices = allData.length;
      // In Stock = status is "In Stock" AND QC result is NOT "Fail" (excludes dispatched and failed items)
      const inStock = allData.filter(i => i.status === 'In Stock' && i.qc_result !== 'Fail').length;
      const dispatched = allData.filter(i => i.status === 'Dispatched').length;
      const qcPass = allData.filter(i => i.qc_result === 'Pass').length;
      const qcFail = allData.filter(i => i.qc_result === 'Fail').length;
      const qcPending = allData.filter(i => !i.qc_result || i.qc_result === 'Pending').length;

      // Group by product/model
      const byModel = allData.reduce((acc, item) => {
        const model = item.product_name || 'Unknown';
        if (!acc[model]) {
          acc[model] = {
            modelName: model,
            inStock: 0,
            dispatched: 0,
            qcPass: 0,
            qcFail: 0,
            qcPending: 0,
            total: 0,
          };
        }
        acc[model].total++;
        // In Stock = status is "In Stock" AND QC is NOT "Fail"
        if (item.status === 'In Stock' && item.qc_result !== 'Fail') acc[model].inStock++;
        if (item.status === 'Dispatched') acc[model].dispatched++;
        if (item.qc_result === 'Pass') acc[model].qcPass++;
        if (item.qc_result === 'Fail') acc[model].qcFail++;
        if (!item.qc_result || item.qc_result === 'Pending') acc[model].qcPending++;
        return acc;
      }, {} as Record<string, ModelInventoryReport>);

      // Filter to only show models with in-stock items > 0
      const modelReports: ModelInventoryReport[] = (Object.values(byModel) as ModelInventoryReport[])
        .filter((model) => model.inStock > 0)
        .sort((a, b) => a.modelName.localeCompare(b.modelName));

      return {
        summary: {
          totalDevices,
          inStock,
          dispatched,
          qcPass,
          qcFail,
          qcPending,
        },
        modelReports,
      };
    },
  });
};

// Dispatch Report Hook
export const useDispatchReport = () => {
  return useQuery({
    queryKey: ["dispatch-report"],
    queryFn: async () => {
      // Fetch all sales with items
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("*")
        .order("sale_date", { ascending: false });

      if (salesError) throw salesError;

      // Fetch all sale items
      const { data: saleItems, error: itemsError } = await supabase
        .from("sale_items")
        .select("*");

      if (itemsError) throw itemsError;

      // Fetch all shipments
      const { data: shipments, error: shipmentsError } = await supabase
        .from("shipments")
        .select("*");

      if (shipmentsError) throw shipmentsError;

      // Fetch dispatched inventory items to count actual dispatched devices
      const dispatchedInventory: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from("inventory")
          .select("order_id")
          .eq("status", "Dispatched")
          .not("order_id", "is", null)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        dispatchedInventory.push(...data);
        
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Group dispatched inventory by order_id
      const dispatchedByOrder = dispatchedInventory.reduce((acc, item) => {
        if (item.order_id) {
          acc[item.order_id] = (acc[item.order_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Group sale items by order_id to get total items per order
      const itemsByOrder = (saleItems || []).reduce((acc, item) => {
        acc[item.order_id] = (acc[item.order_id] || 0) + Number(item.quantity);
        return acc;
      }, {} as Record<string, number>);

      // Group shipments by order_id to get last dispatch date
      const shipmentsByOrder = (shipments || []).reduce((acc, shipment) => {
        if (shipment.order_id) {
          if (!acc[shipment.order_id] || new Date(shipment.created_at) > new Date(acc[shipment.order_id])) {
            acc[shipment.order_id] = shipment.created_at;
          }
        }
        return acc;
      }, {} as Record<string, string>);

      // Build dispatch order reports
      const dispatchOrders: DispatchOrderReport[] = (sales || []).map((sale) => {
        const totalItems = itemsByOrder[sale.order_id] || 0;
        const dispatched = dispatchedByOrder[sale.order_id] || 0;
        const remaining = Math.max(0, totalItems - dispatched);
        const status: "Completed" | "Pending" = remaining === 0 && totalItems > 0 ? "Completed" : "Pending";
        const lastDispatchDate = shipmentsByOrder[sale.order_id] || null;

        return {
          orderId: sale.order_id,
          customerName: sale.customer_name || sale.company_name || 'N/A',
          orderDate: sale.sale_date,
          totalItems,
          dispatched,
          remaining,
          status,
          lastDispatchDate,
        };
      });

      // Calculate summary
      const totalOrders = dispatchOrders.length;
      const totalDevicesDispatched = (Object.values(dispatchedByOrder) as number[]).reduce((sum, count) => sum + count, 0);
      const completedOrders = dispatchOrders.filter(o => o.status === 'Completed').length;
      const pendingOrders = dispatchOrders.filter(o => o.status === 'Pending').length;

      return {
        summary: {
          totalOrders,
          devicesDispatched: totalDevicesDispatched,
          dispatchCompleted: completedOrders,
          dispatchPending: pendingOrders,
        },
        dispatchOrders,
      };
    },
  });
};

// QC Report Hook
export const useQCReport = () => {
  return useQuery({
    queryKey: ["qc-report"],
    queryFn: async () => {
      // Fetch all inventory with QC data
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from("inventory")
          .select("*")
          .order("qc_date", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData.push(...data);
        
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Calculate summary
      const totalChecked = allData.filter(i => i.qc_result && i.qc_result !== 'Pending').length;
      const qcPass = allData.filter(i => i.qc_result === 'Pass').length;
      const qcFail = allData.filter(i => i.qc_result === 'Fail').length;
      const qcPending = allData.filter(i => !i.qc_result || i.qc_result === 'Pending').length;

      // Build QC report items (only items that have been checked)
      const qcItems: QCReportItem[] = allData
        .filter(item => item.qc_date || (item.qc_result && item.qc_result !== 'Pending'))
        .map(item => ({
          date: item.qc_date,
          serialNumber: item.serial_number,
          productName: item.product_name,
          sdConnectivity: item.sd_connect,
          networkQC: item.network_test,
          gpsQC: item.gps_test,
          finalQCStatus: item.qc_result || 'Pending',
          inspector: item.checked_by,
        }));

      return {
        summary: {
          totalChecked,
          qcPass,
          qcFail,
          qcPending,
        },
        qcItems,
      };
    },
  });
};
