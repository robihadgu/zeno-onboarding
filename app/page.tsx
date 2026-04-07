"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { FluidParticlesBackground } from "@/components/ui/fluid-particles-background";
import OnboardingForm from "@/components/OnboardingForm";
import PipelineView from "@/components/PipelineView";
import LeadsDashboard from "@/components/LeadsDashboard";
import type { Client, Lead } from "@/lib/db";

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<"pipeline" | "leads">("pipeline");

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchLeads();
  }, [fetchClients, fetchLeads]);

  const activeCount = clients.filter((c) => c.status !== "complete").length;
  const completeCount = clients.filter((c) => c.status === "complete").length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fluid particles background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <FluidParticlesBackground particleCount={1500} noiseIntensity={0.003} particleSize={{ min: 0.5, max: 1.5 }} className="!h-full" />
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-20 backdrop-blur-2xl"
        style={{
          background: "rgba(5,5,5,0.7)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/Apexai.jpg"
              alt="Zeno"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-[17px] font-semibold text-white tracking-[-0.5px]">Zeno</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-5 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--white)" }} />
                <span style={{ color: "var(--gray-400)" }}>
                  <span className="font-semibold text-white">{activeCount}</span> active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--gray-400)" }} />
                <span style={{ color: "var(--gray-400)" }}>
                  <span className="font-semibold text-white">{completeCount}</span> complete
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3 }}>
              <button
                onClick={() => setTab("pipeline")}
                className="px-4 py-1.5 rounded-md text-[12px] font-medium tracking-wide uppercase"
                style={{
                  background: tab === "pipeline" ? "rgba(255,255,255,0.1)" : "transparent",
                  color: tab === "pipeline" ? "#fff" : "var(--gray-400)",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                }}
              >
                Pipeline
              </button>
              <button
                onClick={() => { setTab("leads"); fetchLeads(); }}
                className="px-4 py-1.5 rounded-md text-[12px] font-medium tracking-wide uppercase"
                style={{
                  background: tab === "leads" ? "rgba(255,255,255,0.1)" : "transparent",
                  color: tab === "leads" ? "#fff" : "var(--gray-400)",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                }}
              >
                Leads {leads.length > 0 && `(${leads.length})`}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {tab === "pipeline" ? (
          <>
            <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <OnboardingForm onSuccess={fetchClients} />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <PipelineView clients={clients} onRefresh={fetchClients} />
            </div>
          </>
        ) : (
          <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <LeadsDashboard leads={leads} onRefresh={fetchLeads} />
          </div>
        )}
      </main>
    </div>
  );
}
