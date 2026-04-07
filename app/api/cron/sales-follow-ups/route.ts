import { NextRequest, NextResponse } from "next/server";
import {
  initDb,
  getLeadsNeedingFollowUp,
  createLeadActivity,
  updateLead,
} from "@/lib/db";
import { generateFollowUpEmail, getFollowUpStrategy, type LeadScore } from "@/lib/sales-agent";
import { sendEmail } from "@/lib/mailer";

/**
 * Cron job: AI-powered sales follow-ups daily at 10 AM UTC.
 * Generates personalized emails for leads based on their score and timing.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();
  const results: { lead: string; action: string }[] = [];

  const leads = await getLeadsNeedingFollowUp();

  for (const lead of leads) {
    try {
      const strategy = getFollowUpStrategy((lead.score || "warm") as LeadScore);
      const emailsSent = lead.emails_sent || 0;

      if (emailsSent >= strategy.maxFollowUps) {
        // Max follow-ups reached — mark as needs manual review
        await updateLead(lead.id, { status: "contacted" });
        results.push({ lead: lead.email || "unknown", action: "Max follow-ups reached" });
        continue;
      }

      // Generate personalized email
      const { subject, body } = await generateFollowUpEmail(lead, emailsSent);

      if (lead.email) {
        await sendEmail(lead.email, subject, body);
        await createLeadActivity(lead.id, "email_sent", subject);
        await updateLead(lead.id, {
          emails_sent: emailsSent + 1,
          last_contacted_at: new Date().toISOString(),
          status: "contacted",
        });
        results.push({ lead: lead.email, action: `Follow-up #${emailsSent + 1} sent` });
        console.log(`[Sales] Follow-up #${emailsSent + 1} sent to ${lead.email}`);
      }
    } catch (err) {
      console.error(`[Sales] Error following up with ${lead.email}:`, err);
      results.push({ lead: lead.email || "unknown", action: "Error" });
    }
  }

  console.log(`[Cron:Sales] Processed ${results.length} follow-ups`);
  return NextResponse.json({ processed: results.length, results });
}
