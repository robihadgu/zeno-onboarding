import { NextRequest, NextResponse } from "next/server";
import { initDb, getClientById, updateClientStatus, deleteClient } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
import type { ClientStatus } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await params;
  const client = await getClientById(Number(id));
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status: ClientStatus };

  const valid: ClientStatus[] = [
    "agreement_sent",
    "agreement_signed",
    "welcome_sent",
    "payment_confirmed",
    "onboarding_complete",
    "complete",
  ];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let client = await updateClientStatus(Number(id), status);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-complete: when BOTH payment AND onboarding are done
  // If we just confirmed payment and onboarding was already done, or vice versa
  if (
    (status === "payment_confirmed" && client.onboarding_completed_at) ||
    (status === "onboarding_complete" && client.payment_confirmed_at)
  ) {
    // Both are done — auto-mark complete and notify Robi
    await updateClientStatus(client.id, "complete");
    client = (await getClientById(client.id))!;

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
          ${client.notion_page_url ? `<p style="margin: 20px 0 0; font-size: 14px;"><a href="${client.notion_page_url}" style="color: #5E6AD2; text-decoration: none; font-weight: 600;">View Onboarding Form &rarr;</a></p>` : ""}
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #333; font-size: 15px; font-weight: 600;">Time to start building their system!</p>
        </div>
      </div>
    `;

    sendEmail(
      teamEmail,
      `Ready to Build: ${client.business_name} — All Steps Complete ✅`,
      readyHtml
    ).catch((err) => console.error("[Auto-complete] Email error:", err));

    console.log(`[Auto-complete] ${client.business_name}: Payment + Onboarding both done. Robi notified.`);
  }

  return NextResponse.json(client);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await params;
  const deleted = await deleteClient(Number(id));
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
