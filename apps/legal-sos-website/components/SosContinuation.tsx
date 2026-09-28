"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import styles from "./SosFlow.module.css";

type Lawyer = { id: string; name: string; etaMinutes?: number | null };
type Progress = {
  ok: boolean; paid: boolean; paymentStatus: string; tapStatus: string;
  requestId: string; reference: string; workflowType: string;
  serviceStatus: string; state: string; candidate: Lawyer | null;
  acceptedLawyer: Lawyer | null; locationAddress: string | null;
  customerLocation: { lat: number; lng: number } | null;
};
type ChatMessage = { id: string; senderRole: "client" | "lawyer"; body: string; createdAt: string };

const copy = {
  ar: {
    brand: "النجدة القانونية", title: "متابعة طلب النجدة", loading: "جارٍ التحقق من حالة الدفع...",
    error: "تعذر تحديث الطلب حاليًا. حاول مرة أخرى.", refresh: "تحديث الحالة",
    pending: "بانتظار تأكيد الدفع", failed: "لم يكتمل الدفع", restart: "طلب نجدة جديد",
    paid: "تم تأكيد الدفع", location: "حدد موقعك لإرسال المحامي", detect: "استخدم موقعي الحالي",
    lat: "خط العرض", lng: "خط الطول", locationDenied: "تعذر الوصول للموقع. يمكنك إدخال الإحداثيات يدويًا.",
    invalidLocation: "أدخل إحداثيات صحيحة للموقع.", confirmLocation: "تأكيد الموقع والبحث عن محامي",
    search: "جارٍ البحث عن محامي متاح", searchAgain: "البحث مجددًا",
    candidate: "محامي متاح", approve: "اختيار المحامي", skip: "ابحث عن محامي آخر",
    waiting: "بانتظار رد المحامي", accepted: "قبل المحامي الطلب", chat: "المحادثة مع المحامي",
    message: "اكتب رسالتك", send: "إرسال", chatError: "تعذر تحميل المحادثة. حاول التحديث.",
    home: "العودة للرئيسية", reference: "رقم الطلب", noAccess: "تعذر فتح الطلب. ارجع إلى المتصفح الذي بدأت منه الدفع.",
    map: "عرض الموقع على الخريطة", ready: "جارٍ تجهيز الطلب...",
  },
  en: {
    brand: "Legal SOS", title: "Track your SOS request", loading: "Checking payment status...",
    error: "Could not update the request. Please try again.", refresh: "Refresh status",
    pending: "Waiting for payment confirmation", failed: "Payment was not completed", restart: "New SOS request",
    paid: "Payment confirmed", location: "Set your location for the lawyer", detect: "Use my current location",
    lat: "Latitude", lng: "Longitude", locationDenied: "Location access failed. You can enter coordinates manually.",
    invalidLocation: "Enter valid location coordinates.", confirmLocation: "Confirm location and find a lawyer",
    search: "Finding an available lawyer", searchAgain: "Search again",
    candidate: "Available lawyer", approve: "Choose this lawyer", skip: "Find another lawyer",
    waiting: "Waiting for the lawyer's response", accepted: "The lawyer accepted your request", chat: "Chat with your lawyer",
    message: "Write a message", send: "Send", chatError: "Could not load chat. Please refresh.",
    home: "Back to home", reference: "Request number", noAccess: "Could not open the request. Return to the browser where you started payment.",
    map: "View location on a map", ready: "Preparing your request...",
  },
  tr: {
    brand: "Legal SOS", title: "SOS talebini takip et", loading: "Ödeme durumu kontrol ediliyor...",
    error: "Talep güncellenemedi. Tekrar deneyin.", refresh: "Durumu yenile",
    pending: "Ödeme onayı bekleniyor", failed: "Ödeme tamamlanmadı", restart: "Yeni SOS talebi",
    paid: "Ödeme onaylandı", location: "Avukat için konumunuzu belirleyin", detect: "Mevcut konumumu kullan",
    lat: "Enlem", lng: "Boylam", locationDenied: "Konuma erişilemedi. Koordinatları elle girebilirsiniz.",
    invalidLocation: "Geçerli koordinatlar girin.", confirmLocation: "Konumu onayla ve avukat ara",
    search: "Uygun avukat aranıyor", searchAgain: "Tekrar ara",
    candidate: "Uygun avukat", approve: "Avukatı seç", skip: "Başka avukat ara",
    waiting: "Avukatın yanıtı bekleniyor", accepted: "Avukat talebi kabul etti", chat: "Avukatınızla sohbet",
    message: "Mesaj yazın", send: "Gönder", chatError: "Sohbet yüklenemedi. Yenileyin.",
    home: "Ana sayfaya dön", reference: "Talep numarası", noAccess: "Talep açılamadı. Ödemeyi başlattığınız tarayıcıya dönün.",
    map: "Konumu haritada gör", ready: "Talep hazırlanıyor...",
  },
};

export function SosContinuation({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [requestId, setRequestId] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [draft, setDraft] = useState("");
  const directSearchStarted = useRef(false);
  const messageId = useRef("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("requestId") || "";
    setRequestId(id);
  }, []);

  const refresh = useCallback(async (id = requestId) => {
    if (!id) return;
    try {
      const response = await fetch("/api/sos/progress?requestId=" + encodeURIComponent(id), { cache: "no-store" });
      const data = await response.json() as Progress & { error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "status");
      setProgress(data);
      setError("");
    } catch {
      setError(t.error);
    }
  }, [requestId, t.error]);

  useEffect(() => {
    if (!requestId) return;
    void refresh(requestId);
    const timer = window.setInterval(() => { void refresh(requestId); }, 4000);
    return () => window.clearInterval(timer);
  }, [refresh, requestId]);

  const dispatch = useCallback(async (action: "find" | "approve" | "skip", coordinates?: { latitude: number; longitude: number }) => {
    if (!requestId || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/sos/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId, action, ...coordinates,
          ...(action !== "find" && progress?.candidate ? { candidateId: progress.candidate.id } : {}),
        }),
      });
      const data = await response.json() as { candidate?: Lawyer | null; error?: string };
      if (!response.ok) throw new Error(data.error || "dispatch");
      if (action === "find") setProgress((current) => current ? { ...current, candidate: data.candidate || null } : current);
      if (action === "skip") {
        setProgress((current) => current ? { ...current, candidate: null } : current);
        directSearchStarted.current = false;
      }
      await refresh();
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }, [busy, progress?.candidate, refresh, requestId, t.error]);

  useEffect(() => {
    if (!progress?.paid || progress.workflowType !== "direct_consultation" ||
        progress.candidate || progress.acceptedLawyer || progress.state === "awaiting_lawyer" ||
        directSearchStarted.current) return;
    directSearchStarted.current = true;
    void dispatch("find");
  }, [dispatch, progress?.paid, progress?.workflowType, progress?.candidate, progress?.acceptedLawyer, progress?.state]);

  function detectLocation() {
    if (!navigator.geolocation) {
      setError(t.locationDenied);
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setError("");
        setBusy(false);
      },
      () => { setError(t.locationDenied); setBusy(false); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  function confirmLocation() {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!latitude || !longitude || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError(t.invalidLocation);
      return;
    }
    void dispatch("find", { latitude: lat, longitude: lng });
  }

  const loadMessages = useCallback(async () => {
    if (!requestId) return;
    try {
      const response = await fetch("/api/sos/messages?requestId=" + encodeURIComponent(requestId), { cache: "no-store" });
      const data = await response.json() as { messages?: ChatMessage[]; capabilities?: { send?: boolean } };
      if (!response.ok || !Array.isArray(data.messages)) throw new Error("messages");
      setMessages(data.messages.slice().reverse());
      setCanSend(Boolean(data.capabilities?.send));
    } catch {
      setError(t.chatError);
    }
  }, [requestId, t.chatError]);

  useEffect(() => {
    if (!progress?.paid || progress.workflowType !== "direct_consultation" || !progress.acceptedLawyer) return;
    void loadMessages();
    const timer = window.setInterval(() => { void loadMessages(); }, 3500);
    return () => window.clearInterval(timer);
  }, [loadMessages, progress?.paid, progress?.workflowType, progress?.acceptedLawyer]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !canSend || busy) return;
    setBusy(true);
    if (!messageId.current) messageId.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/sos/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, message: body, clientMessageId: messageId.current }),
      });
      if (!response.ok) throw new Error("send");
      setDraft("");
      messageId.current = "";
      await loadMessages();
      setError("");
    } catch {
      setError(t.chatError);
    } finally {
      setBusy(false);
    }
  }

  const direct = progress?.workflowType === "direct_consultation";
  const failed = progress && (["failed", "declined", "cancelled", "canceled"].includes(progress.paymentStatus.toLowerCase()) ||
    ["FAILED", "DECLINED", "CANCELLED", "ABANDONED"].includes(progress.tapStatus));
  const mapUrl = latitude && longitude
    ? "https://www.google.com/maps?q=" + encodeURIComponent(latitude + "," + longitude)
    : "";

  return (
    <main className={styles.page} dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className={styles.pageShell}>
        <header className={styles.pageHeader}><Link href={"/" + locale} className={styles.homeLink}>{t.brand}</Link><span>SOS</span></header>
        <div className={styles.continuation}>
          <div className={styles.eyebrow}>LEGAL SOS / REQUEST</div>
          <h1>{t.title}</h1>
          {progress && <p className={styles.reference}>{t.reference}: <bdi>{progress.reference}</bdi></p>}
          {!requestId && <p className={styles.error}>{t.noAccess}</p>}
          {requestId && !progress && !error && <p role="status">{t.loading}</p>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {requestId && <button type="button" className={styles.secondary} onClick={() => { void refresh(); }} disabled={busy}>{t.refresh}</button>}
          {progress && !progress.paid && (
            <div className={styles.statusCard}>
              <div className={styles.statusDot} />
              <h2>{failed ? t.failed : t.pending}</h2>
              <p>{t.loading}</p>
              {failed && <Link className={styles.primaryLink} href={"/" + locale}>{t.restart}</Link>}
            </div>
          )}
          {progress?.paid && (
            <div className={styles.statusCard}>
              <div className={styles.paidDot} />
              <h2>{t.paid}</h2>
              {!progress.workflowType && <p>{t.ready}</p>}
            </div>
          )}
          {progress?.paid && !direct && progress.workflowType && !progress.candidate && !progress.acceptedLawyer &&
            progress.state !== "awaiting_lawyer" && (
            <section className={styles.section}>
              <h2>{t.location}</h2>
              <button type="button" className={styles.secondary} onClick={detectLocation} disabled={busy}>{t.detect}</button>
              <div className={styles.coordinateGrid}>
                <label className={styles.field}><span>{t.lat}</span><input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label>
                <label className={styles.field}><span>{t.lng}</span><input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label>
              </div>
              {mapUrl && <a className={styles.mapLink} href={mapUrl} target="_blank" rel="noopener noreferrer">{t.map}</a>}
              <button type="button" className={styles.primary} onClick={confirmLocation} disabled={busy}>{t.confirmLocation}</button>
            </section>
          )}
          {progress?.paid && progress.candidate && !progress.acceptedLawyer && (
            <section className={styles.section}>
              <p className={styles.eyebrow}>{t.candidate}</p>
              <h2>{progress.candidate.name}</h2>
              {progress.candidate.etaMinutes != null && <p>{progress.candidate.etaMinutes} min</p>}
              <div className={styles.actions}>
                <button type="button" className={styles.primary} disabled={busy} onClick={() => { void dispatch("approve"); }}>{t.approve}</button>
                <button type="button" className={styles.secondary} disabled={busy} onClick={() => { void dispatch("skip"); }}>{t.skip}</button>
              </div>
            </section>
          )}
          {progress?.paid && !progress.acceptedLawyer && !progress.candidate &&
            (direct || progress.state === "awaiting_lawyer") && (
            <section className={styles.section}>
              <h2>{progress.state === "awaiting_lawyer" ? t.waiting : t.search}</h2>
              {progress.state !== "awaiting_lawyer" &&
                <button type="button" className={styles.secondary} disabled={busy} onClick={() => { void dispatch("find"); }}>{t.searchAgain}</button>}
            </section>
          )}
          {progress?.paid && progress.acceptedLawyer && (
            <section className={styles.section}>
              <p className={styles.eyebrow}>{t.accepted}</p>
              <h2>{progress.acceptedLawyer.name}</h2>
            </section>
          )}
          {progress?.paid && direct && progress.acceptedLawyer && (
            <section className={styles.section}>
              <h2>{t.chat}</h2>
              <div className={styles.messages} role="log" aria-live="polite">
                {messages.map((message) => <article key={message.id} className={message.senderRole === "client" ? styles.ownMessage : styles.peerMessage}>
                  <p>{message.body}</p><time>{new Date(message.createdAt).toLocaleTimeString(locale)}</time>
                </article>)}
              </div>
              <form className={styles.chatForm} onSubmit={sendMessage}>
                <input value={draft} maxLength={4000} onChange={(event) => { setDraft(event.target.value); messageId.current = ""; }} placeholder={t.message} aria-label={t.message} />
                <button type="submit" className={styles.primary} disabled={!canSend || !draft.trim() || busy}>{t.send}</button>
              </form>
            </section>
          )}
          <Link className={styles.homeLink} href={"/" + locale}>{t.home}</Link>
        </div>
      </div>
    </main>
  );
}
