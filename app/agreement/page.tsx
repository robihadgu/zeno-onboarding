"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface ClientInfo {
  name: string;
  business_name: string;
  email: string;
  plan: "growth" | "elite";
}

export default function AgreementPageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#666", fontSize: 14 }}>Loading...</p></div>}>
      <AgreementPageInner />
    </Suspense>
  );
}

function AgreementPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState("");
  const [featuresOpen, setFeaturesOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid agreement link.");
      setLoading(false);
      return;
    }
    fetch(`/api/agreement-info?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.status !== "agreement_sent") {
          setSigned(true);
        } else {
          setClient(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load agreement.");
        setLoading(false);
      });
  }, [token]);

  async function handleSign() {
    if (!signatureName.trim() || !agreed) return;
    setSigning(true);
    setError("");

    try {
      const res = await fetch("/api/agreement-signed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signedName: signatureName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to process signature");
      setSigned(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#666", fontSize: 14 }}>Loading agreement...</p>
      </div>
    );
  }

  if (signed) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "48px 40px", maxWidth: 500, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, background: "rgba(34,197,94,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>
            ✓
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Agreement Signed!</h1>
          <p style={{ color: "#999", fontSize: 14, lineHeight: 1.6 }}>
            Thank you! Your agreement has been signed successfully. Check your email for next steps — you'll receive your payment link and onboarding form shortly.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "48px 40px", maxWidth: 500, textAlign: "center" }}>
          <p style={{ color: "#f87171", fontSize: 15 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!client) return null;

  const isElite = client.plan === "elite";
  const setupFee = isElite ? "$750" : "$500";
  const monthlyFee = isElite ? "$1,497/month" : "$797/month";
  const planName = isElite ? "Elite" : "Growth";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const planTagline = isElite
    ? "Replace your front desk. Scale without hiring."
    : "Stop losing leads. Start capturing every opportunity.";
  const planSubtitle = isElite
    ? "Built for growing businesses that want a full AI operations layer — not just tools, but a system."
    : "Built for solo operators and small shops that need the essentials running 24/7.";

  const growthFeatures: { title: string; desc: string }[] = [
    { title: "Missed Call Text-Back", desc: "every missed call gets an instant SMS so leads don't bounce to competitors" },
    { title: "AI Receptionist (basic)", desc: "answers FAQs, books appointments, collects lead info 24/7" },
    { title: "Lead Nurture Sequences", desc: "7-day SMS + email follow-up for every new lead" },
    { title: "Reviews Automation", desc: "auto-request Google reviews after every appointment" },
    { title: "Booking Calendar Integration", desc: "syncs to your existing calendar (GHL, Calendly, Acuity)" },
    { title: "Basic Reporting Dashboard", desc: "see leads captured, calls answered, reviews collected" },
    { title: "Email support", desc: "48hr response" },
  ];

  const eliteExtraFeatures: { title: string; desc: string }[] = [
    { title: "Full AI Voice Receptionist", desc: "human-sounding AI that answers every call, handles bookings, reschedules, pricing questions, objections, and transfers hot leads live to you" },
    { title: "Advanced Lead Nurture", desc: "multi-channel (SMS + email + voicemail drops), behavior-triggered, up to 30 days" },
    { title: "Database Reactivation Campaigns", desc: "wake up old leads and past clients automatically (usually pays for 6+ months in the first 30 days)" },
    { title: "No-Show & Reschedule Automation", desc: "AI calls/texts no-shows, rebooks them, protects your calendar" },
    { title: "Custom AI Knowledge Base", desc: "trained on your services, pricing, policies, and brand voice" },
    { title: "Pipeline & CRM Automation", desc: "deals move themselves through stages, tasks auto-created" },
    { title: "Social DM Auto-Reply", desc: "Instagram & Facebook messages answered and booked instantly" },
    { title: "Monthly Strategy Call", desc: "we review performance and optimize" },
    { title: "Priority support", desc: "same-day, direct line to you" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#050505", padding: "40px 20px" }}>
      {/* Header */}
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, background: "#2563EB", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>Z</span>
          </div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Zeno Automation</h1>
          <p style={{ color: "#666", fontSize: 13 }}>Service Agreement</p>
        </div>

        {/* Agreement Content */}
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "36px 32px", marginBottom: 24 }}>
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 20, marginBottom: 24 }}>
            <p style={{ color: "#999", fontSize: 12, margin: "0 0 4px" }}>Prepared for</p>
            <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, margin: 0 }}>{client.name} — {client.business_name}</p>
            <p style={{ color: "#666", fontSize: 13, margin: "4px 0 0" }}>{client.email} · {planName} Plan · {today}</p>
          </div>

          <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 600, margin: "0 0 16px" }}>Terms of Service</h2>

          <div style={{ color: "#ccc", fontSize: 14, lineHeight: 1.8 }}>
            <p>This Service Agreement (&quot;Agreement&quot;) is entered into between <strong>Zeno Automation</strong> (&quot;Provider&quot;) and <strong>{client.business_name}</strong> (&quot;Client&quot;).</p>

            <h3 style={{ color: "#fff", fontSize: 15, margin: "24px 0 8px" }}>1. Services</h3>
            <p>Provider will deliver AI automation services under the <strong>{planName} Plan</strong>.</p>
            <p style={{ color: "#fff", fontStyle: "italic", margin: "8px 0 4px" }}>&ldquo;{planTagline}&rdquo;</p>
            <p style={{ color: "#999", fontSize: 13, margin: "0 0 12px" }}>{planSubtitle}</p>

            <button
              type="button"
              onClick={() => setFeaturesOpen((o) => !o)}
              style={{
                width: "100%",
                background: "rgba(37,99,235,0.08)",
                border: "1px solid rgba(37,99,235,0.25)",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "inherit",
                marginTop: 8,
              }}
              aria-expanded={featuresOpen}
            >
              <span>View all {planName} Plan features</span>
              <span style={{ fontSize: 12, transform: featuresOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
            </button>

            {featuresOpen && (
              <div style={{ marginTop: 12, padding: "16px 20px", background: "rgba(37,99,235,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {growthFeatures.map((f) => (
                    <li key={f.title} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, lineHeight: 1.6 }}>
                      <span style={{ color: "#2563EB", marginRight: 8 }}>✓</span>
                      <strong style={{ color: "#fff" }}>{f.title}</strong>
                      <span style={{ color: "#999" }}> — {f.desc}</span>
                    </li>
                  ))}
                </ul>

                {isElite && (
                  <>
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: "16px 0 8px" }}>Everything in Growth, plus:</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {eliteExtraFeatures.map((f) => (
                        <li key={f.title} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, lineHeight: 1.6 }}>
                          <span style={{ color: "#2563EB", marginRight: 8 }}>✓</span>
                          <strong style={{ color: "#fff" }}>{f.title}</strong>
                          <span style={{ color: "#999" }}> — {f.desc}</span>
                        </li>
                      ))}
                    </ul>
                    <p style={{ color: "#fff", fontSize: 13, fontStyle: "italic", margin: "16px 0 0", textAlign: "center" }}>
                      &ldquo;Growth plugs the leaks. Elite replaces your front desk.&rdquo;
                    </p>
                  </>
                )}
              </div>
            )}

            <h3 style={{ color: "#fff", fontSize: 15, margin: "24px 0 8px" }}>2. Pricing</h3>
            <div style={{ background: "rgba(37,99,235,0.08)", borderRadius: 10, padding: "16px 20px", margin: "12px 0" }}>
              <p style={{ margin: "0 0 6px" }}><strong>Setup Fee:</strong> {setupFee} (one-time, due today)</p>
              <p style={{ margin: "0 0 6px" }}><strong>Free Trial:</strong> 14 days — no monthly charge</p>
              <p style={{ margin: 0 }}><strong>Monthly Fee:</strong> {monthlyFee} (begins Day 15, billed automatically)</p>
            </div>

            <h3 style={{ color: "#fff", fontSize: 15, margin: "24px 0 8px" }}>3. Delivery Timeline</h3>
            <p>Provider will deliver the initial AI system within <strong>3 business days</strong> of receiving the completed onboarding form from Client.</p>

            <h3 style={{ color: "#fff", fontSize: 15, margin: "24px 0 8px" }}>4. Term &amp; Cancellation</h3>
            <p>This agreement is <strong>month-to-month</strong> after the initial setup. Either party may cancel with 30 days written notice. Setup fees are non-refundable.</p>

            <h3 style={{ color: "#fff", fontSize: 15, margin: "24px 0 8px" }}>5. Support</h3>
            <p>Provider offers ongoing support via text, email, and scheduled calls. System updates and optimization are included in the monthly fee.</p>

            <h3 style={{ color: "#fff", fontSize: 15, margin: "24px 0 8px" }}>6. Confidentiality</h3>
            <p>Both parties agree to keep all business information, login credentials, and proprietary data confidential. Provider will only use Client&apos;s data for the purpose of delivering the agreed services.</p>
          </div>
        </div>

        {/* Signature Section */}
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "32px 32px" }}>
          <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 600, margin: "0 0 20px" }}>Sign Agreement</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#999", fontSize: 12, display: "block", marginBottom: 6 }}>Your Full Legal Name</label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Type your full name"
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#0d0d0d",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {signatureName.trim() && (
            <div style={{ margin: "16px 0 20px", padding: "16px 20px", background: "rgba(37,99,235,0.05)", borderRadius: 10, borderLeft: "3px solid #2563EB" }}>
              <p style={{ color: "#666", fontSize: 11, margin: "0 0 4px" }}>Signature Preview</p>
              <p style={{ color: "#fff", fontSize: 28, fontFamily: "'Georgia', serif", fontStyle: "italic", margin: 0 }}>{signatureName}</p>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 24 }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 3, accentColor: "#2563EB" }}
            />
            <span style={{ color: "#ccc", fontSize: 13, lineHeight: 1.5 }}>
              I, <strong>{signatureName || "[your name]"}</strong>, agree to the terms outlined in this Service Agreement between {client.business_name} and Zeno Automation.
            </span>
          </label>

          {error && (
            <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 16px" }}>{error}</p>
          )}

          <button
            onClick={handleSign}
            disabled={!signatureName.trim() || !agreed || signing}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: !signatureName.trim() || !agreed ? "rgba(37,99,235,0.3)" : "#2563EB",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: !signatureName.trim() || !agreed ? "not-allowed" : "pointer",
              opacity: signing ? 0.6 : 1,
            }}
          >
            {signing ? "Processing..." : "Sign Agreement"}
          </button>

          <p style={{ color: "#666", fontSize: 11, textAlign: "center", marginTop: 12 }}>
            By signing, you agree to the terms above. A copy will be sent to your email.
          </p>
        </div>
      </div>
    </div>
  );
}
