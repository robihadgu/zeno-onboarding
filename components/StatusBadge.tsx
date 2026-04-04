"use client";

import type { ClientStatus } from "@/lib/db";

const config: Record<ClientStatus, { label: string; color: string; bg: string; border: string }> = {
  agreement_sent:    { label: "Pending",    color: "#EAB308", bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.15)" },
  agreement_signed:  { label: "Signed",     color: "#5E6AD2", bg: "rgba(94,106,210,0.08)", border: "rgba(94,106,210,0.15)" },
  welcome_sent:      { label: "Welcome",    color: "#A78BFA", bg: "rgba(167,139,250,0.08)",border: "rgba(167,139,250,0.15)" },
  payment_confirmed: { label: "Paid",       color: "#22C55E", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.15)" },
  onboarding_complete:{ label: "Onboarded", color: "#22C55E", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.2)" },
  complete:          { label: "Complete",   color: "#22C55E", bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.25)" },
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
