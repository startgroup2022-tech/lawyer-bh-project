"use client";

import { CalendarCheck, ChatCircleDots, FileText, House, Key, Plus, SignIn, User, UserCircle, Wallet } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Dictionary, Locale } from "@/lib/i18n";
import { useSite } from "./providers/SiteProvider";
import { tokenStorageKey } from "@/lib/client-auth-proxy";

const icons = [House, FileText, ChatCircleDots, FileText, CalendarCheck, Wallet, UserCircle];
type TrackResponse = {
  ok: boolean;
  requestId: string;
  bookingId: string;
  requestReference: string;
  paymentStatus: string;
  tapStatus: string;
  serviceStatus: string;
  dispatchState: string;
  dispatchToken: string;
  lawyerName: string;
  amount: number;
  currency: string;
  error?: string;
};

type StatusMap = Record<string, string>;
type StatusTone = "success" | "warning" | "error" | "info";

function normalizeStatus(value: string, fallback: string, map: StatusMap) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return map[normalized] ?? value;
}

function statusTone(value: string): StatusTone {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "info";

  if (["succeeded", "paid", "completed", "matched", "assigned", "accepted", "dispatched", "finished"].includes(normalized)) {
    return "success";
  }

  if (["failed", "canceled", "cancelled", "error"].includes(normalized)) {
    return "error";
  }

  if (["in_progress", "inprogress", "matching", "pending", "created", "queued"].includes(normalized)) {
    return "warning";
  }

  return "info";
}

function statusToneStyles(tone: StatusTone): { color: string } {
  if (tone === "success") return { color: "#145a32" };
  if (tone === "error") return { color: "#a11d1d" };
  if (tone === "warning") return { color: "#9a5b00" };
  return { color: "#1f2937" };
}

function statusBadge(tone: StatusTone): string {
  if (tone === "success") return "[OK]";
  if (tone === "error") return "[! ]";
  if (tone === "warning") return "[...]";
  return "[i]";
}

function summarizeTrackingState(params: {
  paymentStatus: string;
  serviceStatus: string;
  dispatchState: string;
  hasLawyer: boolean;
  localeMap: {
    title: string;
    paymentPending: string;
    paymentFailed: string;
    paymentPaid: string;
    paymentCanceled: string;
    waitingMatch: string;
    matched: string;
    dispatched: string;
    inProgress: string;
    completed: string;
    cancelled: string;
    processing: string;
  };
}) {
  const paymentStatus = params.paymentStatus.trim().toLowerCase();
  const serviceStatus = params.serviceStatus.trim().toLowerCase();
  const dispatchState = params.dispatchState.trim().toLowerCase();

  if (["failed", "error", "declined", "rejected"].includes(paymentStatus)) {
    return { title: params.localeMap.title, text: params.localeMap.paymentFailed };
  }

  if (["pending", "new", "created", "queued"].includes(paymentStatus)) {
    return { title: params.localeMap.title, text: params.localeMap.paymentPending };
  }

  if (["succeeded", "paid", "completed"].includes(paymentStatus)) {
    if (["canceled", "cancelled"].includes(serviceStatus) || ["canceled", "cancelled"].includes(dispatchState)) {
      return { title: params.localeMap.title, text: params.localeMap.paymentCanceled };
    }

    if (["matched", "assigned", "accepted"].includes(serviceStatus) || params.hasLawyer) {
      return { title: params.localeMap.title, text: params.localeMap.matched };
    }

    if (["in_progress", "inprogress"].includes(serviceStatus)) {
      return { title: params.localeMap.title, text: params.localeMap.inProgress };
    }

    if (["dispatched", "assigned"].includes(dispatchState)) {
      return { title: params.localeMap.title, text: params.localeMap.dispatched };
    }

    if (["completed", "finished"].includes(serviceStatus)) {
      return { title: params.localeMap.title, text: params.localeMap.completed };
    }

    if (["cancelled", "canceled"].includes(serviceStatus)) {
      return { title: params.localeMap.title, text: params.localeMap.cancelled };
    }

    return { title: params.localeMap.title, text: params.localeMap.waitingMatch };
  }

  if (["cancelled", "canceled"].includes(serviceStatus) || ["cancelled", "canceled"].includes(dispatchState)) {
    return { title: params.localeMap.title, text: params.localeMap.cancelled };
  }

  return { title: params.localeMap.title, text: params.localeMap.processing };
}

type TimelineStep = {
  label: string;
  detail: string;
  tone: StatusTone;
  state: "done" | "active" | "pending";
};

type ClientProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

type AuthForm = {
  mode: "signin" | "register";
  email: string;
  password: string;
  fullName: string;
  phone: string;
  code: string;
  challengeId: string;
};

type AuthPanelMode = "idle" | "signin" | "register" | "verify";

function buildTrackingTimeline(
  tracking: TrackResponse | null,
  localeMap: {
    timeline: {
      title: string;
      steps: {
        requestCreated: string;
        payment: string;
        matching: string;
        dispatch: string;
        completed: string;
      };
      done: string;
      active: string;
      waiting: string;
    };
  },
) {
  const paymentStatus = tracking?.paymentStatus.trim().toLowerCase() ?? "";
  const serviceStatus = tracking?.serviceStatus.trim().toLowerCase() ?? "";
  const dispatchState = tracking?.dispatchState.trim().toLowerCase() ?? "";

  const hasTracking = Boolean(tracking);
  const hasLawyer = Boolean(tracking?.lawyerName);

  const paymentFailed = ["failed", "declined", "error", "rejected", "canceled", "cancelled"].includes(paymentStatus);
  const paymentDone = ["succeeded", "paid", "completed"].includes(paymentStatus);
  const paymentActive = !paymentFailed && (["pending", "created", "queued", "in_progress", "inprogress"].includes(paymentStatus));

  const matchingDone = ["matched", "assigned", "accepted"].includes(serviceStatus) || hasLawyer;
  const matchingActive = paymentDone && !matchingDone && !paymentFailed && !["cancelled", "canceled"].includes(serviceStatus);

  const dispatchDone = ["dispatched", "completed"].includes(dispatchState);
  const dispatchActive = (serviceStatus === "accepted" || serviceStatus === "assigned" || serviceStatus === "in_progress" || serviceStatus === "inprogress")
    && !dispatchDone
    && !paymentFailed;

  const requestCompleted = ["completed", "finished"].includes(serviceStatus);
  const requestCanceled = ["cancelled", "canceled"].includes(serviceStatus);

  const timeline: TimelineStep[] = [
    {
      label: localeMap.timeline.steps.requestCreated,
      detail: hasTracking ? localeMap.timeline.done : localeMap.timeline.waiting,
      tone: hasTracking ? "success" : "info",
      state: hasTracking ? "done" : "pending",
    },
    {
      label: localeMap.timeline.steps.payment,
      detail: paymentDone
        ? localeMap.timeline.done
        : paymentFailed
          ? localeMap.timeline.waiting
          : paymentActive
            ? localeMap.timeline.active
            : localeMap.timeline.waiting,
      tone: paymentDone
        ? "success"
        : paymentFailed
          ? "error"
          : paymentActive
            ? "warning"
            : "info",
      state: paymentDone ? "done" : paymentActive ? "active" : "pending",
    },
    {
      label: localeMap.timeline.steps.matching,
      detail: matchingDone
        ? localeMap.timeline.done
        : matchingActive
          ? localeMap.timeline.active
          : localeMap.timeline.waiting,
      tone: requestCanceled
        ? "error"
        : matchingDone
          ? "success"
          : matchingActive
            ? "warning"
            : "info",
      state: matchingDone ? "done" : matchingActive ? "active" : "pending",
    },
    {
      label: localeMap.timeline.steps.dispatch,
      detail: dispatchDone
        ? localeMap.timeline.done
        : dispatchActive
          ? localeMap.timeline.active
          : localeMap.timeline.waiting,
      tone: requestCanceled
        ? "error"
        : dispatchDone
          ? "success"
          : dispatchActive
            ? "warning"
            : "info",
      state: dispatchDone ? "done" : dispatchActive ? "active" : "pending",
    },
    {
      label: localeMap.timeline.steps.completed,
      detail: requestCompleted ? localeMap.timeline.done : requestCanceled ? localeMap.timeline.waiting : localeMap.timeline.waiting,
      tone: requestCompleted ? "success" : requestCanceled ? "error" : "info",
      state: requestCompleted ? "done" : requestCanceled ? "pending" : (matchingDone || dispatchDone ? "active" : "pending"),
    },
  ];

  if (!hasTracking) {
    return [];
  }

  return timeline;
}

export function PortalShell({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const site = useSite();
  const nav = Object.values(dictionary.portal.nav);
  const searchParams = useSearchParams();
  const requestId = useMemo(() => searchParams.get("requestId") ?? "", [searchParams]);
  const requestAccessToken = useMemo(() => searchParams.get("requestAccessToken") ?? "", [searchParams]);
  const isMountedRef = useRef(true);

  const authTokenKey = tokenStorageKey();
  const [authMode, setAuthMode] = useState<AuthPanelMode>("idle");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState<AuthForm>({
    mode: "signin",
    email: "",
    password: "",
    fullName: "",
    phone: site.country.dialCode,
    code: "",
    challengeId: "",
  });
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [clientToken, setClientToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [tracking, setTracking] = useState<TrackResponse | null>(null);

  const isAuthenticated = Boolean(client && clientToken);

  const hasTrackTarget = Boolean(requestId && requestAccessToken);
  const fallbackValue = dictionary.portal.empty;
  const displayReference = tracking?.requestReference || tracking?.requestId || requestId || fallbackValue;
  const isDispatchPending = Boolean(tracking && !tracking.serviceStatus && !tracking.dispatchState && !tracking.lawyerName);
  const paymentStatusText = normalizeStatus(
    tracking?.paymentStatus ?? "",
    loading ? dictionary.portal.loading : fallbackValue,
    dictionary.portal.paymentStatusMap,
  );
  const serviceStatusText = normalizeStatus(
    tracking?.serviceStatus ?? "",
    loading ? dictionary.portal.loading : fallbackValue,
    dictionary.portal.serviceStatusMap,
  );
  const dispatchStateText = normalizeStatus(
    tracking?.dispatchState ?? "",
    "",
    dictionary.portal.dispatchStateMap,
  );

  const refreshTracking = useCallback(async () => {
    if (!requestId || !requestAccessToken) return;

    if (!isMountedRef.current) return;
    setLoading(true);
    setTrackingError("");

    try {
      const response = await fetch(
        `/api/sos/track?requestId=${encodeURIComponent(requestId)}&requestAccessToken=${encodeURIComponent(requestAccessToken)}`,
        { headers: { Accept: "application/json" } },
      );
      const payload = (await response.json()) as unknown;

      if (!isMountedRef.current) return;

      if (!response.ok || typeof payload !== "object" || payload === null) {
        const error = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : dictionary.sos.retry;
        setTrackingError(error);
        return;
      }

      const typed = payload as TrackResponse;
      if (!typed.ok) {
        setTrackingError(typed.error || dictionary.sos.retry);
        return;
      }

      setTracking(typed);
    } catch {
      if (isMountedRef.current) {
        setTrackingError(dictionary.sos.retry);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [dictionary.sos.retry, requestAccessToken, requestId]);

  const setStoredToken = useCallback((value: string) => {
    if (!value) {
      window.localStorage.removeItem(authTokenKey);
      setClientToken("");
      return;
    }

    window.localStorage.setItem(authTokenKey, value);
    setClientToken(value);
  }, [authTokenKey]);

  const loadSession = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem(authTokenKey);
    if (!token) {
      setClient(null);
      return;
    }

    try {
      const response = await fetch("/api/client-auth/session", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();

      if (response.ok && payload?.ok && payload.client) {
        setClient(payload.client as ClientProfile);
        setStoredToken(token);
        return;
      }

      setStoredToken("");
      setClient(null);
    } catch {
      setStoredToken("");
      setClient(null);
    }
  }, [setStoredToken, authTokenKey]);

  const resetAuth = useCallback(() => {
    setAuthMode("idle");
    setAuthError("");
    setAuthForm((current) => ({
      ...current,
      code: "",
      challengeId: "",
      password: "",
      fullName: "",
      phone: site.country.dialCode,
    }));
  }, [site.country.dialCode]);

  const requestSignupCode = useCallback(async () => {
    setAuthBusy(true);
    setAuthError("");
    const body = {
      mode: "register" as const,
      email: authForm.email.trim().toLowerCase(),
      password: authForm.password,
      fullName: authForm.fullName.trim(),
      phone: authForm.phone.trim(),
      locale,
    };

    try {
      const response = await fetch("/api/client-auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setAuthError(typeof payload?.error === "string" && payload.error.trim() ? payload.error : dictionary.portal.auth.failed);
        return;
      }

      setAuthForm((current) => ({
        ...current,
        challengeId: String(payload.challengeId ?? ""),
      }));
      setAuthMode("verify");
    } catch {
      setAuthError(dictionary.portal.auth.failed);
    } finally {
      setAuthBusy(false);
    }
  }, [authForm.email, authForm.fullName, authForm.password, authForm.phone, dictionary.portal.auth.failed, locale]);

  const verifySignupCode = useCallback(async () => {
    if (!authForm.challengeId || !authForm.code) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/client-auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ challengeId: authForm.challengeId, code: authForm.code.trim() }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok || !payload.token) {
        setAuthError(typeof payload?.error === "string" && payload.error.trim() ? payload.error : dictionary.portal.auth.failed);
        return;
      }

      setStoredToken(String(payload.token));
      await loadSession();
      resetAuth();
    } catch {
      setAuthError(dictionary.portal.auth.failed);
    } finally {
      setAuthBusy(false);
    }
  }, [authForm.challengeId, authForm.code, loadSession, setStoredToken, resetAuth, dictionary.portal.auth.failed]);

  const loginWithPassword = useCallback(async () => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/client-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: authForm.email.trim().toLowerCase(),
          password: authForm.password,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok || !payload.token) {
        setAuthError(typeof payload?.error === "string" && payload.error.trim() ? payload.error : dictionary.portal.auth.failed);
        return;
      }

      setStoredToken(String(payload.token));
      await loadSession();
      resetAuth();
    } catch {
      setAuthError(dictionary.portal.auth.failed);
    } finally {
      setAuthBusy(false);
    }
  }, [authForm.email, authForm.password, loadSession, setStoredToken, resetAuth, dictionary.portal.auth.failed]);

  const signOut = useCallback(async () => {
    if (!clientToken) return;
    try {
      await fetch("/api/client-auth/session", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${clientToken}` },
      });
    } catch {
      // ignored intentionally
    }
    setStoredToken("");
    setClient(null);
    resetAuth();
  }, [clientToken, setStoredToken, resetAuth]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!requestId || !requestAccessToken) return;

  void refreshTracking();
  const intervalId = window.setInterval(() => {
    void refreshTracking();
  }, 30_000);

  return () => {
    window.clearInterval(intervalId);
  };
}, [refreshTracking, requestAccessToken, requestId]);

  const isPortalBusy = loading && !tracking && hasTrackTarget;
  const paymentTone = statusTone(tracking?.paymentStatus ?? "");
  const serviceTone = statusTone(tracking?.serviceStatus ?? "");
  const dispatchTone = statusTone(tracking?.dispatchState ?? "");
  const overallStatus = tracking ? summarizeTrackingState({
    paymentStatus: tracking.paymentStatus,
    serviceStatus: tracking.serviceStatus,
    dispatchState: tracking.dispatchState,
    hasLawyer: Boolean(tracking.lawyerName),
    localeMap: dictionary.portal.overallStatus,
  }) : null;

  const summaryTone = tracking
    ? statusTone((tracking.serviceStatus || tracking.paymentStatus || tracking.dispatchState))
    : "info";
  const timeline = buildTrackingTimeline(tracking, {
    timeline: dictionary.portal.timeline,
  });

  const activeToneStyle = statusToneStyles(summaryTone);
  const updateAuthForm = (changes: Partial<AuthForm>) => {
    setAuthForm((current) => ({ ...current, ...changes }));
  };

  function openAuthMode(mode: "signin" | "register") {
    setAuthMode(mode);
    setAuthError("");
    setAuthForm((current) => ({
      ...current,
      mode,
      code: "",
      challengeId: "",
      fullName: mode === "signin" ? "" : current.fullName,
      phone: mode === "signin" ? site.country.dialCode : current.phone,
    }));
  }

  async function handleAuthSubmit(event: FormEvent) {
    event.preventDefault();
    if (authBusy) return;

    if (authMode === "register") {
      await requestSignupCode();
      return;
    }

    if (authMode === "signin") {
      await loginWithPassword();
      return;
    }

    if (authMode === "verify") {
      await verifySignupCode();
    }
  }

  const renderAuthCard = () => {
    if (isAuthenticated && client) {
      return (
        <div className="portal-auth-card portal-auth-card--signed-in">
          <h3><User size={18} /> {dictionary.portal.auth.welcome}, {client.fullName}</h3>
          <p>{dictionary.portal.auth.loggedInAs}: {client.email}</p>
          <div className="auth-actions">
            <span>
              {dictionary.portal.auth.id}: {client.id.slice(0, 8)}***
            </span>
            <button className="text-button" onClick={signOut}>
              {dictionary.portal.auth.signOut}
            </button>
          </div>
        </div>
      );
    }

    if (authMode === "signin") {
      return (
        <form className="portal-auth-card" onSubmit={handleAuthSubmit}>
          <h3><SignIn size={18} /> {dictionary.portal.auth.signIn}</h3>
          <label>
            <span>{dictionary.portal.auth.email}</span>
            <input value={authForm.email} onChange={(event) => updateAuthForm({ email: event.target.value })} type="email" required />
          </label>
          <label>
            <span>{dictionary.portal.auth.password}</span>
            <input value={authForm.password} onChange={(event) => updateAuthForm({ password: event.target.value })} type="password" minLength={8} required />
          </label>
          <div className="portal-auth-actions">
            {authBusy ? <button className="gold-button" disabled>{dictionary.portal.auth.loading}</button> : <button className="gold-button" type="submit">{dictionary.portal.auth.signIn}</button>}
            <button type="button" className="ghost-button" onClick={() => openAuthMode("register")}>{dictionary.portal.auth.createAccount}</button>
          </div>
          {authError ? <p className="field-error">{authError}</p> : null}
        </form>
      );
    }

    if (authMode === "register" || authMode === "verify") {
      return (
        <form className="portal-auth-card" onSubmit={handleAuthSubmit}>
          <h3><Key size={18} /> {authMode === "verify" ? dictionary.portal.auth.verifyAccount : dictionary.portal.auth.createAccount}</h3>
          {authMode !== "verify" ? (
            <>
              <label>
                <span>{dictionary.portal.auth.name}</span>
                <input value={authForm.fullName} onChange={(event) => updateAuthForm({ fullName: event.target.value })} required />
              </label>
              <label>
                <span>{dictionary.portal.auth.phone}</span>
                <input value={authForm.phone} onChange={(event) => updateAuthForm({ phone: event.target.value })} placeholder={dictionary.portal.auth.phoneHint} required />
              </label>
              <label>
                <span>{dictionary.portal.auth.email}</span>
                <input value={authForm.email} onChange={(event) => updateAuthForm({ email: event.target.value })} type="email" required />
              </label>
              <label>
                <span>{dictionary.portal.auth.password}</span>
                <input value={authForm.password} onChange={(event) => updateAuthForm({ password: event.target.value })} type="password" minLength={8} required />
              </label>
            </>
          ) : null}
          {authMode === "verify" ? (
            <>
              <p>{dictionary.portal.auth.verifyInstruction}</p>
              <label>
                <span>{dictionary.portal.auth.code}</span>
                <input value={authForm.code} onChange={(event) => updateAuthForm({ code: event.target.value })} minLength={6} maxLength={6} required />
              </label>
            </>
          ) : null}
          <div className="portal-auth-actions">
            {authBusy ? <button className="gold-button" disabled>{dictionary.portal.auth.loading}</button> : <button className="gold-button" type="submit">{authMode === "verify" ? dictionary.portal.auth.verifyAccount : dictionary.portal.auth.nextStep}</button>}
            <button type="button" className="ghost-button" onClick={resetAuth}>{dictionary.portal.auth.cancel}</button>
          </div>
          {authError ? <p className="field-error">{authError}</p> : null}
        </form>
      );
    }

    return (
      <div className="portal-auth-card portal-auth-card--idle">
        <h3><SignIn size={18} /> {dictionary.portal.auth.title}</h3>
        <p>{dictionary.portal.auth.ready}</p>
        <div className="portal-auth-actions">
          <button className="gold-button" onClick={() => openAuthMode("signin")}>{dictionary.portal.auth.signIn}</button>
          <button className="ghost-button" onClick={() => openAuthMode("register")}>{dictionary.portal.auth.createAccount}</button>
        </div>
      </div>
    );
  };

  return (
    <main className="portal-page">
      <div className="container portal-layout">
        <aside className="portal-sidebar"><h2>{dictionary.portal.title}</h2><nav>{nav.map((label, index) => { const Icon = icons[index]; return <button className={index === 0 ? "active" : ""} key={label}><Icon size={21} /><span>{label}</span></button>; })}</nav></aside>
        <section className="portal-content">
          <div className="demo-banner">{dictionary.portal.demo}</div>
          <div className="portal-client-panel">{renderAuthCard()}</div>
          <div className="portal-head"><div><span>{site.country.names[locale]}</span><h1>{dictionary.portal.welcome}</h1></div><button className="sos-primary" onClick={() => site.openSos()}><Plus size={19} />{dictionary.portal.cta}</button></div>
          {hasTrackTarget ? (
            <>
              <div className="portal-stats">
                <article><FileText size={29} /><strong>{displayReference}</strong><span>{dictionary.portal.reference}</span></article>
                <article><CalendarCheck size={29} /><strong>{paymentStatusText}</strong><span>{dictionary.portal.paymentStatus}</span></article>
                <article><ChatCircleDots size={29} /><strong>{serviceStatusText}</strong><span>{dictionary.portal.serviceStatus}</span></article>
              </div>
              {overallStatus ? (
                <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, border: `1px solid ${statusToneStyles(summaryTone).color}33`, background: `${statusToneStyles(summaryTone).color}15` }}>
                  <strong style={statusToneStyles(summaryTone)}>{overallStatus.title}: </strong>
                  <span style={statusToneStyles(summaryTone)}>{overallStatus.text}</span>
                </div>
              ) : null}
              {timeline.length ? (
                <div className="portal-tracking-timeline" style={{ marginBottom: 16 }}>
                  <h3 style={{ marginBottom: 8 }}>{dictionary.portal.timeline.title}</h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                    {timeline.map((item) => (
                      <li key={item.label} style={{ display: "flex", gap: 10, alignItems: "center", color: statusToneStyles(item.tone).color }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: item.tone === "success" ? "#145a32" : item.tone === "error" ? "#a11d1d" : item.tone === "warning" ? "#9a5b00" : "#1f2937" }} />
                        <span>{statusBadge(item.tone)}</span>
                        <span>{item.label}</span>
                        <span style={item.state === "done" ? activeToneStyle : { color: "#1f2937" }}>{item.detail}</span>
                        <span style={{ opacity: 0.55 }}>[{item.state}]</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {isPortalBusy ? (
                <div className="portal-empty"><FileText size={52} weight="duotone" /><h2>{dictionary.portal.title}</h2><p>{dictionary.portal.loading}</p></div>
              ) : trackingError ? (
                <div className="portal-empty"><FileText size={52} weight="duotone" /><h2>{dictionary.portal.trackingError}</h2><p>{trackingError}</p><button className="gold-button" onClick={refreshTracking} disabled={loading}>{dictionary.portal.retry}</button></div>
              ) : tracking ? (
                <div className="portal-empty">
                  <FileText size={52} weight="duotone" />
                  <h2>{dictionary.portal.requestTracking}</h2>
                  <p>{dictionary.portal.requestId}: {tracking.requestId}</p>
                  <p>{dictionary.portal.bookingId}: {tracking.bookingId}</p>
                  {tracking.tapStatus ? (
                    <p>
                      {dictionary.portal.tapStatus}: <span style={statusToneStyles(statusTone(tracking.tapStatus))}>{tracking.tapStatus}</span>
                    </p>
                  ) : null}
                  {tracking.dispatchState ? <p>{dictionary.portal.dispatchState}: {statusBadge(dispatchTone)} <span style={statusToneStyles(dispatchTone)}>{dispatchStateText}</span></p> : null}
                  {tracking.dispatchToken ? <p>{dictionary.portal.dispatchToken}: {tracking.dispatchToken}</p> : null}
                  {tracking.lawyerName ? <p>{dictionary.portal.lawyerName}: {tracking.lawyerName}</p> : null}
                  <p>
                    {dictionary.portal.paymentStatus}: {statusBadge(paymentTone)} <span style={statusToneStyles(paymentTone)}>{paymentStatusText}</span>
                  </p>
                  <p>
                    {dictionary.portal.serviceStatus}: {statusBadge(serviceTone)} <span style={statusToneStyles(serviceTone)}>{serviceStatusText}</span>
                  </p>
                  {isDispatchPending ? <p>{dictionary.portal.trackingPending}</p> : null}
                  <button className="gold-button" onClick={refreshTracking} disabled={loading}>{dictionary.portal.refresh}</button>
                </div>
              ) : (
                <div className="portal-empty"><FileText size={52} weight="duotone" /><h2>{dictionary.portal.trackingPending}</h2><p>{dictionary.portal.empty}</p></div>
              )}
            </>
          ) : (
            <div className="portal-empty"><FileText size={52} weight="duotone" /><h2>{dictionary.portal.nav.requests}</h2><p>{dictionary.portal.empty}</p><button className="gold-button" onClick={() => site.openSos()}>{dictionary.portal.cta}</button></div>
          )}
        </section>
      </div>
    </main>
  );
}
