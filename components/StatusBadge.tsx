"use client";

import type { ClientStatus } from "@/lib/db";

const config: Record<ClientStatus, { label: string; color: string; bg: string; border: string }> = {
  agreement_sent:    { label: "Pending",    color: "#999999", bg: "rgba(255,255,255,0.04)",  border: "rgba(255,255,255,0.08)" },
  agreement_signed:  { label: "Signed",     color: "#E0E0E0", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.10)" },
  welcome_sent:      { label: "Welcome",    color: "#E0E0E0", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.10)" },
  payment_confirmed: { label: "Paid",       color: "#FFFFFF", bg: "rgba(255,255,255,0.08)",  border: "rgba(255,255,255,0.14)" },
  onboarding_complete:{ label: "Onboarded", color: "#FFFFFF", bg: "rgba(255,255,255,0.10)",  border: "rgba(255,255,255,0.16)" },
  complete:          { label: "Complete",   color: "#FFFFFF", bg: "rgba(255,255,255,0.12)",  border: "rgba(255,255,255,0.20)" },
};

export default function StatusBadge({ status }: { status: ClientStatus }) {
  const { label, color, bg, border } = config[status] || config.agreement_sent;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.06em]"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: color }} />
      {label}
    </span>
  );
}
