"use client";

import { useState } from "react";
import type { Client, ClientStatus } from "@/lib/db";
import StatusBadge from "./StatusBadge";

const columns: { key: ClientStatus; label: string; icon: string }[] = [
  { key: "agreement_sent", label: "Agreement Sent", icon: "01" },
  { key: "agreement_signed", label: "Signed", icon: "02" },
  { key: "welcome_sent", label: "Welcome Sent", icon: "03" },
  { key: "payment_confirmed", label: "Paid", icon: "04" },
  { key: "onboarding_complete", label: "Onboarded", icon: "05" },
  { key: "complete", label: "Complete", icon: "06" },
];

interface Props {
  clients: Client[];
  onRefresh: () => void;
}

export default function PipelineView({ clients, onRefresh }: Props) {
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  async function handleDelete(clientId: number) {
    setActionLoading(clientId);
    try {
      await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      onRefresh();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  }

  async function advanceClient(client: Client, action: string) {
    setActionLoading(client.id);
    try {
      if (action === "mark_signed") {
        await fetch("/api/agreement-signed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: client.id }),
        });
      } else {
        await fetch(`/api/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action }),
        });
      }
      onRefresh();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(null);
    }
  }

  function getActionButton(client: Client) {
    if (actionLoading === client.id) {
      return (
        <button disabled className="btn-ghost w-full text-[11px] py-2 opacity-40 cursor-not-allowed">
          Processing...
        </button>
      );
    }

    if (client.status === "agreement_sent") {
      return (
        <button onClick={() => advanceClient(client, "mark_signed")} className="w-full text-[11px] py-2 font-medium cursor-pointer btn-ghost">
          Mark as Signed
        </button>
      );
    }

    if (client.status === "welcome_sent") {
      return (
        <div className="space-y-1.5">
          <button onClick={() => advanceClient(client, "payment_confirmed")} className="w-full text-[11px] py-2 font-medium cursor-pointer btn-ghost">
            Confirm Payment
          </button>
          <button onClick={() => advanceClient(client, "onboarding_complete")} className="w-full text-[11px] py-2 font-medium cursor-pointer btn-ghost">
            Mark Onboarded
          </button>
        </div>
      );
    }

    if (client.status === "payment_confirmed") {
      return (
        <div className="space-y-1.5">
          <div className="text-[10px] text-center py-1 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "var(--gray-400)" }}>
            Payment &#10003;
          </div>
          <button onClick={() => advanceClient(client, "onboarding_complete")} className="w-full text-[11px] py-2 font-medium cursor-pointer btn-ghost">
            Mark Onboarded
          </button>
        </div>
      );
    }

    if (client.status === "onboarding_complete") {
      return (
        <div className="space-y-1.5">
          <button onClick={() => advanceClient(client, "payment_confirmed")} className="w-full text-[11px] py-2 font-medium cursor-pointer btn-ghost">
            Confirm Payment
          </button>
          <div className="text-[10px] text-center py-1 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "var(--gray-400)" }}>
            Onboarding &#10003;
          </div>
        </div>
      );
    }

    return null;
  }

  function getReminderInfo(client: Client) {
    const total = client.agreement_reminders_sent + client.payment_reminders_sent + client.onboarding_reminders_sent;
    if (total === 0 && !client.flagged_to_robi) return null;
    return (
      <div className="flex items-center gap-1.5 mt-2">
        {total > 0 && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-md font-medium"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--gray-400)", border: "1px solid var(--border)" }}
          >
            {total} reminder{total !== 1 ? "s" : ""}
          </span>
        )}
        {client.flagged_to_robi === 1 && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-md font-medium"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--white)", border: "1px solid var(--border-hover)" }}
          >
            Needs follow-up
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--gray-400)" }}
          >
            &#9776;
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white tracking-[-0.3px]">Pipeline</h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--gray-600)" }}>
              {clients.length} client{clients.length !== 1 ? "s" : ""} in pipeline
            </p>
          </div>
        </div>
        <button onClick={onRefresh} className="btn-ghost px-4 py-2 text-[12px] font-medium">
          Refresh
        </button>
      </div>

      {clients.length === 0 ? (
        <div
          className="glass-card text-center py-20"
          style={{ color: "var(--gray-600)" }}
        >
          <div className="text-3xl mb-3 opacity-30">&#9671;</div>
          <p className="text-[14px]">No clients yet</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--gray-600)" }}>Start an onboarding above to see clients in the pipeline</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {columns.map((col, colIdx) => {
            const colClients = clients.filter((c) => c.status === col.key);
            return (
              <div
                key={col.key}
                className="glass-card p-3 min-h-[200px]"
                style={{ animationDelay: `${colIdx * 0.05}s` }}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span
                    className="text-[10px] font-bold w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--gray-400)" }}
                  >
                    {col.icon}
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: "var(--gray-400)" }}>
                    {col.label}
                  </span>
                  {colClients.length > 0 && (
                    <span
                      className="text-[10px] font-semibold ml-auto w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ background: "var(--surface-hover)", color: "var(--gray-400)" }}
                    >
                      {colClients.length}
                    </span>
                  )}
                </div>

                {/* Client cards */}
                <div className="space-y-2">
                  {colClients.map((client) => (
                    <div
                      key={client.id}
                      className="group rounded-xl p-3 transition-all hover:translate-y-[-1px] relative"
                      style={{
                        background: "var(--black-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {/* Delete button */}
                      {deleteConfirm === client.id ? (
                        <div
                          className="absolute inset-0 rounded-xl z-10 flex flex-col items-center justify-center gap-2 p-3"
                          style={{ background: "rgba(5,5,5,0.95)", border: "1px solid var(--border-hover)" }}
                        >
                          <p className="text-[11px] text-center" style={{ color: "var(--gray-400)" }}>
                            Delete <span className="text-white font-semibold">{client.business_name}</span>?
                          </p>
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="flex-1 text-[11px] py-1.5 rounded-lg font-medium cursor-pointer transition-all"
                              style={{ background: "rgba(255,255,255,0.08)", color: "var(--white)", border: "1px solid var(--border-hover)" }}
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="flex-1 btn-ghost text-[11px] py-1.5 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(client.id)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          style={{ background: "rgba(255,255,255,0.06)", color: "var(--gray-400)" }}
                          title="Delete client"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}

                      <div className="text-[12px] font-semibold text-white truncate leading-tight pr-6">
                        {client.business_name}
                      </div>
                      <div className="text-[11px] mt-1 truncate" style={{ color: "var(--gray-400)" }}>
                        {client.name}
                      </div>
                      <div className="text-[10px] mt-0.5 truncate" style={{ color: "var(--gray-600)" }}>
                        {client.email}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <StatusBadge status={client.status} />
                        <span
                          className="text-[10px] font-medium capitalize px-2 py-0.5 rounded-md"
                          style={{ background: "var(--surface)", color: "var(--gray-500)" }}
                        >
                          {client.plan}
                        </span>
                      </div>

                      {getReminderInfo(client)}

                      <div className="mt-3">
                        {getActionButton(client)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
