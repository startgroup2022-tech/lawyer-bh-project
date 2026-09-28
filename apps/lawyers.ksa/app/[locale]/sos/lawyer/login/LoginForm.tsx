"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function LoginForm({
  expired,
  preSentMessage,
}: {
  expired: boolean;
  preSentMessage: boolean;
}) {
  const t = useTranslations("sos.lawyerLogin");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(preSentMessage);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/sos/lawyer/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), locale }),
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      <div className="bg-gradient-to-br from-[#1A237E] via-[#0D1660] to-[#D32F2F] text-white">
        <div className="max-w-lg mx-auto px-5 py-10">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
            <Mail size={12} />
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-white/85 leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 -mt-4">
        <section className="rounded-2xl bg-white p-5 shadow-md border border-gray-100">
          {expired && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900">
              {t("expired")}
            </div>
          )}

          {sent ? (
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-3" />
              <h2 className="text-[16px] font-extrabold text-text-primary">
                {t("sent.title")}
              </h2>
              <p className="mt-2 text-[13px] text-text-muted leading-relaxed">
                {t("sent.subtitle")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="mt-4 text-[12px] font-semibold text-[#1A237E]"
              >
                {t("sent.useDifferentEmail")}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {t("emailLabel")}
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  placeholder="advocate@example.com"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#1A237E] focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={submitting || !email}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A237E] py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Mail size={14} />
                )}
                {t("submit")}
              </button>
              <p className="text-center text-[11px] text-text-muted">
                {t("noAccount")}{" "}
                <Link
                  href="/sos/lawyer/join"
                  className="font-semibold text-[#D32F2F]"
                >
                  {t("joinHere")}
                </Link>
              </p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
