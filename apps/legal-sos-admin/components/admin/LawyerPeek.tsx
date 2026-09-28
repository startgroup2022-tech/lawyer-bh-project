"use client";

import { useEffect } from "react";
import { I } from "./Icons";
import { StatusPill, Sparkline } from "./Primitives";
import { SPARKS, fmtBHD } from "@/lib/mockData";
import { useAdmin } from "./AdminProvider";

export function LawyerPeek() {
  const { peekLawyer, openLawyer } = useAdmin();
  const open = !!peekLawyer;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") openLawyer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openLawyer]);

  if (!peekLawyer) return null;
  const l = peekLawyer;

  return (
    <>
      <div
        className={`peek-backdrop ${open ? "open" : ""}`}
        onClick={() => openLawyer(null)}
      />
      <aside className={`peek ${open ? "open" : ""}`}>
        <div className="peek-head">
          <div style={{ flex: 1 }}>
            <div className="flex gap-12">
              <div className="avatar lg">{l.init}</div>
              <div>
                <h2 style={{ marginTop: 0 }}>{l.name}</h2>
                <div className="meta" style={{ marginTop: 4 }}>
                  <span className="ref">{l.bar}</span>
                  <span>·</span>
                  <span>{l.yrs} years</span>
                  <span>·</span>
                  <StatusPill status={l.ready ? "oncall" : "offcall"} />
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => openLawyer(null)}
          >
            <I.close width="14" height="14" />
          </button>
        </div>

        <div className="peek-body">
          <div className="peek-section">
            <h4>Stats</h4>
            <div className="peek-grid">
              <div>
                <div className="l">Rating</div>
                <div className="v gold">★ {l.rating.toFixed(2)} / 5.00</div>
              </div>
              <div>
                <div className="l">Cases (lifetime)</div>
                <div className="v">{l.cases}</div>
              </div>
              <div>
                <div className="l">Outstanding balance</div>
                <div className="v gold">BHD {fmtBHD(l.balance)}</div>
              </div>
              <div>
                <div className="l">Coverage radius</div>
                <div className="v">{l.radius}</div>
              </div>
              <div>
                <div className="l">Languages</div>
                <div className="v">{l.langs.join(" · ")}</div>
              </div>
              <div>
                <div className="l">Country</div>
                <div className="v">{l.country} BH · MNM</div>
              </div>
            </div>
          </div>

          <div className="peek-section">
            <h4>30-day earnings</h4>
            <div
              style={{
                padding: 16,
                background: "rgba(11, 20, 38, 0.5)",
                borderRadius: 8,
                border: "1px solid var(--border-soft)",
              }}
            >
              <Sparkline
                data={SPARKS[l.name]}
                w={460}
                h={80}
                color="var(--gold-2)"
              />
            </div>
          </div>

          <div className="peek-section">
            <h4>Shift schedule · this week</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 4,
                marginTop: 8,
              }}
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
                const on = [true, true, false, true, true, true, false][i];
                return (
                  <div
                    key={d}
                    style={{
                      padding: "12px 6px",
                      borderRadius: 6,
                      background: on
                        ? "var(--green-soft)"
                        : "rgba(143,160,189,0.06)",
                      border: `1px solid ${
                        on ? "rgba(34,197,94,0.3)" : "var(--border-soft)"
                      }`,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "var(--subtle)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {d.toUpperCase()}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        marginTop: 4,
                        color: on ? "var(--green)" : "var(--subtle)",
                      }}
                    >
                      {on ? "08–16" : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="peek-section">
            <h4>Compliance</h4>
            <div className="peek-grid">
              <div>
                <div className="l">KYC</div>
                <div className="v" style={{ color: "var(--green)" }}>
                  ✓ Verified · Mar 2026
                </div>
              </div>
              <div>
                <div className="l">Bar standing</div>
                <div className="v" style={{ color: "var(--green)" }}>
                  ✓ Active
                </div>
              </div>
              <div>
                <div className="l">NDA &amp; ToS</div>
                <div className="v" style={{ color: "var(--green)" }}>
                  ✓ Signed
                </div>
              </div>
              <div>
                <div className="l">Next quarterly review</div>
                <div className="v">Jul 2026</div>
              </div>
            </div>
          </div>
        </div>

        <div className="peek-foot">
          <button type="button" className="btn ghost">
            <I.doc className="sz-12" /> Consent PDF
          </button>
          <button type="button" className="btn ghost">
            Shift &amp; coverage
          </button>
          <button type="button" className="btn primary">
            <I.check className="sz-12" /> Settle BHD {fmtBHD(l.balance)}
          </button>
        </div>
      </aside>
    </>
  );
}
