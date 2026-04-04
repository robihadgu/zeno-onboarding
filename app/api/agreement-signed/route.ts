import { NextRequest, NextResponse } from "next/server";
import {
  initDb,
  getClientByToken,
  getClientById,
  updateClientStatus,
  updateClientNotionUrl,
} from "@/lib/db";
import { welcomeEmailHtml, teamNotificationHtml } from "@/lib/email";
import { sendEmail } from "@/lib/mailer";

const ONBOARDING_URL = "https://zenoautomation.ai/onboarding";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { token, clientId } = body as { token?: string; clientId?: number };

    let client = token
      ? await getClientByToken(token)
      : clientId
        ? await getClientById(clientId)
        : undefined;

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Step 1: Mark agreement as signed
    await updateClientStatus(client.id, "agreement_signed");

    const clientSnapshot = { ...client };

    // Background: send welcome email + notify team (non-blocking)
    (async () => {
      try {
        // Store onboarding link
        await updateClientNotionUrl(clientSnapshot.id, ONBOARDING_URL);

        // Send welcome email with Stripe link + onboarding link
        const stripeLink = clientSnapshot.stripe_link || "#";
        const welcomeHtml = welcomeEmailHtml(clientSnapshot, stripeLink, ONBOARDING_URL);

        sendEmail(
          clientSnapshot.email,
          "Welcome to Zeno Automation — You're In! 🎉",
          welcomeHtml
        ).catch((err) => console.error(`[Welcome] Error:`, err));

        // Update status
        await updateClientStatus(clientSnapshot.id, "welcome_sent");

        // Notify team
        const teamEmail = process.env.TEAM_EMAIL || "zenoscale@gmail.com";
        const notifHtml = teamNotificationHtml(clientSnapshot);

        sendEmail(
          teamEmail,
          `Agreement Signed: ${clientSnapshot.business_name}`,
          notifHtml
        ).catch((err) => console.error(`[Notify] Error:`, err));
      } catch (err) {
        console.error("[Agreement-signed background] Error:", err);
      }
    })();

    client = await getClientById(client.id)!;
    return NextResponse.json(client);
  } catch (err) {
    console.error("Agreement-signed error:", err);
    return NextResponse.json(
      { error: "Failed to process signed agreement" },
      { status: 500 }
    );
  }
}
