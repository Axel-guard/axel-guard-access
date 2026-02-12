import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quotation, QuotationItem } from "@/hooks/useQuotations";
import { numberToWords } from "@/lib/numberToWords";
import { format } from "date-fns";

// Logo will be loaded from public folder
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

export const generateQuotationPDF = async (
  quotation: Quotation,
  items: QuotationItem[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryRed: [number, number, number] = [220, 38, 38];
  const textColor: [number, number, number] = [17, 24, 39];
  const mutedColor: [number, number, number] = [75, 85, 99];
  const lightGray: [number, number, number] = [249, 250, 251];
  const borderColor: [number, number, number] = [229, 231, 235];

  // Load logo
  const logoBase64 = await loadImageAsBase64(LOGO_URL);

  // ===== GRID 1: COMPANY HEADER =====
  // Top bar background
  doc.setFillColor(248, 248, 248);
  doc.rect(0, 0, pageWidth, 38, "F");
  doc.setDrawColor(...borderColor);
  doc.line(0, 38, pageWidth, 38);

  // Logo (left)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 10, 4, 30, 12);
  }

  // Company details (center-left)
  const companyStartX = logoBase64 ? 44 : 10;
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RealTrack Technology", companyStartX, 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text("(Brand: AxelGuard)", companyStartX, 15);
  doc.text("GST: 09FSEPP6050C1ZQ", companyStartX, 21);
  doc.text("+91 8755311835 | info@axel-guard.com", companyStartX, 27);
  doc.text("Office No 210, PC Chamber, Sector 66 Noida (UP) - 201301", companyStartX, 33);

  // Red banner
  doc.setFillColor(...primaryRed);
  doc.rect(0, 38, pageWidth, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Estimate", pageWidth / 2, 48, { align: "center" });

  // ===== GRID 2: ESTIMATE INFO + CUSTOMER INFO =====
  let startY = 58;

  // Left: Estimate For
  doc.setTextColor(...primaryRed);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Estimate For:", 14, startY);

  doc.setTextColor(...textColor);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(quotation.company_name || quotation.customer_name || "-", 14, startY + 7);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  let infoY = startY + 13;

  if (quotation.company_name && quotation.customer_name) {
    doc.text(`Contact Person: ${quotation.customer_name}`, 14, infoY);
    infoY += 5;
  }
  if (quotation.mobile) {
    doc.text(`Contact No.: ${quotation.mobile}`, 14, infoY);
    infoY += 5;
  }
  if (quotation.customer_email) {
    doc.text(`Email: ${quotation.customer_email}`, 14, infoY);
    infoY += 5;
  }
  if (quotation.address) {
    const addressLines = doc.splitTextToSize(`Address: ${quotation.address}`, 90);
    doc.text(addressLines, 14, infoY);
    infoY += addressLines.length * 4;
  }
  if (quotation.gst_number) {
    doc.text(`GST: ${quotation.gst_number}`, 14, infoY);
    infoY += 5;
  }

  // Right: Estimate No & Date
  doc.setDrawColor(...borderColor);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(pageWidth - 75, startY - 4, 65, 24, 2, 2, "FD");

  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.text("Estimate No.:", pageWidth - 72, startY + 3);
  doc.text("Date:", pageWidth - 72, startY + 12);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.text(quotation.quotation_no, pageWidth - 14, startY + 3, { align: "right" });
  doc.text(format(new Date(quotation.quotation_date), "dd/MM/yyyy"), pageWidth - 14, startY + 12, { align: "right" });

  // ===== GRID 3: PRODUCT TABLE =====
  const tableStartY = Math.max(infoY + 6, startY + 28);

  // Calculate total quantity
  const totalQuantity = items.reduce((sum, item) => {
    const qty = typeof item.quantity === "string" ? parseFloat(item.quantity) || 0 : item.quantity;
    return sum + qty;
  }, 0);

  // Build table body with descriptions
  const tableBody: any[][] = [];
  items.forEach((item, index) => {
    tableBody.push([
      (index + 1).toString(),
      item.product_name,
      item.quantity.toString(),
      item.unit || "Pcs",
      `Rs ${Number(item.unit_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `Rs ${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ]);

    // Description row
    if (item.description && item.description.trim()) {
      tableBody.push([
        "",
        { content: item.description, styles: { fontSize: 8, textColor: mutedColor, fontStyle: "italic" } },
        "",
        "",
        "",
        "",
      ]);
    }
  });

  // Total row
  tableBody.push([
    { content: "Total", styles: { fontStyle: "bold", fillColor: lightGray } },
    { content: "", styles: { fillColor: lightGray } },
    { content: totalQuantity.toString(), styles: { fontStyle: "bold", fillColor: lightGray, halign: "center" } },
    { content: "", styles: { fillColor: lightGray } },
    { content: "", styles: { fillColor: lightGray } },
    { content: `Rs ${quotation.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, styles: { fontStyle: "bold", fillColor: lightGray } },
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [["#", "Item name", "Quantity", "Unit", "Price/ Unit", "Amount"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: primaryRed,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
      lineWidth: 0.5,
      lineColor: [200, 30, 30],
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
      lineWidth: 0.3,
      lineColor: borderColor,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
  });

  // After table Y
  let finalY = (doc as any).lastAutoTable.finalY + 8;

  // Summary Section (Right)
  const summaryX = pageWidth - 75;

  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text("Sub Total", summaryX, finalY);
  doc.setTextColor(...textColor);
  doc.text(`Rs ${quotation.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY, { align: "right" });
  finalY += 7;

  if (quotation.courier_charge > 0) {
    doc.setTextColor(...mutedColor);
    doc.text(quotation.courier_type || "Courier Charges", summaryX, finalY);
    doc.setTextColor(...textColor);
    doc.text(`Rs ${quotation.courier_charge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY, { align: "right" });
    finalY += 7;
  }

  if (quotation.apply_gst) {
    doc.setTextColor(...mutedColor);
    doc.text("GST (18%)", summaryX, finalY);
    doc.setTextColor(...textColor);
    doc.text(`Rs ${quotation.gst_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY, { align: "right" });
    finalY += 7;
  }

  // Total (Red background)
  doc.setFillColor(...primaryRed);
  doc.rect(summaryX - 5, finalY - 4, 70, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Total", summaryX, finalY + 3);
  doc.text(`Rs ${quotation.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY + 3, { align: "right" });
  finalY += 20;

  // Bank Details (Left)
  const bankY = finalY - 30;
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(14, bankY, 80, 45, 2, 2, "FD");

  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Pay To:", 18, bankY + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Bank Name : IDFC FIRST BANK LTD, NOIDA", 18, bankY + 15);
  doc.text("Bank Account No. : 10188344828", 18, bankY + 21);
  doc.text("Bank IFSC code : IDFB0020158", 18, bankY + 27);
  doc.text("Account holder's name : RealTrack Technology", 18, bankY + 33);

  // UPI Details
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("UPI ID : retrgy@idfcbank", 18, bankY + 40);

  // QR Code Image (right side of bank details)
  const qrBase64 = await loadImageAsBase64("/images/idfc-qr-scanner.jpeg");
  if (qrBase64) {
    doc.addImage(qrBase64, "JPEG", pageWidth - 55, bankY, 40, 50);
  }

  // Amount in Words
  finalY = Math.max(finalY, bankY + 55);
  doc.setTextColor(...primaryRed);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Estimate Amount In Words", 14, finalY);

  const amountWords = numberToWords(quotation.grand_total);
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(amountWords, 14, finalY + 8);
  finalY += 20;

  // Remarks section (if available)
  const remarks = (quotation as any).remarks;
  if (remarks && remarks.trim()) {
    doc.setTextColor(...primaryRed);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Remarks", 14, finalY);

    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const remarkLines = doc.splitTextToSize(remarks, pageWidth - 28);
    doc.text(remarkLines, 14, finalY + 8);
    finalY += 10 + remarkLines.length * 4;
  }

  // Terms and Conditions
  doc.setTextColor(...primaryRed);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Terms And Conditions", 14, finalY);

  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("1. This quotation is valid for 15 days from the date of issue.", 14, finalY + 8);
  doc.text("2. Thanks for doing business with us!", 14, finalY + 14);
  finalY += 25;

  // Authorized Signatory
  doc.setTextColor(...mutedColor);
  doc.text("For : RealTrack Technology", 14, finalY);

  doc.setDrawColor(...mutedColor);
  doc.line(14, finalY + 20, 70, finalY + 20);

  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", 14, finalY + 27);

  // Bottom red bar
  doc.setFillColor(...primaryRed);
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F");

  return doc;
};
