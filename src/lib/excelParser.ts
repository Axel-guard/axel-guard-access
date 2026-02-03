import * as XLSX from "xlsx";

// Helper to normalize column names for matching
export const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\-\.\#\*]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "");
};

// Find the best matching schema column for an Excel column
export const findMatchingColumn = (
  excelColumn: string,
  columnMappings: Record<string, string[]>
): string | null => {
  const normalized = normalizeColumnName(excelColumn);

  // First pass: exact match
  for (const [schemaColumn, variations] of Object.entries(columnMappings)) {
    for (const variation of variations) {
      if (normalized === variation) {
        return schemaColumn;
      }
    }
  }

  // Second pass: contains match (more flexible)
  for (const [schemaColumn, variations] of Object.entries(columnMappings)) {
    for (const variation of variations) {
      if (normalized.includes(variation) || variation.includes(normalized)) {
        return schemaColumn;
      }
    }
  }

  // Third pass: starts with or ends with
  for (const [schemaColumn, variations] of Object.entries(columnMappings)) {
    for (const variation of variations) {
      if (normalized.startsWith(variation) || normalized.endsWith(variation)) {
        return schemaColumn;
      }
    }
  }

  // Fourth pass: partial word match
  for (const [schemaColumn, variations] of Object.entries(columnMappings)) {
    for (const variation of variations) {
      const normalizedWords = normalized.split(" ");
      const variationWords = variation.split(" ");
      const hasMatchingWord = normalizedWords.some((word) =>
        variationWords.some((vWord) => word === vWord || word.includes(vWord) || vWord.includes(word))
      );
      if (hasMatchingWord) {
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
    try {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
    } catch {
      // Try as timestamp
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
      }
    }
  }

  // Handle Date objects
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value.toISOString().split("T")[0];
    }
    return null;
  }

  // Handle string dates
  if (typeof value === "string") {
    const dateStr = value.trim();
    if (!dateStr) return null;

    // Try DD/MM/YYYY or DD-MM-YYYY format first (common in India)
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (ddmmyyyy) {
      let [, day, month, year] = ddmmyyyy;
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }
      const d = parseInt(day);
      const m = parseInt(month);
      const y = parseInt(year);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }

    // Try YYYY-MM-DD format
    const yyyymmdd = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    // Try direct parsing as fallback
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
        return parsed.toISOString().split("T")[0];
      }
    } catch {
      return null;
    }
  }

  return null;
};

// Clean currency and number strings
export const cleanNumberString = (value: any): string => {
  if (typeof value !== "string") return String(value || "");
  // Remove currency symbols, commas, spaces, and other formatting
  return value
    .replace(/[₹$€£¥]/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();
};

// Parse number value with robust cleaning
export const parseNumber = (value: any): number | null => {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  if (typeof value === "string") {
    const cleaned = cleanNumberString(value);
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
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

  // Convert numbers to strings for text fields
  if (typeof value === "number") {
    return String(value);
  }

  return value;
};

// Read Excel file and return parsed data
export const readExcelFile = async (file: File): Promise<any[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: true, dateNF: "yyyy-mm-dd" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
};

// Validate file is Excel
export const isValidExcelFile = (file: File): boolean => {
  return /\.(xlsx|xls)$/i.test(file.name);
};
