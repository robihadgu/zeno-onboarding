import { NextRequest, NextResponse } from "next/server";
import {
  initDb,
  getAllClients,
  updateClientStatus,
  updateClientNotionUrl,
  deleteClient,
} from "@/lib/db";
import { getEnvelopeStatus } from "@/lib/docusign";
import { welcomeEmailHtml, teamNotificationHtml } from "@/lib/email";
import { sendEmail } from "@/lib/mailer";

const ONBOARDING_URL = "https://zenoautomation.ai/onboarding";

/**
 * Cron job: Check DocuSign signature status every 10 minutes.
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();
  const results: { client: string; action: string }[] = [];

  const clients = await getAllClients();
  const pendingClients = clients.filter(
    (c) => c.status === "agreement_sent" && c.envelope_id
  );

  for (const client of pendingClients) {
    try {
      const status = await getEnvelopeStatus(client.envelope_id!);
      console.log(`[Cron:CheckSig] ${client.business_name}: status = ${status}`);

      if (status === "completed" || status === "signed") {
        await updateClientStatus(client.id, "agreement_signed");
        await updateClientNotionUrl(client.id, ONBOARDING_URL);

        const stripeLink = client.stripe_link || "#";
        const welcomeHtml = welcomeEmailHtml(client, stripeLink, ONBOARDING_URL);

        sendEmail(
          client.email,
          "Welcome to Zeno Automation — You're In!",
          welcomeHtml
        ).catch((err) => console.error(`[Cron] Welcome email error:`, err));

        await updateClientStatus(client.id, "welcome_sent");

        const teamEmail = process.env.TEAM_EMAIL || "zenoscale@gmail.com";
        sendEmail(
          teamEmail,
          `Agreement Signed: ${client.business_name}`,
          teamNotificationHtml(client)
        ).catch((err) => console.error(`[Cron] Team notify error:`, err));

        results.push({ client: client.business_name, action: "Signed → Welcome sent" });
      } else if (status === "voided" || status === "declined") {
        await deleteClient(client.id);
        results.push({ client: client.business_name, action: `Removed (${status})` });
      } else {
        results.push({ client: client.business_name, action: `Waiting (${status})` });
      }
    } catch (err) {
      console.error(`[Cron:CheckSig] Error for ${client.business_name}:`, err);
      results.push({ client: client.business_name, action: "Error" });
    }
  }

  console.log(`[Cron:CheckSig] Checked ${pendingClients.length} envelopes`);
  return NextResponse.json({ checked: pendingClients.length, results });
}
