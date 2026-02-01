import * as XLSX from "xlsx";

// Helper to normalize column names for matching
export const normalizeColumnName = (name: string): string => {
  return name.toLowerCase().trim().replace(/[_\-\.]/g, " ").replace(/\s+/g, " ");
};

// Find the best matching schema column for an Excel column
export const findMatchingColumn = (
  excelColumn: string,
  columnMappings: Record<string, string[]>
): string | null => {
  const normalized = normalizeColumnName(excelColumn);

  // First pass: exact match only
  for (const [schemaColumn, variations] of Object.entries(columnMappings)) {
    for (const variation of variations) {
      if (normalized === variation) {
        return schemaColumn;
      }
    }
  }

  // Second pass: starts with or ends with match
  for (const [schemaColumn, variations] of Object.entries(columnMappings)) {
    for (const variation of variations) {
      if (normalized.startsWith(variation) || normalized.endsWith(variation)) {
        return schemaColumn;
      }
    }
  }

  return null;
};

// Parse date from various formats
export const parseDate = (value: any): string | null => {
  if (!value) return null;

  // Handle Excel serial dates
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }

  // Handle string dates
  if (typeof value === "string") {
    const dateStr = value.trim();

    // Try common formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // D/M/YY or D/M/YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        try {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split("T")[0];
          }
        } catch {
          continue;
        }
      }
    }

    // Try direct parsing
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
    } catch {
      return null;
    }
  }

  return null;
};

// Clean and normalize values
export const cleanValue = (value: any, columnType: string, dateColumns: string[] = []): any => {
  if (value === undefined || value === null || value === "") return null;

  if (dateColumns.includes(columnType)) {
    return parseDate(value);
  }

  // Clean string values
  if (typeof value === "string") {
    return value.trim() || null;
  }

  return value;
};

// Parse number value
export const parseNumber = (value: any): number | null => {
  if (value === undefined || value === null || value === "") return null;
  
  if (typeof value === "number") return value;
  
  if (typeof value === "string") {
    const cleaned = value.replace(/[₹,\s]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  return null;
};

// Read Excel file and return parsed data
export const readExcelFile = async (file: File): Promise<any[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: null });
};

// Validate file is Excel
export const isValidExcelFile = (file: File): boolean => {
  return /\.(xlsx|xls)$/i.test(file.name);
};
