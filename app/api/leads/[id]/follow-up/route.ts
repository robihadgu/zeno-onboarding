import { NextRequest, NextResponse } from "next/server";
import { initDb, getLeadById, updateLead, createLeadActivity } from "@/lib/db";
import { generateFollowUpEmail } from "@/lib/sales-agent";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const lead = await getLeadById(parseInt(id));

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!lead.email) return NextResponse.json({ error: "Lead has no email" }, { status: 400 });

  const { send } = await req.json().catch(() => ({ send: true }));

  const { subject, body } = await generateFollowUpEmail(lead, lead.emails_sent);

  if (send) {
    await sendEmail(lead.email, subject, body);
    await updateLead(lead.id, {
      emails_sent: lead.emails_sent + 1,
      last_contacted_at: new Date().toISOString(),
      status: "contacted",
    });
    await createLeadActivity(lead.id, "email_sent", subject);
  }

  return NextResponse.json({ subject, body, sent: send });
}
