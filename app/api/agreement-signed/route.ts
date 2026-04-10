import { NextRequest, NextResponse } from "next/server";
import {
  initDb,
  getClientByToken,
  getClientById,
  markClientSigned,
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
    const { token, signedName } = body as { token?: string; signedName?: string };

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    if (!signedName || !signedName.trim()) {
      return NextResponse.json({ error: "Signature name is required" }, { status: 400 });
    }

    const client = await getClientByToken(token);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Capture audit trail: typed name, IP, user-agent, timestamp
    const forwardedFor = req.headers.get("x-forwarded-for");
    const signedIp = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
    const signedUserAgent = req.headers.get("user-agent");

    await markClientSigned(client.id, {
      signedName: signedName.trim(),
      signedIp,
      signedUserAgent,
    });

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

    const updated = await getClientById(client.id);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Agreement-signed error:", err);
    return NextResponse.json(
      { error: "Failed to process signed agreement" },
      { status: 500 }
    );
  }
}
