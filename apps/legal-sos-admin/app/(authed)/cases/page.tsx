"use client";

import { useEffect, useMemo, useState } from "react";
import { I } from "@/components/admin/Icons";
import { StatusPill, Avatar } from "@/components/admin/Primitives";
import { useAdmin } from "@/components/admin/AdminProvider";
import { CASES, fmtAgo, type MockCase } from "@/lib/mockData";

type Filter = "all" | "live" | "completed" | "disputed" | "refunded";

export default function CasesPage() {
  const { openCase } = useAdmin();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [kbFocus, setKbFocus] = useState(0);

  const filters: { id: Filter; lbl: string; ct: number }[] = [
    { id: "all", lbl: "All", ct: CASES.length },
    {
      id: "live",
      lbl: "Live & mobilizing",
      ct: CASES.filter((c) => c.status === "live" || c.status === "mobilizing").length,
    },
    {
      id: "completed",
      lbl: "Completed",
      ct: CASES.filter((c) => c.status === "completed").length,
    },
    {
      id: "disputed",
      lbl: "Disputed",
      ct: CASES.filter((c) => c.status === "disputed").length,
    },
    {
      id: "refunded",
      lbl: "Refunded",
      ct: CASES.filter((c) => c.status === "refunded").length,
    },
  ];

  const filtered = useMemo<MockCase[]>(
    () =>
      CASES.filter((c) => {
        if (filter === "live" && !(c.status === "live" || c.status === "mobilizing")) {
          return false;
        }
        if (filter !== "all" && filter !== "live" && c.status !== filter) return false;
        if (
          q &&
          !`${c.ref} ${c.client} ${c.phone} ${c.lawyer} ${c.type}`
            .toLowerCase()
            .includes(q.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [filter, q],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.key === "j") setKbFocus((f) => Math.min(f + 1, filtered.length - 1));
      if (e.key === "k") setKbFocus((f) => Math.max(f - 1, 0));
      if (e.key === "Enter" && filtered[kbFocus]) openCase(filtered[kbFocus]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, kbFocus, openCase]);

  return (
    <>
      <div className="page-head">
        <div className="l">
          <h1>Cases</h1>
          <div className="sub">
            {filtered.length} of {CASES.length} cases · J/K to navigate · Enter to peek
          </div>
        </div>
        <div className="r">
          <button type="button" className="btn ghost">
            <I.download className="sz-12" /> Export selected
          </button>
          <button type="button" className="btn ghost">
            <I.alert className="sz-12" /> Mark disputed
          </button>
          <button type="button" className="btn primary">
            <I.plus className="sz-12" /> New case
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search"
          placeholder="Search ref · client · phone · lawyer…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="divider-v" />
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`filter-pill ${filter === f.id ? "on" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.lbl} <span className="ct">{f.ct}</span>
          </button>
        ))}
        <div className="divider-v" />
        <button type="button" className="filter-pill">
          <I.filter width="12" height="12" /> More
        </button>
      </div>

      <div className="card">
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: "var(--gold)" }}
                  />
                </th>
                <th>Status</th>
                <th>Reference</th>
                <th>Client</th>
                <th>Case type</th>
                <th>Lawyer</th>
                <th>Opened</th>
                <th>Lang</th>
                <th style={{ textAlign: "right" }}>Fee</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.ref}
                  className={`${
                    c.status === "mobilizing" && c.urgent
                      ? "urgent"
                      : c.status === "live" || c.status === "mobilizing"
                        ? "live"
                        : ""
                  } ${i === kbFocus ? "kb-focus" : ""}`}
                  onClick={() => {
                    setKbFocus(i);
                    openCase(c);
                  }}
                >
                  <td>
                    <input
                      type="checkbox"
                      onClick={(e) => e.stopPropagation()}
                      style={{ accentColor: "var(--gold)" }}
                    />
                  </td>
                  <td>
                    <StatusPill status={c.status} />
                  </td>
                  <td className="ref">{c.ref}</td>
                  <td>
                    <div style={{ fontSize: 13 }}>{c.client}</div>
                    <div className="subtle mono">{c.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{c.type}</div>
                    <div className="subtle">{c.location}</div>
                  </td>
                  <td>
                    {c.lawyer === "—" ? (
                      <span className="subtle">—</span>
                    ) : (
                      <div className="flex gap-8">
                        <Avatar init={c.lawyerInit} size="sm" />
                        <span style={{ fontSize: 12.5 }}>{c.lawyer}</span>
                      </div>
                    )}
                  </td>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {fmtAgo(c.openedMin)}
                  </td>
                  <td>
                    <span className="tag">{c.lang}</span>
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    BHD {c.fee}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
