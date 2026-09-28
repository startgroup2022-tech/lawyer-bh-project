"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Briefcase,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import SosSignaturePad from "@/components/SosSignaturePad";
import SosConsentBlock from "@/components/SosConsentBlock";
import { SOS_CASE_TYPES, type SosCaseSlug } from "@/lib/sos/caseTypes";

interface FormState {
  fullName: string;
  registrationNo: string;
  phone: string;
  email: string;
  baseAddress: string;
  baseLat: string;
  baseLng: string;
  radiusKm: string;
  enabledCases: Record<SosCaseSlug, boolean>;
  customRates: Record<SosCaseSlug, string>;
}

const DEFAULT_RADIUS_KM = 20;

export default function LawyerJoinContent() {
  const t = useTranslations("sos.lawyerJoin");
  const tConsent = useTranslations("sos.consentSection");
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    fullName: "",
    registrationNo: "",
    phone: "",
    email: "",
    baseAddress: "",
    baseLat: "",
    baseLng: "",
    radiusKm: String(DEFAULT_RADIUS_KM),
    enabledCases: SOS_CASE_TYPES.reduce(
      (acc, c) => ({ ...acc, [c.slug]: true }),
      {} as Record<SosCaseSlug, boolean>,
    ),
    customRates: SOS_CASE_TYPES.reduce(
      (acc, c) => ({ ...acc, [c.slug]: "" }),
      {} as Record<SosCaseSlug, string>,
    ),
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [agreeRead, setAgreeRead] = useState(false);
  const [agreeSign, setAgreeSign] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function captureLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("baseLat", pos.coords.latitude.toFixed(6));
        update("baseLng", pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function validate(): string | null {
    if (
      !form.fullName.trim() ||
      !form.registrationNo.trim() ||
      !form.phone.trim() ||
      !form.email.trim()
    )
      return t("errors.missingFields");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      return t("errors.invalidEmail");
    if (!form.baseLat || !form.baseLng)
      return t("errors.missingLocation");
    const radius = Number(form.radiusKm);
    if (!Number.isFinite(radius) || radius < 1 || radius > 200)
      return t("errors.invalidRadius");
    const enabled = SOS_CASE_TYPES.filter((c) => form.enabledCases[c.slug]);
    if (enabled.length === 0) return t("errors.noCasesEnabled");
    if (!agreeRead || !agreeSign) return t("errors.missingConsent");
    if (!signature) return t("errors.missingSignature");
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const ratesPayload: Partial<Record<SosCaseSlug, number>> = {};
      for (const c of SOS_CASE_TYPES) {
        const v = form.customRates[c.slug];
        if (form.enabledCases[c.slug] && v) {
          const n = Number(v);
          if (Number.isFinite(n) && n > 0) ratesPayload[c.slug] = n;
        }
      }
      const res = await fetch("/api/sos/lawyer/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          fullName: form.fullName.trim(),
          registrationNo: form.registrationNo.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          baseLocation: {
            lat: Number(form.baseLat),
            lng: Number(form.baseLng),
            address: form.baseAddress.trim() || undefined,
          },
          emergencyRadiusKm: Number(form.radiusKm),
          enabledCases: SOS_CASE_TYPES.filter((c) => form.enabledCases[c.slug]).map(
            (c) => c.slug,
          ),
          emergencyRates: ratesPayload,
          signatureDataUrl: signature,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setSuccess(true);
    } catch (e) {
      console.error(e);
      setError(t("errors.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg-light pb-12">
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-[#1A237E] text-white">
          <div className="max-w-2xl mx-auto px-5 py-12 text-center">
            <CheckCircle2 size={56} className="mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              {t("success.title")}
            </h1>
            <p className="mt-3 text-sm text-white/85 leading-relaxed">
              {t("success.subtitle")}
            </p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-5 mt-6">
          <button
            type="button"
            onClick={() => router.push(`/${locale}`)}
            className="w-full rounded-xl bg-[#1A237E] py-3 text-[13px] font-extrabold text-white"
          >
            {t("success.backHome")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      <div className="bg-gradient-to-br from-[#1A237E] via-[#0D1660] to-[#D32F2F] text-white">
        <div className="max-w-2xl mx-auto px-5 py-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                <Briefcase size={12} />
                {t("eyebrow")}
              </p>
              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight">
                {t("title")}
              </h1>
              <p className="mt-2 text-sm text-white/85 leading-relaxed">
                {t("subtitle")}
              </p>
            </div>
            <a
              href={`/${locale}/sos/lawyer/login`}
              className="shrink-0 rounded-md bg-white/15 px-3 py-1.5 text-[11px] font-semibold hover:bg-white/25"
            >
              {isAr ? "تسجيل الدخول" : "Sign in"}
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 -mt-4 space-y-5">
        {/* Profile */}
        <motion.section
          className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-[15px] font-extrabold text-text-primary mb-3">
            {t("profileSection")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("fields.fullName")}>
              <input
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                className="input"
              />
            </Field>
            <Field label={t("fields.registrationNo")}>
              <input
                value={form.registrationNo}
                onChange={(e) => update("registrationNo", e.target.value)}
                className="input"
              />
            </Field>
            <Field label={t("fields.email")}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="input"
                dir="ltr"
              />
            </Field>
            <Field label={t("fields.phone")}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="input"
                dir="ltr"
              />
            </Field>
          </div>
        </motion.section>

        {/* Coverage */}
        <motion.section
          className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-[15px] font-extrabold text-text-primary mb-1">
            {t("coverageSection")}
          </h2>
          <p className="text-[12px] text-text-muted mb-3">
            {t("coverageHint")}
          </p>

          <div className="rounded-lg border border-gray-200 p-3 mb-3">
            {form.baseLat && form.baseLng ? (
              <div className="flex items-center gap-2 text-[12px] text-[#1A237E] font-semibold">
                <MapPin size={14} />
                <span className="font-mono">
                  {form.baseLat}, {form.baseLng}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={captureLocation}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-[13px] font-semibold text-white"
              >
                {locating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MapPin size={14} />
                )}
                {t("captureLocation")}
              </button>
            )}
            <div className="mt-2">
              <Field label={t("fields.baseAddress")}>
                <input
                  value={form.baseAddress}
                  onChange={(e) => update("baseAddress", e.target.value)}
                  className="input"
                  placeholder={t("fields.baseAddressPlaceholder")}
                />
              </Field>
            </div>
          </div>

          <Field label={t("fields.radiusKm")}>
            <input
              type="number"
              min={1}
              max={200}
              value={form.radiusKm}
              onChange={(e) => update("radiusKm", e.target.value)}
              className="input"
            />
          </Field>
        </motion.section>

        {/* Cases & rates */}
        <motion.section
          className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-[15px] font-extrabold text-text-primary mb-1">
            {t("casesSection")}
          </h2>
          <p className="text-[12px] text-text-muted mb-3">
            {t("casesHint")}
          </p>
          <div className="space-y-2">
            {SOS_CASE_TYPES.map((c) => {
              const enabled = form.enabledCases[c.slug];
              return (
                <div
                  key={c.slug}
                  className={`rounded-lg border p-3 transition-colors ${
                    enabled ? "border-[#1A237E]/40 bg-[#1A237E]/[0.03]" : "border-gray-200"
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          enabledCases: {
                            ...f.enabledCases,
                            [c.slug]: e.target.checked,
                          },
                        }))
                      }
                      className="mt-0.5 h-4 w-4 accent-[#1A237E]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-text-primary leading-tight">
                        {isAr ? c.label.ar : c.label.en}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {t("baselineFee", { fee: c.baseFeeBhd })}
                      </div>
                    </div>
                  </label>
                  {enabled && (
                    <div className="mt-2 ms-7">
                      <Field label={t("fields.customRate")}>
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          value={form.customRates[c.slug]}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              customRates: {
                                ...f.customRates,
                                [c.slug]: e.target.value,
                              },
                            }))
                          }
                          placeholder={String(c.baseFeeBhd)}
                          className="input"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Consent */}
        <motion.section
          className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-[15px] font-extrabold text-text-primary mb-1">
            {t("consentSection")}
          </h2>
          <p className="text-[12px] text-text-muted mb-3">
            {t("consentHint")}
          </p>
          <SosConsentBlock />

          <div className="mt-4 space-y-2.5">
            <label className="flex items-start gap-2 text-[12px] text-text-primary leading-snug cursor-pointer">
              <input
                type="checkbox"
                checked={agreeRead}
                onChange={(e) => setAgreeRead(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#D32F2F]"
              />
              <span>{tConsent("checkboxRead")}</span>
            </label>
            <label className="flex items-start gap-2 text-[12px] text-text-primary leading-snug cursor-pointer">
              <input
                type="checkbox"
                checked={agreeSign}
                onChange={(e) => setAgreeSign(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#D32F2F]"
              />
              <span>{tConsent("checkboxSignature")}</span>
            </label>
          </div>

          <div className="mt-4">
            <SosSignaturePad value={signature} onChange={setSignature} />
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-[#D32F2F]/30 bg-[#D32F2F]/[0.06] p-3 text-[12px] text-[#D32F2F]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A237E] py-3.5 text-[14px] font-extrabold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {tConsent("submitting")}
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                {t("submit")}
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[10px] text-text-muted">
            {t("approvalNotice")}
          </p>
        </motion.section>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(229 231 235);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        :global(.input:focus) {
          outline: none;
          border-color: #1a237e;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
