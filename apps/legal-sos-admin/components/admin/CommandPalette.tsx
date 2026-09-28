"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { I, type IconKey } from "./Icons";
import { CASES, LAWYERS } from "@/lib/mockData";
import { useAdmin } from "./AdminProvider";

interface Item {
  id: string;
  lbl: string;
  sub: string;
  group: string;
  ic: IconKey;
  action: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen, openCase } = useAdmin();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQ("");
      setFocus(0);
    }
  }, [paletteOpen]);

  const all = useMemo<Item[]>(() => {
    const pageItems: Item[] = [
      { id: "p-dashboard", lbl: "Dashboard", sub: "Overview", action: () => router.push("/dashboard"), ic: "dashboard", group: "Navigate" },
      { id: "p-cases", lbl: "Cases", sub: "All cases", action: () => router.push("/cases"), ic: "cases", group: "Navigate" },
      { id: "p-lawyers", lbl: "Lawyers", sub: "Roster", action: () => router.push("/lawyers"), ic: "lawyers", group: "Navigate" },
      { id: "p-payouts", lbl: "Payouts", sub: "Settlements", action: () => router.push("/payouts"), ic: "money", group: "Navigate" },
      { id: "p-settings", lbl: "Settings", sub: "Configuration", action: () => router.push("/settings"), ic: "settings", group: "Navigate" },
    ];
    const caseItems: Item[] = CASES.slice(0, 20).map((c) => ({
      id: c.ref,
      lbl: `${c.ref} · ${c.client}`,
      sub: c.type,
      action: () => {
        router.push("/cases");
        openCase(c);
      },
      ic: "cases" as const,
      group: "Cases",
    }));
    const lawyerItems: Item[] = LAWYERS.map((l) => ({
      id: l.bar,
      lbl: l.name,
      sub: `${l.bar} · ${l.ready ? "on-call" : "off-call"}`,
      action: () => router.push("/lawyers"),
      ic: "lawyers" as const,
      group: "Lawyers",
    }));
    return [...pageItems, ...caseItems, ...lawyerItems];
  }, [router, openCase]);

  const filtered = useMemo(
    () =>
      q
        ? all.filter((it) =>
            `${it.lbl} ${it.sub}`.toLowerCase().includes(q.toLowerCase()),
          )
        : all,
    [all, q],
  );

  useEffect(() => {
    if (!paletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocus((f) => Math.min(f + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocus((f) => Math.max(f - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const it = filtered[focus];
        if (it) {
          it.action();
          setPaletteOpen(false);
        }
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, filtered, focus, setPaletteOpen]);

  if (!paletteOpen) return null;

  const byGroup = filtered.reduce<Record<string, Item[]>>((m, it) => {
    (m[it.group] = m[it.group] || []).push(it);
    return m;
  }, {});

  let idx = -1;
  return (
    <div
      className={`cmd-backdrop ${paletteOpen ? "open" : ""}`}
      onClick={() => setPaletteOpen(false)}
    >
      <div className="cmd" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <I.search width="16" height="16" style={{ color: "var(--subtle)" }} />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Jump to a case, lawyer, page… or type /help"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setFocus(0);
            }}
          />
          <span className="kbd">esc</span>
        </div>
        <div className="cmd-results">
          {Object.keys(byGroup).map((g) => (
            <div key={g} className="cmd-group">
              <div className="cmd-group-h">{g}</div>
              {byGroup[g].map((it) => {
                idx++;
                const isFocus = idx === focus;
                const Icon = I[it.ic];
                return (
                  <div
                    key={it.id}
                    className={`cmd-item ${isFocus ? "focus" : ""}`}
                    onMouseEnter={() => setFocus(filtered.indexOf(it))}
                    onClick={() => {
                      it.action();
                      setPaletteOpen(false);
                    }}
                  >
                    <Icon className="ic" />
                    <span className="lbl">{it.lbl}</span>
                    <span className="sub">{it.sub}</span>
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 30,
                textAlign: "center",
                color: "var(--subtle)",
                fontSize: 13,
              }}
            >
              No matches for &quot;{q}&quot;
            </div>
          )}
        </div>
        <div className="cmd-foot">
          <span className="grp">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> navigate
          </span>
          <span className="grp">
            <span className="kbd">↵</span> open
          </span>
          <span className="grp">
            <span className="kbd">esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
