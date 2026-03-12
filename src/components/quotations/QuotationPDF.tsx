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

  // Logo
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 10, 4, 28, 11);
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

  // Left: Estimate For
  doc.setTextColor(...red);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Estimate For:", 14, y);

  // Company / Customer name
  doc.setTextColor(...dark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const displayName = quotation.company_name || quotation.customer_name || "-";
  doc.text(displayName, 14, y + 7);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  let infoY = y + 14;

  // Sanitized address
  if (quotation.address) {
    const addressLines = sanitizeAddress(quotation.address);
    addressLines.forEach((line) => {
      doc.text(line, 14, infoY);
      infoY += 5;
    });
  }

  // Contact person (if company name exists and is different)
  if (quotation.company_name && quotation.customer_name && quotation.company_name !== quotation.customer_name) {
    doc.text(`Contact Person: ${quotation.customer_name}`, 14, infoY);
    infoY += 5;
  }

  if (quotation.mobile) {
    doc.text(`Contact No.: ${quotation.mobile}`, 14, infoY);
    infoY += 5;
  }

  if (quotation.gst_number) {
    doc.text(`GSTIN Number: ${quotation.gst_number}`, 14, infoY);
    infoY += 5;
  }

  // Derive state from GST number (first 2 digits)
  if (quotation.gst_number && quotation.gst_number.length >= 2) {
    const stateCode = quotation.gst_number.substring(0, 2);
    const stateName = getStateName(stateCode);
    if (stateName) {
      doc.text(`State: ${stateCode}-${stateName}`, 14, infoY);
      infoY += 5;
    }
  }

  // Right: Estimate No & Date box
  doc.setDrawColor(...border);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(pw - 78, y - 4, 68, 30, 2, 2, "FD");

  doc.setTextColor(...muted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Estimate No.:", pw - 74, y + 4);
  doc.text("Date:", pw - 74, y + 12);

  // Determine supply place from customer GST
  const isInterState = quotation.gst_number && quotation.gst_number.length >= 2 &&
    quotation.gst_number.substring(0, 2) !== "09";
  if (isInterState) {
    const custStateCode = quotation.gst_number!.substring(0, 2);
    const custStateName = getStateName(custStateCode);
    doc.text("Place of Supply:", pw - 74, y + 20);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(`${custStateCode}-${custStateName || ""}`, pw - 14, y + 20, { align: "right" });
  }

  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(quotation.quotation_no, pw - 14, y + 4, { align: "right" });
  doc.text(format(new Date(quotation.quotation_date), "dd/MM/yyyy"), pw - 14, y + 12, { align: "right" });

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

  // ===== TERMS =====
  checkPageBreak(30);
  doc.setTextColor(...red);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Terms And Conditions", 14, finalY);
  doc.setTextColor(...dark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Thanks for doing business with us!", 14, finalY + 8);
  finalY += 20;

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

  // Bottom red bar
  doc.setFillColor(...red);
  doc.rect(0, ph - 8, pw, 8, "F");

  return doc;
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
