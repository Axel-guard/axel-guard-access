import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quotation, QuotationItem } from "@/hooks/useQuotations";
import { numberToWords } from "@/lib/numberToWords";
import { format } from "date-fns";

const LOGO_URL = "/images/axelguard-logo.png";

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/** Sanitize and format address into clean multi-line output */
const sanitizeAddress = (address: string): string[] => {
  if (!address) return [];
  // Trim, collapse multiple spaces
  let cleaned = address.trim().replace(/\s{2,}/g, " ");
  // Remove leading/trailing commas
  cleaned = cleaned.replace(/^,+|,+$/g, "").trim();

  // Try splitting by comma first
  const commaParts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    // Group into max 3-4 lines
    const lines: string[] = [];
    let current = "";
    for (const part of commaParts) {
      if (current && (current + ", " + part).length > 45) {
        lines.push(current);
        current = part;
      } else {
        current = current ? current + ", " + part : part;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, 4);
  }

  // Fallback: split long string into ~40 char lines at word boundaries
  const words = cleaned.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && (current + " " + word).length > 40) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
};

const fmt = (n: number): string =>
  `Rs ${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export const generateQuotationPDF = async (
  quotation: Quotation,
  items: QuotationItem[]
) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const red: [number, number, number] = [220, 38, 38];
  const dark: [number, number, number] = [17, 24, 39];
  const muted: [number, number, number] = [75, 85, 99];
  const lightBg: [number, number, number] = [249, 250, 251];
  const border: [number, number, number] = [229, 231, 235];

  const logoBase64 = await loadImageAsBase64(LOGO_URL);

  // ===== HEADER BAR =====
  doc.setFillColor(248, 248, 248);
  doc.rect(0, 0, pw, 42, "F");
  doc.setDrawColor(...border);
  doc.line(0, 42, pw, 42);

  // Logo - maintain aspect ratio, sharp rendering
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 10, 3, 34, 13, undefined, "FAST");
  }

  // Company info - left side
  const cx = logoBase64 ? 42 : 10;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("RealTrack Technology", cx, 10);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text("GSTIN: 09FSEPP6050C1ZQ", cx, 16);
  doc.text("State: 09-Uttar Pradesh", cx, 21);

  // Contact info - right side
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("+91 8755311835", pw - 14, 10, { align: "right" });
  doc.text("info@axel-guard.com", pw - 14, 16, { align: "right" });
  doc.text("Office No 210, Second Floor", pw - 14, 22, { align: "right" });
  doc.text("PC Chamber, Sector 66 Noida,", pw - 14, 28, { align: "right" });
  doc.text("Uttar Pradesh - 201301", pw - 14, 34, { align: "right" });

  // ===== ESTIMATE BANNER =====
  doc.setFillColor(...red);
  doc.rect(0, 42, pw, 13, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Estimate", pw / 2, 51, { align: "center" });

  // ===== CUSTOMER DETAILS + ESTIMATE INFO =====
  let y = 62;

  // --- LEFT SIDE: Estimate For (60% width) ---
  doc.setTextColor(...red);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Estimate For:", 14, y);

  // Company / Customer name - bold, larger
  doc.setTextColor(...dark);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const displayName = quotation.company_name || quotation.customer_name || "-";
  doc.text(displayName, 14, y + 10);

  // Address block - separated from contact info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  let infoY = y + 20;

  if (quotation.address) {
    const addressLines = sanitizeAddress(quotation.address);
    addressLines.forEach((line) => {
      doc.text(line, 14, infoY);
      infoY += 5.5;
    });
    infoY += 3; // gap between address and contact details
  }

  // Contact person (separated from address)
  if (quotation.company_name && quotation.customer_name && quotation.company_name !== quotation.customer_name) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    doc.text("Contact Person:", 14, infoY);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(quotation.customer_name, 50, infoY);
    doc.setFont("helvetica", "normal");
    infoY += 7;
  }

  if (quotation.mobile) {
    doc.setTextColor(...muted);
    doc.text("Contact No.:", 14, infoY);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(quotation.mobile, 50, infoY);
    doc.setFont("helvetica", "normal");
    infoY += 7;
  }

  if (quotation.customer_email) {
    doc.setTextColor(...muted);
    doc.text("Email:", 14, infoY);
    doc.setTextColor(...dark);
    doc.text(quotation.customer_email, 50, infoY);
    infoY += 7;
  }

  if (quotation.gst_number) {
    doc.setTextColor(...muted);
    doc.text("GSTIN:", 14, infoY);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(quotation.gst_number, 50, infoY);
    doc.setFont("helvetica", "normal");
    infoY += 7;
  }

  if (quotation.gst_number && quotation.gst_number.length >= 2) {
    const stateCode = quotation.gst_number.substring(0, 2);
    const stateName = getStateName(stateCode);
    if (stateName) {
      doc.setTextColor(...muted);
      doc.text("State:", 14, infoY);
      doc.setTextColor(...dark);
      doc.text(`${stateCode}-${stateName}`, 50, infoY);
      infoY += 7;
    }
  }

  // --- RIGHT SIDE: Estimate Info Card (40% width) ---
  const cardX = pw - 82;
  const cardW = 72;
  const cardY = y - 6;

  // Determine if we need Place of Supply row
  const isInterState = quotation.gst_number && quotation.gst_number.length >= 2 &&
    quotation.gst_number.substring(0, 2) !== "09";
  const cardH = isInterState ? 42 : 32;

  // Card background
  doc.setDrawColor(...border);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, "FD");

  // Labels column
  const labelX = cardX + 6;
  const valueX = cardX + cardW - 6;
  let rowY = cardY + 10;

  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.text("Estimate No.:", labelX, rowY);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(quotation.quotation_no, valueX, rowY, { align: "right" });

  rowY += 10;
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.text("Date:", labelX, rowY);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(format(new Date(quotation.quotation_date), "dd/MM/yyyy"), valueX, rowY, { align: "right" });

  if (isInterState) {
    rowY += 10;
    const custStateCode = quotation.gst_number!.substring(0, 2);
    const custStateName = getStateName(custStateCode);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.text("Place of Supply:", labelX, rowY);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(`${custStateCode}-${custStateName || ""}`, valueX, rowY, { align: "right" });
  }

  // ===== ITEM TABLE =====
  const tableStartY = Math.max(infoY + 8, y + 34);

  const getNum = (v: number | string): number =>
    typeof v === "string" ? parseFloat(v) || 0 : v || 0;

  // Build table rows
  const tableBody: any[][] = [];
  let totalGstAmount = 0;
  let totalQuantity = 0;

  items.forEach((item, idx) => {
    const qty = getNum(item.quantity);
    const price = getNum(item.unit_price);
    const lineAmount = qty * price;
    const taxPct = getNum(item.tax_percent ?? 0);
    const taxAmt = lineAmount * (taxPct / 100);
    const finalAmt = lineAmount + taxAmt;
    totalGstAmount += taxAmt;
    totalQuantity += qty;

    // Build item name with description and model
    let itemName = item.product_name;
    if (item.description && item.description.trim()) {
      itemName += `\n${item.description.trim()}`;
    }
    if (item.model_no && item.model_no.trim()) {
      itemName += ` Model No.: ${item.model_no.trim()}`;
    }

    tableBody.push([
      (idx + 1).toString(),
      itemName,
      item.hsn_sac || item.serial_no || "",
      qty.toString(),
      item.unit || "Pcs",
      fmt(price),
      taxPct > 0 ? `${fmt(taxAmt)} (${taxPct}%)` : "-",
      fmt(finalAmt),
    ]);
  });

  // Total row
  tableBody.push([
    { content: "Total", styles: { fontStyle: "bold", fillColor: lightBg } },
    { content: "", styles: { fillColor: lightBg } },
    { content: "", styles: { fillColor: lightBg } },
    { content: totalQuantity.toString(), styles: { fontStyle: "bold", fillColor: lightBg, halign: "center" } },
    { content: "", styles: { fillColor: lightBg } },
    { content: "", styles: { fillColor: lightBg } },
    { content: fmt(totalGstAmount), styles: { fontStyle: "bold", fillColor: lightBg } },
    { content: fmt(quotation.grand_total), styles: { fontStyle: "bold", fillColor: lightBg } },
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [["#", "Item name", "HSN/ SAC", "Quantity", "Unit", "Price/ Unit", "GST", "Amount"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: red,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      lineWidth: 0.3,
      lineColor: [200, 30, 30],
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: dark,
      lineWidth: 0.2,
      lineColor: border,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 28, halign: "right" },
      6: { cellWidth: 34, halign: "right" },
      7: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 8;

  // ===== TOTALS SECTION (right aligned) =====
  const sumX = pw - 78;

  // Check if we need a new page
  const checkPageBreak = (needed: number) => {
    if (finalY + needed > ph - 20) {
      doc.addPage();
      finalY = 20;
    }
  };

  checkPageBreak(50);

  // Sub Total
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Sub Total", sumX, finalY);
  doc.setTextColor(...dark);
  doc.text(fmt(quotation.subtotal), pw - 14, finalY, { align: "right" });
  finalY += 7;

  // Courier charges
  if (quotation.courier_charge > 0) {
    doc.setTextColor(...muted);
    doc.text(quotation.courier_type || "Courier Charges", sumX, finalY);
    doc.setTextColor(...dark);
    doc.text(fmt(quotation.courier_charge), pw - 14, finalY, { align: "right" });
    finalY += 7;
  }

  // GST / IGST
  if (quotation.apply_gst) {
    const gstLabel = isInterState ? "IGST@18%" : "GST@18%";
    doc.setTextColor(...muted);
    doc.text(gstLabel, sumX, finalY);
    doc.setTextColor(...dark);
    doc.text(fmt(quotation.gst_amount), pw - 14, finalY, { align: "right" });
    finalY += 7;
  }

  // Courier GST
  if (quotation.apply_courier_gst && quotation.courier_gst_amount > 0) {
    doc.setTextColor(...muted);
    doc.text("Courier GST", sumX, finalY);
    doc.setTextColor(...dark);
    doc.text(fmt(quotation.courier_gst_amount), pw - 14, finalY, { align: "right" });
    finalY += 7;
  }

  // Grand Total bar
  doc.setFillColor(...red);
  doc.rect(sumX - 5, finalY - 4, pw - sumX + 19, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Grand Total", sumX, finalY + 3);
  doc.text(fmt(quotation.grand_total), pw - 14, finalY + 3, { align: "right" });
  finalY += 18;

  // ===== PAYMENT SECTION =====
  checkPageBreak(55);
  const payY = finalY;

  // Bank Details Box (Left)
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...border);
  doc.roundedRect(14, payY, 88, 38, 2, 2, "FD");

  doc.setTextColor(...dark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Pay To:", 18, payY + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Bank Name: IDFC FIRST BANK LTD, NOIDA", 18, payY + 15);
  doc.text("Bank Account No.: 10188344828", 18, payY + 21);
  doc.text("Bank IFSC code: IDFB0020158", 18, payY + 27);
  doc.text("Account holder's name: RealTrack Technology", 18, payY + 33);

  // QR Section (Right)
  const qrBase64 = await loadImageAsBase64("/images/idfc-qr-scanner.jpeg");
  const qrCX = pw - 45;
  doc.setTextColor(...red);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Pay by UPI / Scan QR to Pay", qrCX, payY + 2, { align: "center" });
  if (qrBase64) {
    doc.addImage(qrBase64, "JPEG", qrCX - 15, payY + 5, 30, 28);
  }
  doc.setTextColor(...dark);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("UPI ID: retrgy@idfcbank", qrCX, payY + 36, { align: "center" });

  finalY = payY + 46;

  // ===== AMOUNT IN WORDS =====
  checkPageBreak(25);
  doc.setTextColor(...red);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Estimate Amount In Words", 14, finalY);
  const amountWords = numberToWords(quotation.grand_total);
  doc.setTextColor(...dark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(amountWords, 14, finalY + 8);
  finalY += 20;

  // ===== REMARKS =====
  const remarks = (quotation as any).remarks;
  if (remarks && remarks.trim()) {
    checkPageBreak(20);
    doc.setTextColor(...red);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Remarks", 14, finalY);
    doc.setTextColor(...dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const remarkLines = doc.splitTextToSize(remarks, pw - 28);
    doc.text(remarkLines, 14, finalY + 8);
    finalY += 10 + remarkLines.length * 4;
  }

  // ===== TERMS & CONDITIONS =====
  const termsAndConditions = [
    "Quotation is valid for 7 days.",
    "Advance payment is required to confirm the order.",
    "Material will be dispatched on the same or next working day after payment (subject to availability).",
    "All products come with a 1-year warranty (except cables).",
    "No return or exchange once sold.",
    "Warranty will be void in case of physical damage, improper installation, or tampering.",
    "The company is not responsible for delivery delays caused by courier/transport.",
  ];

  // Estimate space needed: heading + 7 items × ~5mm each + padding
  checkPageBreak(60);
  doc.setTextColor(...red);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Terms & Conditions", 14, finalY);
  finalY += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  termsAndConditions.forEach((term, idx) => {
    checkPageBreak(8);
    const termText = `${idx + 1}. ${term}`;
    const lines = doc.splitTextToSize(termText, pw - 28);
    doc.text(lines, 14, finalY);
    finalY += lines.length * 4.5;
  });
  finalY += 6;

  // ===== AUTHORIZED SIGNATORY =====
  checkPageBreak(35);
  doc.setTextColor(...muted);
  doc.setFontSize(9);
  doc.text("For : RealTrack Technology", 14, finalY);
  doc.setDrawColor(...muted);
  doc.line(14, finalY + 20, 70, finalY + 20);
  doc.setTextColor(...dark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", 14, finalY + 27);

  // Add bottom red bar on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...red);
    doc.rect(0, ph - 8, pw, 8, "F");
  }

  return doc;
};

/** Generate the quotation PDF and return as base64 data URI string */
export const generateQuotationPDFBase64 = async (
  quotation: Quotation,
  items: QuotationItem[]
): Promise<string> => {
  const doc = await generateQuotationPDF(quotation, items);
  // Returns raw base64 string (no data URI prefix)
  return doc.output("datauristring").split(",")[1];
};

/** Map Indian GST state codes to state names */
function getStateName(code: string): string | null {
  const states: Record<string, string> = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
    "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar",
    "36": "Telangana", "37": "Andhra Pradesh",
  };
  return states[code] || null;
}
