import { NextResponse } from "next/server";
import {
  initDb,
  getAllClients,
  updateClientStatus,
  updateClientNotionUrl,
} from "@/lib/db";
import { getEnvelopeStatus } from "@/lib/docusign";
import { welcomeEmailHtml, teamNotificationHtml } from "@/lib/email";
import { sendEmail } from "@/lib/mailer";

const ONBOARDING_URL = "https://zenoautomation.ai/onboarding";

/**
 * Polls DocuSign for envelope status on all clients waiting for signatures.
 * When a signature is completed:
 *   1. Updates status to agreement_signed
 *   2. Sends welcome email with Stripe link + onboarding link
 *   3. Sends team notification
 *   4. Updates status to welcome_sent
 *
 * Also runs follow-up reminders.
 * GET /api/check-signatures
 */
export async function GET() {
  await initDb();
  const results: { client: string; action: string }[] = [];

  const clients = await getAllClients();
  const pendingClients = clients.filter(
    (c) => c.status === "agreement_sent" && c.envelope_id
  );

  if (pendingClients.length === 0) {
    // Still run follow-ups even if no pending signatures
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await fetch(`${appUrl}/api/follow-ups`).catch(() => {});
    } catch {}
    return NextResponse.json({ checked: 0, results });
  }

  for (const client of pendingClients) {
    try {
      const status = await getEnvelopeStatus(client.envelope_id!);
      console.log(`[CheckSig] ${client.business_name}: DocuSign status = ${status}`);

      if (status === "completed" || status === "signed") {
        // Agreement signed — trigger welcome flow
        await updateClientStatus(client.id, "agreement_signed");

        // Store onboarding link
        await updateClientNotionUrl(client.id, ONBOARDING_URL);

        // Send welcome email with Stripe link + onboarding link
        const stripeLink = client.stripe_link || "#";
        const welcomeHtml = welcomeEmailHtml(client, stripeLink, ONBOARDING_URL);

        sendEmail(
          client.email,
          "Welcome to Zeno Automation — You're In! 🎉",
          welcomeHtml
        ).catch((err) => console.error(`[CheckSig] Welcome email error:`, err));

        await updateClientStatus(client.id, "welcome_sent");

        // Notify team
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
        const { deleteClient } = await import("@/lib/db");
        await deleteClient(client.id);
        results.push({ client: client.business_name, action: `Removed (${status})` });
      } else {
        results.push({ client: client.business_name, action: `Waiting (${status})` });
      }
    } catch (err) {
      console.error(`[CheckSig] Error checking ${client.business_name}:`, err);
      results.push({ client: client.business_name, action: `Error checking status` });
    }
  }

  // Run follow-up reminders
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${appUrl}/api/follow-ups`).catch(() => {});
  } catch {}

  return NextResponse.json({ checked: pendingClients.length, results });
}
