"use client";

import { useState } from "react";
import type { Lead } from "@/lib/db";

interface LeadsDashboardProps {
  leads: Lead[];
  onRefresh: () => void;
}

const scoreColors: Record<string, string> = {
  hot: "#ef4444",
  warm: "#f59e0b",
  cold: "#6b7280",
};

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

export default function LeadsDashboard({ leads, onRefresh }: LeadsDashboardProps) {
  const [scoring, setScoring] = useState<number | null>(null);
  const [generating, setGenerating] = useState<number | null>(null);

  async function scoreLead(id: number) {
    setScoring(id);
    try {
      await fetch(`/api/leads/${id}/score`, { method: "POST" });
      onRefresh();
    } catch (err) {
      console.error("Score error:", err);
    } finally {
      setScoring(null);
    }
  }

  async function sendFollowUp(id: number) {
    setGenerating(id);
    try {
      await fetch(`/api/leads/${id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send: true }),
      });
      onRefresh();
    } catch (err) {
      console.error("Follow-up error:", err);
    } finally {
      setGenerating(null);
    }
  }

  if (leads.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
        }}
      >
        <p style={{ color: "var(--gray-400)", fontSize: 14 }}>
          No leads yet. They'll appear here when the chatbot captures them.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-[15px] font-semibold text-white">
          Leads ({leads.length})
        </h2>
        <button
          onClick={onRefresh}
          className="text-[12px] px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.05)",
            color: "var(--gray-400)",
            border: "1px solid var(--border)",
          }}
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Name", "Business", "Email", "Score", "Status", "Emails", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--gray-400)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td style={{ padding: "12px 16px", color: "#fff", fontSize: 13 }}>
                  {lead.name || "—"}
                </td>
                <td style={{ padding: "12px 16px", color: "#ccc", fontSize: 13 }}>
                  {lead.business_name || "—"}
                </td>
                <td style={{ padding: "12px 16px", color: "#ccc", fontSize: 13 }}>
                  {lead.email || "—"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#fff",
                      background: scoreColors[lead.score] || "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    {lead.score}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#ccc", fontSize: 13 }}>
                  {statusLabels[lead.status] || lead.status}
                </td>
                <td style={{ padding: "12px 16px", color: "#ccc", fontSize: 13 }}>
                  {lead.emails_sent}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => scoreLead(lead.id)}
                      disabled={scoring === lead.id}
                      className="text-[11px] px-2.5 py-1 rounded-md"
                      style={{
                        background: "rgba(37,99,235,0.15)",
                        color: "#60a5fa",
                        border: "1px solid rgba(37,99,235,0.3)",
                        cursor: scoring === lead.id ? "wait" : "pointer",
                      }}
                    >
                      {scoring === lead.id ? "..." : "AI Score"}
                    </button>
                    <button
                      onClick={() => sendFollowUp(lead.id)}
                      disabled={generating === lead.id || !lead.email}
                      className="text-[11px] px-2.5 py-1 rounded-md"
                      style={{
                        background: "rgba(34,197,94,0.15)",
                        color: "#4ade80",
                        border: "1px solid rgba(34,197,94,0.3)",
                        cursor: generating === lead.id || !lead.email ? "wait" : "pointer",
                      }}
                    >
                      {generating === lead.id ? "..." : "Follow Up"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
