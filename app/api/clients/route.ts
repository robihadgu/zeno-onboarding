import { NextResponse } from "next/server";
import { initDb, getAllClients } from "@/lib/db";

export async function GET() {
  await initDb();
  const clients = await getAllClients();
  return NextResponse.json(clients);
}
