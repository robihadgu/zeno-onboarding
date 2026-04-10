import { NextRequest, NextResponse } from "next/server";
import { initDb, getAllClients } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  await initDb();
  const clients = await getAllClients();
  return NextResponse.json(clients);
}
