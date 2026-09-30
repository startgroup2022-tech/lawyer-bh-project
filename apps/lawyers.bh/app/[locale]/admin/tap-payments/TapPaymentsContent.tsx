"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";

type EnvironmentView = {
  secretKeyMasked: string | null;
  publicKey: string | null;
  merchantId: string | null;
  marketplaceMid: string | null;
};

type SettingsView = {
  activeEnvironment: "test" | "live";
  liveEnabled: boolean;
  encryptionConfigured: boolean;
  test: EnvironmentView;
  live: EnvironmentView;
  lastTestStatus: "connected" | "failed" | null;
  lastTestAt: string | null;
  lastTestMessage: string | null;
};

type Draft = {
  test: { secretKey: string; publicKey: string; merchantId: string; marketplaceMid: string };
  live: { secretKey: string; publicKey: string; merchantId: string; marketplaceMid: string };
};

const EMPTY_DRAFT: Draft = {
  test: { secretKey: "", publicKey: "", merchantId: "", marketplaceMid: "" },
  live: { secretKey: "", publicKey: "", merchantId: "", marketplaceMid: "" },
};

export default function TapPaymentsContent({ isAr }: { isAr: boolean }) {
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const t = useCallback((ar: string, en: string) => (isAr ? ar : en), [isAr]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/tap-settings", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data.ok) {
        setSettings(data.settings);
        setDraft({
          test: {
            secretKey: "",
            publicKey: data.settings.test.publicKey ?? "",
            merchantId: data.settings.test.merchantId ?? "",
            marketplaceMid: data.settings.test.marketplaceMid ?? "",
          },
          live: {
            secretKey: "",
            publicKey: data.settings.live.publicKey ?? "",
            merchantId: data.settings.live.merchantId ?? "",
            marketplaceMid: data.settings.live.marketplaceMid ?? "",
          },
        });
      } else {
        setMessage({ kind: "error", text: data.error ?? "unavailable" });
      }
    } catch {
      setMessage({ kind: "error", text: t("تعذّر تحميل الإعدادات", "Could not load settings") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/tap-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        setSettings(data.settings);
        setMessage({ kind: "ok", text: t("تم الحفظ", "Saved") });
      } else {
        setMessage({ kind: "error", text: data.error ?? "invalid" });
      }
    } catch {
      setMessage({ kind: "error", text: t("تعذّر الحفظ", "Could not save") });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/tap-settings", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const data = await response.json();
      setMessage({ kind: data.ok ? "ok" : "error", text: data.message ?? data.error ?? "" });
      await load();
    } catch {
      setMessage({ kind: "error", text: t("تعذّر اختبار الاتصال", "Could not test the connection") });
    } finally {
      setTesting(false);
    }
  };

  const field = (
    env: "test" | "live",
    key: keyof Draft["test"],
    label: string,
    type: "text" | "password" = "text",
    placeholder?: string,
  ) => (
    <label className="block">
      <span className="mb-1 block text-xs font-extrabold text-text-muted">{label}</span>
      <input
        type={type}
        value={draft[env][key]}
        placeholder={placeholder}
        onChange={(event) => setDraft((current) => ({ ...current, [env]: { ...current[env], [key]: event.target.value } }))}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-text-primary outline-none transition focus:border-primary"
      />
    </label>
  );

  const environmentCard = (env: "test" | "live") => {
    const current = settings?.[env];
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-text-primary">
            {env === "test" ? t("بيئة الاختبار", "Test environment") : t("البيئة الحقيقية", "Live environment")}
          </h2>
          {settings?.activeEnvironment === env ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
              {t("نشطة", "Active")}
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {field(env, "secretKey", t("المفتاح السري", "Secret key"), "password", current?.secretKeyMasked ?? "sk_...")}
          {field(env, "publicKey", t("المفتاح العام", "Public key"), "text", current?.publicKey ?? "pk_...")}
          {field(env, "merchantId", t("رقم التاجر", "Merchant ID"))}
          {field(env, "marketplaceMid", t("معرّف السوق", "Marketplace MID"))}
        </div>

        {current?.secretKeyMasked ? (
          <p className="mt-3 text-xs font-bold text-text-muted">
            {t("المفتاح السري المخزّن", "Stored secret key")}: {current.secretKeyMasked}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => save({ [env]: draft[env] })}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white transition disabled:opacity-50"
          >
            {t("حفظ بيانات هذه البيئة", "Save this environment")}
          </button>
          {env === "live" ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ activeEnvironment: "live", liveEnabled: true })}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-[#082B67] transition disabled:opacity-50"
            >
              {t("تفعيل البيئة الحقيقية", "Activate live")}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ activeEnvironment: "test" })}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-[#082B67] transition disabled:opacity-50"
            >
              {t("تفعيل بيئة الاختبار", "Activate test")}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <div className="mb-8 rounded-3xl bg-[#B4232A] p-7 text-white shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <CreditCard className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("إعدادات الدفع (Tap)", "Payment Settings (Tap)")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">
          {t(
            "بيانات بوابة Tap محفوظة مشفّرة. المفاتيح السرية لا تُعاد أبدًا إلى المتصفح.",
            "Tap gateway credentials are stored encrypted. Secret keys are never returned to the browser.",
          )}
        </p>
      </div>

      {message ? (
        <div
          className={`mb-5 rounded-2xl px-4 py-3 text-sm font-extrabold ${
            message.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {settings && !settings.encryptionConfigured ? (
        <div className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-700">
          {t(
            "يجب ضبط TAP_CONFIG_ENCRYPTION_KEY على الخادم قبل حفظ المفاتيح السرية.",
            "Set TAP_CONFIG_ENCRYPTION_KEY on the server before saving secret keys.",
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm font-bold text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("جارٍ التحميل...", "Loading...")}
        </div>
      ) : (
        <div className="grid gap-5">
          {environmentCard("test")}
          {environmentCard("live")}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-extrabold text-text-primary">{t("اختبار الاتصال", "Connection test")}</h2>
            </div>
            <p className="mb-4 text-sm text-text-muted">
              {settings?.lastTestAt
                ? `${t("آخر اختبار", "Last test")}: ${new Date(settings.lastTestAt).toLocaleString(isAr ? "ar" : "en")}`
                : t("لم يُجرَ أي اختبار بعد.", "No test has been run yet.")}
            </p>
            <button
              type="button"
              disabled={testing}
              onClick={testConnection}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white transition disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("اختبار الاتصال الآن", "Test connection now")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
