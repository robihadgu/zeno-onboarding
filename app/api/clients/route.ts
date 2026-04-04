import { NextResponse } from "next/server";
import { getAllClients } from "@/lib/db";

export async function GET() {
  const clients = getAllClients();
  return NextResponse.json(clients);
}
