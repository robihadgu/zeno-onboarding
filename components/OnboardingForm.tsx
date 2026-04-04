"use client";

import { useState } from "react";

interface Props {
  onSuccess: () => void;
}

export default function OnboardingForm({ onSuccess }: Props) {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"growth" | "elite">("growth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, businessName, email, plan }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start onboarding");
      }

      setSuccess(`Onboarding started for ${businessName}!`);
      setName("");
      setBusinessName("");
      setEmail("");
      setPlan("growth");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-7">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
        >
          +
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-white tracking-[-0.3px]">New Client Onboarding</h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--foreground-dim)" }}>
            Enter client details to send a DocuSign agreement
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[12px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--foreground-muted)" }}>
            Client Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="John Smith"
            className="w-full px-4 py-3 text-[14px] outline-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--foreground-muted)" }}>
            Business Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            placeholder="Acme Corp"
            className="w-full px-4 py-3 text-[14px] outline-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--foreground-muted)" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="john@acme.com"
            className="w-full px-4 py-3 text-[14px] outline-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--foreground-muted)" }}>
            Plan
          </label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as "growth" | "elite")}
            className="w-full px-4 py-3 text-[14px] outline-none"
          >
            <option value="growth">Growth — $500 setup + $797/mo</option>
            <option value="elite">Elite — $750 setup + $1,497/mo</option>
          </select>
        </div>
      </div>

      {error && (
        <div
          className="mt-5 px-4 py-3 rounded-xl text-[13px] flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.12)" }}
        >
          <span>!</span> {error}
        </div>
      )}
      {success && (
        <div
          className="mt-5 px-4 py-3 rounded-xl text-[13px] flex items-center gap-2"
          style={{ background: "var(--green-glow)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.15)" }}
        >
          <span>&#10003;</span> {success}
        </div>
      )}

      <div className="mt-7">
        <button
          type="submit"
          disabled={loading}
          className="btn-accent px-8 py-3 text-[14px] font-semibold tracking-[-0.2px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" /></svg>
              Starting...
            </span>
          ) : (
            "Start Onboarding →"
          )}
        </button>
      </div>
    </form>
  );
}
