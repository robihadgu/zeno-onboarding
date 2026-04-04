import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { initDb, createClient, updateClientEnvelopeId } from "@/lib/db";
import { sendAgreementEnvelope } from "@/lib/docusign";

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

    // Send DocuSign envelope in background — don't block the response
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/api/docusign/webhook`;

    (async () => {
      try {
        const { envelopeId } = await sendAgreementEnvelope(
          client.name,
          client.email,
          client.business_name,
          client.plan,
          callbackUrl
        );
        await updateClientEnvelopeId(client.id, envelopeId);
        console.log(`[Onboard] DocuSign envelope ${envelopeId} sent to ${client.email}`);
      } catch (err) {
        console.error(`[Onboard] DocuSign failed:`, err);
        // DocuSign failed — log the error. Client is still created in pipeline.
      }
    })();

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error("Onboard error:", err);
    return NextResponse.json({ error: "Failed to onboard client" }, { status: 500 });
  }
}
