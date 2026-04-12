import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { initDb, createClient } from "@/lib/db";
import { agreementEmailHtml } from "@/lib/email";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { name, businessName, email, plan } = await req.json();

    if (!name || !businessName || !email || !plan) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!["growth", "elite"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const token = uuidv4();
    const client = await createClient(name, businessName, email, plan, token);

    // Send agreement email before returning — must complete before Vercel freezes the function
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const agreementLink = `${appUrl}/agreement?token=${token}`;

    try {
      await sendEmail(
        client.email,
        "Your Zeno Automation Service Agreement",
        agreementEmailHtml(client, agreementLink)
      );
      console.log(`[Onboard] Agreement email sent to ${client.email}`);
    } catch (err) {
      console.error(`[Onboard] Agreement email failed:`, err);
    }

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error("Onboard error:", err);
    return NextResponse.json({ error: "Failed to onboard client" }, { status: 500 });
  }
}
