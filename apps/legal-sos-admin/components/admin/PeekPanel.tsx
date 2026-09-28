"use client";

import { useEffect } from "react";
import { I } from "./Icons";
import { StatusPill } from "./Primitives";
import { fmtAgo } from "@/lib/mockData";
import { buildTimeline } from "@/lib/admin/timeline";
import { useAdmin } from "./AdminProvider";

export function PeekPanel() {
  const { peekCase, openCase, pushToast } = useAdmin();
  const open = !!peekCase;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") openCase(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openCase]);

  if (!peekCase) {
    // Render hidden so the entrance transition runs cleanly on first open
    return (
      <>
        <div className="peek-backdrop" />
        <aside className="peek" />
      </>
    );
  }

  const c = peekCase;
  const tl = buildTimeline(c);

  return (
    <>
      <div
        className={`peek-backdrop ${open ? "open" : ""}`}
        onClick={() => openCase(null)}
      />
      <aside className={`peek ${open ? "open" : ""}`}>
        <div className="peek-head">
          <div style={{ flex: 1 }}>
            <div className="flex gap-8" style={{ marginBottom: 4 }}>
              <StatusPill status={c.status} />
              <span className="ref">{c.ref}</span>
            </div>
            <h2>{c.type}</h2>
            <div className="meta">
              <span>
                <I.pin
                  width="11"
                  height="11"
                  style={{ verticalAlign: -1, marginRight: 4 }}
                />
                {c.location}
              </span>
              <span>·</span>
              <span>Opened {fmtAgo(c.openedMin)}</span>
              <span>·</span>
              <span className="mono">{c.lang}</span>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => openCase(null)}
            aria-label="Close peek"
          >
            <I.close width="14" height="14" />
          </button>
        </div>

        <div className="peek-body">
          {c.status === "mobilizing" && c.urgent && (
            <div className="callout urgent" style={{ marginBottom: 20 }}>
              <I.alert width="14" height="14" className="ic" />
              <div>
                <strong>Urgent · client at Manama Block 318.</strong>
                <br />
                SLA target: connect within 3 min. ETA from Sara Al-Hashimi: ~4 min.
              </div>
            </div>
          )}

          <div className="peek-section">
            <h4>Case timeline</h4>
            <div className="timeline">
              {tl.map((t, i) => (
                <div key={i} className="tl-row">
                  <div className="time">{t.time}</div>
                  <div className="tl-dot-col">
                    <div className={`tl-dot ${t.kind ?? ""}`} />
                  </div>
                  <div>
                    <div className="l">{t.label}</div>
                    {t.desc && <div className="d">{t.desc}</div>}
                  </div>
                  {t.meta && <div className="meta">{t.meta}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="peek-section">
            <h4>Client &amp; lawyer</h4>
            <div className="peek-grid">
              <div>
                <div className="l">Client</div>
                <div className="v">{c.client}</div>
                <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 2 }}>
                  {c.phone}
                </div>
              </div>
              <div>
                <div className="l">Lawyer</div>
                <div className="v">{c.lawyer}</div>
                <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 2 }}>
                  {c.lawyerInit !== "—"
                    ? `License No. ${4000 + c.lawyerInit.charCodeAt(0)}`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="l">Consent recorded</div>
                <div className="v" style={{ color: "var(--green)" }}>
                  ✓ 09:38 AST
                </div>
              </div>
              <div>
                <div className="l">Privileged session</div>
                <div className="v" style={{ color: "var(--green)" }}>
                  ✓ E2E encrypted
                </div>
              </div>
            </div>
          </div>

          <div className="peek-section">
            <h4>Payment</h4>
            <div className="peek-grid">
              <div>
                <div className="l">Fee charged</div>
                <div className="v gold">BHD {c.fee}.000</div>
              </div>
              <div>
                <div className="l">Payment method</div>
                <div className="v">•••• 4823 · Apple Pay</div>
              </div>
              <div>
                <div className="l">Platform cut · 20%</div>
                <div className="v">BHD {(c.fee * 0.2).toFixed(3)}</div>
              </div>
              <div>
                <div className="l">Lawyer payout</div>
                <div className="v gold">BHD {(c.fee * 0.8).toFixed(3)}</div>
              </div>
            </div>
          </div>

          <div className="peek-section">
            <h4>Operator notes</h4>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Add an internal note. Visible to ops + finance only."
              style={{ maxWidth: "100%" }}
            />
          </div>
        </div>

        <div className="peek-foot">
          <button
            type="button"
            className="btn ghost"
            onClick={() => pushToast(`${c.ref} · downloaded case PDF`)}
          >
            <I.doc className="sz-12" /> Export PDF
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => pushToast(`${c.ref} · reassign picker opened`)}
          >
            <I.reassign className="sz-12" /> Reassign
          </button>
          {(c.status === "completed" || c.status === "disputed") && (
            <button
              type="button"
              className="btn danger"
              onClick={() => pushToast(`${c.ref} · refund processed`)}
            >
              <I.refund className="sz-12" /> Refund
            </button>
          )}
          <button
            type="button"
            className="btn primary"
            onClick={() => pushToast(`${c.ref} · opened in full view`)}
          >
            <I.arrow className="sz-12" /> Open
          </button>
        </div>
      </aside>
    </>
  );
}
