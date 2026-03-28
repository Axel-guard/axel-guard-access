import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, subQuarters, getYear } from "date-fns";

const MONTHLY_TARGET = 550000;

const EXCLUDED_EMPLOYEES = new Set(["Imported", "imported", "IMPORTED"]);

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
  collectionEfficiency: number;
  contributionPct: number;
  avgDealSize: number;
  performanceScore: number;
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
  prevRevenue: number;
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

// Financial year quarter boundaries (months are 0-indexed)
// Q1: Apr-Jun (months 3-5), Q2: Jul-Sep (months 6-8), Q3: Oct-Dec (months 9-11), Q4: Jan-Mar (months 0-2)
function getFYQuarterBounds(fyYear: number, q: number): { qStart: Date; qEnd: Date } {
  switch (q) {
    case 1: // Apr 1 - Jun 30
      return { qStart: new Date(fyYear, 3, 1), qEnd: new Date(fyYear, 6, 0, 23, 59, 59) };
    case 2: // Jul 1 - Sep 30
      return { qStart: new Date(fyYear, 6, 1), qEnd: new Date(fyYear, 9, 0, 23, 59, 59) };
    case 3: // Oct 1 - Dec 31
      return { qStart: new Date(fyYear, 9, 1), qEnd: new Date(fyYear, 12, 0, 23, 59, 59) };
    case 4: // Jan 1 - Mar 31 (next calendar year)
      return { qStart: new Date(fyYear + 1, 0, 1), qEnd: new Date(fyYear + 1, 3, 0, 23, 59, 59) };
    default:
      return { qStart: new Date(fyYear, 3, 1), qEnd: new Date(fyYear, 6, 0, 23, 59, 59) };
  }
}

function getCurrentFYYear(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

function getCurrentFYQuarter(): number {
  const month = new Date().getMonth(); // 0-indexed
  if (month >= 3 && month <= 5) return 1;
  if (month >= 6 && month <= 8) return 2;
  if (month >= 9 && month <= 11) return 3;
  return 4; // Jan-Mar
}

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

      // Get unique employees (excluding "Imported")
      const employeeSet = new Set<string>();
      allSales.forEach(sale => {
        if (sale.employee_name && !EXCLUDED_EMPLOYEES.has(sale.employee_name)) {
          employeeSet.add(sale.employee_name);
        }
      });

      const fyYear = getCurrentFYYear();

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
        const lastMonthSalesArr = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return s.employee_name === employeeName &&
                 saleDate >= lastMonthStart &&
                 saleDate <= lastMonthEnd;
        });

        // Calculate metrics
        const currentMonthTotal = currentSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
        const currentMonthBalance = currentSales.reduce((sum, s) => sum + (Number(s.balance_amount) || 0), 0);
        const lastMonthTotal = lastMonthSalesArr.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

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

        // Collection efficiency
        const collectionEfficiency = currentMonthTotal > 0
          ? ((currentMonthTotal - currentMonthBalance) / currentMonthTotal) * 100
          : 0;

        // Avg deal size
        const avgDealSize = currentSales.length > 0 ? currentMonthTotal / currentSales.length : 0;

        // Calculate FY quarterly data
        const quarterlyData: QuarterData[] = [];

        for (let q = 1; q <= 4; q++) {
          const { qStart, qEnd } = getFYQuarterBounds(fyYear, q);

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
            year: fyYear,
            revenue: qRevenue,
            orders: qOrders,
            avgOrderValue: qOrders > 0 ? qRevenue / qOrders : 0,
          });
        }

        // Find best quarter
        const bestQ = quarterlyData.reduce((best, current) =>
          current.revenue > best.revenue ? current : best
        , quarterlyData[0]);

        // Total FY year sales
        const { qStart: fyStart } = getFYQuarterBounds(fyYear, 1);
        const { qEnd: fyEnd } = getFYQuarterBounds(fyYear, 4);
        const yearSales = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return s.employee_name === employeeName &&
                 saleDate >= fyStart &&
                 saleDate <= fyEnd;
        });
        const totalYearSales = yearSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

        return {
          employeeName,
          currentMonthSales: currentMonthTotal,
          currentMonthOrders: currentSales.length,
          currentMonthBalance,
          lastMonthSales: lastMonthTotal,
          lastMonthOrders: lastMonthSalesArr.length,
          targetProgress,
          remainingTarget,
          growthPercentage,
          isGrowth,
          quarterlyData,
          bestQuarter: bestQ?.quarter || "Q1",
          totalYearSales,
          collectionEfficiency,
          contributionPct: 0, // filled after
          avgDealSize,
          performanceScore: 0, // filled after
        };
      });

      // Sort by current month sales (descending)
      employeePerformance.sort((a, b) => b.currentMonthSales - a.currentMonthSales);

      // Compute team-level stats for contributionPct and performanceScore
      const totalTeamSales = employeePerformance.reduce((s, e) => s + e.currentMonthSales, 0);
      const maxRevenue = employeePerformance.reduce((m, e) => Math.max(m, e.currentMonthSales), 0);
      const maxOrders = employeePerformance.reduce((m, e) => Math.max(m, e.currentMonthOrders), 0);

      employeePerformance.forEach(emp => {
        emp.contributionPct = totalTeamSales > 0 ? (emp.currentMonthSales / totalTeamSales) * 100 : 0;
        const revenueScore = maxRevenue > 0 ? emp.currentMonthSales / maxRevenue : 0;
        const collScore = emp.collectionEfficiency / 100;
        const ordersScore = maxOrders > 0 ? emp.currentMonthOrders / maxOrders : 0;
        emp.performanceScore = (0.5 * revenueScore + 0.3 * collScore + 0.2 * ordersScore) * 100;
      });

      return employeePerformance;
    },
  });
};

export const useCompanyQuarterlyReport = () => {
  return useQuery({
    queryKey: ["company-quarterly-report"],
    queryFn: async () => {
      const now = new Date();
      const fyYear = getCurrentFYYear();
      const currentFYQuarter = getCurrentFYQuarter();

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

      // Calculate company quarterly data using FY quarters
      const companyQuarterlyData: CompanyQuarterlyData[] = [];

      for (let q = 1; q <= 4; q++) {
        const { qStart, qEnd } = getFYQuarterBounds(fyYear, q);

        const qSales = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return saleDate >= qStart && saleDate <= qEnd;
        });

        const qRevenue = qSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
        const qOrders = qSales.length;

        // Calculate growth from previous quarter
        let growthPercent: number | null = null;
        let prevRevenue = 0;
        if (q > 1 && companyQuarterlyData.length > 0) {
          prevRevenue = companyQuarterlyData[q - 2].revenue;
          if (prevRevenue > 0) {
            growthPercent = ((qRevenue - prevRevenue) / prevRevenue) * 100;
          }
        }

        companyQuarterlyData.push({
          quarter: `Q${q}`,
          year: fyYear,
          revenue: qRevenue,
          orders: qOrders,
          avgOrderValue: qOrders > 0 ? qRevenue / qOrders : 0,
          growthPercent,
          prevRevenue,
        });
      }

      // Get unique employees (excluding "Imported")
      const employeeSet = new Set<string>();
      allSales.forEach(sale => {
        if (sale.employee_name && !EXCLUDED_EMPLOYEES.has(sale.employee_name)) {
          employeeSet.add(sale.employee_name);
        }
      });

      const { qStart: currentQStart, qEnd: currentQEnd } = getFYQuarterBounds(fyYear, currentFYQuarter);
      const prevFYQ = currentFYQuarter === 1 ? 4 : currentFYQuarter - 1;
      const prevFYYear = currentFYQuarter === 1 ? fyYear - 1 : fyYear;
      const { qStart: prevQStart, qEnd: prevQEnd } = getFYQuarterBounds(prevFYYear, prevFYQ);

      // Grand total for contribution pct
      const grandTotal = allSales
        .filter(s => {
          const saleDate = new Date(s.sale_date);
          return saleDate >= currentQStart && saleDate <= currentQEnd && !EXCLUDED_EMPLOYEES.has(s.employee_name || "");
        })
        .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

      // Employee quarterly data
      const employeeQuarterlyData = Array.from(employeeSet).map(employeeName => {
        const quarterlyData: QuarterData[] = [];

        for (let q = 1; q <= 4; q++) {
          const { qStart, qEnd } = getFYQuarterBounds(fyYear, q);

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
            year: fyYear,
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
        const prevQSalesArr = allSales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return s.employee_name === employeeName &&
                 saleDate >= prevQStart &&
                 saleDate <= prevQEnd;
        });
        const prevQRevenue = prevQSalesArr.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

        let quarterGrowth = 0;
        if (prevQRevenue > 0) {
          quarterGrowth = ((currentQRevenue - prevQRevenue) / prevQRevenue) * 100;
        } else if (currentQRevenue > 0) {
          quarterGrowth = 100;
        }

        const totalRevenue = quarterlyData.reduce((sum, q) => sum + q.revenue, 0);
        const totalOrders = quarterlyData.reduce((sum, q) => sum + q.orders, 0);

        const contributionPct = grandTotal > 0 ? (currentQRevenue / grandTotal) * 100 : 0;

        return {
          employeeName,
          quarterlyData,
          bestQuarter: bestQ?.quarter || "Q1",
          totalRevenue,
          totalOrders,
          currentQuarterRevenue: currentQRevenue,
          prevQuarterRevenue: prevQRevenue,
          quarterGrowth,
          contributionPct,
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

      const quarterRevenueTotal = companyQuarterlyData[currentFYQuarter - 1]?.revenue || 0;

      const highlights: QuarterlyHighlights = {
        topPerformerThisQuarter,
        highestGrowthEmployee: highestGrowthEmployee
          ? { name: highestGrowthEmployee.employeeName, growthPercent: highestGrowthEmployee.quarterGrowth }
          : null,
        quarterRevenueTotal,
        currentQuarter: `Q${currentFYQuarter}`,
      };

      return {
        companyQuarterlyData,
        employeeQuarterlyData,
        highlights,
        currentYear: fyYear,
      };
    },
  });
};
