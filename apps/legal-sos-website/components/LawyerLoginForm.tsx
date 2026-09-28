"use client";

import { useState, type FormEvent } from "react";

import type { CountryConfig } from "@/lib/countries";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { LawyerSessionProfile } from "@/lib/lawyer-portal-types";

type Props = {
  locale: Locale;
  dictionary: Dictionary;
  countries: CountryConfig[];
  countryCode: string;
  onCountryChange: (countryCode: string) => void;
  onAuthenticated: (lawyer: LawyerSessionProfile) => void;
};

type Mode = "login" | "reset";

export function LawyerLoginForm({
  locale,
  dictionary,
  countries,
  countryCode,
  onCountryChange,
  onAuthenticated,
}: Props) {
  const copy = dictionary.portal.lawyerAuth;
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  function mapError(code: string) {
    if (code === "INVALID_CREDENTIALS") return copy.invalidCredentials;
    if (code === "ACCOUNT_UNAVAILABLE") return copy.accountUnavailable;
    return copy.serviceUnavailable;
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/lawyer-auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, licenseNumber: identifier, password }),
      });
      const payload = await response.json().catch(() => null) as
        | { ok?: boolean; error?: string; lawyer?: LawyerSessionProfile }
        | null;
      if (!response.ok || !payload?.lawyer) {
        setError(mapError(payload?.error || "SERVICE_UNAVAILABLE"));
        return;
      }
      setPassword("");
      onAuthenticated(payload.lawyer);
    } catch {
      setError(copy.serviceUnavailable);
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResetSent(false);
    try {
      const response = await fetch("/api/lawyer-auth/forgot-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, identifier, locale }),
      });
      if (!response.ok) {
        setError(copy.serviceUnavailable);
        return;
      }
      setResetSent(true);
    } catch {
      setError(copy.serviceUnavailable);
    } finally {
      setBusy(false);
    }
  }

  function returnToLogin() {
    setMode("login");
    setPassword("");
    setError("");
    setResetSent(false);
  }

  return (
    <form className="lawyer-login-form" onSubmit={mode === "login" ? submitLogin : submitReset}>
      <h2>{mode === "login" ? copy.title : copy.resetTitle}</h2>
      <label>
        <span>{copy.country}</span>
        <select value={countryCode} onChange={(event) => onCountryChange(event.target.value)} disabled={busy}>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>{country.names[locale]}</option>
          ))}
        </select>
      </label>
      <label>
        <span>{copy.identifier}</span>
        <input
          name="lawyerIdentifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete="username"
          required
        />
      </label>
      {mode === "login" ? (
        <label>
          <span>{copy.password}</span>
          <input
            name="lawyerPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
      ) : null}
      {error ? <p className="portal-auth-error" role="alert">{error}</p> : null}
      {resetSent ? <p className="portal-auth-success" role="status">{copy.resetSent}</p> : null}
      <button className="gold-button" type="submit" disabled={busy || !identifier.trim() || (mode === "login" && !password)}>
        {busy ? copy.loading : mode === "login" ? copy.signIn : copy.resetSubmit}
      </button>
      {mode === "login" ? (
        <button type="button" className="text-button" onClick={() => { setMode("reset"); setPassword(""); setError(""); }}>
          {copy.forgotPassword}
        </button>
      ) : (
        <button type="button" className="text-button" onClick={returnToLogin}>{copy.backToLogin}</button>
      )}
    </form>
  );
}
