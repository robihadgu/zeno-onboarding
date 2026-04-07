import { NextRequest, NextResponse } from "next/server";
import { chatWithClaude, type ChatMessage } from "@/lib/claude";
import { CHATBOT_SYSTEM_PROMPT } from "@/lib/chatbot-system-prompt";
import { initDb, createLead } from "@/lib/db";

// Simple rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // messages per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// CORS headers for cross-origin widget
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a moment." },
        { status: 429, headers: corsHeaders }
      );
    }

    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Limit conversation history to last 20 messages
    const trimmedMessages = messages.slice(-20);

    const reply = await chatWithClaude(trimmedMessages, CHATBOT_SYSTEM_PROMPT);

    // Check if the AI collected lead data
    const leadMatch = reply.match(/```LEAD_DATA\n([\s\S]*?)\n```/);
    let cleanReply = reply;
    let leadCaptured = false;

    if (leadMatch) {
      try {
        const leadData = JSON.parse(leadMatch[1]);
        await initDb();
        await createLead({
          name: leadData.name || null,
          email: leadData.email || null,
          business_name: leadData.businessName || null,
          interest: leadData.interest || null,
          source: "chatbot",
          notes: `Captured via chatbot conversation`,
        });
        leadCaptured = true;
        console.log(`[Chat] Lead captured: ${leadData.email}`);
      } catch (err) {
        console.error("[Chat] Failed to save lead:", err);
      }
      // Remove the LEAD_DATA block from the visible reply
      cleanReply = reply.replace(/```LEAD_DATA\n[\s\S]*?\n```/, "").trim();
    }

    return NextResponse.json(
      { reply: cleanReply, leadCaptured },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("[Chat] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
