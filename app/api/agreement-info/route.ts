import { NextRequest, NextResponse } from "next/server";
import { getClientByToken } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const client = getClientByToken(token);
  if (!client) {
    return NextResponse.json({ error: "Agreement not found or link has expired." }, { status: 404 });
  }

  return NextResponse.json({
    name: client.name,
    business_name: client.business_name,
    email: client.email,
    plan: client.plan,
    status: client.status,
  });
}
