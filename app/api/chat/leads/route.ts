import { NextRequest, NextResponse } from "next/server";
import { initDb, createLead } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * Manually capture a lead from the chat widget.
 */
export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { name, email, businessName, interest, phone } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const lead = await createLead({
      name: name || null,
      email,
      business_name: businessName || null,
      interest: interest || null,
      phone: phone || null,
      source: "chatbot",
      notes: null,
    });

    // Notify Robi about new lead
    const teamEmail = process.env.TEAM_EMAIL || "zenoscale@gmail.com";
    sendEmail(
      teamEmail,
      `New Lead from Chatbot: ${businessName || email}`,
      `<p><strong>New lead captured via chatbot:</strong></p>
       <p>Name: ${name || "Not provided"}</p>
       <p>Business: ${businessName || "Not provided"}</p>
       <p>Email: ${email}</p>
       <p>Phone: ${phone || "Not provided"}</p>
       <p>Interest: ${interest || "Not specified"}</p>`
    ).catch((err) => console.error("[Lead] Notify error:", err));

    return NextResponse.json({ success: true, lead }, { headers: corsHeaders });
  } catch (err) {
    console.error("[Lead] Error:", err);
    return NextResponse.json(
      { error: "Failed to capture lead" },
      { status: 500, headers: corsHeaders }
    );
  }
}
