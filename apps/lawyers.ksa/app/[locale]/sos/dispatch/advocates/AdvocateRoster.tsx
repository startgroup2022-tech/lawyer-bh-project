"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Siren,
  Power,
  ShieldCheck,
  ShieldOff,
  Star,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
} from "lucide-react";

interface AdvocateRow {
  id: string;
  fullName: string;
  registrationNo: string;
  email: string | null;
  phone: string;
  isActive: boolean;
  isEmergencyReady: boolean;
  emergencyRadiusKm: number;
  baseLocation: { lat: number; lng: number; address?: string } | null;
  consentId: string | null;
  createdAtIso: string;
  stats: { completed: number; total: number; avgRating: number | null };
}

type Action = "activate" | "deactivate" | "ready" | "unready";

export default function AdvocateRoster({
  advocates,
}: {
  advocates: AdvocateRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function actOn(id: string, action: Action) {
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/sos/dispatch/advocates/${encodeURIComponent(id)}/${action}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      alert(`Action failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      <div className="bg-gradient-to-r from-[#1A237E] via-[#0D1660] to-[#1A237E] text-white">
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="../dispatch"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25"
              title="Back to cases"
            >
              <ChevronLeft size={18} />
            </a>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D32F2F]">
              <Siren size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                Saudi Lawyers · Dispatch
              </div>
              <h1 className="text-lg font-extrabold leading-tight truncate">
                Advocate Roster
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="advocates/import"
              className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
            >
              Bulk import
            </a>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-5">
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total" value={advocates.length.toString()} />
          <Stat
            label="Active"
            value={advocates.filter((a) => a.isActive).length.toString()}
          />
          <Stat
            label="Emergency-ready now"
            value={advocates
              .filter((a) => a.isActive && a.isEmergencyReady)
              .length.toString()}
            highlight
          />
          <Stat
            label="Total cases handled"
            value={advocates
              .reduce((s, a) => s + a.stats.completed, 0)
              .toString()}
          />
        </div>

        {advocates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-text-muted">
            No advocates have signed up yet. Send them to /sos/lawyer/join.
          </div>
        ) : (
          <div className="space-y-3">
            {advocates.map((a) => (
              <article
                key={a.id}
                className={`rounded-xl bg-white border p-4 shadow-sm ${
                  !a.isActive ? "opacity-60 border-gray-200" : "border-gray-200"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[14px] font-extrabold text-text-primary">
                        {a.fullName}
                      </h3>
                      <span className="font-mono text-[10px] text-text-muted">
                        #{a.registrationNo}
                      </span>
                      <StatusPill active={a.isActive} ready={a.isEmergencyReady} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                      {a.email && (
                        <a
                          href={`mailto:${a.email}`}
                          className="inline-flex items-center gap-1"
                        >
                          <Mail size={11} />
                          {a.email}
                        </a>
                      )}
                      <a
                        href={`tel:${a.phone}`}
                        className="inline-flex items-center gap-1"
                        dir="ltr"
                      >
                        <Phone size={11} />
                        {a.phone}
                      </a>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} />
                        {a.emergencyRadiusKm} km radius
                      </span>
                    </div>
                  </div>
                  <div className="text-end text-[11px]">
                    {a.stats.avgRating != null && (
                      <div className="inline-flex items-center gap-1 text-yellow-700">
                        <Star
                          size={11}
                          className="fill-yellow-400 text-yellow-500"
                        />
                        {a.stats.avgRating.toFixed(1)} / 5
                      </div>
                    )}
                    <div className="text-text-muted">
                      {a.stats.completed} completed · {a.stats.total} total
                    </div>
                  </div>
                </div>

                {a.baseLocation && (
                  <div className="mt-2 text-[11px] text-text-muted">
                    Base:{" "}
                    <a
                      href={`https://maps.google.com/?q=${a.baseLocation.lat},${a.baseLocation.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1A237E] font-mono"
                    >
                      {a.baseLocation.lat.toFixed(4)},{" "}
                      {a.baseLocation.lng.toFixed(4)}
                    </a>
                    {a.baseLocation.address && (
                      <> · {a.baseLocation.address}</>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {a.consentId && (
                    <a
                      href={`/api/sos/dispatch/advocates/${a.id}/consent-pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-text-primary"
                    >
                      Consent PDF
                    </a>
                  )}
                  {a.isActive ? (
                    <button
                      type="button"
                      onClick={() => actOn(a.id, "deactivate")}
                      disabled={busyId === a.id}
                      className="inline-flex items-center gap-1 rounded-md border border-[#D32F2F] px-2.5 py-1.5 text-[11px] font-bold text-[#D32F2F]"
                    >
                      <ShieldOff size={12} />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => actOn(a.id, "activate")}
                      disabled={busyId === a.id}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
                    >
                      <ShieldCheck size={12} />
                      Activate
                    </button>
                  )}
                  {a.isActive && a.isEmergencyReady ? (
                    <button
                      type="button"
                      onClick={() => actOn(a.id, "unready")}
                      disabled={busyId === a.id}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-amber-700"
                    >
                      <Power size={12} />
                      Force offline
                    </button>
                  ) : a.isActive ? (
                    <button
                      type="button"
                      onClick={() => actOn(a.id, "ready")}
                      disabled={busyId === a.id}
                      className="inline-flex items-center gap-1 rounded-md bg-[#1A237E] px-2.5 py-1.5 text-[11px] font-bold text-white"
                    >
                      <Power size={12} />
                      Mark online
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold text-text-primary">
        {value}
      </div>
    </div>
  );
}

function StatusPill({
  active,
  ready,
}: {
  active: boolean;
  ready: boolean;
}) {
  if (!active) {
    return (
      <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-700">
        Inactive
      </span>
    );
  }
  if (ready) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
      Active · Offline
    </span>
  );
}
