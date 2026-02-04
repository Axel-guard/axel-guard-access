import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quotation, QuotationItem } from "@/hooks/useQuotations";
import { numberToWords } from "@/lib/numberToWords";
import { format } from "date-fns";

export const generateQuotationPDF = (
  quotation: Quotation,
  items: QuotationItem[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
  const textColor: [number, number, number] = [31, 41, 55];
  const mutedColor: [number, number, number] = [107, 114, 128];

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("AXELGUARD", 14, 20);

  // Company Tagline
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("GPS Tracking Solutions", 14, 28);

  // Contact Info (Right side)
  doc.setFontSize(9);
  doc.text("Phone: +91 9876543210", pageWidth - 14, 15, { align: "right" });
  doc.text("Email: info@axel-guard.com", pageWidth - 14, 21, { align: "right" });
  doc.text("GSTIN: 27AABCT1332D1ZT", pageWidth - 14, 27, { align: "right" });
  doc.text("Maharashtra, India", pageWidth - 14, 33, { align: "right" });

  // Title
  doc.setTextColor(...textColor);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION / ESTIMATE", pageWidth / 2, 58, { align: "center" });

  // Quotation Info Box
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 70, 65, 56, 22, 2, 2);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Quotation No:", pageWidth - 66, 73);
  doc.text("Date:", pageWidth - 66, 81);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.quotation_no, pageWidth - 30, 73);
  doc.text(
    format(new Date(quotation.quotation_date), "dd/MM/yyyy"),
    pageWidth - 30,
    81
  );

  // Customer Details Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 65, 100, 35, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("BILL TO:", 18, 73);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.text(quotation.customer_name || "-", 18, 81);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  if (quotation.company_name) {
    doc.text(quotation.company_name, 18, 87);
  }
  if (quotation.address) {
    const addressLines = doc.splitTextToSize(quotation.address, 90);
    doc.text(addressLines, 18, quotation.company_name ? 93 : 87);
  }

  // Customer contact on right side of box
  doc.setTextColor(...textColor);
  if (quotation.mobile) {
    doc.text(`Mobile: ${quotation.mobile}`, 18, 97);
  }
  if (quotation.gst_number) {
    doc.text(`GSTIN: ${quotation.gst_number}`, 70, 97);
  }

  // Items Table
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.product_name,
    item.hsn_sac || "-",
    item.quantity.toString(),
    `₹${item.unit_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    `₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 105,
    head: [["#", "Product Description", "HSN/SAC", "Qty", "Rate", "Amount"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 35, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  });

  // Get the Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Summary Section
  const summaryX = pageWidth - 80;
  let summaryY = finalY;

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(summaryX - 5, summaryY - 5, 71, 60, 2, 2, "F");

  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);

  // Subtotal
  doc.text("Subtotal:", summaryX, summaryY);
  doc.setTextColor(...textColor);
  doc.text(
    `₹${quotation.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    pageWidth - 14,
    summaryY,
    { align: "right" }
  );
  summaryY += 7;

  // GST
  if (quotation.apply_gst) {
    doc.setTextColor(...mutedColor);
    doc.text("GST (18%):", summaryX, summaryY);
    doc.setTextColor(...textColor);
    doc.text(
      `₹${quotation.gst_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      pageWidth - 14,
      summaryY,
      { align: "right" }
    );
    summaryY += 7;
  }

  // Courier
  if (quotation.courier_charge > 0) {
    doc.setTextColor(...mutedColor);
    doc.text(`Courier (${quotation.courier_type || "Standard"}):`, summaryX, summaryY);
    doc.setTextColor(...textColor);
    doc.text(
      `₹${quotation.courier_charge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      pageWidth - 14,
      summaryY,
      { align: "right" }
    );
    summaryY += 7;

    if (quotation.apply_courier_gst) {
      doc.setTextColor(...mutedColor);
      doc.text("Courier GST (18%):", summaryX, summaryY);
      doc.setTextColor(...textColor);
      doc.text(
        `₹${quotation.courier_gst_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        pageWidth - 14,
        summaryY,
        { align: "right" }
      );
      summaryY += 7;
    }
  }

  // Grand Total
  doc.setDrawColor(...primaryColor);
  doc.line(summaryX - 2, summaryY, pageWidth - 12, summaryY);
  summaryY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("Grand Total:", summaryX, summaryY);
  doc.text(
    `₹${quotation.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    pageWidth - 14,
    summaryY,
    { align: "right" }
  );

  // Amount in Words
  const amountWords = numberToWords(quotation.grand_total);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text(`Amount in Words: ${amountWords}`, 14, summaryY + 15);

  // Bank Details
  const bankY = summaryY + 30;
  doc.setFillColor(...primaryColor);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(14, bankY, 85, 7, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BANK DETAILS", 18, bankY + 5);

  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Bank: IDFC First Bank", 14, bankY + 14);
  doc.text("Account No: 10XXXXXXXXXX", 14, bankY + 20);
  doc.text("IFSC: IDFB0XXXXXX", 14, bankY + 26);
  doc.text("Account Name: AxelGuard Technologies", 14, bankY + 32);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(229, 231, 235);
  doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...primaryColor);
  doc.text("Thank you for doing business with us!", pageWidth / 2, footerY, {
    align: "center",
  });

  return doc;
};
