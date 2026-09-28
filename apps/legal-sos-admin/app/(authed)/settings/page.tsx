"use client";

import { useState, type ReactNode } from "react";
import { I } from "@/components/admin/Icons";
import { StatusPill, Toggle, Avatar } from "@/components/admin/Primitives";

type Tab =
  | "brand"
  | "contact"
  | "slas"
  | "pricing"
  | "countries"
  | "integrations"
  | "team";

const TABS: { id: Tab; lbl: string }[] = [
  { id: "brand", lbl: "Brand" },
  { id: "contact", lbl: "Contact" },
  { id: "slas", lbl: "SLAs" },
  { id: "pricing", lbl: "Pricing" },
  { id: "countries", lbl: "Country roster" },
  { id: "integrations", lbl: "Integrations" },
  { id: "team", lbl: "Team & permissions" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("slas");

  return (
    <>
      <div className="page-head">
        <div className="l">
          <h1>Settings</h1>
          <div className="sub">
            Workspace configuration · changes apply across all dispatcher seats
          </div>
        </div>
        <div className="r">
          <button type="button" className="btn primary">
            <I.check className="sz-12" /> Save changes
          </button>
        </div>
      </div>

      <div className="tabs-row">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-btn ${tab === t.id ? "on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.lbl}
          </button>
        ))}
      </div>

      {tab === "slas" && <SettingsSLA />}
      {tab === "pricing" && <SettingsPricing />}
      {tab === "countries" && <SettingsCountries />}
      {tab === "team" && <SettingsTeam />}
      {tab === "brand" && <SettingsGeneric title="Brand identity" />}
      {tab === "contact" && <SettingsGeneric title="Contact channels" />}
      {tab === "integrations" && <SettingsGeneric title="Integrations" />}
    </>
  );
}

function FormRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-row">
      <div className="l">
        {label}
        {desc && <div className="d">{desc}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SettingsSLA() {
  const [autoRefund, setAutoRefund] = useState(true);
  const [reroute, setReroute] = useState(true);
  return (
    <div className="card">
      <div style={{ padding: "8px 24px" }}>
        <FormRow
          label="Connect target"
          desc="Time from case creation to lawyer acceptance."
        >
          <input
            className="input"
            defaultValue="3 minutes"
            style={{ maxWidth: 200 }}
          />
        </FormRow>
        <FormRow
          label="Auto-refund timeout"
          desc="If no lawyer connects within this window, refund the client and notify ops."
        >
          <div className="flex gap-12">
            <input
              className="input"
              defaultValue="5 minutes"
              style={{ maxWidth: 200 }}
            />
            <Toggle on={autoRefund} onChange={setAutoRefund} />
            <span className="muted" style={{ fontSize: 12.5 }}>
              {autoRefund ? "Enabled" : "Disabled"}
            </span>
          </div>
        </FormRow>
        <FormRow
          label="Auto-reroute"
          desc="If a lawyer declines or doesn't respond in 45s, automatically re-dispatch to the next nearest available."
        >
          <Toggle on={reroute} onChange={setReroute} />
        </FormRow>
        <FormRow label="ETA mode" desc="In-person dispatch ETA calculation.">
          <select
            className="select"
            style={{ maxWidth: 240 }}
            defaultValue="traffic"
          >
            <option value="straight">Straight-line · radius</option>
            <option value="traffic">Live traffic (Google Maps API)</option>
            <option value="manual">Lawyer-confirmed</option>
          </select>
        </FormRow>
        <FormRow
          label="On-call shift length"
          desc="Maximum continuous on-call hours before forced break."
        >
          <input
            className="input"
            defaultValue="8 hours"
            style={{ maxWidth: 200 }}
          />
        </FormRow>
      </div>
    </div>
  );
}

function SettingsPricing() {
  const rows = [
    { case: "Emergency Consultation", price: 25, take: "20%", payout: 20 },
    { case: "Arrest, Detention & Investigations", price: 150, take: "20%", payout: 120 },
    { case: "Search & Seizure", price: 200, take: "20%", payout: 160 },
    { case: "Travel Ban / Precautionary Attachment", price: 300, take: "20%", payout: 240 },
    { case: "Urgent Evidence Preservation", price: 400, take: "20%", payout: 320 },
    { case: "Urgent Criminal Report", price: 150, take: "20%", payout: 120 },
  ];
  return (
    <div className="card">
      <table className="tbl">
        <thead>
          <tr>
            <th>Case type</th>
            <th>Client price</th>
            <th>Platform take</th>
            <th>Lawyer payout</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.case}>
              <td>{r.case}</td>
              <td className="num">BHD {r.price}</td>
              <td className="mono muted">{r.take}</td>
              <td className="num" style={{ color: "var(--gold-2)" }}>
                BHD {r.payout}
              </td>
              <td>
                <StatusPill status="live" label="Active" />
              </td>
              <td>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsCountries() {
  const rows = [
    { flag: "🇧🇭", name: "Bahrain", code: "BH", status: "live" as const, lawyers: 8, since: "Jan 2026" },
    { flag: "🇦🇪", name: "United Arab Emirates", code: "AE", status: "draft" as const, lawyers: 0, since: "—" },
    { flag: "🇸🇦", name: "Saudi Arabia", code: "SA", status: "draft" as const, lawyers: 0, since: "—" },
    { flag: "🇰🇼", name: "Kuwait", code: "KW", status: "draft" as const, lawyers: 0, since: "—" },
    { flag: "🇶🇦", name: "Qatar", code: "QA", status: "draft" as const, lawyers: 0, since: "—" },
    { flag: "🇴🇲", name: "Oman", code: "OM", status: "draft" as const, lawyers: 0, since: "—" },
  ];
  return (
    <div className="card">
      <table className="tbl">
        <thead>
          <tr>
            <th>Country</th>
            <th>ISO</th>
            <th>Status</th>
            <th>Roster</th>
            <th>Live since</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.code}>
              <td>
                <span style={{ fontSize: 18, marginRight: 10 }}>{c.flag}</span>
                {c.name}
              </td>
              <td className="mono muted">{c.code}</td>
              <td>
                <StatusPill
                  status={c.status}
                  label={c.status === "live" ? "Live" : "Draft"}
                />
              </td>
              <td className="num">{c.lawyers}</td>
              <td className="mono muted">{c.since}</td>
              <td>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                >
                  {c.status === "live" ? "Manage" : "Onboard"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTeam() {
  const team = [
    { name: "Ops · Lead", email: "ops@gicc.bh", role: "Owner", last: "now" },
    { name: "Noor Z.", email: "noor@gicc.bh", role: "Dispatcher", last: "12m ago" },
    { name: "Hamad K.", email: "hamad@gicc.bh", role: "Dispatcher", last: "1h ago" },
    { name: "Finance · Maya", email: "finance@gicc.bh", role: "Finance", last: "3h ago" },
    { name: "Legal · Counsel", email: "legal@gicc.bh", role: "Read-only", last: "1d ago" },
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div className="muted" style={{ fontSize: 13 }}>
          5 of 8 seats used · Pro plan
        </div>
        <button type="button" className="btn primary">
          <I.plus className="sz-12" /> Invite teammate
        </button>
      </div>
      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Last active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.email}>
                <td>
                  <div className="flex gap-8">
                    <Avatar init={m.name[0]!} size="sm" />
                    <span>{m.name}</span>
                  </div>
                </td>
                <td className="mono muted" style={{ fontSize: 12.5 }}>
                  {m.email}
                </td>
                <td>
                  <StatusPill
                    status={m.role === "Owner" ? "live" : "muted"}
                    label={m.role}
                  />
                </td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {m.last}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: "5px 10px", fontSize: 12 }}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SettingsGeneric({ title }: { title: string }) {
  return (
    <div
      className="card"
      style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}
    >
      <div style={{ fontSize: 14 }}>{title} settings · placeholder section</div>
      <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 6 }}>
        Form fields render here following the same FormRow pattern.
      </div>
    </div>
  );
}
