"use client";

import { I } from "@/components/admin/Icons";
import {
  Kpi,
  Card,
  StatusPill,
  BahrainMap,
  Histogram,
  Avatar,
  type MapPin,
} from "@/components/admin/Primitives";
import { useAdmin } from "@/components/admin/AdminProvider";
import {
  CASES,
  FEED,
  HISTO_DATA,
  KPI_24H,
  fmtBHD,
} from "@/lib/mockData";

export default function DashboardPage() {
  const { openCase } = useAdmin();
  const activeCases = CASES.filter(
    (c) => c.status === "mobilizing" || c.status === "live",
  );
  const mapPins: MapPin[] = CASES.filter((c) => c.mapX !== undefined)
    .slice(0, 6)
    .map((c) => ({
      x: c.mapX!,
      y: c.mapY!,
      kind:
        c.status === "mobilizing" && c.urgent
          ? "urgent"
          : c.status === "live"
            ? "live"
            : "",
    }));

  return (
    <>
      <div className="page-head">
        <div className="l">
          <h1>
            Dispatch overview{" "}
            <span className="pill live" style={{ fontSize: 11 }}>
              <span className="d" />
              LIVE
            </span>
          </h1>
          <div className="sub mono">
            May 27, 2026 · 09:42 AST · {KPI_24H.lawyersOnline} advocates on-call
          </div>
        </div>
        <div className="r">
          <button type="button" className="btn ghost">
            <I.download className="sz-12" /> Export 24h
          </button>
          <button type="button" className="btn primary">
            <I.plus className="sz-12" /> New case
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          label="Cases · 24h"
          value={KPI_24H.cases}
          delta="+18% vs yesterday"
          deltaDir="up"
          spark={[28, 32, 30, 35, 38, 33, 36, 40, 44, 41, 39, 43, 47]}
        />
        <Kpi
          label="Active now"
          value={KPI_24H.active}
          delta="2 urgent · 2 live"
          sparkColor="var(--sos)"
          spark={[3, 5, 4, 6, 5, 4, 3, 4, 5, 6, 7, 5, 4]}
        />
        <Kpi
          label="On-call lawyers"
          value={KPI_24H.lawyersOnline}
          unit="/ 8"
          delta="75% of roster"
          sparkColor="var(--green)"
          spark={[5, 6, 6, 5, 7, 6, 8, 7, 6, 7, 8, 7, 6]}
        />
        <Kpi
          label="Revenue · 24h"
          value={fmtBHD(KPI_24H.revenue)}
          unit="BHD"
          delta="+12% vs yesterday"
          deltaDir="up"
          spark={[2200, 2800, 2400, 3100, 2900, 3400, 3200, 3600, 3800, 3500, 3900, 4100, 4385]}
        />
      </div>

      {/* row 1: active cases + map */}
      <div className="row" style={{ marginBottom: 14 }}>
        <Card
          title="Active cases"
          sub={`${activeCases.length} live · sorted by urgency`}
          action={
            <>
              <span className="kbd">J</span>
              <span className="kbd">K</span>
              <span style={{ fontSize: 11, color: "var(--subtle)" }}>
                to navigate
              </span>
            </>
          }
        >
          <table className="tbl">
            <thead>
              <tr>
                <th>Status</th>
                <th>Reference</th>
                <th>Type</th>
                <th>Lawyer · ETA</th>
                <th>Opened</th>
                <th style={{ textAlign: "right" }}>Fee</th>
              </tr>
            </thead>
            <tbody>
              {activeCases.map((c) => (
                <tr
                  key={c.ref}
                  className={
                    c.status === "mobilizing" && c.urgent ? "urgent" : "live"
                  }
                  onClick={() => openCase(c)}
                >
                  <td>
                    <StatusPill status={c.status} />
                  </td>
                  <td className="ref">{c.ref}</td>
                  <td>
                    <div style={{ fontSize: 13 }}>{c.typeShort}</div>
                    <div className="subtle">{c.location}</div>
                  </td>
                  <td>
                    <div className="flex gap-8">
                      <Avatar init={c.lawyerInit} size="sm" />
                      <div>
                        <div style={{ fontSize: 12.5 }}>{c.lawyer}</div>
                        <div className="subtle mono">
                          {c.etaMin > 0 ? `ETA ~${c.etaMin}m` : "Connected"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {c.openedMin}m ago
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    BHD {c.fee}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="col">
          <Card title="Live map" sub="Bahrain">
            <BahrainMap pins={mapPins} />
          </Card>
        </div>
      </div>

      {/* row 2: SLA + feed */}
      <div className="row">
        <Card
          title="SLA health · 24h"
          sub="Connect time distribution"
          tabs={
            <div className="tabs">
              <span className="tab on">24h</span>
              <span className="tab">7d</span>
              <span className="tab">30d</span>
            </div>
          }
        >
          <Histogram data={HISTO_DATA} qThreshold={3} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
              borderTop: "1px solid var(--divider)",
            }}
          >
            <SlaStat label="Avg connect" value="2:14" sub="target 3:00" good />
            <SlaStat
              label="3-min SLA hit"
              value="86%"
              sub="135 / 157 cases"
              good
            />
            <SlaStat
              label="Refund rate"
              value="2.1%"
              sub="below 5m timeout"
            />
            <SlaStat label="Avg rating" value="4.81" sub="of 5.0 · 142 reviews" />
          </div>
        </Card>

        <Card title="Recent activity" sub="System events">
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {FEED.map((f, i) => (
              <div key={i} className="feed-item">
                <div className={`feed-icon ${f.ic}`}>
                  <FeedIcon kind={f.ic} />
                </div>
                <div>
                  <div className="t">
                    {f.t.map((part, j) =>
                      typeof part === "string" ? (
                        <span key={j}>{part}</span>
                      ) : (
                        <span key={j} className="ref">
                          {part.ref}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="ago">{f.ago} ago</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function FeedIcon({ kind }: { kind: "red" | "green" | "gold" | "amber" }) {
  if (kind === "red" || kind === "amber")
    return <I.alert width="13" height="13" />;
  if (kind === "green") return <I.check width="13" height="13" />;
  return <I.ring width="11" height="11" />;
}

function SlaStat({
  label,
  value,
  sub,
  good,
}: {
  label: string;
  value: string;
  sub: string;
  good?: boolean;
}) {
  return (
    <div style={{ padding: "14px 16px", borderRight: "1px solid var(--divider)" }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--subtle)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 20,
          fontWeight: 500,
          marginTop: 4,
          color: good ? "var(--green)" : "var(--text)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}
