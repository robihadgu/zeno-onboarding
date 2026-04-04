import { NextRequest, NextResponse } from "next/server";
import { getClientByEnvelopeId } from "@/lib/db";

/**
 * DocuSign Connect webhook — called when an envelope status changes.
 * When status is "completed", triggers the agreement-signed flow.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.log("[DocuSign Webhook] Received:", body.substring(0, 500));

    // DocuSign Connect sends XML by default
    const envelopeIdMatch = body.match(/<EnvelopeID>([^<]+)<\/EnvelopeID>/);
    const statusMatch = body.match(/<Status>([^<]+)<\/Status>/);

    if (!envelopeIdMatch || !statusMatch) {
      console.log("[DocuSign Webhook] Could not parse envelope data");
      return NextResponse.json({ received: true });
    }

    const envelopeId = envelopeIdMatch[1];
    const status = statusMatch[1].toLowerCase();

    console.log(`[DocuSign Webhook] Envelope ${envelopeId} status: ${status}`);

    if (status === "completed") {
      const client = getClientByEnvelopeId(envelopeId);

      if (client && client.status === "agreement_sent") {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await fetch(`${appUrl}/api/agreement-signed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: client.id }),
        });
        console.log(`[DocuSign Webhook] Triggered onboarding for ${client.business_name}`);
      } else {
        console.log(`[DocuSign Webhook] No matching client for envelope ${envelopeId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[DocuSign Webhook] Error:", err);
    return NextResponse.json({ received: true });
  }
}
