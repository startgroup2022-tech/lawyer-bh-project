// /login — email + password form for back-office admins.
// On success POSTs to /api/auth/login (cookie set server-side), then
// hard-navigates to /dashboard so the authed layout runs.

"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Sign-in failed.");
        setLoading(false);
        return;
      }
      // Cookie is set; full reload so the (authed) server layout picks it up.
      window.location.href = "/dashboard";
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <div style={shellStyle}>
      <form onSubmit={onSubmit} style={cardStyle} autoComplete="on">
        <div style={brandRow}>
          <div style={brandMark}>L</div>
          <div>
            <div style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
              Legal SOS · Admin
            </div>
            <div style={brandEnv}>RESTRICTED ACCESS</div>
          </div>
        </div>

        <h1 style={headingStyle}>Operator sign-in</h1>
        <p style={subStyle}>
          Authorised personnel only. All actions are logged and auditable.
        </p>

        <label style={labelStyle} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          placeholder="info@lawyers.bh"
        />

        <label style={{ ...labelStyle, marginTop: 14 }} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          placeholder="••••••••••••"
        />

        {error && (
          <div role="alert" style={errorStyle}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={btnStyle(loading)}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p style={footStyle}>
          Lost access? Contact the system owner — credentials cannot be reset
          from this screen.
        </p>
      </form>
    </div>
  );
}

// ── Inline styles (kept off globals.css so the login is fully encapsulated) ──

const shellStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(1200px 800px at 50% -20%, rgba(212, 168, 90, 0.10), transparent 60%), #0b1426",
  padding: 24,
  overflow: "auto",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 380,
  background: "#172541",
  border: "1px solid #22325a",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 24px 60px -16px rgba(0,0,0,0.6)",
};

const brandRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 22,
};

const brandMark: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 9,
  background: "linear-gradient(135deg, #d4a85a 0%, #9c7a3d 100%)",
  display: "grid",
  placeItems: "center",
  color: "#0b1426",
  fontWeight: 700,
  fontSize: 14,
  boxShadow:
    "0 0 0 1px rgba(212, 168, 90, 0.3), 0 8px 24px -8px rgba(212, 168, 90, 0.5)",
};

const brandEnv: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  color: "#e8c281",
  letterSpacing: "0.12em",
  marginTop: 2,
};

const headingStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  marginBottom: 6,
};

const subStyle: React.CSSProperties = {
  color: "#8fa0bd",
  fontSize: 12.5,
  lineHeight: 1.5,
  marginBottom: 22,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#8fa0bd",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid #22325a",
  borderRadius: 10,
  padding: "12px 13px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  background: "rgba(211, 47, 47, 0.14)",
  border: "1px solid rgba(211, 47, 47, 0.3)",
  color: "#ff8a8a",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 12.5,
};

function btnStyle(loading: boolean): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 20,
    padding: "13px 16px",
    borderRadius: 10,
    background: loading
      ? "linear-gradient(135deg, #9c7a3d 0%, #6d5429 100%)"
      : "linear-gradient(135deg, #e8c281 0%, #9c7a3d 100%)",
    color: "#1a0f00",
    fontWeight: 600,
    fontSize: 14,
    border: "none",
    cursor: loading ? "not-allowed" : "pointer",
    boxShadow: "0 12px 28px -10px rgba(212, 168, 90, 0.5)",
  };
}

const footStyle: React.CSSProperties = {
  marginTop: 18,
  color: "#6b7b97",
  fontSize: 11,
  textAlign: "center",
  lineHeight: 1.5,
};
