"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Siren,
  Phone,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Power,
  LogOut,
  MapPin,
  RefreshCw,
  Bell,
  BellOff,
  Smartphone,
  X,
} from "lucide-react";
import { playSosAlarm, vibrate } from "@/lib/sos/sirenAudio";
import SosShiftPanel from "@/components/SosShiftPanel";

interface Advocate {
  id: string;
  fullName: string;
  registrationNo: string;
  email: string | null;
  phone: string;
  isEmergencyReady: boolean;
  emergencyRadiusKm: number;
}

interface MyCase {
  id: string;
  caseRef: string;
  caseType: string;
  caseTypeLabel: { en: string; ar: string };
  contactName: string;
  contactPhone: string;
  description: string | null;
  location: { lat: number; lng: number; address?: string } | null;
  baseFee: number;
  paymentStatus: string;
  serviceStatus: string;
  createdAtIso: string;
  responseTsIso: string | null;
  arrivalTsIso: string | null;
  completedTsIso: string | null;
}

interface Pickup {
  id: string;
  caseRef: string;
  caseType: string;
  caseTypeLabel: { en: string; ar: string };
  description: string | null;
  location: { lat: number; lng: number; address?: string } | null;
  baseFee: number;
  createdAtIso: string;
  distanceKm: number | null;
}

export default function Dashboard({
  advocate,
  myCases,
  pickups,
}: {
  advocate: Advocate;
  myCases: MyCase[];
  pickups: Pickup[];
}) {
  const t = useTranslations("sos.lawyerDashboard");
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();

  const [online, setOnline] = useState(advocate.isEmergencyReady);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pushState, setPushState] = useState<
    "unsupported" | "denied" | "off" | "on" | "loading"
  >("loading");
  const [isInAppWebView, setIsInAppWebView] = useState(false);
  const [foregroundAlert, setForegroundAlert] = useState<
    | {
        caseRef: string;
        baseFee: number;
        distanceKm: number | null;
      }
    | null
  >(null);
  const seenPickupIdsRef = useRef<Set<string>>(new Set());
  const lastPollIsoRef = useRef<string | null>(null);
  const audioPrimedRef = useRef(false);
  const [, startTransition] = useTransition();

  // Detect iOS WebView (the embedded shell) so we can hide the push
  // button and surface the foreground polling explanation instead of
  // pretending Web Push will work.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent;
    // WKWebView markers: iOS UA without `Safari/` token, or our own
    // shell sets `data-in-app="1"` on <html> via SSR (see
    // i18n/proxy.ts + layout.tsx). Either signal is a sufficient hint.
    const isIos = /iPhone|iPad|iPod/.test(ua);
    const looksLikeWebView = isIos && !/Safari/.test(ua);
    const htmlAttr =
      typeof document !== "undefined"
        ? document.documentElement.getAttribute("data-in-app")
        : null;
    setIsInAppWebView(looksLikeWebView || htmlAttr === "1");
  }, []);

  // Detect Web Push capability + current subscription state on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    navigator.serviceWorker
      .getRegistration("/sos-sw.js")
      .then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        setPushState(sub ? "on" : "off");
      })
      .catch(() => setPushState("off"));
  }, []);

  async function enableNotifications() {
    setPushState("loading");
    try {
      // 1. Register the SW (idempotent — same scope reuses).
      const reg = await navigator.serviceWorker.register("/sos-sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;
      // 2. Ask permission.
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushState(perm === "denied" ? "denied" : "off");
        return;
      }
      // 3. Subscribe.
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        alert("Notifications are not configured on the server.");
        setPushState("off");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Browser TS lib insists on a strict ArrayBufferView<ArrayBuffer>
        // — Uint8Array satisfies the runtime contract but not the narrow
        // type, so we cast explicitly.
        applicationServerKey: urlBase64ToUint8Array(
          vapidKey,
        ) as unknown as BufferSource,
      });
      // 4. Tell the server.
      const json = sub.toJSON();
      await fetch("/api/sos/lawyer/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      setPushState("on");
    } catch (e) {
      console.error("enableNotifications failed", e);
      setPushState("off");
    }
  }

  async function disableNotifications() {
    setPushState("loading");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sos-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/sos/lawyer/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushState("off");
    } catch (e) {
      console.error("disableNotifications failed", e);
      setPushState("on");
    }
  }

  // Live tracking: while the advocate has any case in `mobilizing`,
  // watch their GPS via the browser API and POST it every ~30s to
  // /api/sos/lawyer/case/[caseRef]/location. The client's status
  // endpoint then exposes the live ETA. The watcher stops when there
  // are no mobilizing cases left, so an idle advocate doesn't drain
  // their battery.
  const streamingCaseRefs = myCases
    .filter((c) => c.serviceStatus === "mobilizing")
    .map((c) => c.caseRef);
  const streamingKey = streamingCaseRefs.join(",");
  const lastSentRef = useRef<{ ts: number; lat: number; lng: number } | null>(
    null,
  );

  useEffect(() => {
    if (!streamingCaseRefs.length || typeof navigator === "undefined") return;
    if (!navigator.geolocation) return;
    let cancelled = false;

    const send = (pos: GeolocationPosition) => {
      const now = Date.now();
      const last = lastSentRef.current;
      // Throttle: only push if we haven't pushed in 25s OR we've moved
      // 30 metres. Keeps the network chatter sane while still feeling
      // live to the client.
      if (last) {
        const dtSec = (now - last.ts) / 1000;
        const distMeters = roughMeters(
          last.lat,
          last.lng,
          pos.coords.latitude,
          pos.coords.longitude,
        );
        if (dtSec < 25 && distMeters < 30) return;
      }
      lastSentRef.current = {
        ts: now,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      for (const caseRef of streamingCaseRefs) {
        if (cancelled) break;
        fetch(`/api/sos/lawyer/case/${encodeURIComponent(caseRef)}/location`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            location: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          }),
        }).catch(() => {
          /* swallow — next tick will retry */
        });
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!cancelled) send(pos);
      },
      (err) => {
        // GPS denial isn't fatal — the advocate can still mark arrival
        // manually. Log and move on.
        console.warn("[sos/lawyer] geolocation watch error", err);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 60000 },
    );
    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
    // The list of streaming case refs is the only thing that changes
    // the watcher's lifetime, and we serialise it as a string so React
    // sees a stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingKey]);

  // Foreground pickup polling — covers iOS WebView (no Web Push) and
  // browsers where the operator declined the push permission. Polls
  // every 15 s while the advocate is online, ringing the siren only
  // for cases that arrived after the last poll.
  useEffect(() => {
    if (!online) {
      // Reset the seen-set when going offline so the next online cycle
      // doesn't ring the siren for stale pickups already on screen.
      seenPickupIdsRef.current.clear();
      lastPollIsoRef.current = null;
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      try {
        const url = lastPollIsoRef.current
          ? `/api/sos/lawyer/pickups/check?since=${encodeURIComponent(lastPollIsoRef.current)}`
          : "/api/sos/lawyer/pickups/check";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as {
          now: string;
          advocateOnline: boolean;
          pickups: Array<{
            id: string;
            caseRef: string;
            baseFee: number;
            distanceKm: number | null;
            createdAtIso: string;
          }>;
        };
        const newOnes = data.pickups.filter(
          (p) => !seenPickupIdsRef.current.has(p.id),
        );
        for (const p of newOnes) seenPickupIdsRef.current.add(p.id);
        // Only ring the siren on subsequent polls — the first poll
        // bootstraps the seen-set with whatever's already on screen.
        const isFirstPoll = lastPollIsoRef.current == null;
        lastPollIsoRef.current = data.now;
        if (!isFirstPoll && newOnes.length > 0) {
          const first = newOnes[0];
          setForegroundAlert({
            caseRef: first.caseRef,
            baseFee: first.baseFee,
            distanceKm: first.distanceKm,
          });
          // Ring + vibrate. Audio context only "primes" once the user
          // has tapped Go Online — see audioPrimedRef in toggleOnline.
          void playSosAlarm(2);
          vibrate([200, 80, 200, 80, 200]);
          // Refresh the server-rendered list so the new card actually
          // appears in the pickups section under the alert.
          startTransition(() => router.refresh());
        }
      } catch {
        /* swallow — next tick will retry */
      } finally {
        if (!cancelled) timer = setTimeout(tick, 15_000);
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function toggleOnline() {
    const next = !online;
    setOnline(next);
    // Prime the AudioContext on the user gesture that turns the
    // advocate online. iOS WebView caches the gesture for the
    // remainder of the session so the polling layer can ring the
    // siren without a fresh tap each time.
    if (next && !audioPrimedRef.current) {
      void playSosAlarm(0); // 0 cycles = silent prime
      audioPrimedRef.current = true;
    }
    try {
      await fetch("/api/sos/lawyer/online", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isEmergencyReady: next }),
      });
    } catch {
      setOnline(!next);
    }
  }

  async function logout() {
    await fetch("/api/sos/lawyer/logout", { method: "POST" });
    router.push(`/${locale}/sos/lawyer/login`);
  }

  async function accept(caseRef: string) {
    setBusyId(caseRef);
    try {
      const res = await fetch(
        `/api/sos/lawyer/case/${encodeURIComponent(caseRef)}/accept`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`${t("errors.acceptFailed")}: ${data.error ?? res.status}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  async function markArrived(caseRef: string) {
    setBusyId(caseRef);
    try {
      if (!navigator.geolocation) {
        alert(t("errors.geolocationUnavailable"));
        return;
      }
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });
      const res = await fetch(
        `/api/sos/lawyer/case/${encodeURIComponent(caseRef)}/arrived`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            location: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          distanceMeters?: number;
          requiredMeters?: number;
        };
        if (data.error === "geofence_failed") {
          alert(
            t("errors.geofenceFailed", {
              actual: data.distanceMeters ?? 0,
              required: data.requiredMeters ?? 0,
            }),
          );
        } else {
          alert(`${t("errors.arrivedFailed")}: ${data.error ?? res.status}`);
        }
        return;
      }
      startTransition(() => router.refresh());
    } catch (e) {
      alert(t("errors.geolocationDenied"));
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  async function complete(caseRef: string) {
    setBusyId(caseRef);
    try {
      const res = await fetch(
        `/api/sos/lawyer/case/${encodeURIComponent(caseRef)}/complete`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`${t("errors.completeFailed")}: ${data.error ?? res.status}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = myCases.filter(
    (c) => c.serviceStatus !== "completed" && c.serviceStatus !== "cancelled",
  ).length;

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A237E] via-[#0D1660] to-[#1A237E] text-white">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D32F2F]">
              <Siren size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                {t("eyebrow")}
              </div>
              <div className="text-base font-extrabold leading-tight truncate">
                {advocate.fullName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Hide the Web Push button when running inside the iOS
                WebView shell; Apple blocks the Notification API there
                and the foreground polling layer covers that surface. */}
            {!isInAppWebView && (
              <PushButton
                state={pushState}
                onEnable={enableNotifications}
                onDisable={disableNotifications}
                labels={{
                  enable: t("enableNotifications"),
                  enabled: t("notificationsOn"),
                  denied: t("notificationsDenied"),
                }}
              />
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[11px] font-semibold hover:bg-white/25"
            >
              <LogOut size={12} />
              {t("logout")}
            </button>
          </div>
        </div>
      </div>

      {/* Foreground alert — drops in when polling sees a new pickup */}
      {foregroundAlert && (
        <div className="fixed inset-x-3 top-3 z-50 flex justify-center">
          <div className="flex w-full max-w-md items-center gap-3 rounded-xl bg-[#D32F2F] p-4 text-white shadow-2xl ring-2 ring-white/40">
            <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
              <span className="absolute inset-0 animate-ping rounded-lg bg-white/30" />
              <Siren size={18} className="relative" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/85">
                {t("newPickup")}
              </div>
              <div className="font-extrabold leading-tight">
                {foregroundAlert.caseRef}
                <span className="ms-2 text-[12px] font-bold text-white/90">
                  {foregroundAlert.baseFee} SAR
                </span>
              </div>
              {foregroundAlert.distanceKm != null && (
                <div className="text-[11px] text-white/85">
                  {foregroundAlert.distanceKm.toFixed(2)} km
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setForegroundAlert(null)}
              className="rounded-md p-1 hover:bg-white/15"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-5 -mt-4 space-y-4">
        {/* WebView notice — Apple blocks Web Push inside WKWebView. The
            polling layer above covers the foreground case; we recommend
            Safari + Add to Home Screen for background pushes. */}
        {isInAppWebView && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900 leading-relaxed">
            <div className="flex items-start gap-2">
              <Smartphone size={14} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <strong className="font-bold">{t("webviewBannerTitle")}</strong>
                <p className="mt-0.5">{t("webviewBannerBody")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Online toggle */}
        <section
          className={`rounded-2xl p-5 shadow-md border transition-colors ${
            online
              ? "bg-emerald-50 border-emerald-200"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                <Power
                  size={12}
                  className={online ? "text-emerald-600" : "text-text-muted"}
                />
                {online ? t("online") : t("offline")}
              </div>
              <div className="mt-1 text-[14px] font-extrabold text-text-primary leading-tight">
                {online ? t("onlineHeadline") : t("offlineHeadline")}
              </div>
              <div className="mt-1 text-[11px] text-text-muted">
                {t("radius", { km: advocate.emergencyRadiusKm })}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleOnline}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-extrabold ${
                online
                  ? "bg-emerald-600 text-white"
                  : "bg-[#1A237E] text-white"
              }`}
            >
              {online ? t("goOffline") : t("goOnline")}
            </button>
          </div>
        </section>

        {/* Recurring shift schedule */}
        <SosShiftPanel />

        {/* My active cases */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[14px] font-extrabold text-text-primary">
              {t("myCasesTitle")} · {activeCount}
            </h2>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-text-muted"
            >
              <RefreshCw size={11} />
              {t("refresh")}
            </button>
          </div>
          {myCases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-[13px] text-text-muted">
              {t("noMyCases")}
            </div>
          ) : (
            <div className="space-y-3">
              {myCases.map((c) => (
                <CaseCard
                  key={c.id}
                  c={c}
                  isAr={isAr}
                  busy={busyId === c.caseRef}
                  onArrived={markArrived}
                  onComplete={complete}
                />
              ))}
            </div>
          )}
        </section>

        {/* Pending pickups (unassigned cases in radius) */}
        <section>
          <h2 className="text-[14px] font-extrabold text-text-primary mb-2">
            {t("pickupsTitle")} · {pickups.length}
          </h2>
          {pickups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-[13px] text-text-muted">
              {t("noPickups")}
            </div>
          ) : (
            <div className="space-y-2">
              {pickups.map((p) => {
                const mapsUrl = p.location
                  ? `https://maps.google.com/?q=${p.location.lat},${p.location.lng}`
                  : null;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm"
                  >
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                      <span className="font-mono text-[12px] font-extrabold text-[#D32F2F]">
                        {p.caseRef}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(p.createdAtIso).toLocaleTimeString(
                          isAr ? "ar-SA" : "en-GB",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    </div>
                    <h3 className="mt-1 text-[13px] font-bold text-text-primary">
                      {isAr ? p.caseTypeLabel.ar : p.caseTypeLabel.en}
                      <span className="ms-2 text-[11px] font-bold text-[#1A237E]">
                        {p.baseFee} SAR
                      </span>
                    </h3>
                    {p.distanceKm != null && (
                      <div className="mt-1 text-[11px] text-text-muted">
                        {p.distanceKm.toFixed(2)} km
                      </div>
                    )}
                    {p.description && (
                      <p className="mt-1 text-[12px] text-text-primary line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold"
                        >
                          <ExternalLink size={11} />
                          {t("openMap")}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => accept(p.caseRef)}
                        disabled={busyId === p.caseRef}
                        className="inline-flex items-center gap-1 rounded-md bg-[#D32F2F] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                      >
                        {busyId === p.caseRef ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        {t("accept")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CaseCard({
  c,
  isAr,
  busy,
  onArrived,
  onComplete,
}: {
  c: MyCase;
  isAr: boolean;
  busy: boolean;
  onArrived: (caseRef: string) => void;
  onComplete: (caseRef: string) => void;
}) {
  const t = useTranslations("sos.lawyerDashboard");
  const mapsUrl = c.location
    ? `https://maps.google.com/?q=${c.location.lat},${c.location.lng}`
    : null;
  const waLink = `https://wa.me/${c.contactPhone.replace(/[^0-9]/g, "")}`;

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[12px] font-extrabold text-[#D32F2F]">
            {c.caseRef}
          </span>
          <StatusPill status={c.serviceStatus} isAr={isAr} />
        </div>
        <span className="text-[10px] text-text-muted">
          {new Date(c.createdAtIso).toLocaleString(isAr ? "ar-SA" : "en-GB", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
      </div>
      <h3 className="mt-1 text-[13px] font-bold text-text-primary">
        {isAr ? c.caseTypeLabel.ar : c.caseTypeLabel.en}
        <span className="ms-2 text-[11px] font-bold text-[#1A237E]">
          {c.baseFee} SAR
        </span>
      </h3>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            {t("client")}
          </div>
          <div className="font-semibold">{c.contactName}</div>
          <a href={`tel:${c.contactPhone}`} className="text-[#1A237E]" dir="ltr">
            {c.contactPhone}
          </a>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            {t("location")}
          </div>
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#1A237E]"
            >
              <MapPin size={11} />
              {c.location!.lat.toFixed(4)}, {c.location!.lng.toFixed(4)}
            </a>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </div>
      </div>
      {c.description && (
        <p className="mt-2 text-[12px] text-text-primary line-clamp-3">
          {c.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white"
        >
          {t("whatsapp")}
        </a>
        {c.serviceStatus === "mobilizing" && (
          <button
            type="button"
            onClick={() => onArrived(c.caseRef)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
            {t("markArrived")}
          </button>
        )}
        {(c.serviceStatus === "arrived" || c.serviceStatus === "mobilizing") && (
          <button
            type="button"
            onClick={() => onComplete(c.caseRef)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
          >
            <CheckCircle2 size={12} />
            {t("markCompleted")}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status, isAr }: { status: string; isAr: boolean }) {
  const map: Record<string, { en: string; ar: string; cls: string }> = {
    pending: {
      en: "Pending",
      ar: "قيد الانتظار",
      cls: "bg-amber-100 text-amber-800",
    },
    mobilizing: {
      en: "Mobilizing",
      ar: "في الطريق",
      cls: "bg-blue-100 text-blue-800",
    },
    arrived: {
      en: "On site",
      ar: "في الموقع",
      cls: "bg-purple-100 text-purple-800",
    },
    completed: {
      en: "Completed",
      ar: "مكتملة",
      cls: "bg-emerald-100 text-emerald-800",
    },
    cancelled: {
      en: "Cancelled",
      ar: "ملغاة",
      cls: "bg-gray-200 text-gray-700",
    },
    disputed: {
      en: "Disputed",
      ar: "قيد المراجعة",
      cls: "bg-red-100 text-red-800",
    },
  };
  const m = map[status] ?? { en: status, ar: status, cls: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}>
      {isAr ? m.ar : m.en}
    </span>
  );
}

/** Quick spherical-Earth metric distance for the GPS throttle. We
 *  don't need full Haversine precision here — only "did we move at
 *  all". One degree of latitude is ~111km; longitude is ~111*cos(lat).
 */
function roughMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = (lat2 - lat1) * 110_540;
  const dLng = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** VAPID public keys are URL-safe base64; the Push API expects a raw
 *  Uint8Array. */
function urlBase64ToUint8Array(s: string): Uint8Array {
  const padding = "=".repeat((4 - (s.length % 4)) % 4);
  const base64 = (s + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

interface PushButtonProps {
  state: "unsupported" | "denied" | "off" | "on" | "loading";
  onEnable: () => void;
  onDisable: () => void;
  labels: { enable: string; enabled: string; denied: string };
}

function PushButton({ state, onEnable, onDisable, labels }: PushButtonProps) {
  if (state === "unsupported") return null;
  if (state === "denied") {
    return (
      <span
        title={labels.denied}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[11px] font-semibold opacity-60"
      >
        <BellOff size={12} />
        {labels.denied}
      </span>
    );
  }
  if (state === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[11px] font-semibold">
        <Loader2 size={12} className="animate-spin" />
      </span>
    );
  }
  if (state === "on") {
    return (
      <button
        type="button"
        onClick={onDisable}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold ring-1 ring-emerald-400/40"
      >
        <Bell size={12} />
        {labels.enabled}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onEnable}
      className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[11px] font-semibold hover:bg-white/25"
    >
      <Bell size={12} />
      {labels.enable}
    </button>
  );
}
