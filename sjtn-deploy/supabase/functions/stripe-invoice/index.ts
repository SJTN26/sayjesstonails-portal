import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildInvoiceEmail({ to_name, tier, amount, note, paymentLink }) {
  const dollarAmount = (amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tierDescriptions = {
    "Hourly Session": "One-on-one mentorship session — personalized coaching, Q&A, and strategy tailored to your nail business.",
    "30-Day Intensive": "30 days of focused mentorship — daily access, a custom action plan, and accountability check-ins.",
    "3-Month Elite": "Full 3-month elite program — weekly calls, deep-dive strategy, community access, and ongoing support.",
    "Community": "Monthly SayJessToNails community membership — resources, group coaching, and peer support.",
  };
  const tierDesc = tierDescriptions[tier] || "Payment request for " + tier + ".";
  const noteRow = note ? '<p style="margin:8px 0 0;font-size:12px;color:#6b6b6b;font-style:italic;">' + note + '</p>' : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Invoice from SayJessToNails</title></head>
<body style="margin:0;padding:0;background-color:#f0eaec;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0eaec;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background-color:#C4607A;padding:32px;text-align:center;border-radius:4px 4px 0 0;">
        <img src="https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png" alt="SayJessToNails" height="160" style="display:block;margin:0 auto;"/>
      </td></tr>

      <!-- DARK BAND -->
      <tr><td style="background-color:#1a1a1a;padding:28px 40px;">
        <p style="margin:0 0 4px;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C4607A;">Payment Request</p>
        <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#ffffff;">Hi ${to_name},</p>
        <p style="margin:0;font-size:16px;font-style:italic;color:#e8a4b0;">Your invoice is ready.</p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background-color:#ffffff;padding:28px 40px 20px;">
        <p style="margin:0;font-size:14px;color:#6b6b6b;line-height:1.6;">Jess has sent you a payment request through the SayJessToNails mentorship portal. Review the details below and click the button to pay securely through Stripe.</p>
      </td></tr>

      <!-- INVOICE TABLE -->
      <tr><td style="background-color:#ffffff;padding:0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="padding:12px 18px;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4607A;">Description</td>
            <td style="padding:12px 18px;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4607A;text-align:right;">Amount</td>
          </tr>
          <tr>
            <td style="padding:18px;border-top:1px solid #333;vertical-align:top;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#ffffff;">${tier}</p>
              <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">${tierDesc}</p>
              ${noteRow}
            </td>
            <td style="padding:18px;border-top:1px solid #333;text-align:right;vertical-align:top;">
              <p style="margin:0;font-size:18px;font-weight:900;color:#ffffff;">$${dollarAmount}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 18px;border-top:2px solid #333;">
              <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#999;">Total Due</p>
            </td>
            <td style="padding:14px 18px;border-top:2px solid #333;text-align:right;">
              <p style="margin:0;font-size:20px;font-weight:900;color:#e8a4b0;">$${dollarAmount}</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- CTA BUTTON -->
      <tr><td style="background-color:#ffffff;padding:0 40px 40px;text-align:center;">
        <a href="${paymentLink}" style="display:inline-block;background-color:#C4607A;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:16px 40px;border-radius:2px;">
          Pay Your Invoice &rarr;
        </a>
        <p style="margin:16px 0 0;font-size:11px;color:#9a8880;">Payments are processed securely through Stripe.</p>
      </td></tr>

      <!-- DIVIDER -->
      <tr><td style="background-color:#ffffff;padding:0 40px;"><hr style="border:none;border-top:1px solid #e8e0dc;margin:0;"/></td></tr>

      <!-- FOOTER -->
      <tr><td style="background-color:#1a1a1a;padding:24px 40px;text-align:center;border-radius:0 0 4px 4px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#ffffff;">Jess — SayJessToNails</p>
        <p style="margin:0;font-size:11px;color:#999;">info@sayjesstonails.com &nbsp;&middot;&nbsp; 954-544-2888 &nbsp;&middot;&nbsp; portal.sayjesstonails.com</p>
        <p style="margin:12px 0 0;font-size:10px;color:#666;">Questions? Reply to this email or reach out to Jess directly.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action } = body;

    if (action === "get_invoices") {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ invoices: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_invoice") {
      const { mentee_email, to_name, tier, amount, note } = body;
      if (!mentee_email || !to_name || !amount) throw new Error("Missing required fields");

      const amountCents = Math.round(Number(amount) * 100);

      const stripeRes = await fetch("https://api.stripe.com/v1/payment_links", {
        method: "POST",
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][unit_amount]": String(amountCents),
          "line_items[0][price_data][product_data][name]": tier || "Mentorship Session",
          "line_items[0][price_data][product_data][description]": note || `Invoice for ${to_name}`,
          "line_items[0][quantity]": "1",
          "metadata[mentee_email]": mentee_email,
          "metadata[to_name]": to_name,
        }),
      });
      const stripeData = await stripeRes.json();
      if (!stripeRes.ok) throw new Error(`Stripe error: ${stripeData.error?.message || "Unknown error"}`);
      const paymentLink = stripeData.url;

      const { data, error } = await supabase.from("invoices").insert({
        mentee_email, to_name, tier: tier || "Custom", amount: amountCents,
        note: note || null, status: "pending", stripe_payment_link: paymentLink,
      }).select().single();
      if (error) throw error;

      const emailHtml = buildInvoiceEmail({ to_name, tier: tier || "Custom", amount: amountCents, note, paymentLink });
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Jess at SayJessToNails <info@sayjesstonails.com>",
          to: [mentee_email],
          subject: `Your Invoice from SayJessToNails — ${tier || "Mentorship"}`,
          html: emailHtml,
        }),
      });
      const emailData = await emailRes.json();
      if (!emailRes.ok) console.error("Resend error:", JSON.stringify(emailData));

      return new Response(JSON.stringify({ invoice: data, payment_link: paymentLink, email_sent: emailRes.ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark_paid") {
      const { id } = body;
      const { data, error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ invoice: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "decline_invoice") {
      const { id } = body;
      const { data, error } = await supabase.from("invoices").update({ status: "declined" }).eq("id", id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ invoice: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_invoice") {
      const { id } = body;
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (err) {
    console.error("stripe-invoice error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
