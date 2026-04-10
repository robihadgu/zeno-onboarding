import { NextRequest, NextResponse } from "next/server";

/**
 * Checks Bearer token against ADMIN_SECRET env var.
 * Used to protect /api/clients* endpoints from public access.
 * Returns null if authorized, otherwise a 401 response.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    console.error("[auth] ADMIN_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_SECRET not set" },
      { status: 500 }
    );
  }
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Checks Bearer token against CRON_SECRET env var.
 * Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`
 * when `crons` is configured in vercel.json and CRON_SECRET is set.
 * Returns null if authorized, otherwise a 401 response.
 */
export function requireCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[auth] CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured: CRON_SECRET not set" },
      { status: 500 }
    );
  }
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
