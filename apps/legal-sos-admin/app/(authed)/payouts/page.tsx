"use client";

import { I } from "@/components/admin/Icons";
import {
  Kpi,
  Card,
  Sparkline,
  Avatar,
} from "@/components/admin/Primitives";
import { useAdmin } from "@/components/admin/AdminProvider";
import { LAWYERS, SPARKS, fmtBHD } from "@/lib/mockData";

const AUDIT_LOG = [
  {
    who: "ops@gicc.bh",
    what: "Settled BHD 1,320 → Layla Buhindi",
    ref: "PO-9912",
    ago: "32m",
  },
  {
    who: "ops@gicc.bh",
    what: "Settled BHD 2,425 → Yusuf Al-Khalifa",
    ref: "PO-9911",
    ago: "1d",
  },
  {
    who: "system",
    what: "Auto-refund · BHD 25 → Aisha N.",
    ref: "LS-2026-08834",
    ago: "1d",
  },
  {
    who: "noor@gicc.bh",
    what: "Adjusted balance · -BHD 150 (chargeback)",
    ref: "PO-9910",
    ago: "2d",
  },
  {
    who: "ops@gicc.bh",
    what: "Settled BHD 950 → Noor Al-Mahmood",
    ref: "PO-9909",
    ago: "3d",
  },
  {
    who: "ops@gicc.bh",
    what: "Bulk-settled 4 lawyers · BHD 5,890",
    ref: "PO-9905..08",
    ago: "1w",
  },
];

export default function PayoutsPage() {
  const { pushToast } = useAdmin();
  const totalOut = LAWYERS.reduce((s, l) => s + l.balance, 0);

  function settle(name: string) {
    const l = LAWYERS.find((x) => x.name === name);
    if (!l) return;
    pushToast(`Settled BHD ${fmtBHD(l.balance)} to ${name}`);
  }

  return (
    <>
      <div className="page-head">
        <div className="l">
          <h1>Payouts &amp; settlements</h1>
          <div className="sub">
            May 2026 · {LAWYERS.filter((l) => l.balance > 0).length} lawyers
            with outstanding balance
          </div>
        </div>
        <div className="r">
          <button type="button" className="btn ghost">
            <I.download className="sz-12" /> Export ledger
          </button>
          <button type="button" className="btn primary">
            <I.check className="sz-12" /> Settle all eligible · BHD{" "}
            {fmtBHD(totalOut)}
          </button>
        </div>
      </div>

      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <Kpi
          label="Outstanding · all lawyers"
          value={fmtBHD(totalOut)}
          unit="BHD"
          delta="8 lawyers · last settle 3 days ago"
        />
        <Kpi
          label="Paid YTD"
          value="48,720"
          unit="BHD"
          delta="+22% YoY"
          deltaDir="up"
          spark={[8, 12, 14, 18, 22, 25, 28, 32, 36, 42, 45, 48]}
          sparkColor="var(--green)"
        />
        <Kpi
          label="Platform cut · YTD"
          value="9,744"
          unit="BHD"
          delta="20% take rate"
          spark={[1.8, 2.4, 2.9, 3.6, 4.4, 5.0, 5.6, 6.4, 7.2, 8.4, 9.0, 9.7]}
        />
      </div>

      <div className="filter-bar">
        <input className="search" placeholder="Search lawyer…" />
        <div className="divider-v" />
        <button type="button" className="filter-pill on">
          All <span className="ct">{LAWYERS.length}</span>
        </button>
        <button type="button" className="filter-pill">
          Aged &gt; 7d
        </button>
        <button type="button" className="filter-pill">
          Aged &gt; 30d
        </button>
        <button type="button" className="filter-pill">
          High balance
        </button>
      </div>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }} />
                <th>Lawyer</th>
                <th>Cases · 30d</th>
                <th>30-day trend</th>
                <th>Last settle</th>
                <th style={{ textAlign: "right" }}>Balance</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {LAWYERS.map((l) => {
                const spark = SPARKS[l.name] ?? [];
                const cases30 = Math.round(
                  spark.reduce((s, v) => s + (v > 50 ? 1 : 0.5), 0),
                );
                return (
                  <tr key={l.bar}>
                    <td>
                      <input
                        type="checkbox"
                        style={{ accentColor: "var(--gold)" }}
                      />
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <Avatar init={l.init} size="sm" />
                        <div>
                          <div style={{ fontSize: 13 }}>{l.name}</div>
                          <div
                            className="subtle mono"
                            style={{ fontSize: 11 }}
                          >
                            {l.bar}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{cases30}</td>
                    <td>
                      <Sparkline
                        data={spark}
                        w={120}
                        h={28}
                        color={
                          l.balance > 1500 ? "var(--gold-2)" : "var(--muted)"
                        }
                      />
                    </td>
                    <td className="mono muted" style={{ fontSize: 12 }}>
                      {l.balance > 1500
                        ? "12d ago"
                        : l.balance > 500
                          ? "6d ago"
                          : "2d ago"}
                    </td>
                    <td
                      className="num"
                      style={{
                        textAlign: "right",
                        color: l.balance > 1500 ? "var(--gold-2)" : "var(--text)",
                        fontSize: 13.5,
                      }}
                    >
                      BHD {fmtBHD(l.balance)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={() => settle(l.name)}
                      >
                        Settle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Card title="Audit log" sub="Recent settlements">
          <div>
            {AUDIT_LOG.map((a, i) => (
              <div key={i} className="feed-item">
                <div className="feed-icon">
                  <I.check width="13" height="13" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="t">{a.what}</div>
                  <div className="ago">
                    <span className="ref">{a.ref}</span> · {a.who} · {a.ago} ago
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
