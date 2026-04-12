import { NextRequest, NextResponse } from "next/server";
import {
  initDb,
  getAllClients,
  getClientById,
  updateClientStatus,
} from "@/lib/db";
import { sendEmail } from "@/lib/mailer";

/**
 * Webhook endpoint — called by zenoautomation.ai/onboarding when a client submits the form.
 *
 * POST /api/onboarding-complete
 * Body: { email: "client@example.com" }
 *
 * Matches the email to a client in the pipeline, marks onboarding as complete,
 * and if payment is also confirmed, auto-completes and notifies Robi.
 */
export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Find the client by email (case-insensitive)
    const clients = await getAllClients();
    const client = clients.find(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.status !== "complete"
    );

    if (!client) {
      console.log(`[Onboarding Webhook] No active client found for ${email}`);
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Only accept onboarding completion from clients who have at least signed the agreement.
    // Prevents status jumps from agreement_sent → onboarding_complete.
    const allowedPriorStatuses = [
      "agreement_signed",
      "welcome_sent",
      "payment_confirmed",
      "onboarding_complete", // idempotent re-submit
    ];
    if (!allowedPriorStatuses.includes(client.status)) {
      console.log(
        `[Onboarding Webhook] ${client.business_name} is in status '${client.status}' — refusing to mark onboarding complete`
      );
      return NextResponse.json(
        { error: "Client has not yet signed the agreement" },
        { status: 409 }
      );
    }

    console.log(`[Onboarding Webhook] ${client.business_name} (${email}) completed onboarding`);

    // Mark onboarding as complete
    await updateClientStatus(client.id, "onboarding_complete");

    // Check if payment was already confirmed — if so, auto-complete
    if (client.payment_confirmed_at) {
      await updateClientStatus(client.id, "complete");

      const teamEmail = process.env.TEAM_EMAIL || "zenoscale@gmail.com";
      const planName = client.plan === "elite" ? "Elite" : "Growth";

      const readyHtml = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background: #050505; padding: 24px 32px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700;">Zeno Automation</h1>
            <div style="width: 40px; height: 3px; background: #22C55E; margin: 8px auto 0;"></div>
          </div>
          <div style="padding: 32px;">
            <div style="background: #f0fdf4; border-left: 4px solid #22C55E; padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
              <h2 style="color: #15803d; margin: 0 0 4px; font-size: 18px;">Ready to Build!</h2>
              <p style="color: #333; margin: 0; font-size: 14px;"><strong>${client.business_name}</strong> has completed everything.</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #f0f0f0;">Client</td><td style="padding: 10px 0; color: #333; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f0f0f0;">${client.name}</td></tr>
              <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #f0f0f0;">Business</td><td style="padding: 10px 0; color: #333; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f0f0f0;">${client.business_name}</td></tr>
              <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #f0f0f0;">Email</td><td style="padding: 10px 0; color: #333; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f0f0f0;">${client.email}</td></tr>
              <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #f0f0f0;">Plan</td><td style="padding: 10px 0; color: #333; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f0f0f0;">${planName}</td></tr>
              <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #f0f0f0;">Agreement</td><td style="padding: 10px 0; color: #22C55E; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f0f0f0;">Signed &#10003;</td></tr>
              <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #f0f0f0;">Payment</td><td style="padding: 10px 0; color: #22C55E; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f0f0f0;">Paid &#10003;</td></tr>
              <tr><td style="padding: 10px 0; color: #888; font-size: 14px;">Onboarding</td><td style="padding: 10px 0; color: #22C55E; font-weight: 600; font-size: 14px;">Completed &#10003;</td></tr>
            </table>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #333; font-size: 15px; font-weight: 600;">Time to start building their system!</p>
          </div>
        </div>
      `;

      try {
        await sendEmail(
          teamEmail,
          `Ready to Build: ${client.business_name} — All Steps Complete ✅`,
          readyHtml
        );
      } catch (err) {
        console.error("[Onboarding Webhook] Email error:", err);
      }

      console.log(`[Onboarding Webhook] ${client.business_name}: Payment + Onboarding both done. Auto-completed.`);
    }

    const updated = await getClientById(client.id)!;
    return NextResponse.json({ success: true, status: updated!.status });
  } catch (err) {
    console.error("[Onboarding Webhook] Error:", err);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
