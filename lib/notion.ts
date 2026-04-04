/**
 * Notion integration for client onboarding.
 * Uses Notion API to duplicate the template page via the /pages endpoint.
 * The duplicate creates a child page under the template with full content.
 */

const NOTION_API = "https://api.notion.com/v1";

function getHeaders(): Record<string, string> {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new Error("NOTION_API_KEY must be set in .env.local");
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

/**
 * Duplicates the onboarding template page for a client.
 * Creates a simple titled page under the template, then returns its URL.
 * The actual content duplication is handled by the Notion MCP duplicate-page
 * tool which is called separately. This creates a placeholder that gets
 * the Notion link for the welcome email.
 */
export async function duplicateOnboardingPage(
  businessName: string,
  clientName: string,
  plan: string
): Promise<string> {
  const templatePageId = process.env.NOTION_TEMPLATE_PAGE_ID;
  if (!templatePageId) throw new Error("NOTION_TEMPLATE_PAGE_ID must be set");

  const headers = getHeaders();
  const planLabel = plan === "elite" ? "Elite" : "Growth";

  // Create a new page under the template with basic onboarding content
  const createRes = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { type: "page_id", page_id: templatePageId },
      icon: { type: "emoji", emoji: "🌟" },
      properties: {
        title: {
          title: [
            {
              text: {
                content: `CLIENT ONBOARDING PORTAL — ${businessName}`,
              },
            },
          ],
        },
      },
      children: [
        {
          object: "block",
          type: "callout",
          callout: {
            icon: { type: "emoji", emoji: "🎉" },
            color: "blue_background",
            rich_text: [
              {
                type: "text",
                text: {
                  content: `Welcome to Zeno Automation! This page is your personal onboarding hub — everything you need to get your AI system live in 7 days is right here. Fill in your answers below and text Robi at 571-699-9042 when done!`,
                },
              },
            ],
          },
        },
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [{ type: "text", text: { content: `👋 Welcome, ${businessName}!` } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: `Hi ${clientName}, I'm Robi — founder of Zeno Automation. You've made a great decision. Over the next 7 days, I'm personally building your AI system so your business never misses another lead.`,
                },
              },
            ],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: "Your plan: " } },
              { type: "text", text: { content: `${planLabel} Plan` }, annotations: { bold: true } },
            ],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: "Your direct line to me: " } },
              { type: "text", text: { content: "Text 571-699-9042 anytime" }, annotations: { bold: true } },
            ],
          },
        },
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "📋 Step 1 — Your Business Info" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: "Fill in your answers directly on this page — just click any line and type!" }, annotations: { italic: true } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Business Name:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Your Name & Title:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Business Phone Number (the number clients currently call):" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Business Email:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Business Address:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Website URL:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Business Hours:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "What type of business are you?" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Biggest challenge with your current phone/booking system:" }, annotations: { bold: true } }] },
        },
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "⚙️ Step 2 — Your Services & Pricing" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "List all services you offer (one per line):" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Starting price for your most popular service:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Do you offer free consultations?" }, annotations: { bold: true } }] },
        },
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "🎙️ Step 3 — Brand Voice & Chatbot Setup" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "What name should your AI chatbot use? (e.g. Aria, Jade, Alex):" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Chatbot greeting message (or leave blank — I'll write one for you):" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Missed-call text-back message (or leave blank):" }, annotations: { bold: true } }] },
        },
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "📅 Step 4 — Booking System Access" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "What booking system do you use?" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Booking system login email:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Direct booking link (if you have one):" }, annotations: { bold: true } }] },
        },
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "⭐ Step 5 — Google Business Profile" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Do you have a Google Business Profile?" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Google Business Profile URL:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "Gmail account used for your Google Business Profile:" }, annotations: { bold: true } }] },
        },
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "❓ Step 6 — Your FAQs" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "The AI chatbot will answer these questions automatically 24/7." }, annotations: { italic: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "FAQ 1 — Question:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "FAQ 1 — Answer:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "FAQ 2 — Question:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "FAQ 2 — Answer:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "FAQ 3 — Question:" }, annotations: { bold: true } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: "FAQ 3 — Answer:" }, annotations: { bold: true } }] },
        },
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "📞 How to Reach Me" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: "Text or Call: " } },
              { type: "text", text: { content: "571-699-9042" }, annotations: { bold: true } },
            ],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: "Email: " } },
              { type: "text", text: { content: "zenoscale@gmail.com" }, annotations: { bold: true } },
            ],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: "Website: " } },
              { type: "text", text: { content: "zenoautomation.ai" }, annotations: { bold: true } },
            ],
          },
        },
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "✅ Done? Let Me Know!" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: "Once you've filled in all the sections above, simply " } },
              { type: "text", text: { content: "text me at 571-699-9042" }, annotations: { bold: true } },
              { type: "text", text: { content: " and say \"Onboarding done!\" — I'll review your answers and start building your system right away." } },
            ],
          },
        },
        {
          object: "block",
          type: "quote",
          quote: {
            rich_text: [
              { type: "text", text: { content: "Thank you for trusting Zeno Automation with your business. I'm going to make sure this is the best investment you've made this year. — Robi" }, annotations: { italic: true } },
            ],
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    console.error("[Notion] Create page error:", JSON.stringify(err).substring(0, 500));
    throw new Error(`Failed to create page: ${err.message || createRes.status}`);
  }

  const newPage = await createRes.json();
  const pageId = newPage.id.replace(/-/g, "");
  const url = `https://www.notion.so/${pageId}`;

  console.log(`[Notion] Created onboarding page for ${businessName}: ${url}`);
  return url;
}
