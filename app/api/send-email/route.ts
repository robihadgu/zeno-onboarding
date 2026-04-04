import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = (await req.json()) as EmailPayload;

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Missing to, subject, or html" }, { status: 400 });
    }

    const result = await sendEmail(to, subject, html);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err) {
    console.error("Send email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
