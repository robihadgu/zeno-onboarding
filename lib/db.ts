import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "zeno.db");

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        business_name TEXT NOT NULL,
        email TEXT NOT NULL,
        plan TEXT NOT NULL CHECK(plan IN ('growth', 'elite')),
        status TEXT NOT NULL DEFAULT 'agreement_sent',
        agreement_token TEXT UNIQUE NOT NULL,
        envelope_id TEXT,
        notion_page_url TEXT,
        stripe_link TEXT,
        agreement_sent_at TEXT,
        agreement_signed_at TEXT,
        welcome_sent_at TEXT,
        payment_confirmed_at TEXT,
        onboarding_completed_at TEXT,
        agreement_reminders_sent INTEGER NOT NULL DEFAULT 0,
        payment_reminders_sent INTEGER NOT NULL DEFAULT 0,
        onboarding_reminders_sent INTEGER NOT NULL DEFAULT 0,
        flagged_to_robi INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        html_body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
        client_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        sent_at TEXT
      )
    `);
  }
  return db;
}

export interface QueuedEmail {
  id: number;
  recipient: string;
  subject: string;
  html_body: string;
  status: "pending" | "sent" | "failed";
  client_id: number | null;
  created_at: string;
  sent_at: string | null;
}

export function queueEmail(recipient: string, subject: string, htmlBody: string, clientId?: number): QueuedEmail {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO email_queue (recipient, subject, html_body, client_id) VALUES (?, ?, ?, ?)"
  ).run(recipient, subject, htmlBody, clientId || null);
  return db.prepare("SELECT * FROM email_queue WHERE id = ?").get(result.lastInsertRowid) as QueuedEmail;
}

export function getPendingEmails(): QueuedEmail[] {
  const db = getDb();
  return db.prepare("SELECT * FROM email_queue WHERE status = 'pending' ORDER BY created_at ASC").all() as QueuedEmail[];
}

export function markEmailSent(id: number): void {
  const db = getDb();
  db.prepare("UPDATE email_queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?").run(id);
}

export function markEmailFailed(id: number): void {
  const db = getDb();
  db.prepare("UPDATE email_queue SET status = 'failed' WHERE id = ?").run(id);
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
  envelope_id: string | null;
  notion_page_url: string | null;
  stripe_link: string | null;
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

export function createClient(
  name: string,
  businessName: string,
  email: string,
  plan: "growth" | "elite",
  agreementToken: string
): Client {
  const db = getDb();
  const stripeLink =
    plan === "growth"
      ? process.env.GROWTH_STRIPE_LINK || "GROWTH_STRIPE_LINK"
      : process.env.ELITE_STRIPE_LINK || "ELITE_STRIPE_LINK";

  const stmt = db.prepare(`
    INSERT INTO clients (name, business_name, email, plan, agreement_token, stripe_link, agreement_sent_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(name, businessName, email, plan, agreementToken, stripeLink);
  return getClientById(result.lastInsertRowid as number)!;
}

export function getClientById(id: number): Client | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as Client | undefined;
}

export function getClientByToken(token: string): Client | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM clients WHERE agreement_token = ?")
    .get(token) as Client | undefined;
}

export function getAllClients(): Client[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM clients ORDER BY created_at DESC")
    .all() as Client[];
}

export function deleteClient(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return result.changes > 0;
}

export function updateClientStatus(id: number, status: ClientStatus): Client | undefined {
  const db = getDb();
  const timestampCol: Record<string, string> = {
    agreement_signed: "agreement_signed_at",
    welcome_sent: "welcome_sent_at",
    payment_confirmed: "payment_confirmed_at",
    onboarding_complete: "onboarding_completed_at",
  };
  const col = timestampCol[status];
  if (col) {
    db.prepare(
      `UPDATE clients SET status = ?, ${col} = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(status, id);
  } else {
    db.prepare(
      "UPDATE clients SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(status, id);
  }
  return getClientById(id);
}

export function updateClientNotionUrl(id: number, url: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE clients SET notion_page_url = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(url, id);
}

export function updateClientEnvelopeId(id: number, envelopeId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE clients SET envelope_id = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(envelopeId, id);
}

export function getClientByEnvelopeId(envelopeId: string): Client | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM clients WHERE envelope_id = ?")
    .get(envelopeId) as Client | undefined;
}

export function incrementReminderCount(
  id: number,
  type: "agreement" | "payment" | "onboarding"
): void {
  const db = getDb();
  const col = `${type}_reminders_sent`;
  db.prepare(
    `UPDATE clients SET ${col} = ${col} + 1, updated_at = datetime('now') WHERE id = ?`
  ).run(id);
}

export function flagClient(id: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE clients SET flagged_to_robi = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(id);
}

/** Get clients needing agreement follow-ups */
export function getClientsNeedingAgreementReminder(): Client[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM clients
    WHERE status = 'agreement_sent'
      AND flagged_to_robi = 0
      AND (
        (agreement_reminders_sent = 0 AND datetime(agreement_sent_at, '+2 days') <= datetime('now'))
        OR (agreement_reminders_sent = 1 AND datetime(agreement_sent_at, '+4 days') <= datetime('now'))
        OR (agreement_reminders_sent = 2 AND datetime(agreement_sent_at, '+7 days') <= datetime('now'))
      )
  `).all() as Client[];
}

/** Get clients needing payment follow-ups */
export function getClientsNeedingPaymentReminder(): Client[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM clients
    WHERE status IN ('welcome_sent')
      AND payment_confirmed_at IS NULL
      AND flagged_to_robi = 0
      AND welcome_sent_at IS NOT NULL
      AND (
        (payment_reminders_sent = 0 AND datetime(welcome_sent_at, '+2 days') <= datetime('now'))
        OR (payment_reminders_sent = 1 AND datetime(welcome_sent_at, '+4 days') <= datetime('now'))
        OR (payment_reminders_sent = 2 AND datetime(welcome_sent_at, '+7 days') <= datetime('now'))
      )
  `).all() as Client[];
}

/** Get clients needing onboarding form follow-ups */
export function getClientsNeedingOnboardingReminder(): Client[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM clients
    WHERE status = 'payment_confirmed'
      AND onboarding_completed_at IS NULL
      AND flagged_to_robi = 0
      AND payment_confirmed_at IS NOT NULL
      AND (
        (onboarding_reminders_sent = 0 AND datetime(payment_confirmed_at, '+3 days') <= datetime('now'))
        OR (onboarding_reminders_sent = 1 AND datetime(payment_confirmed_at, '+6 days') <= datetime('now'))
        OR (onboarding_reminders_sent = 2 AND datetime(payment_confirmed_at, '+10 days') <= datetime('now'))
      )
  `).all() as Client[];
}
