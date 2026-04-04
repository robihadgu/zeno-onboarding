import type { Client } from "./db";

const BRAND_BLUE = "#2563EB";
const BRAND_DARK = "#050505";

function emailWrapper(content: string): string {
  return `
    <div style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="background: ${BRAND_DARK}; padding: 24px 32px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">Zeno Automation</h1>
        <div style="width: 40px; height: 3px; background: ${BRAND_BLUE}; margin: 8px auto 0;"></div>
      </div>
      <div style="padding: 32px;">
        ${content}
      </div>
      <div style="background: #f8f9fa; padding: 20px 32px; text-align: center; border-top: 1px solid #e9ecef;">
        <p style="margin: 0; color: #999; font-size: 12px;">Zeno Automation &bull; AI-Powered Business Systems</p>
        <p style="margin: 4px 0 0; color: #bbb; font-size: 11px;">zenoautomation.ai</p>
      </div>
    </div>
  `;
}

function blueButton(text: string, href: string): string {
  return `
    <a href="${href}"
       style="display: inline-block; background: ${BRAND_BLUE}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
      ${text}
    </a>
  `;
}

// ── Agreement Email ──

export function agreementEmailHtml(client: Client, agreementLink: string): string {
  return emailWrapper(`
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${client.name},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Please review and sign your service agreement to get started with Zeno Automation:</p>
    <p style="text-align: center; margin: 28px 0;">
      ${blueButton("Review &amp; Sign Agreement", agreementLink)}
    </p>
    <p style="color: #888; font-size: 14px;">If you have any questions, reply to this email and we'll be happy to help.</p>
    <p style="color: #333; font-size: 15px; margin-top: 24px;">— The Zeno Automation Team</p>
  `);
}

// ── Welcome Email ──

export function welcomeEmailHtml(
  client: Client,
  stripeLink: string,
  notionFormLink: string
): string {
  const isElite = client.plan === "elite";
  const setupFee = isElite ? "$750" : "$500";
  const monthlyFee = isElite ? "$1,497/month" : "$797/month";

  return emailWrapper(`
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${client.name},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Welcome to Zeno Automation! We're excited to start building your AI automation system.</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Here's everything you need to get started:</p>

    <div style="background: #f0f4ff; border-radius: 10px; padding: 20px 24px; margin: 20px 0;">
      <h3 style="color: ${BRAND_DARK}; margin: 0 0 12px; font-size: 16px;">Complete Your Payment</h3>
      <p style="text-align: center; margin: 16px 0;">
        ${blueButton("Pay Now &rarr;", stripeLink)}
      </p>
      <p style="color: #555; font-size: 14px; margin: 12px 0 0;">Here's how your billing works:</p>
      <ul style="color: #555; font-size: 14px; padding-left: 20px;">
        <li><strong>Today:</strong> ${setupFee} setup fee (one-time)</li>
        <li><strong>Days 1–14:</strong> FREE — no monthly charge</li>
        <li><strong>Day 15 onwards:</strong> ${monthlyFee} automatically</li>
      </ul>
    </div>

    <div style="background: #f0faf4; border-radius: 10px; padding: 20px 24px; margin: 20px 0;">
      <h3 style="color: ${BRAND_DARK}; margin: 0 0 12px; font-size: 16px;">Complete Your Onboarding Form</h3>
      <p style="text-align: center; margin: 16px 0;">
        ${blueButton("Start Onboarding Form &rarr;", notionFormLink)}
      </p>
      <p style="color: #555; font-size: 14px; margin: 12px 0 0;">This form helps us build your system exactly the way you want it. Takes about 10 minutes.</p>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #333; font-size: 15px;">We'll be in touch within 24 hours to confirm your setup is underway.</p>
    <p style="color: #333; font-size: 15px;">— The Zeno Automation Team</p>
  `);
}

// ── Team Notification ──

export function teamNotificationHtml(client: Client): string {
  return emailWrapper(`
    <h2 style="color: ${BRAND_DARK}; font-size: 18px; margin: 0 0 16px;">New Client Onboarded</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Agreement</td><td style="padding: 8px 0; color: #22c55e; font-weight: 600; font-size: 14px;">Signed</td></tr>
      <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Welcome Email</td><td style="padding: 8px 0; color: #22c55e; font-weight: 600; font-size: 14px;">Sent</td></tr>
      <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Plan</td><td style="padding: 8px 0; color: #333; font-weight: 600; font-size: 14px;">${client.plan === "elite" ? "Elite" : "Growth"}</td></tr>
      <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Business</td><td style="padding: 8px 0; color: #333; font-weight: 600; font-size: 14px;">${client.business_name}</td></tr>
      <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Email</td><td style="padding: 8px 0; color: #333; font-weight: 600; font-size: 14px;">${client.email}</td></tr>
    </table>
  `);
}

// ── Follow-up: Agreement Reminders ──

export function agreementReminderHtml(
  client: Client,
  agreementLink: string,
  reminderNumber: number
): string {
  const messages: Record<number, string> = {
    1: "Just a friendly reminder — your service agreement is ready for your signature. We'd love to get started on your AI system!",
    2: "We noticed you haven't had a chance to sign your agreement yet. We're here if you have any questions at all.",
    3: "This is our final reminder about your Zeno Automation service agreement. If you're still interested, we'd love to hear from you. Otherwise, no worries at all!",
  };

  return emailWrapper(`
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${client.name},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">${messages[reminderNumber] || messages[1]}</p>
    <p style="text-align: center; margin: 28px 0;">
      ${blueButton("Review &amp; Sign Agreement", agreementLink)}
    </p>
    <p style="color: #888; font-size: 14px;">Questions? Just reply to this email.</p>
    <p style="color: #333; font-size: 15px; margin-top: 24px;">— Robi, Zeno Automation</p>
  `);
}

// ── Follow-up: Payment Reminders ──

export function paymentReminderHtml(
  client: Client,
  stripeLink: string,
  reminderNumber: number
): string {
  const isElite = client.plan === "elite";
  const setupFee = isElite ? "$750" : "$500";

  const messages: Record<number, string> = {
    1: `Just a quick reminder — your payment of ${setupFee} (setup fee) is needed to kick off your AI system build. Once that's in, we start building!`,
    2: `Following up on your payment — we're ready to start building your system as soon as we receive your ${setupFee} setup fee. Don't miss out on your 14-day free trial!`,
    3: `This is our final payment reminder. If you're still interested in getting started with Zeno Automation, complete your payment below. We'd love to build your system!`,
  };

  return emailWrapper(`
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${client.name},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">${messages[reminderNumber] || messages[1]}</p>
    <p style="text-align: center; margin: 28px 0;">
      ${blueButton("Complete Payment &rarr;", stripeLink)}
    </p>
    <p style="color: #888; font-size: 14px;">Questions? Text Robi at 571-699-9042 or reply to this email.</p>
    <p style="color: #333; font-size: 15px; margin-top: 24px;">— Robi, Zeno Automation</p>
  `);
}

// ── Follow-up: Onboarding Form Reminders ──

export function onboardingReminderHtml(
  client: Client,
  notionLink: string,
  reminderNumber: number
): string {
  const messages: Record<number, string> = {
    1: "Your onboarding form is waiting for you! It takes about 10 minutes, and it's the last step before we start building your AI system.",
    2: "Quick reminder — we need your onboarding form completed so we can start building your custom AI system. It only takes 10 minutes!",
    3: "This is our final reminder about your onboarding form. We're excited to build your system, but we need your info to get started!",
  };

  return emailWrapper(`
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${client.name},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">${messages[reminderNumber] || messages[1]}</p>
    <p style="text-align: center; margin: 28px 0;">
      ${blueButton("Complete Onboarding Form &rarr;", notionLink)}
    </p>
    <p style="color: #888; font-size: 14px;">Need help? Text Robi at 571-699-9042.</p>
    <p style="color: #333; font-size: 15px; margin-top: 24px;">— Robi, Zeno Automation</p>
  `);
}

// ── Flag to Robi ──

export function flagToRobiHtml(
  client: Client,
  reason: "agreement" | "payment" | "onboarding"
): string {
  const reasonText: Record<string, string> = {
    agreement: "has NOT signed their service agreement after 3 reminders (Day 2, 4, 7).",
    payment: "has NOT completed payment after 3 reminders (Day 2, 4, 7 after signing).",
    onboarding: "has NOT completed the onboarding form after 3 reminders (Day 3, 6, 10 after payment).",
  };

  return emailWrapper(`
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
      <h3 style="color: #dc2626; margin: 0 0 8px; font-size: 16px;">Action Required</h3>
      <p style="color: #333; font-size: 14px; margin: 0;"><strong>${client.business_name}</strong> (${client.name}) ${reasonText[reason]}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color: #888; font-size: 14px;">Client</td><td style="padding: 6px 0; color: #333; font-weight: 600; font-size: 14px;">${client.name}</td></tr>
      <tr><td style="padding: 6px 0; color: #888; font-size: 14px;">Business</td><td style="padding: 6px 0; color: #333; font-weight: 600; font-size: 14px;">${client.business_name}</td></tr>
      <tr><td style="padding: 6px 0; color: #888; font-size: 14px;">Email</td><td style="padding: 6px 0; color: #333; font-weight: 600; font-size: 14px;">${client.email}</td></tr>
      <tr><td style="padding: 6px 0; color: #888; font-size: 14px;">Plan</td><td style="padding: 6px 0; color: #333; font-weight: 600; font-size: 14px;">${client.plan === "elite" ? "Elite" : "Growth"}</td></tr>
    </table>
    <p style="color: #333; font-size: 15px; margin-top: 20px;">Please follow up personally.</p>
  `);
}
