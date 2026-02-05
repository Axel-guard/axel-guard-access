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
   const pageHeight = doc.internal.pageSize.getHeight();
 
   // Colors
   const primaryRed: [number, number, number] = [220, 38, 38]; // Red-600
   const textColor: [number, number, number] = [17, 24, 39];
   const mutedColor: [number, number, number] = [75, 85, 99];
   const lightGray: [number, number, number] = [249, 250, 251];
 
   // Top Header Bar
   doc.setFillColor(248, 248, 248);
   doc.rect(0, 0, pageWidth, 25, "F");
 
   // Logo placeholder
   doc.setFillColor(...primaryRed);
   doc.roundedRect(10, 5, 35, 15, 2, 2, "F");
   doc.setTextColor(255, 255, 255);
   doc.setFontSize(10);
   doc.setFont("helvetica", "bold");
   doc.text("AxelGuard", 14, 14);
 
   // Contact Info in header
   doc.setTextColor(...mutedColor);
   doc.setFontSize(9);
   doc.setFont("helvetica", "normal");
   doc.text("+91 8755311835", 55, 10);
   doc.text("info@axel-guard.com", 95, 10);
   doc.text("Office No.210 Second Floor", pageWidth - 14, 8, { align: "right" });
   doc.text("PC Chamber Sector 66 Noida,", pageWidth - 14, 13, { align: "right" });
   doc.text("Uttar Pradesh - 201301", pageWidth - 14, 18, { align: "right" });
 
   // Company Name Banner (Red)
   doc.setFillColor(...primaryRed);
   doc.rect(0, 25, pageWidth, 20, "F");
   doc.setTextColor(255, 255, 255);
   doc.setFontSize(16);
   doc.setFont("helvetica", "bold");
   doc.text("AxelGuard Technologies", 14, 37);
 
   // GSTIN and State
   doc.setTextColor(...textColor);
   doc.setFontSize(9);
   doc.setFont("helvetica", "normal");
   doc.text("GSTIN: 09FSEPP6050C1ZQ", 14, 52);
   doc.text("State: 09-Uttar Pradesh", 14, 58);
 
   // Estimate Title
   doc.setFontSize(28);
   doc.setFont("helvetica", "bold");
   doc.text("Estimate", pageWidth - 14, 55, { align: "right" });
 
   // Estimate No & Date
   doc.setFontSize(10);
   doc.setFont("helvetica", "normal");
   doc.setTextColor(...mutedColor);
   doc.text("Estimate No.:", pageWidth - 60, 65);
   doc.text("Date:", pageWidth - 60, 72);
   doc.setTextColor(...textColor);
   doc.setFont("helvetica", "bold");
   doc.text(quotation.quotation_no, pageWidth - 14, 65, { align: "right" });
   doc.text(format(new Date(quotation.quotation_date), "dd/MM/yyyy"), pageWidth - 14, 72, { align: "right" });
 
   // Estimate For Section
   doc.setTextColor(...primaryRed);
   doc.setFontSize(11);
   doc.setFont("helvetica", "bold");
   doc.text("Estimate For:", 14, 70);
 
   doc.setTextColor(...textColor);
   doc.setFontSize(14);
   doc.setFont("helvetica", "bold");
   doc.text(quotation.customer_name || "-", 14, 78);
 
   doc.setFontSize(9);
   doc.setFont("helvetica", "normal");
   if (quotation.mobile) {
     doc.text(`Contact No.: ${quotation.mobile}`, 14, 85);
   }
 
   // Calculate total quantity
   const totalQuantity = items.reduce((sum, item) => {
     const qty = typeof item.quantity === "string" ? parseFloat(item.quantity) || 0 : item.quantity;
     return sum + qty;
   }, 0);
 
   // Items Table - Build table body with descriptions
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
 
     // Description row if exists
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
 
   // Add Total row
   tableBody.push([
     { content: "Total", styles: { fontStyle: "bold", fillColor: lightGray } },
     { content: "", styles: { fillColor: lightGray } },
     { content: totalQuantity.toString(), styles: { fontStyle: "bold", fillColor: lightGray, halign: "center" } },
     { content: "", styles: { fillColor: lightGray } },
     { content: "", styles: { fillColor: lightGray } },
     { content: `Rs ${quotation.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, styles: { fontStyle: "bold", fillColor: lightGray } },
   ]);
 
   autoTable(doc, {
     startY: 95,
     head: [["#", "Item name", "Quantity", "Unit", "Price/ Unit", "Amount"]],
     body: tableBody,
     theme: "striped",
     headStyles: {
       fillColor: primaryRed,
       textColor: [255, 255, 255],
       fontStyle: "bold",
       fontSize: 10,
     },
     bodyStyles: {
       fontSize: 9,
       textColor: textColor,
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
 
   // Get the Y position after table
   let finalY = (doc as any).lastAutoTable.finalY + 8;
 
   // Summary Section (Right side)
   const summaryX = pageWidth - 75;
 
   // Sub Total
   doc.setFontSize(9);
   doc.setTextColor(...mutedColor);
   doc.text("Sub Total", summaryX, finalY);
   doc.setTextColor(...textColor);
   doc.text(`Rs ${quotation.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY, { align: "right" });
   finalY += 7;
 
   // Courier if applicable
   if (quotation.courier_charge > 0) {
     doc.setTextColor(...mutedColor);
    doc.text(quotation.courier_type || "Courier Charges", summaryX, finalY);
     doc.setTextColor(...textColor);
     doc.text(`Rs ${quotation.courier_charge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY, { align: "right" });
     finalY += 7;
   }
 
  // Single GST on (Subtotal + Courier)
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
 
   // Bank Details Section (Left side)
   const bankY = finalY - 30;
   doc.setFillColor(...lightGray);
   doc.roundedRect(14, bankY, 80, 35, 2, 2, "F");
 
   doc.setTextColor(...textColor);
   doc.setFontSize(10);
   doc.setFont("helvetica", "bold");
   doc.text("Pay To:", 18, bankY + 8);
 
   doc.setFontSize(8);
   doc.setFont("helvetica", "normal");
   doc.text("Bank Name : IDFC FIRST BANK LTD, NOIDA", 18, bankY + 15);
   doc.text("Bank Account No. : 10188344828", 18, bankY + 21);
   doc.text("Bank IFSC code : IDFB0020158", 18, bankY + 27);
   doc.text("Account holder's name : AxelGuard Tech", 18, bankY + 33);
 
   // Amount in Words Section
   finalY = Math.max(finalY, bankY + 45);
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
 
   // Terms and Conditions
   doc.setTextColor(...primaryRed);
   doc.setFontSize(12);
   doc.setFont("helvetica", "bold");
   doc.text("Terms And Conditions", 14, finalY);
 
   doc.setTextColor(...textColor);
   doc.setFontSize(9);
   doc.setFont("helvetica", "normal");
   doc.text("Thanks for doing business with us!", 14, finalY + 8);
   finalY += 25;
 
   // Authorized Signatory Section
   doc.setTextColor(...mutedColor);
   doc.text("For : AxelGuard Technologies", 14, finalY);
 
   // Signature line
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