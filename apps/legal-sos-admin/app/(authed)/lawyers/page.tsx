"use client";

import { useState } from "react";
import { I } from "@/components/admin/Icons";
import {
  StatusPill,
  Sparkline,
  Avatar,
} from "@/components/admin/Primitives";
import { useAdmin } from "@/components/admin/AdminProvider";
import { LAWYERS, SPARKS, fmtBHD } from "@/lib/mockData";

type Filter = "all" | "available" | "top";

export default function LawyersPage() {
  const { openLawyer } = useAdmin();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const filtered = LAWYERS.filter((l) => {
    if (filter === "available" && !l.ready) return false;
    if (filter === "top" && l.rating < 4.85) return false;
    if (
      q &&
      !`${l.name} ${l.bar} ${l.langs.join(" ")}`
        .toLowerCase()
        .includes(q.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <>
      <div className="page-head">
        <div className="l">
          <h1>Lawyer roster</h1>
          <div className="sub">
            {LAWYERS.filter((l) => l.ready).length} on-call · {LAWYERS.length}{" "}
            total · Avg rating 4.82
          </div>
        </div>
        <div className="r">
          <button type="button" className="btn ghost">
            <I.download className="sz-12" /> Export roster
          </button>
          <button type="button" className="btn primary">
            <I.plus className="sz-12" /> Add lawyer
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search"
          placeholder="Search lawyer · bar number · language…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="divider-v" />
        <button
          type="button"
          className={`filter-pill ${filter === "all" ? "on" : ""}`}
          onClick={() => setFilter("all")}
        >
          All <span className="ct">{LAWYERS.length}</span>
        </button>
        <button
          type="button"
          className={`filter-pill ${filter === "available" ? "on" : ""}`}
          onClick={() => setFilter("available")}
        >
          Available now{" "}
          <span className="ct">{LAWYERS.filter((l) => l.ready).length}</span>
        </button>
        <button
          type="button"
          className={`filter-pill ${filter === "top" ? "on" : ""}`}
          onClick={() => setFilter("top")}
        >
          Top rated{" "}
          <span className="ct">
            {LAWYERS.filter((l) => l.rating >= 4.85).length}
          </span>
        </button>
        <div className="divider-v" />
        <button type="button" className="filter-pill">
          Country: 🇧🇭 BH
        </button>
        <button type="button" className="filter-pill">
          Language
        </button>
      </div>

      <div className="lawyer-grid">
        {filtered.map((l) => (
          <div
            key={l.bar}
            className="lawyer-card"
            onClick={() => openLawyer(l)}
          >
            <div className="head">
              <Avatar init={l.init} size="lg" />
              <div style={{ flex: 1 }}>
                <div className="name">{l.name}</div>
                <div className="bar">
                  Bar {l.bar} · {l.yrs} yrs
                </div>
              </div>
              <StatusPill status={l.ready ? "oncall" : "offcall"} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div className="langs">
                <span className="tag">{l.country}</span>
                {l.langs.map((lang) => (
                  <span key={lang} className="tag">
                    {lang}
                  </span>
                ))}
              </div>
              <div
                className="subtle mono"
                style={{ fontSize: 11.5 }}
              >
                <I.pin
                  width="10"
                  height="10"
                  style={{ marginRight: 4, verticalAlign: -1 }}
                />
                {l.radius}
              </div>
            </div>
            <div className="stats">
              <div className="stat" style={{ flex: 1 }}>
                <span className="l">Rating</span>
                <span className="v">
                  <span className="star">★</span>
                  {l.rating.toFixed(2)}
                </span>
              </div>
              <div className="stat" style={{ flex: 1 }}>
                <span className="l">Cases</span>
                <span className="v">{l.cases}</span>
              </div>
              <div className="stat" style={{ flex: 1 }}>
                <span className="l">Balance</span>
                <span className="v" style={{ color: "var(--gold-2)" }}>
                  {fmtBHD(l.balance)}
                </span>
              </div>
              <Sparkline data={SPARKS[l.name]} w={56} h={26} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
