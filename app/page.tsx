"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { FluidParticlesBackground } from "@/components/ui/fluid-particles-background";
import OnboardingForm from "@/components/OnboardingForm";
import PipelineView from "@/components/PipelineView";
import type { Client } from "@/lib/db";

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  }, []);

  useEffect(() => {
    // Load clients immediately, then poll
    fetchClients();
    const interval = setInterval(fetchClients, 30000);
    return () => clearInterval(interval);
  }, [fetchClients]);

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

            {/* Badge */}
            <div
              className="px-4 py-1.5 rounded-full text-[12px] font-medium tracking-wide uppercase"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--gray-400)",
                border: "1px solid var(--border)",
                letterSpacing: "0.05em",
              }}
            >
              Onboarding Agent
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <OnboardingForm onSuccess={fetchClients} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <PipelineView clients={clients} onRefresh={fetchClients} />
        </div>
      </main>
    </div>
  );
}
