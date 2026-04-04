import { NextRequest, NextResponse } from "next/server";
import { getPendingEmails, markEmailSent, markEmailFailed } from "@/lib/db";

/** GET — returns all pending emails in the queue */
export async function GET() {
  const pending = getPendingEmails();
  return NextResponse.json(pending);
}

/** POST — mark an email as sent or failed */
export async function POST(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id || !["sent", "failed"].includes(status)) {
    return NextResponse.json({ error: "Invalid id or status" }, { status: 400 });
  }
  if (status === "sent") {
    markEmailSent(id);
  } else {
    markEmailFailed(id);
  }
  return NextResponse.json({ success: true });
}
