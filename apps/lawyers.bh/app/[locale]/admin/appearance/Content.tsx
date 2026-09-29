"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Image as ImageIcon, Loader2, Palette, Trash2, Upload } from "lucide-react";
import {
  appearancePatchBody,
  backgroundStateLabel,
  clampPercent,
  type AppearanceCountry,
} from "./appearance-view";

const fieldClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-[#082B67] outline-none focus:border-[#B4232A] focus:ring-4 focus:ring-red-50";

export default function Content({ isAr }: { isAr: boolean }) {
  const [countries, setCountries] = useState<AppearanceCountry[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const country = countries.find((item) => item.code === selected) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/mobile-appearance", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error();
      setCountries(data.countries ?? []);
      setSelected((current) => current || data.countries?.[0]?.code || "");
    } catch {
      setError(isAr ? "تعذر تحميل إعدادات المظهر." : "Could not load appearance settings.");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  function patchCountry(code: string, patch: Partial<AppearanceCountry>) {
    setCountries((all) => all.map((item) => (item.code === code ? { ...item, ...patch } : item)));
  }

  async function uploadBackground(target: AppearanceCountry, file: File) {
    setBusy("background");
    setError("");
    setNotice("");
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error(isAr ? "الحد الأقصى للصورة 4 ميغابايت" : "Maximum image size is 4 MB");
      const form = new FormData();
      form.set("code", target.code);
      form.set("background", file);
      const response = await fetch("/api/admin/country-settings/background", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      patchCountry(target.code, { backgroundUrl: data.backgroundUrl });
      setNotice(isAr ? "تم حفظ الخلفية" : "Background saved");
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : isAr ? "تعذر رفع الخلفية" : "Background upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function removeBackground(target: AppearanceCountry) {
    if (!window.confirm(isAr ? "سيتم حذف الخلفية والعودة للخلفية الافتراضية. هل تريد المتابعة؟" : "The background will be removed and the app returns to its default. Continue?")) return;
    setBusy("background");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/country-settings/background", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: target.code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      patchCountry(target.code, { backgroundUrl: null });
      setNotice(isAr ? "تم حذف الخلفية" : "Background removed");
    } catch {
      setError(isAr ? "تعذر حذف الخلفية." : "Could not remove the background.");
    } finally {
      setBusy(null);
    }
  }

  async function saveAppearance(target: AppearanceCountry, patch: Partial<AppearanceCountry>) {
    setBusy("appearance");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/mobile-appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appearancePatchBody(target, patch)),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error);
      patchCountry(target.code, patch);
      setNotice(isAr ? "تم حفظ المظهر" : "Appearance saved");
    } catch {
      setError(isAr ? "تعذر حفظ المظهر. تأكد من القيم المدخلة." : "Could not save appearance. Check the values.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#F7F8FA] px-4 pb-10 pt-4 text-[#082B67] sm:px-5">
        <div role="status" className="mx-auto flex min-h-64 max-w-5xl flex-col items-center justify-center gap-3 text-sm font-bold text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#B4232A]" />
          {isAr ? "جاري تحميل المظهر…" : "Loading appearance…"}
        </div>
      </main>
    );
  }

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#F7F8FA] px-4 pb-10 pt-4 text-[#082B67] sm:px-5">
      <div className="mx-auto max-w-5xl">
        <section className="mb-6 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#B4232A_0%,#8E1820_100%)] p-7 text-white shadow-[0_22px_60px_rgba(180,35,42,0.24)]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12"><Palette /></div>
          <h1 className="text-2xl font-black sm:text-3xl">{isAr ? "مظهر التطبيق" : "App Appearance"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/75">
            {isAr
              ? "تحكّم بخلفية التطبيق ودرجة شفافيتها. تُحفظ الصورة في التخزين ويقرأها التطبيق من الـ API مباشرة."
              : "Control the app background and its opacity. The image is stored in blob storage and read by the app from the API."}
          </p>
        </section>

        {error && (
          <div role="alert" className="mb-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertCircle className="h-4 w-4" />{error}
          </div>
        )}
        {notice && (
          <div role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />{notice}
          </div>
        )}

        <section className="mb-5 rounded-2xl border border-transparent bg-white p-4 shadow-sm">
          <label className="block text-xs font-black">{isAr ? "الدولة" : "Country"}</label>
          <select value={selected} onChange={(event) => setSelected(event.target.value)} className={`${fieldClass} mt-2 max-w-sm`}>
            {countries.map((item) => (
              <option key={item.code} value={item.code}>{isAr ? item.nameAr : item.nameEn} — {item.code}</option>
            ))}
          </select>
        </section>

        {!country ? (
          <div className="rounded-3xl bg-white py-16 text-center text-sm font-bold text-gray-400">
            {isAr ? "لا توجد دولة مفعّلة بعد." : "No active country yet."}
          </div>
        ) : (
          <>
            <section className="mb-5 rounded-3xl bg-white p-5 shadow-[0_14px_40px_rgba(7,17,31,0.055)]">
              <h2 className="text-lg font-black">{isAr ? "خلفية التطبيق" : "App background"}</h2>
              <p className="mt-1 text-xs font-bold text-gray-500">{backgroundStateLabel(country, isAr)}</p>

              <div className="relative mt-4 h-44 overflow-hidden rounded-2xl bg-[#EEF2F7]">
                {country.backgroundUrl ? (
                  <Image src={country.backgroundUrl} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-[#8B98AA]">
                    <ImageIcon className="h-9 w-9" />
                    <span className="text-xs font-bold">{isAr ? "لا توجد خلفية" : "No background"}</span>
                  </div>
                )}
                {busy === "background" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm">
                    <Loader2 className="h-7 w-7 animate-spin text-[#B4232A]" />
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs font-bold text-[#53657D] transition hover:border-[#B4232A] hover:text-[#B4232A]">
                  <Upload className="h-4 w-4" />
                  {country.backgroundUrl ? (isAr ? "تغيير الصورة" : "Change image") : (isAr ? "رفع صورة PNG / JPG / WebP — حتى 4 MB" : "Upload PNG / JPG / WebP — up to 4 MB")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy !== null}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadBackground(country, file);
                      event.target.value = "";
                    }}
                  />
                </label>
                {country.backgroundUrl && (
                  <button
                    type="button"
                    onClick={() => void removeBackground(country)}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isAr ? "حذف والعودة للافتراضي" : "Delete and use default"}
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-[0_14px_40px_rgba(7,17,31,0.055)]">
              <h2 className="text-lg font-black">{isAr ? "شفافية الخلفية" : "Background opacity"}</h2>
              <p className="mt-1 text-xs font-bold text-gray-500">
                {isAr ? "تُطبَّق على صورة الخلفية داخل التطبيق." : "Applied to the background image inside the app."}
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="bg-opacity" className="block text-xs font-black">
                    {isAr ? "شفافية الصورة" : "Image opacity"} — {country.backgroundOpacity}%
                  </label>
                  <input
                    id="bg-opacity"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={country.backgroundOpacity}
                    disabled={busy !== null}
                    onChange={(event) => patchCountry(country.code, { backgroundOpacity: clampPercent(Number(event.target.value)) })}
                    className="mt-2 w-full accent-[#B4232A]"
                  />
                </div>
                <div>
                  <label htmlFor="bg-overlay" className="block text-xs font-black">
                    {isAr ? "طبقة التبييض" : "Light overlay"} — {country.backgroundOverlayOpacity}%
                  </label>
                  <input
                    id="bg-overlay"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={country.backgroundOverlayOpacity}
                    disabled={busy !== null}
                    onChange={(event) => patchCountry(country.code, { backgroundOverlayOpacity: clampPercent(Number(event.target.value)) })}
                    className="mt-2 w-full accent-[#B4232A]"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-black">
                  {isAr ? "لون الخلفية" : "Background colour"}
                  <input
                    type="color"
                    value={country.backgroundColor ?? "#F5F4F1"}
                    disabled={busy !== null}
                    onChange={(event) => patchCountry(country.code, { backgroundColor: event.target.value.toUpperCase() })}
                    className="h-9 w-14 rounded-lg border border-gray-200"
                  />
                </label>
                {country.backgroundColor && (
                  <button
                    type="button"
                    onClick={() => patchCountry(country.code, { backgroundColor: null })}
                    disabled={busy !== null}
                    className="text-xs font-bold text-gray-500 underline-offset-2 hover:underline"
                  >
                    {isAr ? "إزالة اللون" : "Clear colour"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void saveAppearance(country, {
                    backgroundOpacity: country.backgroundOpacity,
                    backgroundOverlayOpacity: country.backgroundOverlayOpacity,
                    backgroundColor: country.backgroundColor,
                  })}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#082B67] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                >
                  {busy === "appearance" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {isAr ? "حفظ المظهر" : "Save appearance"}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
