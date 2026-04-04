import { NextResponse } from "next/server";
import {
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
 * Follow-up checker — runs on a schedule (called by cron or setInterval).
 * Checks for clients who need reminders and sends them.
 *
 * GET /api/follow-ups — check and send all due follow-ups
 */
export async function GET() {
  const results: { type: string; client: string; action: string }[] = [];
  const teamEmail = process.env.TEAM_EMAIL || "zenoscale@gmail.com";

  // ── Agreement reminders (Day 2, 4, 7) ──
  const agreementClients = getClientsNeedingAgreementReminder();
  for (const client of agreementClients) {
    const reminderNum = client.agreement_reminders_sent + 1;

    if (reminderNum <= 3) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const agreementLink = `${appUrl}/agreement?token=${client.agreement_token}`;

      if (reminderNum < 3) {
        // Send reminder to client
        const html = agreementReminderHtml(client, agreementLink, reminderNum);
        const subject =
          reminderNum === 1
            ? "Reminder: Your Zeno Automation Service Agreement"
            : "Friendly Reminder: Service Agreement Awaiting Signature";
        await sendEmail(client.email, subject, html);
        incrementReminderCount(client.id, "agreement");
        results.push({ type: "agreement", client: client.business_name, action: `Reminder ${reminderNum} sent` });
      } else {
        // Final reminder to client + flag to Robi
        const html = agreementReminderHtml(client, agreementLink, 3);
        await sendEmail(client.email, "Final Reminder: Service Agreement", html);

        const flagHtml = flagToRobiHtml(client, "agreement");
        await sendEmail(teamEmail, `Action Required: ${client.business_name} — Agreement Not Signed`, flagHtml);

        incrementReminderCount(client.id, "agreement");
        flagClient(client.id);
        results.push({ type: "agreement", client: client.business_name, action: "Final reminder + flagged to Robi" });
      }
    }
  }

  // ── Payment reminders (Day 2, 4, 7 after signing) ──
  const paymentClients = getClientsNeedingPaymentReminder();
  for (const client of paymentClients) {
    const reminderNum = client.payment_reminders_sent + 1;
    const stripeLink = client.stripe_link || "#";

    if (reminderNum <= 3) {
      if (reminderNum < 3) {
        const html = paymentReminderHtml(client, stripeLink, reminderNum);
        const subject =
          reminderNum === 1
            ? "Reminder: Complete Your Payment — Zeno Automation"
            : "Your Payment is Still Pending — Zeno Automation";
        await sendEmail(client.email, subject, html);
        incrementReminderCount(client.id, "payment");
        results.push({ type: "payment", client: client.business_name, action: `Reminder ${reminderNum} sent` });
      } else {
        const html = paymentReminderHtml(client, stripeLink, 3);
        await sendEmail(client.email, "Final Reminder: Complete Your Payment", html);

        const flagHtml = flagToRobiHtml(client, "payment");
        await sendEmail(teamEmail, `Action Required: ${client.business_name} — Payment Not Received`, flagHtml);

        incrementReminderCount(client.id, "payment");
        flagClient(client.id);
        results.push({ type: "payment", client: client.business_name, action: "Final reminder + flagged to Robi" });
      }
    }
  }

  // ── Onboarding form reminders (Day 3, 6, 10 after payment) ──
  const onboardingClients = getClientsNeedingOnboardingReminder();
  for (const client of onboardingClients) {
    const reminderNum = client.onboarding_reminders_sent + 1;
    const notionLink = client.notion_page_url || "#";

    if (reminderNum <= 3) {
      if (reminderNum < 3) {
        const html = onboardingReminderHtml(client, notionLink, reminderNum);
        const subject =
          reminderNum === 1
            ? "Reminder: Complete Your Onboarding Form — Zeno Automation"
            : "Your Onboarding Form is Waiting — Zeno Automation";
        await sendEmail(client.email, subject, html);
        incrementReminderCount(client.id, "onboarding");
        results.push({ type: "onboarding", client: client.business_name, action: `Reminder ${reminderNum} sent` });
      } else {
        const html = onboardingReminderHtml(client, notionLink, 3);
        await sendEmail(client.email, "Final Reminder: Complete Your Onboarding Form", html);

        const flagHtml = flagToRobiHtml(client, "onboarding");
        await sendEmail(teamEmail, `Action Required: ${client.business_name} — Onboarding Form Incomplete`, flagHtml);

        incrementReminderCount(client.id, "onboarding");
        flagClient(client.id);
        results.push({ type: "onboarding", client: client.business_name, action: "Final reminder + flagged to Robi" });
      }
    }
  }

  console.log(`[Follow-ups] Processed ${results.length} follow-ups`);
  return NextResponse.json({ processed: results.length, results });
}
