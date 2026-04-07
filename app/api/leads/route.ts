import { NextRequest, NextResponse } from "next/server";
import { initDb, getAllLeads, createLead } from "@/lib/db";

/**
 * GET /api/leads — List all leads
 * POST /api/leads — Manually add a lead
 */
export async function GET() {
  await initDb();
  const leads = await getAllLeads();
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const data = await req.json();

    if (!data.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const lead = await createLead({
      name: data.name || null,
      email: data.email,
      business_name: data.businessName || data.business_name || null,
      interest: data.interest || null,
      phone: data.phone || null,
      source: data.source || "manual",
      notes: data.notes || null,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    console.error("[Leads] Error:", err);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
