"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import {
  Siren,
  Phone,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  RefreshCw,
  Users,
  CreditCard,
  Copy,
  CheckCheck,
  TrendingUp,
  Download,
  LogOut,
  Wallet,
} from "lucide-react";
import { formatBahrainDateTime } from "@/lib/sos/bahrain-time";
import { useRouter } from "next/navigation";

interface Advocate {
  id: string;
  fullName: string;
  registrationNo: string;
  phone: string;
  email: string | null;
  distanceKm: number;
  rateBhd: number | null;
}

interface CaseRow {
  id: string;
  caseRef: string;
  caseType: string;
  caseTypeLabel: { en: string; ar: string };
  contactName: string;
  contactPhone: string;
  contactIdNumber: string | null;
  description: string | null;
  location: { lat: number; lng: number; address?: string } | null;
  baseFeeBhd: number;
  paymentStatus: string;
  serviceStatus: string;
  ratingStars: number | null;
  ratingComment: string | null;
  responseTsIso: string | null;
  arrivalTsIso: string | null;
  completedTsIso: string | null;
  consentId: string | null;
  locale: string;
  createdAtIso: string;
  dispatchActorLog: Array<{ actor: string; action: string; ts: string }>;
  internalNotes: Array<{
    id: string;
    actor: string;
    body: string;
    ts: string;
  }>;
  cancellationReason: string | null;
  refundStatus: "none" | "pending" | "completed" | "failed";
  refundAmountBhd: number | null;
  refundRef: string | null;
  refundMarkedAtIso: string | null;
  refundMarkedBy: string | null;
}

const STATUS_FLOW: Array<{
  current: string;
  action: string;
  label: string;
  cls: string;
}> = [
  {
    current: "pending",
    action: "accept",
    label: "Accept",
    cls: "bg-[#1A237E] text-white",
  },
  {
    current: "mobilizing",
    action: "arrived",
    label: "Mark Arrived",
    cls: "bg-[#1A237E] text-white",
  },
  {
    current: "arrived",
    action: "complete",
    label: "Mark Completed",
    cls: "bg-emerald-600 text-white",
  },
];

export default function DispatchBoard({ cases }: { cases: CaseRow[] }) {
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === "ar";
  const [filter, setFilter] = useState<"active" | "all" | "completed">(
    "active",
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [suggestionsForCase, setSuggestionsForCase] = useState<
    Record<string, Advocate[] | null>
  >({});
  const [chargeLinkByCase, setChargeLinkByCase] = useState<
    Record<string, string>
  >({});
  const [chargeQrByCase, setChargeQrByCase] = useState<
    Record<string, string>
  >({});
  const [copiedCase, setCopiedCase] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function loadSuggestions(caseRef: string) {
    setSuggestionsForCase((s) => ({ ...s, [caseRef]: null })); // null = loading
    try {
      const res = await fetch(
        `/api/sos/dispatch/${encodeURIComponent(caseRef)}/suggest`,
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { matches: Advocate[] };
      setSuggestionsForCase((s) => ({ ...s, [caseRef]: data.matches }));
    } catch (e) {
      alert(
        `Suggest failed: ${e instanceof Error ? e.message : "unknown"}`,
      );
      setSuggestionsForCase((s) => {
        const { [caseRef]: _, ...rest } = s;
        return rest;
      });
    }
  }

  async function assignAdvocate(caseRef: string, advocateId: string) {
    setPendingId(caseRef);
    try {
      const res = await fetch(
        `/api/sos/dispatch/${encodeURIComponent(caseRef)}/assign`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ advocateId }),
        },
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      alert(`Assign failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setPendingId(null);
    }
  }

  async function createCharge(caseRef: string) {
    setPendingId(caseRef);
    try {
      const res = await fetch(
        `/api/sos/dispatch/${encodeURIComponent(caseRef)}/charge`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as {
        chargeUrl: string | null;
        chargeQrDataUrl: string | null;
      };
      if (data.chargeUrl) {
        setChargeLinkByCase((c) => ({ ...c, [caseRef]: data.chargeUrl! }));
        if (data.chargeQrDataUrl) {
          setChargeQrByCase((c) => ({
            ...c,
            [caseRef]: data.chargeQrDataUrl!,
          }));
        }
      } else {
        alert("Charge created but no URL returned. Check Tap config.");
      }
    } catch (e) {
      alert(`Charge failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setPendingId(null);
    }
  }

  async function copyChargeLink(caseRef: string) {
    const link = chargeLinkByCase[caseRef];
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCase(caseRef);
      setTimeout(() => setCopiedCase(null), 2000);
    } catch {
      // Clipboard API can fail without user gesture; show the link in prompt
      window.prompt("Copy this Tap checkout URL:", link);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "active") {
      return cases.filter(
        (c) =>
          c.serviceStatus !== "completed" && c.serviceStatus !== "cancelled",
      );
    }
    if (filter === "completed") {
      return cases.filter((c) => c.serviceStatus === "completed");
    }
    return cases;
  }, [cases, filter]);

  async function transition(caseRef: string, action: string) {
    let body: BodyInit | undefined;
    let headers: HeadersInit | undefined;
    // Cancel needs a reason — prompt before firing the request so the
    // operator can capture context ("client called back", "duplicate
    // of SOS-XYZ", etc.) for the audit trail.
    if (action === "cancel") {
      const reason = window.prompt(
        "Reason for cancellation? (Required for the audit log.)",
      );
      if (reason == null) return; // operator hit Cancel on the prompt
      const trimmed = reason.trim();
      if (!trimmed) {
        alert("A reason is required when cancelling.");
        return;
      }
      body = JSON.stringify({ reason: trimmed });
      headers = { "content-type": "application/json" };
    }
    setPendingId(caseRef);
    try {
      const res = await fetch(`/api/sos/dispatch/${encodeURIComponent(caseRef)}/${action}`, {
        method: "POST",
        headers,
        body,
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      alert(`Action failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setPendingId(null);
    }
  }

  async function addNote(caseRef: string) {
    const body = window.prompt("Add an internal note (visible to all dispatch operators):");
    if (body == null) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setPendingId(caseRef);
    try {
      const res = await fetch(
        `/api/sos/dispatch/${encodeURIComponent(caseRef)}/note`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        },
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      alert(`Note failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setPendingId(null);
    }
  }

  async function removeNote(caseRef: string, noteId: string) {
    if (!confirm("Remove this note?")) return;
    setPendingId(caseRef);
    try {
      await fetch(
        `/api/sos/dispatch/${encodeURIComponent(caseRef)}/note/${encodeURIComponent(noteId)}`,
        { method: "DELETE" },
      );
      startTransition(() => router.refresh());
    } finally {
      setPendingId(null);
    }
  }

  async function markRefund(
    caseRef: string,
    status: "pending" | "completed" | "failed",
    baseFeeBhd: number,
  ) {
    // 50% rule from the SOS Service Agreement is the default; the
    // operator can override (full refund on a dispatch error, etc.).
    const defaultAmount = (baseFeeBhd / 2).toFixed(3);
    const amountInput = window.prompt(
      `Refund amount in BHD (contract default 50% = ${defaultAmount}):`,
      defaultAmount,
    );
    if (amountInput == null) return;
    const amountBhd = Number(amountInput.trim());
    if (!Number.isFinite(amountBhd) || amountBhd < 0) {
      alert("Refund amount must be a non-negative number.");
      return;
    }
    let ref: string | null = null;
    if (status !== "failed") {
      ref = window.prompt("Tap refund reference (optional):");
    }
    setPendingId(caseRef);
    try {
      const res = await fetch(
        `/api/sos/dispatch/${encodeURIComponent(caseRef)}/refund`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status,
            amountBhd,
            ref: ref?.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`Refund failed: ${data.error ?? res.status}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header band */}
      <div className="bg-gradient-to-r from-[#1A237E] via-[#0D1660] to-[#1A237E] text-white">
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D32F2F]">
              <Siren size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                Lawyers.bh
              </div>
              <h1 className="text-lg font-extrabold leading-tight truncate">
                SOS Dispatch Board
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <a
            href="dispatch/advocates"
            className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
          >
            <Users size={13} />
            Advocates
          </a>
          <a
            href="dispatch/analytics"
            className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
          >
            <TrendingUp size={13} />
            Analytics
          </a>
          <a
            href="dispatch/payouts"
            className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
          >
            <Wallet size={13} />
            Payouts
          </a>
          <a
            href="/api/sos/dispatch/export"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
          >
            <Download size={13} />
            CSV
          </a>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/sos/dispatch/logout", { method: "POST" });
              router.push("dispatch/login");
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-5">
        {/* Filter tabs */}
        <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-1 text-[12px] font-semibold">
          {(["active", "completed", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === f
                  ? "bg-[#1A237E] text-white"
                  : "text-text-muted hover:bg-gray-50"
              }`}
            >
              {f === "active"
                ? `Active · ${cases.filter((c) => c.serviceStatus !== "completed" && c.serviceStatus !== "cancelled").length}`
                : f === "completed"
                  ? `Completed · ${cases.filter((c) => c.serviceStatus === "completed").length}`
                  : `All · ${cases.length}`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-text-muted">
            No requests in this view.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const next = STATUS_FLOW.find((s) => s.current === c.serviceStatus);
              const mapsUrl = c.location
                ? `https://maps.google.com/?q=${c.location.lat},${c.location.lng}`
                : null;
              const waLink = `https://wa.me/${c.contactPhone.replace(/[^0-9]/g, "")}`;
              return (
                <div
                  key={c.id}
                  className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[13px] font-extrabold text-[#D32F2F]">
                          {c.caseRef}
                        </span>
                        <StatusPill status={c.serviceStatus} />
                        <PaymentPill status={c.paymentStatus} />
                      </div>
                      <h3 className="mt-1 text-[14px] font-bold text-text-primary">
                        {isAr ? c.caseTypeLabel.ar : c.caseTypeLabel.en}
                        <span className="ms-2 text-[11px] font-bold text-[#1A237E]">
                          {c.baseFeeBhd} BHD
                        </span>
                      </h3>
                    </div>
                    <div className="text-end text-[10px] text-text-muted">
                      <div>{formatBahrainDateTime(c.createdAtIso, "en-GB")}</div>
                      <div className="font-mono">{c.locale.toUpperCase()}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Client
                      </div>
                      <div className="font-semibold">{c.contactName}</div>
                      <div className="text-text-muted">{c.contactIdNumber}</div>
                      <a
                        href={`tel:${c.contactPhone}`}
                        className="mt-1 inline-flex items-center gap-1 text-[#1A237E]"
                        dir="ltr"
                      >
                        <Phone size={11} />
                        {c.contactPhone}
                      </a>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Location
                      </div>
                      {c.location ? (
                        <a
                          href={mapsUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#1A237E]"
                        >
                          <ExternalLink size={11} />
                          {c.location.lat.toFixed(4)}, {c.location.lng.toFixed(4)}
                        </a>
                      ) : (
                        <span className="text-text-muted italic">No GPS</span>
                      )}
                      {c.location?.address && (
                        <div className="mt-1 text-text-muted text-[11px]">
                          {c.location.address}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Description
                      </div>
                      <div className="text-text-primary line-clamp-3">
                        {c.description ?? "—"}
                      </div>
                    </div>
                  </div>

                  {c.dispatchActorLog.length > 0 && (
                    <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-2 text-[11px]">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                        Audit · last action by{" "}
                        <span className="text-[#1A237E]">
                          {c.dispatchActorLog[c.dispatchActorLog.length - 1].actor}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.dispatchActorLog
                          .slice(-6)
                          .map((entry, i) => (
                            <span
                              key={`${entry.ts}-${i}`}
                              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-text-primary border border-gray-200"
                              title={`${entry.actor} · ${entry.action} · ${new Date(entry.ts).toLocaleString()}`}
                            >
                              <span className="font-bold capitalize">
                                {entry.action}
                              </span>
                              <span className="text-text-muted">
                                {entry.actor}
                              </span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Cancellation reason — only meaningful for cancelled cases. */}
                  {c.serviceStatus === "cancelled" && c.cancellationReason && (
                    <div className="mt-3 rounded-lg bg-gray-100 border border-gray-300 p-2 text-[11px] text-text-primary">
                      <span className="font-bold uppercase tracking-wide text-text-muted">
                        Cancelled because:
                      </span>{" "}
                      {c.cancellationReason}
                    </div>
                  )}

                  {/* Refund tracker — only when payment was captured (refunds
                       require an underlying charge) AND the case is cancelled
                       OR a refund has already been initiated for another reason. */}
                  {(c.paymentStatus === "success" ||
                    c.paymentStatus === "refunded") &&
                    (c.serviceStatus === "cancelled" ||
                      c.refundStatus !== "none") && (
                      <div className="mt-3 rounded-lg border border-orange-300 bg-orange-50 p-2 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold uppercase tracking-wide text-orange-800">
                              Refund
                            </span>
                            <RefundPill status={c.refundStatus} />
                            {c.refundAmountBhd != null && (
                              <span className="font-mono font-bold text-orange-900">
                                {c.refundAmountBhd.toFixed(3)} BHD
                              </span>
                            )}
                            {c.refundRef && (
                              <span className="font-mono text-[10px] text-orange-700">
                                ref: {c.refundRef}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {c.refundStatus !== "completed" && (
                              <>
                                {c.refundStatus !== "pending" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      markRefund(c.caseRef, "pending", c.baseFeeBhd)
                                    }
                                    disabled={pendingId === c.caseRef}
                                    className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white"
                                  >
                                    Mark pending
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    markRefund(c.caseRef, "completed", c.baseFeeBhd)
                                  }
                                  disabled={pendingId === c.caseRef}
                                  className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white"
                                >
                                  Mark completed
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    markRefund(c.caseRef, "failed", c.baseFeeBhd)
                                  }
                                  disabled={pendingId === c.caseRef}
                                  className="rounded-md border border-[#D32F2F] px-2 py-0.5 text-[10px] font-bold text-[#D32F2F]"
                                >
                                  Mark failed
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {c.refundMarkedAtIso && (
                          <div className="mt-1 text-[10px] text-orange-700">
                            Marked by{" "}
                            <span className="font-bold">
                              {c.refundMarkedBy ?? "—"}
                            </span>{" "}
                            ·{" "}
                            {new Date(c.refundMarkedAtIso).toLocaleString(
                              "en-GB",
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Internal notes log — handoff context for other ops. */}
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-blue-800">
                      <span>Internal notes · {c.internalNotes.length}</span>
                      <button
                        type="button"
                        onClick={() => addNote(c.caseRef)}
                        disabled={pendingId === c.caseRef}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white disabled:opacity-50"
                      >
                        + Add
                      </button>
                    </div>
                    {c.internalNotes.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {c.internalNotes.slice(-5).map((n) => (
                          <li
                            key={n.id}
                            className="rounded bg-white border border-blue-100 px-2 py-1.5 text-[11px] text-text-primary leading-snug"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-bold text-blue-700">
                                {n.actor}
                              </span>
                              <span className="text-[10px] text-text-muted flex items-center gap-1">
                                {new Date(n.ts).toLocaleString("en-GB", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                                <button
                                  type="button"
                                  onClick={() => removeNote(c.caseRef, n.id)}
                                  className="text-[#D32F2F] font-bold"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </span>
                            </div>
                            <div className="mt-0.5 whitespace-pre-wrap">
                              {n.body}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {c.ratingStars && (
                    <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-2">
                      <div className="flex items-center gap-1 text-[12px] font-semibold text-yellow-800">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={
                              i < (c.ratingStars ?? 0)
                                ? "fill-yellow-400 text-yellow-500"
                                : "text-gray-300"
                            }
                          />
                        ))}
                        <span className="ms-2">{c.ratingStars} / 5</span>
                      </div>
                      {c.ratingComment && (
                        <div className="mt-1 text-[11px] text-yellow-900">
                          &quot;{c.ratingComment}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {c.consentId && (
                      <a
                        href={`/api/sos/agreement/${encodeURIComponent(c.caseRef)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-text-primary"
                      >
                        Signed PDF
                      </a>
                    )}
                    <a
                      href={`/api/sos/dispatch/${encodeURIComponent(c.caseRef)}/case-file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-text-primary"
                    >
                      Case file
                    </a>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white"
                    >
                      WhatsApp
                    </a>
                    {c.serviceStatus === "pending" && (
                      <button
                        type="button"
                        onClick={() => loadSuggestions(c.caseRef)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#1A237E] px-2.5 py-1.5 text-[11px] font-bold text-[#1A237E]"
                      >
                        <Users size={12} />
                        Find Advocates
                      </button>
                    )}
                    {c.paymentStatus !== "success" && (
                      <button
                        type="button"
                        onClick={() => createCharge(c.caseRef)}
                        disabled={pendingId === c.caseRef}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                      >
                        <CreditCard size={12} />
                        Charge Client
                      </button>
                    )}
                    {next && (
                      <button
                        type="button"
                        onClick={() => transition(c.caseRef, next.action)}
                        disabled={pendingId === c.caseRef}
                        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-bold ${next.cls} disabled:opacity-60`}
                      >
                        {pendingId === c.caseRef ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        {next.label}
                      </button>
                    )}
                    {c.serviceStatus !== "completed" &&
                      c.serviceStatus !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => transition(c.caseRef, "cancel")}
                          disabled={pendingId === c.caseRef}
                          className="inline-flex items-center gap-1 rounded-md border border-[#D32F2F] px-2.5 py-1.5 text-[11px] font-bold text-[#D32F2F]"
                        >
                          <XCircle size={12} />
                          Cancel
                        </button>
                      )}
                  </div>

                  {/* Tap charge link + QR surfaced after Charge Client */}
                  {chargeLinkByCase[c.caseRef] && (
                    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                      <div className="flex items-center gap-2 text-[11px]">
                        <CreditCard size={12} className="text-amber-700" />
                        <span
                          className="font-mono truncate flex-1 text-amber-900"
                          dir="ltr"
                        >
                          {chargeLinkByCase[c.caseRef]}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyChargeLink(c.caseRef)}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-[10px] font-bold text-white"
                        >
                          {copiedCase === c.caseRef ? (
                            <CheckCheck size={10} />
                          ) : (
                            <Copy size={10} />
                          )}
                          {copiedCase === c.caseRef ? "Copied" : "Copy"}
                        </button>
                      </div>
                      {chargeQrByCase[c.caseRef] && (
                        <div className="mt-3 flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={chargeQrByCase[c.caseRef]}
                            alt="Tap checkout QR"
                            className="h-32 w-32 rounded-md bg-white p-1 ring-1 ring-amber-300"
                          />
                          <div className="text-[11px] text-amber-900 leading-snug">
                            <div className="font-bold uppercase tracking-wide text-amber-700">
                              Scan to pay
                            </div>
                            <div className="mt-1">
                              Show this QR to the client. They scan with their
                              phone camera and complete payment via Tap
                              (BenefitPay, KNET, card).
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Geo-matched advocates */}
                  {suggestionsForCase[c.caseRef] !== undefined && (
                    <div className="mt-3 rounded-lg border border-[#1A237E]/20 bg-[#1A237E]/[0.04] p-3">
                      <div className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#1A237E]">
                        <Users size={12} />
                        Nearest emergency-ready advocates
                      </div>
                      {suggestionsForCase[c.caseRef] === null ? (
                        <div className="flex items-center gap-2 text-[12px] text-text-muted">
                          <Loader2 size={12} className="animate-spin" />
                          Searching…
                        </div>
                      ) : suggestionsForCase[c.caseRef]!.length === 0 ? (
                        <div className="text-[12px] text-text-muted">
                          No emergency-ready advocates within range. Onboard
                          one at /sos/lawyer/join then flip
                          is_emergency_ready=true.
                        </div>
                      ) : (
                        <ul className="space-y-1.5">
                          {suggestionsForCase[c.caseRef]!.map((a) => (
                            <li
                              key={a.id}
                              className="flex items-center gap-3 rounded-md bg-white border border-gray-200 p-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-bold text-text-primary truncate">
                                  {a.fullName}
                                  <span className="ms-2 text-[10px] font-normal text-text-muted font-mono">
                                    #{a.registrationNo}
                                  </span>
                                </div>
                                <div className="text-[11px] text-text-muted" dir="ltr">
                                  {a.phone} · {a.distanceKm} km
                                  {a.rateBhd != null && (
                                    <> · {a.rateBhd} BHD</>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => assignAdvocate(c.caseRef, a.id)}
                                disabled={pendingId === c.caseRef}
                                className="inline-flex items-center gap-1 rounded-md bg-[#1A237E] px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                              >
                                Assign
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Awaiting dispatch", cls: "bg-amber-100 text-amber-800" },
    mobilizing: { label: "Mobilizing", cls: "bg-blue-100 text-blue-800" },
    arrived: { label: "On site", cls: "bg-purple-100 text-purple-800" },
    completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-800" },
    cancelled: { label: "Cancelled", cls: "bg-gray-200 text-gray-700" },
    disputed: { label: "Disputed", cls: "bg-red-100 text-red-800" },
  };
  const m = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function PaymentPill({ status }: { status: string }) {
  if (status === "pending") return null;
  const cls =
    status === "success"
      ? "bg-emerald-100 text-emerald-800"
      : status === "refunded"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      Pay: {status}
    </span>
  );
}

function RefundPill({
  status,
}: {
  status: "none" | "pending" | "completed" | "failed";
}) {
  if (status === "none") return null;
  const map: Record<"pending" | "completed" | "failed", string> = {
    pending: "bg-amber-200 text-amber-900",
    completed: "bg-emerald-200 text-emerald-900",
    failed: "bg-red-200 text-red-900",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${map[status]}`}
    >
      {status}
    </span>
  );
}
