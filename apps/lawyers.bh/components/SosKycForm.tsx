"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export interface SosKycValue {
  fullName: string;
  idType: "cpr" | "residence" | "passport";
  idNumber: string;
  phone: string;
  description: string;
  location: { lat: number; lng: number; accuracy?: number } | null;
  manualAddress: string;
}

interface Props {
  value: SosKycValue;
  onChange: (next: SosKycValue) => void;
}

export default function SosKycForm({ value, onChange }: Props) {
  const t = useTranslations("sos");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  function update<K extends keyof SosKycValue>(key: K, v: SosKycValue[K]) {
    onChange({ ...value, [key]: v });
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationError(t("kycSection.locationFailed"));
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("location", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      () => {
        setLocationError(t("kycSection.locationFailed"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <section>
      <h2 className="text-[15px] font-extrabold text-text-primary mb-1">
        {t("kycSection.title")}
      </h2>
      <p className="text-[12px] text-text-muted mb-4">
        {t("kycSection.subtitle")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t("kycSection.fullName")}>
          <input
            type="text"
            value={value.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            placeholder={t("kycSection.fullNamePlaceholder")}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A237E] focus:outline-none"
          />
        </Field>

        <Field label={t("kycSection.idType")}>
          <select
            value={value.idType}
            onChange={(e) => update("idType", e.target.value as "cpr" | "residence" | "passport")}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#1A237E] focus:outline-none"
          >
            <option value="cpr">{t("kycSection.idCpr")}</option>
            <option value="residence">{t("kycSection.idResidence")}</option>
            <option value="passport">{t("kycSection.idPassport")}</option>
          </select>
        </Field>

        <Field label={t("kycSection.idNumber")}>
          <input
            type="text"
            value={value.idNumber}
            onChange={(e) => update("idNumber", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A237E] focus:outline-none"
          />
        </Field>

        <Field label={t("kycSection.phone")}>
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder={t("kycSection.phonePlaceholder")}
            dir="ltr"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A237E] focus:outline-none"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label={t("kycSection.description")}>
          <textarea
            rows={2}
            value={value.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder={t("kycSection.descriptionPlaceholder")}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A237E] focus:outline-none"
          />
        </Field>
      </div>

      <div className="mt-3 rounded-lg border border-gray-200 p-3">
        {value.location ? (
          <div className="flex items-center gap-2 text-[12px] text-[#1A237E] font-semibold">
            <MapPin size={14} />
            {t("kycSection.locationCaptured")} —{" "}
            <span className="font-mono text-[11px] text-text-muted">
              {value.location.lat.toFixed(5)}, {value.location.lng.toFixed(5)}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={captureLocation}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {locating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <MapPin size={14} />
            )}
            {t("kycSection.useMyLocation")}
          </button>
        )}
        {locationError && (
          <p className="mt-2 text-[11px] text-[#D32F2F]">{locationError}</p>
        )}
        <div className="mt-3">
          <Field label={t("kycSection.locationManualLabel")}>
            <input
              type="text"
              value={value.manualAddress}
              onChange={(e) => update("manualAddress", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A237E] focus:outline-none"
            />
          </Field>
        </div>
      </div>
    </section>
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
