"use client";

import type { ReactNode, CSSProperties } from "react";
import type { CaseStatus, PaymentStatus } from "@/lib/mockData";

// ───── Status pill ──────────────────────────────────────────────────

type StatusKey = CaseStatus | PaymentStatus | "oncall" | "offcall" | string;

const STATUS_MAP: Record<string, { cls: string; lbl: string }> = {
  pending: { cls: "warn", lbl: "Pending" },
  mobilizing: { cls: "urgent", lbl: "Mobilizing" },
  live: { cls: "live", lbl: "Live" },
  arrived: { cls: "live", lbl: "Arrived" },
  completed: { cls: "muted", lbl: "Completed" },
  cancelled: { cls: "muted", lbl: "Cancelled" },
  disputed: { cls: "warn", lbl: "Disputed" },
  refunded: { cls: "violet", lbl: "Refunded" },
  failed: { cls: "urgent", lbl: "Failed" },
  success: { cls: "live", lbl: "Success" },
  draft: { cls: "outline", lbl: "Draft" },
  oncall: { cls: "live", lbl: "On-call" },
  offcall: { cls: "muted", lbl: "Off-call" },
};

export function StatusPill({
  status,
  dot = true,
  label,
}: {
  status: StatusKey;
  dot?: boolean;
  label?: string;
}) {
  const s = STATUS_MAP[status] ?? { cls: "muted", lbl: status };
  return (
    <span className={`pill ${s.cls}`}>
      {dot && <span className="d" />}
      {label ?? s.lbl}
    </span>
  );
}

// ───── Live dot ─────────────────────────────────────────────────────

export function LiveDot({
  color = "green",
}: {
  color?: "green" | "red" | "gold";
}) {
  const colorMap = {
    green: "var(--green)",
    red: "var(--sos)",
    gold: "var(--gold-2)",
  };
  const ringMap = {
    green: "rgba(34,197,94,0.22)",
    red: "rgba(211,47,47,0.22)",
    gold: "rgba(212,168,90,0.22)",
  };
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: colorMap[color],
        boxShadow: `0 0 0 3px ${ringMap[color]}`,
        animation: "pulse 2s infinite",
        display: "inline-block",
      }}
    />
  );
}

// ───── Sparkline ────────────────────────────────────────────────────

export function Sparkline({
  data,
  w = 90,
  h = 28,
  color = "var(--gold-2)",
  showLast = false,
}: {
  data: number[] | undefined;
  w?: number;
  h?: number;
  color?: string;
  showLast?: boolean;
}) {
  if (!data || !data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map(
    (v, i) =>
      [i * step, h - ((v - min) / range) * (h - 4) - 2] as [number, number],
  );
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const fill = `${line} L${w} ${h} L0 ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path className="fill" d={fill} fill={color} />
      <path className="line" d={line} stroke={color} />
      {showLast && last && <circle cx={last[0]} cy={last[1]} r="2" fill={color} />}
    </svg>
  );
}

// ───── KPI card ─────────────────────────────────────────────────────

export function Kpi({
  label,
  value,
  unit,
  delta,
  deltaDir,
  spark,
  sparkColor,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
  sparkColor?: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-l">{label}</div>
      <div className="kpi-v">
        {unit === "BHD" && <span className="cur">BHD</span>}
        {value}
        {unit && unit !== "BHD" && (
          <span className="cur" style={{ marginLeft: 4 }}>
            {unit}
          </span>
        )}
      </div>
      {delta && (
        <div className={`kpi-d ${deltaDir ?? ""}`}>
          {deltaDir === "up" ? "▲" : deltaDir === "down" ? "▼" : "·"} {delta}
        </div>
      )}
      {spark && (
        <div className="kpi-spark">
          <Sparkline data={spark} w={70} h={26} color={sparkColor ?? "var(--gold-2)"} />
        </div>
      )}
    </div>
  );
}

// ───── Card shell ───────────────────────────────────────────────────

export function Card({
  title,
  sub,
  action,
  tabs,
  padded,
  children,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  tabs?: ReactNode;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="card">
      {(title || action || tabs) && (
        <div className="card-head">
          <div>
            <h3>
              {title}
              {sub && <span className="sub" style={{ marginLeft: 8 }}>{sub}</span>}
            </h3>
          </div>
          <div className="flex gap-8">
            {tabs}
            {action}
          </div>
        </div>
      )}
      <div className={padded ? "card-body" : ""} style={padded ? { padding: 16 } : {}}>
        {children}
      </div>
    </div>
  );
}

// ───── Bahrain map (stylized SVG) ──────────────────────────────────

export interface MapPin {
  x: number;
  y: number;
  kind?: "" | "urgent" | "live";
}

export function BahrainMap({ pins = [] }: { pins?: MapPin[] }) {
  return (
    <div className="map-wrap">
      <div className="map-grid" />
      <svg
        className="map-svg"
        viewBox="0 0 100 70"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c2c4f" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#172541" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* Bahrain main island — stylized */}
        <path
          d="M48 12 Q56 14 60 22 Q63 30 60 38 Q58 46 56 52 Q54 60 48 62 Q43 60 40 54 Q37 46 38 38 Q39 28 42 20 Q44 14 48 12 Z"
          fill="url(#landGrad)"
          stroke="#22325a"
          strokeWidth="0.4"
        />
        {/* Muharraq */}
        <path
          d="M62 18 Q70 18 72 24 Q72 30 68 32 Q63 32 61 28 Q60 22 62 18 Z"
          fill="url(#landGrad)"
          stroke="#22325a"
          strokeWidth="0.4"
        />
        {/* Sitra */}
        <path
          d="M54 60 Q60 60 62 66 Q60 70 54 68 Q52 64 54 60 Z"
          fill="url(#landGrad)"
          stroke="#22325a"
          strokeWidth="0.4"
        />
        {/* Hawar (small) */}
        <ellipse cx="82" cy="58" rx="3" ry="6" fill="url(#landGrad)" stroke="#22325a" strokeWidth="0.4" />
        {/* labels */}
        <text x="48" y="32" fontSize="2.2" fill="#6b7b97" textAnchor="middle" fontFamily="Geist">Manama</text>
        <text x="66" y="26" fontSize="1.8" fill="#6b7b97" textAnchor="middle" fontFamily="Geist">Muharraq</text>
        <text x="46" y="50" fontSize="1.8" fill="#6b7b97" textAnchor="middle" fontFamily="Geist">Riffa</text>
        <text x="58" y="67" fontSize="1.6" fill="#6b7b97" textAnchor="middle" fontFamily="Geist">Sitra</text>
      </svg>
      {pins.map((p, i) => (
        <div
          key={i}
          className={`map-pin ${p.kind ?? ""}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <div className="d" />
        </div>
      ))}
      <div className="map-overlay">
        <span className="l">Live cases on map</span>
        <span className="v">{pins.length}</span>
      </div>
      <div className="map-legend">
        <span className="lg">
          <span className="d" style={{ background: "var(--sos)" }} />
          Urgent
        </span>
        <span className="lg">
          <span className="d" style={{ background: "var(--gold-2)" }} />
          Mobilizing
        </span>
        <span className="lg">
          <span className="d" style={{ background: "var(--green)" }} />
          Live
        </span>
      </div>
    </div>
  );
}

// ───── Histogram ────────────────────────────────────────────────────

export function Histogram({
  data,
  max,
  qThreshold = 6,
}: {
  data: number[];
  max?: number;
  qThreshold?: number;
}) {
  const m = max ?? Math.max(...data);
  return (
    <div className="histo">
      {data.map((v, i) => (
        <div
          key={i}
          className={`bar ${i < qThreshold ? "q" : ""}`}
          style={{
            height: `${(v / m) * 100}%`,
            opacity: 0.6 + (v / m) * 0.4,
          }}
          title={`${i}–${i + 1}m: ${v} cases`}
        />
      ))}
    </div>
  );
}

// ───── Toggle ───────────────────────────────────────────────────────

export function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`toggle ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    />
  );
}

// ───── Avatar (small helper) ────────────────────────────────────────

export function Avatar({
  init,
  size = "default",
  style,
}: {
  init: string;
  size?: "sm" | "default" | "lg";
  style?: CSSProperties;
}) {
  const cls =
    size === "sm" ? "avatar sm" : size === "lg" ? "avatar lg" : "avatar";
  return (
    <div className={cls} style={style}>
      {init}
    </div>
  );
}
