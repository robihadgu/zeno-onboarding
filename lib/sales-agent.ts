import { chatWithClaude } from "./claude";
import { LEAD_SCORING_PROMPT, EMAIL_GENERATION_PROMPT } from "./sales-prompts";

export type LeadScore = "hot" | "warm" | "cold";

export interface ScoringResult {
  score: LeadScore;
  reasoning: string;
}

/**
 * Use AI to score a lead based on their info and interaction history.
 */
export async function scoreLead(lead: {
  name: string | null;
  email: string | null;
  business_name: string | null;
  interest: string | null;
  notes: string | null;
  source: string;
  created_at: string;
}): Promise<ScoringResult> {
  const prompt = `Score this lead:
- Name: ${lead.name || "Unknown"}
- Business: ${lead.business_name || "Unknown"}
- Email: ${lead.email || "Unknown"}
- Interest: ${lead.interest || "Unknown"}
- Source: ${lead.source}
- Notes: ${lead.notes || "None"}
- First contact: ${lead.created_at}

Respond in JSON format: {"score": "hot|warm|cold", "reasoning": "..."}`;

  const response = await chatWithClaude(
    [{ role: "user", content: prompt }],
    LEAD_SCORING_PROMPT,
    300
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: parsed.score || "warm",
        reasoning: parsed.reasoning || "No reasoning provided",
      };
    }
  } catch {}

  return { score: "warm", reasoning: "Could not parse AI response" };
}

/**
 * Generate a personalized follow-up email for a lead.
 */
export async function generateFollowUpEmail(lead: {
  name: string | null;
  email: string | null;
  business_name: string | null;
  interest: string | null;
  notes: string | null;
  score: string;
}, previousEmails: number): Promise<{ subject: string; body: string }> {
  const prompt = `Generate a follow-up email for this lead:
- Name: ${lead.name || "there"}
- Business: ${lead.business_name || "your business"}
- Interest: ${lead.interest || "AI automation"}
- Lead score: ${lead.score}
- Previous emails sent: ${previousEmails}
- Notes: ${lead.notes || "None"}

This is follow-up #${previousEmails + 1}. ${
    previousEmails === 0
      ? "This is the first outreach — introduce Zeno and be warm."
      : previousEmails === 1
        ? "This is a gentle follow-up — reference the first email."
        : "This is a final follow-up — create urgency but stay respectful."
  }

Respond in JSON: {"subject": "...", "body": "..."}
The body should be HTML formatted for email.`;

  const response = await chatWithClaude(
    [{ role: "user", content: prompt }],
    EMAIL_GENERATION_PROMPT,
    800
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject || "Following up — Zeno Automation",
        body: parsed.body || "",
      };
    }
  } catch {}

  return {
    subject: "Following up — Zeno Automation",
    body: `<p>Hi ${lead.name || "there"},</p><p>I wanted to follow up about how Zeno Automation can help ${lead.business_name || "your business"} grow with AI. Would you be open to a quick chat?</p><p>— Robi, Zeno Automation</p>`,
  };
}

/**
 * Determine follow-up timing based on lead score.
 */
export function getFollowUpStrategy(score: LeadScore): {
  intervals: number[];
  maxFollowUps: number;
} {
  switch (score) {
    case "hot":
      return { intervals: [2, 24, 48], maxFollowUps: 3 }; // hours
    case "warm":
      return { intervals: [24, 72, 168], maxFollowUps: 3 }; // 1 day, 3 days, 7 days
    case "cold":
      return { intervals: [72, 168, 336], maxFollowUps: 3 }; // 3 days, 7 days, 14 days
  }
}
