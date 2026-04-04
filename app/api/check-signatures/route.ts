import { NextResponse } from "next/server";
import {
  getAllClients,
  updateClientStatus,
  updateClientNotionUrl,
} from "@/lib/db";
import { getEnvelopeStatus } from "@/lib/docusign";
import { welcomeEmailHtml, teamNotificationHtml } from "@/lib/email";
import { sendEmail } from "@/lib/mailer";
import { duplicateOnboardingPage } from "@/lib/notion";

/**
 * Polls DocuSign for envelope status on all clients waiting for signatures.
 * When a signature is completed:
 *   1. Updates status to agreement_signed
 *   2. Creates Notion onboarding page
 *   3. Sends welcome email with Stripe link + Notion link
 *   4. Sends team notification
 *   5. Updates status to welcome_sent
 *
 * Call this endpoint on a schedule (every 2-5 minutes).
 * GET /api/check-signatures
 */
export async function GET() {
  const results: { client: string; action: string }[] = [];

  const clients = getAllClients();
  const pendingClients = clients.filter(
    (c) => c.status === "agreement_sent" && c.envelope_id
  );

  if (pendingClients.length === 0) {
    return NextResponse.json({ checked: 0, results });
  }

  for (const client of pendingClients) {
    try {
      const status = await getEnvelopeStatus(client.envelope_id!);
      console.log(`[CheckSig] ${client.business_name}: DocuSign status = ${status}`);

      if (status === "completed" || status === "signed") {
        // Agreement signed! Trigger the full welcome flow.
        updateClientStatus(client.id, "agreement_signed");

        // 1. Duplicate Notion onboarding page
        let notionUrl: string;
        try {
          notionUrl = await duplicateOnboardingPage(
            client.business_name,
            client.name,
            client.plan
          );
          updateClientNotionUrl(client.id, notionUrl);
        } catch (err) {
          console.error(`[CheckSig] Notion failed for ${client.business_name}:`, err);
          notionUrl = `https://notion.so/onboarding-${client.id}`;
          updateClientNotionUrl(client.id, notionUrl);
        }

        // 2. Send welcome email with correct Stripe link + Notion link
        const stripeLink = client.stripe_link || "#";
        const welcomeHtml = welcomeEmailHtml(client, stripeLink, notionUrl);

        sendEmail(
          client.email,
          "Welcome to Zeno Automation — You're In! 🎉",
          welcomeHtml
        ).catch((err) => console.error(`[CheckSig] Welcome email error:`, err));

        updateClientStatus(client.id, "welcome_sent");

        // 3. Notify team
        const teamEmail = process.env.TEAM_EMAIL || "zenoscale@gmail.com";
        const notifHtml = teamNotificationHtml(client);

        sendEmail(
          teamEmail,
          `Agreement Signed: ${client.business_name}`,
          notifHtml
        ).catch((err) => console.error(`[CheckSig] Team notify error:`, err));

        results.push({ client: client.business_name, action: "Signed → Welcome email sent" });
        console.log(`[CheckSig] ${client.business_name}: Agreement signed! Welcome flow triggered.`);
      } else if (status === "voided" || status === "declined") {
        console.log(`[CheckSig] ${client.business_name}: Envelope ${status} — removing from pipeline`);
        // Delete voided/declined clients so they don't clog the pipeline
        const { deleteClient } = await import("@/lib/db");
        deleteClient(client.id);
        results.push({ client: client.business_name, action: `Removed (${status})` });
      } else {
        results.push({ client: client.business_name, action: `Waiting (${status})` });
      }
    } catch (err) {
      console.error(`[CheckSig] Error checking ${client.business_name}:`, err);
      results.push({ client: client.business_name, action: `Error checking status` });
    }
  }

  // Also run follow-up reminders while we're here
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${appUrl}/api/follow-ups`).catch(() => {});
  } catch {}

  return NextResponse.json({ checked: pendingClients.length, results });
}
