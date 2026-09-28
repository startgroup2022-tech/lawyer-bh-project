"use client";

import { useEffect, useRef, useState } from "react";
import { I } from "./Icons";
import { NOTIFS } from "@/lib/mockData";
import { useAdmin } from "./AdminProvider";
import { usePusher } from "./PusherClient";

export function Topbar() {
  const { setPaletteOpen } = useAdmin();
  const { state: wsState } = usePusher();
  const [notifOpen, setNotifOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = NOTIFS.filter((n) => n.unread).length;

  return (
    <div className="topbar">
      <button
        type="button"
        className="search-trigger"
        onClick={() => setPaletteOpen(true)}
      >
        <I.search width="14" height="14" />
        <span className="grow">Search cases, lawyers, settings…</span>
        <span className="kbd">⌘</span>
        <span className="kbd">K</span>
      </button>

      <div className="topbar-right">
        <span className="live-pill" title={`Pusher state: ${wsState}`}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                wsState === "connected"
                  ? "var(--green)"
                  : wsState === "connecting"
                    ? "var(--amber)"
                    : wsState === "initialized"
                      ? "var(--subtle)"
                      : "var(--sos)",
              animation: wsState === "connected" ? "pulse 2s infinite" : undefined,
            }}
          />
          {wsState === "connected"
            ? "WS connected"
            : wsState === "connecting"
              ? "WS connecting…"
              : wsState === "initialized"
                ? "WS not configured"
                : "WS disconnected"}
        </span>
        <div style={{ position: "relative" }} ref={ref}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
          >
            <I.bell width="16" height="16" />
            {unread > 0 && <span className="dot" />}
          </button>
          {notifOpen && <NotifDropdown />}
        </div>
        <button type="button" className="icon-btn" aria-label="Settings">
          <I.settings width="16" height="16" />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Sign out"
          title="Sign out"
          onClick={signOut}
        >
          <I.signout width="16" height="16" />
        </button>
        <div
          className="avatar"
          style={{ width: 32, height: 32, fontSize: 12 }}
        >
          OP
        </div>
      </div>
    </div>
  );
}

async function signOut() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
}

function NotifDropdown() {
  return (
    <div className="notif">
      <div className="notif-head">
        <span className="t">Notifications</span>
        <a className="lk">Mark all as read</a>
      </div>
      <div className="notif-body">
        {NOTIFS.map((n, i) => (
          <div
            key={i}
            className="feed-item"
            style={{
              background: n.unread ? "rgba(212, 168, 90, 0.04)" : "transparent",
            }}
          >
            <div className={`feed-icon ${n.ic}`}>
              {n.ic === "red" || n.ic === "amber" ? (
                <I.alert width="12" height="12" />
              ) : n.ic === "green" ? (
                <I.check width="12" height="12" />
              ) : (
                <I.ring width="10" height="10" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div className="t" style={{ fontSize: 12.5 }}>
                {n.t}
              </div>
              <div className="ago">{n.ago} ago</div>
            </div>
            {n.unread && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--gold-2)",
                  marginTop: 6,
                  alignSelf: "flex-start",
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="notif-foot">View all activity →</div>
    </div>
  );
}
