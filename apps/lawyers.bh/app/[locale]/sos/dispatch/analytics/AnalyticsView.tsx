"use client";

import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import {
  Siren,
  ChevronLeft,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Wallet,
  Activity,
  MapPin,
} from "lucide-react";

// Leaflet only loads in the browser — dynamic import keeps it out of
// the SSR bundle.
const SosHeatmap = dynamic(() => import("@/components/SosHeatmap"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
  ),
});

interface Kpis {
  total: number;
  completed: number;
  cancelled: number;
  revenueBhd: number;
  avgRespSec: number;
  avgArriveSec: number;
  avgCompleteSec: number;
  avgRating: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
}

interface DailyBucket {
  day: string;
  count: number;
}

interface CaseTypeBucket {
  slug: string;
  label: { en: string; ar: string };
  count: number;
}

interface TopAdvocate {
  advocateId: string;
  fullName: string;
  registrationNo: string;
  completed: number;
  total: number;
  avgRating: number;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export default function AnalyticsView({
  kpis,
  statusBreakdown,
  daily,
  byType,
  topAdvocates,
  heatmapPoints,
}: {
  kpis: Kpis;
  statusBreakdown: StatusBreakdown[];
  daily: DailyBucket[];
  byType: CaseTypeBucket[];
  topAdvocates: TopAdvocate[];
  heatmapPoints: HeatmapPoint[];
}) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const dailyMax = Math.max(1, ...daily.map((d) => d.count));
  const completionRate =
    kpis.total > 0 ? (kpis.completed / kpis.total) * 100 : 0;
  const cancellationRate =
    kpis.total > 0 ? (kpis.cancelled / kpis.total) * 100 : 0;

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
                Lawyers.bh · Dispatch
              </div>
              <h1 className="text-lg font-extrabold leading-tight truncate">
                Analytics
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-5 space-y-6">
        {/* KPI cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            icon={<TrendingUp size={14} className="text-[#1A237E]" />}
            label="Total cases"
            value={kpis.total.toString()}
          />
          <KpiCard
            icon={<CheckCircle2 size={14} className="text-emerald-600" />}
            label="Completed"
            value={kpis.completed.toString()}
            sub={`${completionRate.toFixed(0)}% of all`}
          />
          <KpiCard
            icon={<XCircle size={14} className="text-[#D32F2F]" />}
            label="Cancelled"
            value={kpis.cancelled.toString()}
            sub={`${cancellationRate.toFixed(0)}% of all`}
          />
          <KpiCard
            icon={<Wallet size={14} className="text-amber-600" />}
            label="Revenue captured"
            value={`${kpis.revenueBhd.toFixed(0)} BHD`}
            sub="payment_status = success"
          />
        </section>

        {/* Response-time stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard
            icon={<Clock size={14} className="text-[#1A237E]" />}
            label="Avg time to dispatch"
            value={fmtDuration(kpis.avgRespSec)}
            sub="request → mobilizing"
          />
          <KpiCard
            icon={<Activity size={14} className="text-purple-600" />}
            label="Avg arrival time"
            value={fmtDuration(kpis.avgArriveSec)}
            sub="mobilizing → on site"
          />
          <KpiCard
            icon={<Star size={14} className="text-yellow-500 fill-yellow-400" />}
            label="Avg rating"
            value={
              kpis.avgRating > 0
                ? `${kpis.avgRating.toFixed(2)} / 5`
                : "—"
            }
            sub="across all rated cases"
          />
        </section>

        {/* Daily chart (last 30 days) */}
        <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h2 className="text-[14px] font-extrabold text-text-primary mb-1">
            Cases per day · last 30 days
          </h2>
          <p className="text-[11px] text-text-muted mb-4">
            Hover a bar for the exact count.
          </p>
          <div className="flex items-end gap-1 h-40">
            {daily.map((d) => {
              const h = d.count === 0 ? 0 : (d.count / dailyMax) * 100;
              return (
                <div
                  key={d.day}
                  className="group relative flex-1 flex flex-col items-center"
                  title={`${d.day}: ${d.count}`}
                >
                  <div
                    className="w-full rounded-t-sm bg-[#1A237E]/80 hover:bg-[#1A237E] transition-colors"
                    style={{ height: `${h}%` }}
                  />
                  <span className="absolute -top-5 hidden group-hover:block text-[10px] font-bold text-text-primary">
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-text-muted">
            <span>{daily[0]?.day}</span>
            <span>{daily[daily.length - 1]?.day}</span>
          </div>
        </section>

        {/* Geographic heatmap */}
        <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="flex items-center gap-1.5 text-[14px] font-extrabold text-text-primary">
                <MapPin size={14} className="text-[#D32F2F]" />
                Where requests come from
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                500-metre buckets, brighter circles = more cases.
              </p>
            </div>
            <div className="text-[11px] text-text-muted">
              {heatmapPoints.length} zones ·{" "}
              {heatmapPoints.reduce((s, p) => s + p.weight, 0)} cases mapped
            </div>
          </div>
          {heatmapPoints.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-[12px] text-text-muted">
              No requests with GPS yet.
            </div>
          ) : (
            <SosHeatmap points={heatmapPoints} />
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status breakdown */}
          <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="text-[14px] font-extrabold text-text-primary mb-3">
              Status breakdown
            </h2>
            {statusBreakdown.length === 0 ? (
              <p className="text-[12px] text-text-muted">No cases yet.</p>
            ) : (
              <ul className="space-y-2">
                {statusBreakdown.map((s) => {
                  const ratio =
                    kpis.total > 0 ? (s.count / kpis.total) * 100 : 0;
                  return (
                    <li key={s.status}>
                      <div className="flex items-baseline justify-between text-[12px]">
                        <span className="font-semibold capitalize">
                          {s.status}
                        </span>
                        <span className="text-text-muted">
                          {s.count} · {ratio.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-[#1A237E]"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Cases by type */}
          <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="text-[14px] font-extrabold text-text-primary mb-3">
              Cases by type
            </h2>
            {byType.length === 0 ? (
              <p className="text-[12px] text-text-muted">No cases yet.</p>
            ) : (
              <ul className="space-y-2">
                {byType.map((b) => {
                  const ratio =
                    kpis.total > 0 ? (b.count / kpis.total) * 100 : 0;
                  return (
                    <li key={b.slug}>
                      <div className="flex items-baseline justify-between text-[12px]">
                        <span className="font-semibold">
                          {isAr ? b.label.ar : b.label.en}
                        </span>
                        <span className="text-text-muted">
                          {b.count} · {ratio.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-[#D32F2F]"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Top advocates */}
        <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h2 className="text-[14px] font-extrabold text-text-primary mb-3">
            Top advocates · by completed cases
          </h2>
          {topAdvocates.length === 0 ? (
            <p className="text-[12px] text-text-muted">
              No assigned cases yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {topAdvocates.map((a, i) => (
                <li
                  key={a.advocateId}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1A237E] text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-text-primary truncate">
                      {a.fullName}
                      <span className="ms-2 font-mono text-[10px] font-normal text-text-muted">
                        #{a.registrationNo}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-muted">
                      {a.completed} completed · {a.total} total
                      {a.avgRating > 0 && (
                        <>
                          {" · "}
                          <Star
                            size={10}
                            className="inline fill-yellow-400 text-yellow-500"
                          />{" "}
                          {a.avgRating.toFixed(1)}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold text-text-primary">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[10px] text-text-muted">{sub}</div>
      )}
    </div>
  );
}

/** Format an average duration (in seconds) as a friendly "Xm Ys" or
 *  "Xh Ym" depending on magnitude. Zero seconds → "—". */
function fmtDuration(sec: number): string {
  if (!sec || sec < 1) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) {
    const s = Math.round(sec % 60);
    return s ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}
