import { neon } from "@neondatabase/serverless";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be set");
  return neon(url);
}

export async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      business_name TEXT NOT NULL,
      email TEXT NOT NULL,
      plan TEXT NOT NULL CHECK(plan IN ('growth', 'elite')),
      status TEXT NOT NULL DEFAULT 'agreement_sent',
      agreement_token TEXT UNIQUE NOT NULL,
      notion_page_url TEXT,
      stripe_link TEXT,
      signed_name TEXT,
      signed_ip TEXT,
      signed_user_agent TEXT,
      agreement_sent_at TIMESTAMPTZ,
      agreement_signed_at TIMESTAMPTZ,
      welcome_sent_at TIMESTAMPTZ,
      payment_confirmed_at TIMESTAMPTZ,
      onboarding_completed_at TIMESTAMPTZ,
      agreement_reminders_sent INTEGER NOT NULL DEFAULT 0,
      payment_reminders_sent INTEGER NOT NULL DEFAULT 0,
      onboarding_reminders_sent INTEGER NOT NULL DEFAULT 0,
      flagged_to_robi INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Migrations for existing databases
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS signed_name TEXT`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS signed_ip TEXT`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS signed_user_agent TEXT`;
  await sql`ALTER TABLE clients DROP COLUMN IF EXISTS envelope_id`;
}

export type ClientStatus =
  | "agreement_sent"
  | "agreement_signed"
  | "welcome_sent"
  | "payment_confirmed"
  | "onboarding_complete"
  | "complete";

export interface Client {
  id: number;
  name: string;
  business_name: string;
  email: string;
  plan: "growth" | "elite";
  status: ClientStatus;
  agreement_token: string;
  notion_page_url: string | null;
  stripe_link: string | null;
  signed_name: string | null;
  signed_ip: string | null;
  signed_user_agent: string | null;
  agreement_sent_at: string | null;
  agreement_signed_at: string | null;
  welcome_sent_at: string | null;
  payment_confirmed_at: string | null;
  onboarding_completed_at: string | null;
  agreement_reminders_sent: number;
  payment_reminders_sent: number;
  onboarding_reminders_sent: number;
  flagged_to_robi: number;
  created_at: string;
  updated_at: string;
}

export async function createClient(
  name: string,
  businessName: string,
  email: string,
  plan: "growth" | "elite",
  agreementToken: string
): Promise<Client> {
  const sql = getDb();
  const stripeLink =
    plan === "growth"
      ? process.env.GROWTH_STRIPE_LINK || "GROWTH_STRIPE_LINK"
      : process.env.ELITE_STRIPE_LINK || "ELITE_STRIPE_LINK";

  const rows = await sql`
    INSERT INTO clients (name, business_name, email, plan, agreement_token, stripe_link, agreement_sent_at)
    VALUES (${name}, ${businessName}, ${email}, ${plan}, ${agreementToken}, ${stripeLink}, NOW())
    RETURNING *
  `;
  return rows[0] as Client;
}

export async function getClientById(id: number): Promise<Client | undefined> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM clients WHERE id = ${id}`;
  return rows[0] as Client | undefined;
}

export async function getClientByToken(token: string): Promise<Client | undefined> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM clients WHERE agreement_token = ${token}`;
  return rows[0] as Client | undefined;
}

export async function getAllClients(): Promise<Client[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
  return rows as Client[];
}

export async function deleteClient(id: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`DELETE FROM clients WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function updateClientStatus(id: number, status: ClientStatus): Promise<Client | undefined> {
  const sql = getDb();
  switch (status) {
    case "agreement_signed":
      await sql`UPDATE clients SET status = ${status}, agreement_signed_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
      break;
    case "welcome_sent":
      await sql`UPDATE clients SET status = ${status}, welcome_sent_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
      break;
    case "payment_confirmed":
      await sql`UPDATE clients SET status = ${status}, payment_confirmed_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
      break;
    case "onboarding_complete":
      await sql`UPDATE clients SET status = ${status}, onboarding_completed_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
      break;
    default:
      await sql`UPDATE clients SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
  }
  return getClientById(id);
}

export async function updateClientNotionUrl(id: number, url: string): Promise<void> {
  const sql = getDb();
  await sql`UPDATE clients SET notion_page_url = ${url}, updated_at = NOW() WHERE id = ${id}`;
}

export async function markClientSigned(
  id: number,
  audit: { signedName: string; signedIp: string | null; signedUserAgent: string | null }
): Promise<Client | undefined> {
  const sql = getDb();
  await sql`
    UPDATE clients
    SET status = 'agreement_signed',
        agreement_signed_at = NOW(),
        signed_name = ${audit.signedName},
        signed_ip = ${audit.signedIp},
        signed_user_agent = ${audit.signedUserAgent},
        updated_at = NOW()
    WHERE id = ${id}
  `;
  return getClientById(id);
}

export async function incrementReminderCount(id: number, type: "agreement" | "payment" | "onboarding"): Promise<void> {
  const sql = getDb();
  switch (type) {
    case "agreement":
      await sql`UPDATE clients SET agreement_reminders_sent = agreement_reminders_sent + 1, updated_at = NOW() WHERE id = ${id}`;
      break;
    case "payment":
      await sql`UPDATE clients SET payment_reminders_sent = payment_reminders_sent + 1, updated_at = NOW() WHERE id = ${id}`;
      break;
    case "onboarding":
      await sql`UPDATE clients SET onboarding_reminders_sent = onboarding_reminders_sent + 1, updated_at = NOW() WHERE id = ${id}`;
      break;
  }
}

export async function flagClient(id: number): Promise<void> {
  const sql = getDb();
  await sql`UPDATE clients SET flagged_to_robi = 1, updated_at = NOW() WHERE id = ${id}`;
}

export async function getClientsNeedingAgreementReminder(): Promise<Client[]> {
  const sql = getDb();
  return await sql`
    SELECT * FROM clients
    WHERE status = 'agreement_sent'
      AND flagged_to_robi = 0
      AND (
        (agreement_reminders_sent = 0 AND agreement_sent_at + INTERVAL '2 days' <= NOW())
        OR (agreement_reminders_sent = 1 AND agreement_sent_at + INTERVAL '4 days' <= NOW())
        OR (agreement_reminders_sent = 2 AND agreement_sent_at + INTERVAL '7 days' <= NOW())
      )
  ` as Client[];
}

export async function getClientsNeedingPaymentReminder(): Promise<Client[]> {
  const sql = getDb();
  return await sql`
    SELECT * FROM clients
    WHERE status IN ('welcome_sent')
      AND payment_confirmed_at IS NULL
      AND flagged_to_robi = 0
      AND welcome_sent_at IS NOT NULL
      AND (
        (payment_reminders_sent = 0 AND welcome_sent_at + INTERVAL '2 days' <= NOW())
        OR (payment_reminders_sent = 1 AND welcome_sent_at + INTERVAL '4 days' <= NOW())
        OR (payment_reminders_sent = 2 AND welcome_sent_at + INTERVAL '7 days' <= NOW())
      )
  ` as Client[];
}

export async function getClientsNeedingOnboardingReminder(): Promise<Client[]> {
  const sql = getDb();
  return await sql`
    SELECT * FROM clients
    WHERE status = 'payment_confirmed'
      AND onboarding_completed_at IS NULL
      AND flagged_to_robi = 0
      AND payment_confirmed_at IS NOT NULL
      AND (
        (onboarding_reminders_sent = 0 AND payment_confirmed_at + INTERVAL '3 days' <= NOW())
        OR (onboarding_reminders_sent = 1 AND payment_confirmed_at + INTERVAL '6 days' <= NOW())
        OR (onboarding_reminders_sent = 2 AND payment_confirmed_at + INTERVAL '10 days' <= NOW())
      )
  ` as Client[];
}
