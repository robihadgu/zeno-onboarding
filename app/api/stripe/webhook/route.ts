import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  initDb,
  getAllClients,
  updateClientStatus,
} from "@/lib/db";
import { sendEmail } from "@/lib/mailer";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "");
}

/**
 * Stripe webhook — auto-confirms payment when client completes checkout.
 * Matches the payment email to a client in the database.
 * POST /api/stripe/webhook
 */
export async function POST(req: NextRequest) {
  await initDb();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe] STRIPE_WEBHOOK_SECRET is not configured — refusing request");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe] Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
      console.log("[Stripe] No customer email in session");
      return NextResponse.json({ received: true });
    }

    console.log(`[Stripe] Payment completed for: ${customerEmail}`);

    // Find client by email (case-insensitive)
    const clients = await getAllClients();
    const client = clients.find(
      (c) => c.email.toLowerCase() === customerEmail.toLowerCase()
    );

    if (!client) {
      console.log(`[Stripe] No matching client for email: ${customerEmail}`);
      return NextResponse.json({ received: true });
    }

    // Only update if client is waiting for payment
    if (client.status === "welcome_sent" || client.status === "agreement_signed") {
      await updateClientStatus(client.id, "payment_confirmed");
      console.log(`[Stripe] Payment confirmed for: ${client.business_name}`);

      // Check if onboarding is already done — auto-complete
      if (client.onboarding_completed_at) {
        await updateClientStatus(client.id, "complete");
        const teamEmail = process.env.TEAM_EMAIL || "zenoscale@gmail.com";
        try {
          await sendEmail(
            teamEmail,
            `Ready to Build: ${client.business_name}`,
            `<p><strong>${client.business_name}</strong> has completed payment and onboarding. Ready to build on GoHighLevel.</p>`
          );
        } catch (err) {
          console.error("[Stripe] Team notify error:", err);
        }
        console.log(`[Stripe] ${client.business_name} auto-completed (payment + onboarding done)`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
