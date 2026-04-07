import { NextRequest, NextResponse } from "next/server";
import {
  initDb,
  getClientsNeedingAgreementReminder,
  getClientsNeedingPaymentReminder,
  getClientsNeedingOnboardingReminder,
  incrementReminderCount,
  flagClient,
} from "@/lib/db";
import {
  agreementReminderHtml,
  paymentReminderHtml,
  onboardingReminderHtml,
  flagToRobiHtml,
} from "@/lib/email";
import { sendEmail } from "@/lib/mailer";

/**
 * Cron job: Send follow-up reminders daily at 9 AM UTC.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();
  const results: { type: string; client: string; action: string }[] = [];
  const teamEmail = process.env.TEAM_EMAIL || "zenoscale@gmail.com";

  // Agreement reminders (Day 2, 4, 7)
  const agreementClients = await getClientsNeedingAgreementReminder();
  for (const client of agreementClients) {
    const reminderNum = client.agreement_reminders_sent + 1;
    if (reminderNum <= 3) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const agreementLink = `${appUrl}/agreement?token=${client.agreement_token}`;

      if (reminderNum < 3) {
        const html = agreementReminderHtml(client, agreementLink, reminderNum);
        const subject = reminderNum === 1
          ? "Reminder: Your Zeno Automation Service Agreement"
          : "Friendly Reminder: Service Agreement Awaiting Signature";
        await sendEmail(client.email, subject, html);
        await incrementReminderCount(client.id, "agreement");
        results.push({ type: "agreement", client: client.business_name, action: `Reminder ${reminderNum} sent` });
      } else {
        const html = agreementReminderHtml(client, agreementLink, 3);
        await sendEmail(client.email, "Final Reminder: Service Agreement", html);
        await sendEmail(teamEmail, `Action Required: ${client.business_name} — Agreement Not Signed`, flagToRobiHtml(client, "agreement"));
        await incrementReminderCount(client.id, "agreement");
        await flagClient(client.id);
        results.push({ type: "agreement", client: client.business_name, action: "Final reminder + flagged" });
      }
    }
  }

  // Payment reminders (Day 2, 4, 7 after signing)
  const paymentClients = await getClientsNeedingPaymentReminder();
  for (const client of paymentClients) {
    const reminderNum = client.payment_reminders_sent + 1;
    const stripeLink = client.stripe_link || "#";
    if (reminderNum <= 3) {
      if (reminderNum < 3) {
        const html = paymentReminderHtml(client, stripeLink, reminderNum);
        const subject = reminderNum === 1
          ? "Reminder: Complete Your Payment — Zeno Automation"
          : "Your Payment is Still Pending — Zeno Automation";
        await sendEmail(client.email, subject, html);
        await incrementReminderCount(client.id, "payment");
        results.push({ type: "payment", client: client.business_name, action: `Reminder ${reminderNum} sent` });
      } else {
        await sendEmail(client.email, "Final Reminder: Complete Your Payment", paymentReminderHtml(client, stripeLink, 3));
        await sendEmail(teamEmail, `Action Required: ${client.business_name} — Payment Not Received`, flagToRobiHtml(client, "payment"));
        await incrementReminderCount(client.id, "payment");
        await flagClient(client.id);
        results.push({ type: "payment", client: client.business_name, action: "Final reminder + flagged" });
      }
    }
  }

  // Onboarding reminders (Day 3, 6, 10 after payment)
  const onboardingClients = await getClientsNeedingOnboardingReminder();
  for (const client of onboardingClients) {
    const reminderNum = client.onboarding_reminders_sent + 1;
    const notionLink = "https://zenoautomation.ai/onboarding";
    if (reminderNum <= 3) {
      if (reminderNum < 3) {
        const html = onboardingReminderHtml(client, notionLink, reminderNum);
        const subject = reminderNum === 1
          ? "Reminder: Complete Your Onboarding Form — Zeno Automation"
          : "Your Onboarding Form is Waiting — Zeno Automation";
        await sendEmail(client.email, subject, html);
        await incrementReminderCount(client.id, "onboarding");
        results.push({ type: "onboarding", client: client.business_name, action: `Reminder ${reminderNum} sent` });
      } else {
        await sendEmail(client.email, "Final Reminder: Complete Your Onboarding Form", onboardingReminderHtml(client, notionLink, 3));
        await sendEmail(teamEmail, `Action Required: ${client.business_name} — Onboarding Incomplete`, flagToRobiHtml(client, "onboarding"));
        await incrementReminderCount(client.id, "onboarding");
        await flagClient(client.id);
        results.push({ type: "onboarding", client: client.business_name, action: "Final reminder + flagged" });
      }
    }
  }

  console.log(`[Cron:FollowUps] Processed ${results.length} follow-ups`);
  return NextResponse.json({ processed: results.length, results });
}
