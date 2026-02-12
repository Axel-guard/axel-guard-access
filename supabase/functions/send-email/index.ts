 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
interface EmailRequest {
  type: "sale" | "dispatch" | "tracking" | "quotation";
  orderId?: string;
  quotationId?: string;
  dispatchData?: {
    dispatchDate?: string;
    serialNumbers?: string[];
    productName?: string;
    totalQuantity?: number;
  };
}
 
 const CC_EMAIL = "mani@axel-guard.com";
 
 const formatCurrency = (amount: number) =>
   `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
 
const baseEmailStyles = `
  body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
  .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 32px 24px; text-align: center; }
  .header-logo { font-size: 32px; font-weight: 700; margin: 0; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .header-subtitle { font-size: 18px; font-weight: 400; margin: 8px 0 0 0; opacity: 0.95; }
  .content { padding: 32px 24px; background: #f9fafb; }
  .greeting { font-size: 16px; margin-bottom: 8px; }
  .greeting strong { color: #1e40af; }
  .intro-text { color: #4b5563; margin-bottom: 24px; }
  .section-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .section-title { font-size: 15px; font-weight: 600; color: #1e40af; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #3b82f6; display: flex; align-items: center; gap: 8px; }
  .info-row { padding: 10px 0; border-bottom: 1px solid #f3f4f6; display: flex; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #6b7280; font-size: 14px; min-width: 140px; }
  .info-value { font-weight: 600; color: #111827; }
  .product-list { color: #374151; font-size: 14px; line-height: 1.8; }
  .amount-section { margin: 24px 0; }
  .amount-box { text-align: center; padding: 20px; border-radius: 10px; margin-bottom: 12px; }
  .amount-box.total { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; }
  .amount-box.received { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; }
  .amount-box.balance { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; }
  .amount-label { font-size: 13px; opacity: 0.9; margin-bottom: 4px; }
  .amount-value { font-size: 26px; font-weight: 700; }
  .closing-text { color: #4b5563; margin-top: 24px; font-size: 14px; }
  .footer { text-align: center; padding: 28px 24px; background: #1f2937; color: #9ca3af; font-size: 13px; }
  .footer-brand { color: #ffffff; font-weight: 600; font-size: 15px; margin-bottom: 8px; }
  .footer-contact { margin-top: 12px; }
  .footer-contact a { color: #60a5fa; text-decoration: none; }
  .serial-badge { display: inline-block; background: #10b981; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-family: monospace; margin: 4px; }
  .status-badge { display: inline-block; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; }
  .status-badge.success { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
  .status-badge.transit { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
  .tracking-highlight { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 20px 0; }
  .tracking-number { font-size: 28px; font-weight: 700; letter-spacing: 2px; margin-top: 8px; font-family: monospace; }
`;

const getEmailTemplate = (
  type: string,
  data: Record<string, unknown>
): { subject: string; body: string } => {
  switch (type) {
    case "sale":
      // Build product table rows
      const productItems = data.productItems as Array<{
        product_name: string;
        quantity: number;
        unit_price: number;
      }> || [];
      
      const productTableRows = productItems.map(item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.product_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">${formatCurrency(item.unit_price)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(item.quantity * item.unit_price)}</td>
        </tr>
      `).join('');

      const courierMode = data.courierMode || 'Standard';
      const courierCost = Number(data.courierCost) || 0;
      const subtotal = Number(data.subtotal) || 0;
      const gstAmount = Number(data.gstAmount) || 0;
      const showGst = gstAmount > 0;

      return {
        subject: `Order Confirmation - ${data.orderId} | AxelGuard`,
        body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseEmailStyles}
    .product-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .product-table th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    .product-table th:nth-child(2), .product-table th:nth-child(3), .product-table th:nth-child(4) { text-align: right; }
    .product-table th:nth-child(2) { text-align: center; }
    .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .summary-row:last-child { border-bottom: none; }
    .summary-row.total { background: #f0f9ff; margin: 12px -20px -20px -20px; padding: 16px 20px; border-radius: 0 0 12px 12px; border-top: 2px solid #3b82f6; }
    .summary-label { color: #6b7280; font-size: 14px; }
    .summary-value { font-weight: 600; color: #111827; }
    .summary-row.total .summary-label, .summary-row.total .summary-value { color: #1e40af; font-size: 16px; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="header-logo">🛡️ AxelGuard</div>
      <div class="header-subtitle">Order Confirmation</div>
    </div>
    <div class="content">
      <p class="greeting">Hello <strong>${data.customerName || "Customer"}</strong>,</p>
      <p class="intro-text">Thank you for choosing AxelGuard. Your order has been successfully created in our system.</p>
      
      <div class="section-card">
        <div class="section-title">📦 Order Details</div>
        <div class="info-row">
          <span class="info-label">Order ID:</span>
          <span class="info-value">${data.orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Order Date:</span>
          <span class="info-value">${data.saleDate}</span>
        </div>
      </div>
      
      <div class="section-card">
        <div class="section-title">🛒 Products Ordered</div>
        <table class="product-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${productTableRows}
          </tbody>
        </table>
      </div>

      <div class="section-card">
        <div class="section-title">🚚 Courier Charges</div>
        <div class="info-row">
          <span class="info-label">Courier Mode:</span>
          <span class="info-value">${courierMode}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Courier Cost:</span>
          <span class="info-value">${formatCurrency(courierCost)}</span>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">💰 Order Summary</div>
        <div class="summary-row">
          <span class="summary-label">Subtotal:</span>
          <span class="summary-value">${formatCurrency(subtotal)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">GST ${showGst ? '(18%)' : ''}:</span>
          <span class="summary-value">${showGst ? formatCurrency(gstAmount) : '₹0.00'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Courier:</span>
          <span class="summary-value">${formatCurrency(courierCost)}</span>
        </div>
        <div class="summary-row total">
          <span class="summary-label">Grand Total:</span>
          <span class="summary-value">${formatCurrency(data.totalAmount as number)}</span>
        </div>
      </div>
      
      <div class="amount-section">
        <div class="amount-box received">
          <div class="amount-label">Amount Received</div>
          <div class="amount-value">${formatCurrency(data.amountReceived as number)}</div>
        </div>
        <div class="amount-box balance">
          <div class="amount-label">Outstanding Balance</div>
          <div class="amount-value">${formatCurrency(data.balanceAmount as number)}</div>
        </div>
      </div>
      
      <p class="closing-text">Our team is reviewing your order and will process it shortly. You will receive dispatch notification soon.</p>
    </div>
    <div class="footer">
      <div class="footer-brand">Warm regards,<br>AxelGuard Team</div>
      <div class="footer-contact">
        📧 <a href="mailto:info@axel-guard.com">info@axel-guard.com</a> &nbsp;|&nbsp; 🌐 <a href="https://www.axel-guard.com">www.axel-guard.com</a>
      </div>
    </div>
  </div>
</body>
</html>`,
      };
 
     case "dispatch":
       const serialNumbersHtml = (data.serialNumbers as string[])?.length > 0
        ? `<div class="section-card">
            <div class="section-title">🔢 Dispatched Serial Numbers</div>
            <div style="text-align: center; padding: 10px 0;">
              ${(data.serialNumbers as string[]).map((sn: string) => `<span class="serial-badge">${sn}</span>`).join("")}
             </div>
           </div>`
         : "";
 
       const totalOrderQty = Number(data.totalOrderItems) || 0;
       const totalDispatchedSoFar = Number(data.totalDispatchedSoFar) || 0;
       const remainingItems = Number(data.remainingItems) || 0;
       const isPartialDispatch = remainingItems > 0;

       return {
         subject: `${isPartialDispatch ? 'Partial ' : ''}Dispatch - Order ${data.orderId} | AxelGuard`,
         body: `<!DOCTYPE html>
 <html>
 <head>
   <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseEmailStyles}
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); }
    .section-title { color: #059669; border-bottom-color: #10b981; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 16px 0; }
    .summary-item { text-align: center; padding: 16px; border-radius: 10px; }
    .summary-item.total { background: #f0f9ff; border: 1px solid #bae6fd; }
    .summary-item.dispatched { background: #d1fae5; border: 1px solid #6ee7b7; }
    .summary-item.remaining { background: #fef3c7; border: 1px solid #fcd34d; }
    .summary-number { font-size: 24px; font-weight: 700; }
    .summary-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  </style>
 </head>
 <body>
  <div class="email-wrapper">
     <div class="header">
      <div class="header-logo">🚚 AxelGuard</div>
      <div class="header-subtitle">${isPartialDispatch ? 'Partial Dispatch Notification' : 'Order Dispatched'}</div>
     </div>
     <div class="content">
      <p class="greeting">Hello <strong>${data.customerName || "Customer"}</strong>,</p>
      <p class="intro-text">${isPartialDispatch 
        ? 'A partial shipment for your order has been dispatched. The remaining items will follow in subsequent dispatches.'
        : 'Great news! Your order has been fully dispatched and is on its way to you.'}</p>
       
      <div class="section-card">
        <div class="section-title">📦 Dispatch Information</div>
        <div class="info-row">
          <span class="info-label">Order ID:</span>
          <span class="info-value">${data.orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dispatch Date:</span>
          <span class="info-value">${data.dispatchDate}</span>
        </div>
       </div>
       
      <div class="section-card">
        <div class="section-title">📋 Dispatch Summary</div>
        <div class="summary-grid">
          <div class="summary-item total">
            <div class="summary-number" style="color: #1e40af;">${totalOrderQty}</div>
            <div class="summary-label">Total Order Items</div>
          </div>
          <div class="summary-item dispatched">
            <div class="summary-number" style="color: #059669;">${totalDispatchedSoFar}</div>
            <div class="summary-label">Total Dispatched</div>
          </div>
          <div class="summary-item remaining">
            <div class="summary-number" style="color: #d97706;">${remainingItems}</div>
            <div class="summary-label">Remaining</div>
          </div>
        </div>
        <div class="info-row">
          <span class="info-label">This Dispatch:</span>
          <span class="info-value">${data.totalQuantity || 0} item(s)</span>
        </div>
        <div class="info-row">
          <span class="info-label">Products:</span>
          <span class="info-value">${data.productName || "N/A"}</span>
        </div>
       </div>
       
       ${serialNumbersHtml}
       
      <div style="text-align: center; margin: 28px 0;">
        <span class="status-badge ${isPartialDispatch ? 'transit' : 'success'}">${isPartialDispatch ? '📦 Partial Shipment Sent' : '✅ All Items Dispatched'}</span>
       </div>
       
      <p class="closing-text">${isPartialDispatch 
        ? 'The remaining items will be dispatched soon. Courier & tracking details will be shared separately.'
        : 'Courier & tracking details will be shared soon.'}</p>
     </div>
     <div class="footer">
      <div class="footer-brand">Warm regards,<br>AxelGuard Team</div>
      <div class="footer-contact">
        📧 <a href="mailto:info@axel-guard.com">info@axel-guard.com</a> &nbsp;|&nbsp; 🌐 <a href="https://www.axel-guard.com">www.axel-guard.com</a>
      </div>
     </div>
   </div>
 </body>
 </html>`,
       };
 
     case "tracking":
       return {
         subject: `Tracking Details - Order ${data.orderId} | AxelGuard`,
         body: `<!DOCTYPE html>
 <html>
 <head>
   <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseEmailStyles}
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); }
    .section-title { color: #7c3aed; border-bottom-color: #a78bfa; }
  </style>
 </head>
 <body>
  <div class="email-wrapper">
     <div class="header">
      <div class="header-logo">📍 AxelGuard</div>
      <div class="header-subtitle">Tracking Details</div>
     </div>
     <div class="content">
      <p class="greeting">Hello <strong>${data.customerName || "Customer"}</strong>,</p>
      <p class="intro-text">Your order is on the way! Here are your shipment tracking details.</p>
       
       <div class="tracking-highlight">
         <div style="font-size: 14px; opacity: 0.9;">🚚 AWB / Tracking Number</div>
         <div class="tracking-number">${data.trackingId || "Pending"}</div>
       </div>
       
      <div class="section-card">
        <div class="section-title">📦 Shipment Details</div>
        <div class="info-row">
          <span class="info-label">Order ID:</span>
          <span class="info-value">${data.orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Courier Partner:</span>
          <span class="info-value">${data.courier || "N/A"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Shipping Mode:</span>
          <span class="info-value">${data.mode || "N/A"}</span>
        </div>
       </div>
       
      <div style="text-align: center; margin: 28px 0;">
        <span class="status-badge transit">📦 In Transit</span>
       </div>
       
      <p class="closing-text">Contact us if you have any questions about your delivery.</p>
     </div>
     <div class="footer">
      <div class="footer-brand">Warm regards,<br>AxelGuard Team</div>
      <div class="footer-contact">
        📧 <a href="mailto:info@axel-guard.com">info@axel-guard.com</a> &nbsp;|&nbsp; 🌐 <a href="https://www.axel-guard.com">www.axel-guard.com</a>
      </div>
     </div>
   </div>
 </body>
 </html>`,
       };
 
    case "quotation":
      const quotationItems = data.quotationItems as Array<{
        product_name: string;
        quantity: number;
        unit_price: number;
        amount: number;
        description?: string;
      }> || [];
      
      const quotationTableRows = quotationItems.map((item, idx) => `
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; color: #374151;">${idx + 1}</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151;">
            ${item.product_name}
            ${item.description ? `<div style="font-size: 12px; color: #6b7280; font-style: italic; margin-top: 4px;">${item.description}</div>` : ''}
          </td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.quantity}</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: #374151;">${formatCurrency(item.unit_price)}</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(item.amount)}</td>
        </tr>
      `).join('');

      const qSubtotal = Number(data.subtotal) || 0;
      const qGstAmount = Number(data.gstAmount) || 0;
      const qCourierCharge = Number(data.courierCharge) || 0;
      const qShowGst = qGstAmount > 0;
      const qRemarks = data.remarks as string || '';

      return {
        subject: `Quotation ${data.quotationNo} | RealTrack Technology (AxelGuard)`,
        body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseEmailStyles}
    .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); }
    .section-title { color: #dc2626; border-bottom-color: #ef4444; }
    .product-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .product-table th { background: #dc2626; color: white; padding: 12px; text-align: left; font-size: 13px; font-weight: 600; border: 1px solid #b91c1c; }
    .product-table th:nth-child(1) { text-align: center; width: 40px; }
    .product-table th:nth-child(3) { text-align: center; }
    .product-table th:nth-child(4), .product-table th:nth-child(5) { text-align: right; }
    .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .summary-row:last-child { border-bottom: none; }
    .summary-row.total { background: #fef2f2; margin: 12px -20px -20px -20px; padding: 16px 20px; border-radius: 0 0 12px 12px; border-top: 2px solid #dc2626; }
    .summary-label { color: #6b7280; font-size: 14px; }
    .summary-value { font-weight: 600; color: #111827; }
    .summary-row.total .summary-label, .summary-row.total .summary-value { color: #dc2626; font-size: 16px; }
    .validity-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 20px; text-align: center; }
    .company-header { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .remarks-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="header-logo">📋 RealTrack Technology</div>
      <div class="header-subtitle">Quotation / Estimate</div>
    </div>
    <div class="content">
      <!-- Company Details -->
      <div class="company-header">
        <div style="font-weight: 700; font-size: 15px; color: #111827; margin-bottom: 4px;">RealTrack Technology <span style="font-weight: 400; font-size: 13px; color: #6b7280;">(Brand: AxelGuard)</span></div>
        <div style="font-size: 13px; color: #4b5563;">
          GST: 09FSEPP6050C1ZQ<br>
          📞 +91 8755311835 &nbsp;|&nbsp; ✉️ info@axel-guard.com<br>
          📍 Office No 210, PC Chamber, Sector 66 Noida (UP) - 201301
        </div>
      </div>

      <p class="greeting">Dear <strong>${data.customerName || "Customer"}</strong>,</p>
      <p class="intro-text">Thank you for your interest in our products. We are pleased to share the following quotation for your review and consideration.</p>
      
      <div class="section-card">
        <div class="section-title">📋 Quotation Details</div>
        <div class="info-row">
          <span class="info-label">Quotation No:</span>
          <span class="info-value">${data.quotationNo}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${data.quotationDate}</span>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">👤 Customer Details</div>
        <div class="info-row">
          <span class="info-label">Company:</span>
          <span class="info-value">${data.companyName || data.customerName || '-'}</span>
        </div>
        ${data.companyName && data.customerName ? `<div class="info-row">
          <span class="info-label">Contact Person:</span>
          <span class="info-value">${data.customerName}</span>
        </div>` : ''}
        ${data.customerGst ? `<div class="info-row">
          <span class="info-label">GST:</span>
          <span class="info-value">${data.customerGst}</span>
        </div>` : ''}
        ${data.customerAddress ? `<div class="info-row">
          <span class="info-label">Address:</span>
          <span class="info-value">${data.customerAddress}</span>
        </div>` : ''}
        ${data.customerEmail ? `<div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${data.customerEmail}</span>
        </div>` : ''}
      </div>
      
      <div class="section-card">
        <div class="section-title">🛒 Products</div>
        <table class="product-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${quotationTableRows}
          </tbody>
        </table>
      </div>

      <div class="section-card">
        <div class="section-title">💰 Quotation Summary</div>
        <div class="summary-row">
          <span class="summary-label">Subtotal:</span>
          <span class="summary-value">${formatCurrency(qSubtotal)}</span>
        </div>
        ${qCourierCharge > 0 ? `
        <div class="summary-row">
          <span class="summary-label">${data.courierType || 'Courier Charges'}:</span>
          <span class="summary-value">${formatCurrency(qCourierCharge)}</span>
        </div>` : ''}
        ${qShowGst ? `
        <div class="summary-row">
          <span class="summary-label">GST (18%):</span>
          <span class="summary-value">${formatCurrency(qGstAmount)}</span>
        </div>` : ''}
        <div class="summary-row total">
          <span class="summary-label">Grand Total:</span>
          <span class="summary-value">${formatCurrency(data.grandTotal as number)}</span>
        </div>
      </div>

      ${qRemarks ? `
      <div class="remarks-box">
        <div style="font-weight: 600; font-size: 14px; color: #166534; margin-bottom: 6px;">📝 Remarks</div>
        <div style="font-size: 13px; color: #374151;">${qRemarks}</div>
      </div>` : ''}

      <div class="validity-box">
        <p style="margin: 0; font-weight: 600; color: #92400e;">⏰ This quotation is valid for 15 days from the date of issue</p>
      </div>

      <div class="section-card" style="margin-top: 20px;">
        <div class="section-title">🏦 Payment Details</div>
        <div class="info-row"><span class="info-label">Bank Name:</span><span class="info-value">IDFC FIRST BANK LTD, NOIDA</span></div>
        <div class="info-row"><span class="info-label">Account No.:</span><span class="info-value">10188344828</span></div>
        <div class="info-row"><span class="info-label">IFSC Code:</span><span class="info-value">IDFB0020158</span></div>
        <div class="info-row"><span class="info-label">Account Name:</span><span class="info-value">RealTrack Technology</span></div>
        <div class="info-row"><span class="info-label">UPI ID:</span><span class="info-value">retrgy@idfcbank</span></div>
      </div>
      
      <p class="closing-text">We look forward to your positive response. Please feel free to reach out for any clarifications or to proceed with the order.</p>
    </div>
    <div class="footer">
      <div class="footer-brand">Warm regards,<br>RealTrack Technology (AxelGuard)</div>
      <div class="footer-contact">
        📞 +91 8755311835<br>
        📧 <a href="mailto:info@axel-guard.com">info@axel-guard.com</a> &nbsp;|&nbsp; 🌐 <a href="https://www.axel-guard.com">www.axel-guard.com</a><br>
        📍 Office No 210, PC Chamber, Sector 66 Noida (UP) - 201301
      </div>
    </div>
  </div>
</body>
</html>`,
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
};
 
 function toBase64(str: string): string {
   return btoa(str);
 }
 
 async function sendSmtpEmail(config: {
   host: string;
   port: number;
   username: string;
   password: string;
   from: string;
   to: string;
   cc?: string;
   subject: string;
   body: string;
   isHtml?: boolean;
 }): Promise<void> {
   const encoder = new TextEncoder();
   const decoder = new TextDecoder();
 
   const conn = await Deno.connectTls({
     hostname: config.host,
     port: config.port,
   });
 
   const reader = conn.readable.getReader();
   const writer = conn.writable.getWriter();
 
   async function readResponse(): Promise<string> {
     const result = await reader.read();
     if (result.done) throw new Error("Connection closed");
     return decoder.decode(result.value);
   }
 
   async function sendCommand(cmd: string): Promise<string> {
     await writer.write(encoder.encode(cmd + "\r\n"));
     return await readResponse();
   }
 
   try {
     let response = await readResponse();
     console.log("SMTP greeting:", response.substring(0, 50));
 
     response = await sendCommand("EHLO localhost");
     console.log("EHLO response:", response.substring(0, 50));
 
     response = await sendCommand("AUTH LOGIN");
     console.log("AUTH response:", response.substring(0, 50));
 
     const usernameB64 = toBase64(config.username);
     response = await sendCommand(usernameB64);
 
     const passwordB64 = toBase64(config.password);
     response = await sendCommand(passwordB64);
 
     if (!response.startsWith("235")) {
       throw new Error(`Authentication failed: ${response}`);
     }
     console.log("Authentication successful");
 
     response = await sendCommand(`MAIL FROM:<${config.from}>`);
     if (!response.startsWith("250")) {
       throw new Error(`MAIL FROM failed: ${response}`);
     }
 
     response = await sendCommand(`RCPT TO:<${config.to}>`);
     if (!response.startsWith("250")) {
       throw new Error(`RCPT TO failed: ${response}`);
     }
 
     if (config.cc) {
       response = await sendCommand(`RCPT TO:<${config.cc}>`);
       if (!response.startsWith("250")) {
         console.warn(`CC recipient failed: ${response}`);
       }
     }
 
     response = await sendCommand("DATA");
     if (!response.startsWith("354")) {
       throw new Error(`DATA command failed: ${response}`);
     }
 
     const date = new Date().toUTCString();
     const contentType = config.isHtml ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
     
     const emailContent = [
       `From: AxelGuard <${config.from}>`,
       `To: ${config.to}`,
       config.cc ? `Cc: ${config.cc}` : null,
       `Subject: ${config.subject}`,
       `Date: ${date}`,
       `MIME-Version: 1.0`,
       `Content-Type: ${contentType}`,
       ``,
       config.body,
     ]
       .filter(Boolean)
       .join("\r\n");
 
     await writer.write(encoder.encode(emailContent + "\r\n.\r\n"));
     response = await readResponse();
 
     if (!response.startsWith("250")) {
       throw new Error(`Failed to send email: ${response}`);
     }
     console.log("Message accepted");
 
     await sendCommand("QUIT");
   } finally {
     reader.releaseLock();
     writer.releaseLock();
     conn.close();
   }
 }
 
 async function sendEmailWithRetry(
   config: Parameters<typeof sendSmtpEmail>[0],
   maxRetries: number = 2
 ): Promise<void> {
   let lastError: Error | null = null;
   
   for (let attempt = 1; attempt <= maxRetries; attempt++) {
     try {
       console.log(`Email attempt ${attempt}/${maxRetries}`);
       await sendSmtpEmail(config);
       console.log(`Email sent successfully on attempt ${attempt}`);
       return;
     } catch (error) {
       lastError = error as Error;
       console.error(`Attempt ${attempt} failed:`, error);
       
       if (attempt < maxRetries) {
         await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
       }
     }
   }
   
   throw lastError || new Error("Failed to send email after retries");
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
    const { type, orderId, quotationId, dispatchData }: EmailRequest = await req.json();

    if (!type) {
      throw new Error("Missing required field: type");
    }

    // For quotation emails, we use quotationId instead of orderId
    if (type === "quotation") {
      if (!quotationId) {
        throw new Error("Missing required field: quotationId for quotation emails");
      }
      console.log(`Processing quotation email for: ${quotationId}`);
    } else {
      if (!orderId) {
        throw new Error("Missing required field: orderId");
      }
      console.log(`Processing ${type} email for order: ${orderId}`);
    }
 
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

     let customerEmail: string | null = null;
     let emailData: Record<string, unknown> = {};

     // Handle quotation emails separately
     if (type === "quotation") {
       const { data: quotation, error: quotationError } = await supabase
         .from("quotations")
         .select("*")
         .eq("id", quotationId)
         .single();

       if (quotationError || !quotation) {
         throw new Error(`Quotation not found for ID: ${quotationId}`);
       }

       // Get quotation items with description
       const { data: qItems } = await supabase
         .from("quotation_items")
         .select("product_name, quantity, unit_price, amount, description")
         .eq("quotation_id", quotationId);

       // Use customer_email from quotation record first, fallback to leads
       customerEmail = quotation.customer_email || null;
       if (!customerEmail && quotation.customer_code) {
         const { data: lead } = await supabase
           .from("leads")
           .select("email")
           .eq("customer_code", quotation.customer_code)
           .single();
         customerEmail = lead?.email || null;
       }

      if (!customerEmail) {
        throw new Error("Customer email not found. Please update customer details with email.");
      }

      emailData = {
        quotationNo: quotation.quotation_no,
        quotationDate: new Date(quotation.quotation_date).toLocaleDateString("en-IN"),
        customerName: quotation.customer_name,
        companyName: quotation.company_name || '',
        customerGst: quotation.gst_number || '',
        customerAddress: quotation.address || '',
        customerEmail: customerEmail || '',
        courierType: quotation.courier_type || '',
        remarks: quotation.remarks || '',
        quotationItems: qItems || [],
        subtotal: Number(quotation.subtotal) || 0,
        gstAmount: Number(quotation.gst_amount) || 0,
        courierCharge: Number(quotation.courier_charge) || 0,
        grandTotal: Number(quotation.grand_total) || 0,
      };
    } else {
      // Handle sale-based emails (sale, dispatch, tracking)
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (saleError || !sale) {
        throw new Error(`Sale not found for order ID: ${orderId}`);
      }

       // Use customer_email from sale record first, fallback to leads
       customerEmail = sale.customer_email || null;
       if (!customerEmail && sale.customer_code) {
         const { data: lead } = await supabase
           .from("leads")
           .select("email")
           .eq("customer_code", sale.customer_code)
           .single();
         customerEmail = lead?.email || null;
       }

      if (!customerEmail) {
        throw new Error("Customer email not found. Please update customer details with email.");
      }

      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("product_name, quantity, unit_price")
        .eq("order_id", orderId);

      // Determine courier mode based on sale type or default
      let courierMode = 'Standard';
      if (sale.sale_type?.toLowerCase().includes('air')) {
        courierMode = 'Air';
      } else if (sale.sale_type?.toLowerCase().includes('surface')) {
        courierMode = 'Surface';
      }

      emailData = {
        orderId,
        customerName: sale.customer_name,
        productItems: saleItems || [],
        totalAmount: Number(sale.total_amount) || 0,
        amountReceived: Number(sale.amount_received) || 0,
        balanceAmount: Number(sale.balance_amount) || 0,
        saleDate: new Date(sale.sale_date).toLocaleDateString("en-IN"),
        subtotal: Number(sale.subtotal) || 0,
        gstAmount: Number(sale.gst_amount) || 0,
        courierCost: Number(sale.courier_cost) || 0,
        courierMode,
      };

      if (type === "dispatch") {
        let serialNumbers: string[] = dispatchData?.serialNumbers || [];
        
        if (serialNumbers.length === 0) {
          const { data: inventoryItems } = await supabase
            .from("inventory")
            .select("serial_number")
            .eq("order_id", orderId)
            .eq("status", "Dispatched");
          
          serialNumbers = inventoryItems?.map(i => i.serial_number) || [];
        }
        
        const productName = dispatchData?.productName || 
          saleItems?.map(i => i.product_name).join(", ") || "N/A";
        
        const totalQuantity = dispatchData?.totalQuantity || 
          saleItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;
        
        // Calculate total order items, total dispatched so far, and remaining
        const totalOrderItems = saleItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;
        
        // Count all dispatched inventory for this order
        const { data: allDispatched } = await supabase
          .from("inventory")
          .select("id")
          .eq("order_id", orderId)
          .eq("status", "Dispatched");
        
        const totalDispatchedSoFar = allDispatched?.length || 0;
        const remainingItems = Math.max(0, totalOrderItems - totalDispatchedSoFar);
        
        emailData = {
          ...emailData,
          dispatchDate: dispatchData?.dispatchDate || new Date().toLocaleDateString("en-IN"),
          serialNumbers,
          productName,
          totalQuantity,
          totalOrderItems,
          totalDispatchedSoFar,
          remainingItems,
        };
      }
      
      if (type === "tracking") {
        const { data: shipment } = await supabase
          .from("shipments")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        emailData = {
          ...emailData,
          courier: shipment?.courier_partner,
          mode: shipment?.shipping_mode,
          trackingId: shipment?.tracking_id,
        };
      }
    }

    const { subject, body } = getEmailTemplate(type, emailData);

    console.log(`Sending email to: ${customerEmail}, CC: ${CC_EMAIL}`);

    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER")!;
    const smtpPass = Deno.env.get("SMTP_PASS")!;

    console.log(`Connecting to SMTP: ${smtpHost}:${smtpPort}`);

    await sendEmailWithRetry({
      host: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
      from: smtpUser,
      to: customerEmail,
      cc: CC_EMAIL,
      subject,
      body,
      isHtml: true,
    }, 2);

    console.log(`Email sent successfully for ${type === "quotation" ? `quotation: ${quotationId}` : `order: ${orderId}`}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
   } catch (error) {
     console.error("Error sending email:", error);
     return new Response(
       JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
       {
         status: 500,
         headers: { "Content-Type": "application/json", ...corsHeaders },
       }
     );
   }
 });