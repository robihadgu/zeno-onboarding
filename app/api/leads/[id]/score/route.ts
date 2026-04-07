import { NextRequest, NextResponse } from "next/server";
import { initDb, getLeadById, updateLead, createLeadActivity } from "@/lib/db";
import { scoreLead } from "@/lib/sales-agent";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const lead = await getLeadById(parseInt(id));

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const result = await scoreLead(lead);

  await updateLead(lead.id, {
    score: result.score,
    ai_summary: result.reasoning,
  });

  await createLeadActivity(lead.id, "score_update", `Scored as ${result.score}: ${result.reasoning}`);

  return NextResponse.json({ score: result.score, reasoning: result.reasoning });
}
