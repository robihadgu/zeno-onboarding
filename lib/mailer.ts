import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error(
        "GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env.local."
      );
    }

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: `"Zeno Automation" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent to ${to} — ${subject} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Email] Failed to send to ${to}: ${msg}`);
    return { success: false, error: msg };
  }
}
