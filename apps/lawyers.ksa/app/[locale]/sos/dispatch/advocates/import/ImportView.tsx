"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Siren,
  ChevronLeft,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ParsedRow {
  rowNumber: number;
  fullName: string;
  registrationNo: string;
  phone: string;
  email: string | null;
  baseLocation: { lat: number; lng: number; address?: string } | null;
  emergencyRadiusKm: number;
  errors: string[];
  exists: boolean;
}

interface PreviewResp {
  rows: ParsedRow[];
  summary: {
    total: number;
    insertable: number;
    skippedDuplicates: number;
    skippedErrors: number;
  };
}

const SAMPLE = `full_name,registration_no,phone,email,base_lat,base_lng,base_address,radius_km
Ahmed Al-Khalifa,LB-1024,+97333112233,ahmed@example.com,26.2235,50.5876,Manama,25
Fatima Al-Sharif,LB-1025,+97333445566,fatima@example.com,26.2389,50.5832,Seef,30`;

export default function ImportView() {
  const router = useRouter();
  const [csv, setCsv] = useState(SAMPLE);
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runPreview() {
    setError(null);
    setSubmitting(true);
    setPreview(null);
    try {
      const res = await fetch("/api/sos/dispatch/advocates/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv, preview: true }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(`Preview failed: ${data.error ?? res.status}`);
        return;
      }
      setPreview((await res.json()) as PreviewResp);
    } finally {
      setSubmitting(false);
    }
  }

  async function commit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/sos/dispatch/advocates/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv, preview: false }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(`Import failed: ${data.error ?? res.status}`);
        return;
      }
      const data = (await res.json()) as { inserted: number };
      alert(
        `Imported ${data.inserted} advocate(s). They land inactive — open the roster to verify and activate each one.`,
      );
      router.push("../advocates");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      <div className="bg-gradient-to-r from-[#1A237E] via-[#0D1660] to-[#1A237E] text-white">
        <div className="max-w-5xl mx-auto px-5 py-5 flex items-center gap-3">
          <a
            href="../../advocates"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25"
          >
            <ChevronLeft size={18} />
          </a>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D32F2F]">
            <Siren size={18} />
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
              Dispatch
            </div>
            <h1 className="text-lg font-extrabold leading-tight">
              Bulk advocate import
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-5 space-y-4">
        <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h2 className="text-[14px] font-extrabold text-text-primary">
            CSV
          </h2>
          <p className="mt-1 text-[11px] text-text-muted leading-snug">
            Columns: <code>full_name</code>, <code>registration_no</code>,{" "}
            <code>phone</code>, <code>email</code>, <code>base_lat</code>,{" "}
            <code>base_lng</code>, <code>base_address</code>,{" "}
            <code>radius_km</code>. Header row required; column order is
            flexible. Imported advocates land inactive — verify and activate
            each one from the roster.
          </p>
          <textarea
            rows={10}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-[11px]"
            dir="ltr"
          />
          {error && (
            <div className="mt-3 rounded-lg border border-[#D32F2F]/30 bg-[#D32F2F]/[0.06] p-2 text-[12px] text-[#D32F2F]">
              {error}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={runPreview}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A237E] px-4 py-2 text-[12px] font-extrabold text-white disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              Preview
            </button>
            {preview && preview.summary.insertable > 0 && (
              <button
                type="button"
                onClick={commit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[12px] font-extrabold text-white disabled:opacity-60"
              >
                <CheckCircle2 size={12} />
                Import {preview.summary.insertable} advocate(s)
              </button>
            )}
          </div>
        </section>

        {preview && (
          <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="text-[14px] font-extrabold text-text-primary">
              Preview · {preview.summary.total} rows
            </h2>
            <p className="mt-1 text-[11px] text-text-muted">
              Will insert: {preview.summary.insertable} ·{" "}
              Skipped duplicates: {preview.summary.skippedDuplicates} ·{" "}
              Skipped errors: {preview.summary.skippedErrors}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-2 py-2 text-start">#</th>
                    <th className="px-2 py-2 text-start">Name</th>
                    <th className="px-2 py-2 text-start">Reg. No</th>
                    <th className="px-2 py-2 text-start">Phone</th>
                    <th className="px-2 py-2 text-start">Location</th>
                    <th className="px-2 py-2 text-end">Radius</th>
                    <th className="px-2 py-2 text-start">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.rowNumber} className="border-t border-gray-100 align-top">
                      <td className="px-2 py-2 font-mono text-text-muted">{r.rowNumber}</td>
                      <td className="px-2 py-2">{r.fullName}</td>
                      <td className="px-2 py-2 font-mono">{r.registrationNo}</td>
                      <td className="px-2 py-2 font-mono" dir="ltr">
                        {r.phone}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-text-muted">
                        {r.baseLocation
                          ? `${r.baseLocation.lat.toFixed(4)}, ${r.baseLocation.lng.toFixed(4)}`
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-end">{r.emergencyRadiusKm}km</td>
                      <td className="px-2 py-2">
                        {r.errors.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D32F2F]">
                            <AlertTriangle size={11} />
                            {r.errors.join(", ")}
                          </span>
                        ) : r.exists ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                            Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                            Will import
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
