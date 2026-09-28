"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";

const SosLiveMap = dynamic(() => import("@/components/SosLiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
  ),
});
import {
  CheckCircle2,
  Download,
  Phone,
  MessageCircle,
  Clock,
  Navigation,
  ExternalLink,
} from "lucide-react";
import { formatBahrainDateTime } from "@/lib/sos/bahrain-time";
import SosRatingPanel from "@/components/SosRatingPanel";

interface Props {
  caseRef: string;
  caseTypeLabel: { en: string; ar: string };
  contactName: string;
  contactPhone: string;
  baseFeeBhd: number;
  serviceStatus: string;
  createdAtIso: string;
  requestLocation: { lat: number; lng: number } | null;
}

interface StatusPayload {
  caseRef: string;
  serviceStatus: string;
  paymentStatus: string;
  hasRating: boolean;
  hasAssignedAdvocate: boolean;
  responseTsIso: string | null;
  arrivalTsIso: string | null;
  completedTsIso: string | null;
  advocateLocation:
    | { lat: number; lng: number; accuracy?: number; reportedAt: string }
    | null;
  distanceKm: number | null;
  etaMinutes: number | null;
}

const POLL_INTERVAL_MS = 5000;

export default function ConfirmedContent({
  caseRef,
  caseTypeLabel,
  contactName,
  contactPhone,
  baseFeeBhd,
  serviceStatus: initialStatus,
  createdAtIso,
  requestLocation,
}: Props) {
  const t = useTranslations("sos.confirmation");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [status, setStatus] = useState(initialStatus);
  const [hasRating, setHasRating] = useState(false);
  const [tsResponse, setTsResponse] = useState<string | null>(null);
  const [tsArrival, setTsArrival] = useState<string | null>(null);
  const [tsCompleted, setTsCompleted] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [advocateLocation, setAdvocateLocation] = useState<
    StatusPayload["advocateLocation"]
  >(null);

  // Poll the public status endpoint every 5s while the case is open.
  // Stops once the case is closed (completed / cancelled).
  useEffect(() => {
    const closed = ["completed", "cancelled"];
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const res = await fetch(
          `/api/sos/status/${encodeURIComponent(caseRef)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as StatusPayload;
        if (cancelled) return;
        setStatus(data.serviceStatus);
        setHasRating(data.hasRating);
        setTsResponse(data.responseTsIso);
        setTsArrival(data.arrivalTsIso);
        setTsCompleted(data.completedTsIso);
        setDistanceKm(data.distanceKm ?? null);
        setEtaMinutes(data.etaMinutes ?? null);
        setAdvocateLocation(data.advocateLocation);
        if (!closed.includes(data.serviceStatus)) {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch {
        // Silently retry on network blips.
        if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [caseRef]);

  const dispatchPhone = "+97336470706";
  const waLink = `https://wa.me/${dispatchPhone.replace(/^\+/, "")}?text=${encodeURIComponent(
    `Legal SOS — ${caseRef}\n${contactName}\n${contactPhone}`,
  )}`;

  const isCompleted = status === "completed";
  const isMobilizing = status === "mobilizing";
  const isArrived = status === "arrived";
  const heroFrom = isCompleted ? "#0F766E" : "#1A237E";
  const heroTo = isCompleted ? "#0D5752" : "#0D1660";

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      <div
        className="text-white"
        style={{
          background: `linear-gradient(135deg, ${heroFrom}, ${heroTo}, ${heroFrom})`,
        }}
      >
        <div className="max-w-2xl mx-auto px-5 py-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
            <CheckCircle2 size={14} />
            {t("title")}
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold leading-tight">
            {isAr ? caseTypeLabel.ar : caseTypeLabel.en}
          </h1>
          <p className="mt-2 text-sm text-white/85 leading-relaxed">
            {isCompleted
              ? isAr
                ? "اكتملت الخدمة. شكراً لك."
                : "Service completed. Thank you."
              : isArrived
                ? isAr
                  ? "وصل المحامي إلى موقعك."
                  : "The advocate has arrived at your location."
                : isMobilizing
                  ? isAr
                    ? "المحامي في الطريق إليك."
                    : "An advocate is on the way to you."
                  : t("subtitle")}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 -mt-6 space-y-4">
        {/* Live ETA card — only while advocate is en route */}
        {isMobilizing && etaMinutes != null && distanceKm != null && (
          <LiveEtaCard
            etaMinutes={etaMinutes}
            distanceKm={distanceKm}
            advocateLocation={advocateLocation}
            isAr={isAr}
          />
        )}

        {/* Live map — visible while there's an advocate inbound */}
        {isMobilizing && requestLocation && (
          <SosLiveMap
            requestLocation={requestLocation}
            advocateLocation={advocateLocation}
            isAr={isAr}
          />
        )}

        {/* Live status card */}
        <section className="rounded-2xl bg-white p-5 shadow-md border border-gray-100">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              {t("caseRef")}
            </span>
            <span className="font-mono text-base font-extrabold text-[#D32F2F]">
              {caseRef}
            </span>
          </div>

          <ProgressTimeline
            status={status}
            isAr={isAr}
            tsResponse={tsResponse}
            tsArrival={tsArrival}
            tsCompleted={tsCompleted}
          />

          <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
            <Metric
              label={isAr ? "أتعاب أولية" : "Initial Fee"}
              value={`${baseFeeBhd} BHD`}
            />
            <Metric
              label={isAr ? "الاسم" : "Name"}
              value={contactName}
            />
            <Metric
              label={isAr ? "الهاتف" : "Phone"}
              value={contactPhone}
              dir="ltr"
            />
            <Metric
              label={isAr ? "أُنشئت" : "Created"}
              value={formatBahrainDateTime(
                createdAtIso,
                isAr ? "ar-BH" : "en-GB",
              )}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
          <a
            href={`/api/sos/agreement/${encodeURIComponent(caseRef)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1A237E] py-3 text-[13px] font-extrabold text-white"
          >
            <Download size={15} />
            {t("downloadAgreement")}
          </a>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`tel:${dispatchPhone}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-[13px] font-bold text-text-primary"
            >
              <Phone size={15} />
              {t("callDispatch")}
            </a>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-[13px] font-bold text-white"
            >
              <MessageCircle size={15} />
              {t("whatsappDispatch")}
            </a>
          </div>
        </section>

        {/* Rating prompt (only when status === completed) */}
        {isCompleted && (
          <SosRatingPanel
            caseRef={caseRef}
            initialStars={hasRating ? 0 : null}
          />
        )}

        <div className="rounded-xl bg-[#D32F2F]/[0.06] border border-[#D32F2F]/20 p-4 text-[12px] text-[#D32F2F] leading-relaxed">
          {t("thankYou")}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div className="mt-0.5 font-semibold text-text-primary" dir={dir}>
        {value}
      </div>
    </div>
  );
}

interface TimelineProps {
  status: string;
  isAr: boolean;
  tsResponse: string | null;
  tsArrival: string | null;
  tsCompleted: string | null;
}

function ProgressTimeline({
  status,
  isAr,
  tsResponse,
  tsArrival,
  tsCompleted,
}: TimelineProps) {
  const order = ["pending", "mobilizing", "arrived", "completed"];
  const idx = order.indexOf(status);
  const isCancelled = status === "cancelled";
  const stops: Array<{ key: string; en: string; ar: string; ts: string | null }> = [
    {
      key: "pending",
      en: "Received",
      ar: "تم الاستلام",
      ts: null,
    },
    {
      key: "mobilizing",
      en: "Advocate dispatched",
      ar: "المحامي في الطريق",
      ts: tsResponse,
    },
    {
      key: "arrived",
      en: "On site",
      ar: "وصل المحامي",
      ts: tsArrival,
    },
    {
      key: "completed",
      en: "Completed",
      ar: "اكتملت",
      ts: tsCompleted,
    },
  ];

  return (
    <div className="mt-4">
      {isCancelled ? (
        <div className="rounded-lg bg-gray-100 p-3 text-center text-[12px] font-semibold text-gray-700">
          {isAr ? "تم إلغاء الطلب" : "Request cancelled"}
        </div>
      ) : (
        <ol className="space-y-2">
          {stops.map((stop, i) => {
            const reached = i <= idx;
            const current = i === idx;
            return (
              <li key={stop.key} className="flex items-center gap-3">
                <span
                  className={`relative flex h-6 w-6 items-center justify-center rounded-full ${
                    reached ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {current && status !== "completed" && (
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  {reached ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Clock size={12} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-[13px] font-semibold ${
                      reached ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {isAr ? stop.ar : stop.en}
                  </div>
                  {stop.ts && (
                    <div className="text-[10px] text-text-muted">
                      {new Date(stop.ts).toLocaleTimeString(
                        isAr ? "ar-BH" : "en-GB",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

interface LiveEtaCardProps {
  etaMinutes: number;
  distanceKm: number;
  advocateLocation: {
    lat: number;
    lng: number;
    accuracy?: number;
    reportedAt: string;
  } | null;
  isAr: boolean;
}

/** Compact "advocate is en route" card with live distance + ETA and a
 *  one-tap "Track on map" button that opens Google Maps centred on the
 *  advocate's last known location. Polled by the parent component. */
function LiveEtaCard({
  etaMinutes,
  distanceKm,
  advocateLocation,
  isAr,
}: LiveEtaCardProps) {
  const mapsUrl = advocateLocation
    ? `https://maps.google.com/?q=${advocateLocation.lat},${advocateLocation.lng}`
    : null;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-[#1A237E] to-[#0D1660] p-5 text-white shadow-md">
      <div className="flex items-start gap-3">
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
          <span className="absolute inset-0 animate-ping rounded-xl bg-white/25" />
          <Navigation size={22} className="relative" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            {isAr ? "المحامي قادم" : "Advocate inbound"}
          </div>
          <div className="mt-1 text-2xl font-extrabold leading-tight">
            {isAr ? `≈ ${etaMinutes} دقيقة` : `≈ ${etaMinutes} min`}
          </div>
          <div className="text-[12px] text-white/80">
            {isAr
              ? `يبعد ${distanceKm} كم في الوقت الحالي`
              : `${distanceKm} km away right now`}
          </div>
          {advocateLocation?.reportedAt && (
            <div className="mt-1 text-[10px] text-white/60">
              {isAr ? "آخر تحديث: " : "Updated: "}
              {new Date(advocateLocation.reportedAt).toLocaleTimeString(
                isAr ? "ar-BH" : "en-GB",
                { hour: "2-digit", minute: "2-digit", second: "2-digit" },
              )}
            </div>
          )}
        </div>
      </div>
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-bold hover:bg-white/25"
        >
          <ExternalLink size={12} />
          {isAr ? "تتبع على الخريطة" : "Track on map"}
        </a>
      )}
    </section>
  );
}
