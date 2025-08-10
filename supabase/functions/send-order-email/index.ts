import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import jsPDF from "npm:jspdf@2.5.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  orderItems: Array<{
    product_name: string;
    quantity: number;
    product_price: number;
    total: number;
  }>;
  subtotal: number;
  shippingCharges: number;
  discountAmount: number;
  total: number;
  orderDate: string;
  invoiceDate: string;
  adminEmail: string;
  invoiceSettings?: {
    businessName: string;
    businessSubtitle: string;
    phone: string;
    email: string;
  };
}

const generatePDF = (orderData: OrderEmailRequest): Uint8Array => {
  const doc = new jsPDF();
  const settings = orderData.invoiceSettings || {
    businessName: "Your Business",
    businessSubtitle: "Professional Services",
    businessPhone: "+1 (555) 123-4567",
    businessEmail: "contact@yourbusiness.com"
  };

  // Header
  doc.setFontSize(24);
  doc.text(settings.businessName, 20, 30);
  doc.setFontSize(12);
  doc.text(settings.businessSubtitle, 20, 40);
  doc.text(`Phone: ${settings.businessPhone}`, 20, 50);
  doc.text(`Email: ${settings.businessEmail}`, 20, 60);

  // Invoice title
  doc.setFontSize(20);
  doc.text("INVOICE", 150, 30);

  // Order details
  doc.setFontSize(12);
  doc.text(`Order ID: ${orderData.orderId}`, 20, 80);
  doc.text(`Date: ${new Date(orderData.orderDate).toLocaleDateString()}`, 20, 90);
  doc.text(`Customer: ${orderData.customerName}`, 20, 100);
  doc.text(`Email: ${orderData.customerEmail}`, 20, 110);

  // Items header
  let yPosition = 130;
  doc.setFontSize(14);
  doc.text("Items:", 20, yPosition);
  yPosition += 10;

  // Items table
  doc.setFontSize(10);
  doc.text("Product", 20, yPosition);
  doc.text("Qty", 120, yPosition);
  doc.text("Price", 140, yPosition);
  doc.text("Total", 170, yPosition);
  yPosition += 10;

  // Draw line
  doc.line(20, yPosition - 5, 190, yPosition - 5);

  // Items
  orderData.orderItems.forEach((item) => {
    doc.text(item.product_name, 20, yPosition);
    doc.text(item.quantity.toString(), 120, yPosition);
    doc.text(`$${item.product_price.toFixed(2)}`, 140, yPosition);
    doc.text(`$${item.total.toFixed(2)}`, 170, yPosition);
    yPosition += 10;
  });

  // Totals
  yPosition += 10;
  doc.text(`Subtotal: $${orderData.subtotal.toFixed(2)}`, 120, yPosition);
  yPosition += 10;
  if (orderData.shippingCharges > 0) {
    doc.text(`Shipping: $${orderData.shippingCharges.toFixed(2)}`, 120, yPosition);
    yPosition += 10;
  }
  if (orderData.discountAmount > 0) {
    doc.text(`Discount: -$${orderData.discountAmount.toFixed(2)}`, 120, yPosition);
    yPosition += 10;
  }
  doc.setFontSize(12);
  doc.text(`Total: $${orderData.total.toFixed(2)}`, 120, yPosition);

  return doc.output('arraybuffer');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const orderData: OrderEmailRequest = await req.json();
    console.log("Processing order email for:", orderData.orderId);

    // Generate PDF
    const pdfBytes = generatePDF(orderData);
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // Send email to customer
    const customerEmailResponse = await resend.emails.send({
      from: "Orders <onboarding@resend.dev>",
      to: [orderData.customerEmail],
      subject: `Order Confirmation - ${orderData.orderId}`,
      html: `
        <h1>Thank you for your order, ${orderData.customerName}!</h1>
        <p>Your order <strong>${orderData.orderId}</strong> has been confirmed.</p>
        <h3>Order Details:</h3>
        <ul>
          ${orderData.orderItems.map(item => 
            `<li>${item.product_name} - Qty: ${item.quantity} - $${item.total.toFixed(2)}</li>`
          ).join('')}
        </ul>
        <p><strong>Total: $${orderData.total.toFixed(2)}</strong></p>
        <p>Please find your invoice attached.</p>
        <p>Best regards,<br>Your Business Team</p>
      `,
      attachments: [
        {
          filename: `${orderData.customerName.replace(/\s+/g, '-').toLowerCase()}-invoice-${orderData.orderId}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    // Send copy to admin email
    const businessEmailResponse = await resend.emails.send({
      from: "Orders <onboarding@resend.dev>",
      to: [orderData.adminEmail],
      subject: `New Order Received - ${orderData.orderId}`,
      html: `
        <h1>New Order Received</h1>
        <p>Order ID: <strong>${orderData.orderId}</strong></p>
        <p>Customer: ${orderData.customerName} (${orderData.customerEmail})</p>
        <p>Date: ${new Date(orderData.orderDate).toLocaleDateString()}</p>
        <h3>Order Items:</h3>
        <ul>
          ${orderData.orderItems.map(item => 
            `<li>${item.product_name} - Qty: ${item.quantity} - $${item.total.toFixed(2)}</li>`
          ).join('')}
        </ul>
        <p><strong>Total: $${orderData.total.toFixed(2)}</strong></p>
      `,
      attachments: [
        {
          filename: `${orderData.customerName.replace(/\s+/g, '-').toLowerCase()}-invoice-${orderData.orderId}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    console.log("Emails sent successfully:", { customerEmailResponse, businessEmailResponse });

    return new Response(
      JSON.stringify({ 
        success: true, 
        customerEmailId: customerEmailResponse.data?.id,
        businessEmailId: businessEmailResponse.data?.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);