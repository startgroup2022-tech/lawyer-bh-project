"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CASES, LAWYERS } from "@/lib/mockData";
import { I, type IconKey } from "./Icons";

interface NavItem {
  href: string;
  id: string;
  lbl: string;
  ic: IconKey;
  ct?: number;
  ctTone?: "urgent";
}

interface NavSection {
  h: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const active = CASES.filter(
    (c) => c.status === "mobilizing" || c.status === "live",
  ).length;

  const sections: NavSection[] = [
    {
      h: "Dispatch",
      items: [
        { href: "/dashboard", id: "dashboard", lbl: "Dashboard", ic: "dashboard" },
        {
          href: "/cases",
          id: "cases",
          lbl: "Cases",
          ic: "cases",
          ct: active,
          ctTone: "urgent",
        },
      ],
    },
    {
      h: "Roster",
      items: [
        {
          href: "/lawyers",
          id: "lawyers",
          lbl: "Lawyers",
          ic: "lawyers",
          ct: LAWYERS.filter((l) => l.ready).length,
        },
      ],
    },
    {
      h: "Money",
      items: [{ href: "/payouts", id: "payouts", lbl: "Payouts", ic: "money" }],
    },
    {
      h: "Setup",
      items: [{ href: "/settings", id: "settings", lbl: "Settings", ic: "settings" }],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">Au</div>
        <div>
          <div className="brand-name">Legal SOS</div>
          <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 1 }}>
            Ops console
          </div>
        </div>
        <span className="brand-env">PROD</span>
      </div>

      {sections.map((s) => (
        <div key={s.h} className="sidebar-section">
          <div className="sidebar-section-h">{s.h}</div>
          {s.items.map((it) => {
            const Icon = I[it.ic];
            const isActive = pathname.startsWith(it.href);
            return (
              <Link
                key={it.id}
                href={it.href}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <Icon className="nav-icon" />
                <span>{it.lbl}</span>
                {it.ct !== undefined && (
                  <span
                    className="nav-count"
                    style={
                      it.ctTone === "urgent"
                        ? {
                            background: "var(--sos-soft)",
                            color: "#ff8a8a",
                          }
                        : {}
                    }
                  >
                    {it.ct}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="sidebar-foot">
        <div className="avatar">OP</div>
        <div>
          <div className="u">Ops · Lead</div>
          <div className="r">ops@gicc.bh</div>
        </div>
      </div>
    </aside>
  );
}
