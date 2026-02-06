import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, getQuarter, getYear } from "date-fns";

const MONTHLY_TARGET = 550000;

export interface EmployeePerformanceData {
  employeeName: string;
  currentMonthSales: number;
  currentMonthOrders: number;
  currentMonthBalance: number;
  lastMonthSales: number;
  lastMonthOrders: number;
  targetProgress: number;
  remainingTarget: number;
  growthPercentage: number;
  isGrowth: boolean;
  quarterlyData: QuarterData[];
  bestQuarter: string;
  totalYearSales: number;
}

export interface QuarterData {
  quarter: string;
  year: number;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

export interface CompanyQuarterlyData {
  quarter: string;
  year: number;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  growthPercent: number | null;
}

export interface QuarterlyHighlights {
  topPerformerThisQuarter: { name: string; revenue: number } | null;
  highestGrowthEmployee: { name: string; growthPercent: number } | null;
  quarterRevenueTotal: number;
  currentQuarter: string;
}

export interface UseEmployeePerformanceOptions {
  dateFilter: "this-month" | "last-month" | "custom";
  customStartDate?: Date;
  customEndDate?: Date;
}

// Helper to get quarter string
const getQuarterString = (date: Date): string => {
  const q = getQuarter(date);
  return `Q${q}`;
};

export const useEmployeePerformance = (options: UseEmployeePerformanceOptions) => {
  return useQuery({
    queryKey: ["employee-performance", options],
    queryFn: async () => {
      const now = new Date();
      
      // Calculate date ranges
      let startDate: Date;
      let endDate: Date;
      
      switch (options.dateFilter) {
        case "this-month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "last-month":
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case "custom":
          startDate = options.customStartDate || startOfMonth(now);
          endDate = options.customEndDate || endOfMonth(now);
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }
      
      // Last month for comparison
      const lastMonthStart = startOfMonth(subMonths(startDate, 1));
      const lastMonthEnd = endOfMonth(subMonths(startDate, 1));

      // Fetch all sales with pagination
      const allSales: any[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("sales")
          .select("employee_name, total_amount, balance_amount, sale_date")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allSales.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Get unique employees
      const employeeSet = new Set<string>();
      allSales.forEach(sale => {
        if (sale.employee_name) {
          employeeSet.add(sale.employee_name);
        }
      });

      // Calculate performance for each employee
      const employeePerformance: EmployeePerformanceData[] = Array.from(employeeSet).map(employeeName => {
        // Current period sales
        const currentSales = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return s.employee_name === employeeName && 
                 saleDate >= startDate && 
                 saleDate <= endDate;
        });

        // Last month sales (for comparison)
        const lastMonthSales = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return s.employee_name === employeeName && 
                 saleDate >= lastMonthStart && 
                 saleDate <= lastMonthEnd;
        });

        // Calculate metrics
        const currentMonthTotal = currentSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
        const currentMonthBalance = currentSales.reduce((sum, s) => sum + (Number(s.balance_amount) || 0), 0);
        const lastMonthTotal = lastMonthSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

        const targetProgress = Math.min((currentMonthTotal / MONTHLY_TARGET) * 100, 100);
        const remainingTarget = Math.max(MONTHLY_TARGET - currentMonthTotal, 0);
        
        // Growth calculation
        let growthPercentage = 0;
        let isGrowth = true;
        if (lastMonthTotal > 0) {
          growthPercentage = ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
          isGrowth = growthPercentage >= 0;
        } else if (currentMonthTotal > 0) {
          growthPercentage = 100;
          isGrowth = true;
        }

        // Calculate quarterly data
        const currentYear = getYear(now);
        const quarterlyData: QuarterData[] = [];
        
        for (let q = 1; q <= 4; q++) {
          const qStart = startOfQuarter(new Date(currentYear, (q - 1) * 3, 1));
          const qEnd = endOfQuarter(new Date(currentYear, (q - 1) * 3, 1));
          
          const qSales = allSales.filter(s => {
            const saleDate = new Date(s.sale_date);
            return s.employee_name === employeeName && 
                   saleDate >= qStart && 
                   saleDate <= qEnd;
          });

          const qRevenue = qSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
          const qOrders = qSales.length;
          
          quarterlyData.push({
            quarter: `Q${q}`,
            year: currentYear,
            revenue: qRevenue,
            orders: qOrders,
            avgOrderValue: qOrders > 0 ? qRevenue / qOrders : 0,
          });
        }

        // Find best quarter
        const bestQ = quarterlyData.reduce((best, current) => 
          current.revenue > best.revenue ? current : best
        , quarterlyData[0]);

        // Total year sales
        const yearSales = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return s.employee_name === employeeName && 
                 getYear(saleDate) === currentYear;
        });
        const totalYearSales = yearSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

        return {
          employeeName,
          currentMonthSales: currentMonthTotal,
          currentMonthOrders: currentSales.length,
          currentMonthBalance,
          lastMonthSales: lastMonthTotal,
          lastMonthOrders: lastMonthSales.length,
          targetProgress,
          remainingTarget,
          growthPercentage,
          isGrowth,
          quarterlyData,
          bestQuarter: bestQ?.quarter || "Q1",
          totalYearSales,
        };
      });

      // Sort by current month sales (descending)
      employeePerformance.sort((a, b) => b.currentMonthSales - a.currentMonthSales);

      return employeePerformance;
    },
  });
};

export const useCompanyQuarterlyReport = () => {
  return useQuery({
    queryKey: ["company-quarterly-report"],
    queryFn: async () => {
      const now = new Date();
      const currentYear = getYear(now);

      // Fetch all sales
      const allSales: any[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("sales")
          .select("employee_name, total_amount, sale_date")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allSales.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Calculate company quarterly data
      const companyQuarterlyData: CompanyQuarterlyData[] = [];
      
      for (let q = 1; q <= 4; q++) {
        const qStart = startOfQuarter(new Date(currentYear, (q - 1) * 3, 1));
        const qEnd = endOfQuarter(new Date(currentYear, (q - 1) * 3, 1));
        
        const qSales = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return saleDate >= qStart && saleDate <= qEnd;
        });

        const qRevenue = qSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
        const qOrders = qSales.length;
        
        // Calculate growth from previous quarter
        let growthPercent: number | null = null;
        if (q > 1 && companyQuarterlyData.length > 0) {
          const prevRevenue = companyQuarterlyData[q - 2].revenue;
          if (prevRevenue > 0) {
            growthPercent = ((qRevenue - prevRevenue) / prevRevenue) * 100;
          }
        }
        
        companyQuarterlyData.push({
          quarter: `Q${q}`,
          year: currentYear,
          revenue: qRevenue,
          orders: qOrders,
          avgOrderValue: qOrders > 0 ? qRevenue / qOrders : 0,
          growthPercent,
        });
      }

      // Calculate employee quarterly performance
      const employeeSet = new Set<string>();
      allSales.forEach(sale => {
        if (sale.employee_name) {
          employeeSet.add(sale.employee_name);
        }
      });

      const currentQuarter = getQuarter(now);
      const currentQStart = startOfQuarter(now);
      const currentQEnd = endOfQuarter(now);
      const prevQStart = startOfQuarter(subQuarters(now, 1));
      const prevQEnd = endOfQuarter(subQuarters(now, 1));

      // Employee quarterly data
      const employeeQuarterlyData = Array.from(employeeSet).map(employeeName => {
        const quarterlyData: QuarterData[] = [];
        
        for (let q = 1; q <= 4; q++) {
          const qStart = startOfQuarter(new Date(currentYear, (q - 1) * 3, 1));
          const qEnd = endOfQuarter(new Date(currentYear, (q - 1) * 3, 1));
          
          const qSales = allSales.filter(s => {
            const saleDate = new Date(s.sale_date);
            return s.employee_name === employeeName && 
                   saleDate >= qStart && 
                   saleDate <= qEnd;
          });

          const qRevenue = qSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
          const qOrders = qSales.length;
          
          quarterlyData.push({
            quarter: `Q${q}`,
            year: currentYear,
            revenue: qRevenue,
            orders: qOrders,
            avgOrderValue: qOrders > 0 ? qRevenue / qOrders : 0,
          });
        }

        // Find best quarter
        const bestQ = quarterlyData.reduce((best, current) => 
          current.revenue > best.revenue ? current : best
        , quarterlyData[0]);

        // Current quarter data
        const currentQSales = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return s.employee_name === employeeName && 
                 saleDate >= currentQStart && 
                 saleDate <= currentQEnd;
        });
        const currentQRevenue = currentQSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

        // Previous quarter for growth
        const prevQSales = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return s.employee_name === employeeName && 
                 saleDate >= prevQStart && 
                 saleDate <= prevQEnd;
        });
        const prevQRevenue = prevQSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

        let quarterGrowth = 0;
        if (prevQRevenue > 0) {
          quarterGrowth = ((currentQRevenue - prevQRevenue) / prevQRevenue) * 100;
        } else if (currentQRevenue > 0) {
          quarterGrowth = 100;
        }

        const totalRevenue = quarterlyData.reduce((sum, q) => sum + q.revenue, 0);
        const totalOrders = quarterlyData.reduce((sum, q) => sum + q.orders, 0);

        return {
          employeeName,
          quarterlyData,
          bestQuarter: bestQ?.quarter || "Q1",
          totalRevenue,
          totalOrders,
          currentQuarterRevenue: currentQRevenue,
          quarterGrowth,
        };
      });

      // Sort by total revenue
      employeeQuarterlyData.sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Calculate highlights
      const topPerformerThisQuarter = employeeQuarterlyData.length > 0 
        ? { name: employeeQuarterlyData[0].employeeName, revenue: employeeQuarterlyData[0].currentQuarterRevenue }
        : null;

      const highestGrowthEmployee = employeeQuarterlyData
        .filter(e => e.quarterGrowth > 0)
        .sort((a, b) => b.quarterGrowth - a.quarterGrowth)[0];

      const quarterRevenueTotal = companyQuarterlyData[currentQuarter - 1]?.revenue || 0;

      const highlights: QuarterlyHighlights = {
        topPerformerThisQuarter,
        highestGrowthEmployee: highestGrowthEmployee 
          ? { name: highestGrowthEmployee.employeeName, growthPercent: highestGrowthEmployee.quarterGrowth }
          : null,
        quarterRevenueTotal,
        currentQuarter: `Q${currentQuarter}`,
      };

      return {
        companyQuarterlyData,
        employeeQuarterlyData,
        highlights,
        currentYear,
      };
    },
  });
};
