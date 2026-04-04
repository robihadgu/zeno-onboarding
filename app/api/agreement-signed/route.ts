import { NextRequest, NextResponse } from "next/server";
import {
  getClientByToken,
  getClientById,
  updateClientStatus,
  updateClientNotionUrl,
} from "@/lib/db";
import { welcomeEmailHtml, teamNotificationHtml } from "@/lib/email";
import { sendEmail } from "@/lib/mailer";
import { duplicateOnboardingPage } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, clientId } = body as { token?: string; clientId?: number };

    let client = token
      ? getClientByToken(token)
      : clientId
        ? getClientById(clientId)
        : undefined;

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Step 1: Mark agreement as signed immediately
    updateClientStatus(client.id, "agreement_signed");

    // Return response right away — do heavy work in background
    const clientSnapshot = { ...client };

    // Background: Notion + emails (non-blocking)
    (async () => {
      try {
        // Step 2: Duplicate Notion onboarding template
        let notionUrl: string;
        try {
          notionUrl = await duplicateOnboardingPage(
            clientSnapshot.business_name,
            clientSnapshot.name,
            clientSnapshot.plan
          );
          updateClientNotionUrl(clientSnapshot.id, notionUrl);
        } catch (err) {
          console.error("[Notion] Failed to duplicate template:", err);
          notionUrl = `https://notion.so/onboarding-${clientSnapshot.id}`;
          updateClientNotionUrl(clientSnapshot.id, notionUrl);
        }

        // Step 3: Send welcome email
        const stripeLink = clientSnapshot.stripe_link || "#";
        const welcomeHtml = welcomeEmailHtml(clientSnapshot, stripeLink, notionUrl);

        sendEmail(
          clientSnapshot.email,
          "Welcome to Zeno Automation — You're In! 🎉",
          welcomeHtml
        ).catch((err) => console.error(`[Welcome] Error:`, err));

        // Step 4: Update status
        updateClientStatus(clientSnapshot.id, "welcome_sent");

        // Step 5: Notify team
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

    client = getClientById(client.id)!;
    return NextResponse.json(client);
  } catch (err) {
    console.error("Agreement-signed error:", err);
    return NextResponse.json(
      { error: "Failed to process signed agreement" },
      { status: 500 }
    );
  }
}
