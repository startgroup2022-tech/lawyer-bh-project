"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Loader2, PenLine, CheckCircle2, AlertTriangle } from "lucide-react";
import type { AgreementSection } from "@/lib/contract/agreementTemplate";
import AgreementPreview from "@/components/legalTools/AgreementPreview";
import SignaturePad from "@/components/legalTools/SignaturePad";

interface FetchResp {
  reference: string;
  locale: string;
  lawyerName: string;
  clientName: string;
  sections: AgreementSection[];
  error?: string;
}

type Phase = "loading" | "ready" | "done" | "error";

export default function RemoteSign({
  reference,
  token,
}: {
  reference: string;
  token: string;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errCode, setErrCode] = useState<string>("");
  const [data, setData] = useState<FetchResp | null>(null);
  const [signedName, setSignedName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) {
        setErrCode("missing_token");
        setPhase("error");
        return;
      }
      try {
        const res = await fetch(
          `/api/legal-tools/agreement/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`,
        );
        const json = (await res.json().catch(() => ({}))) as FetchResp;
        if (!alive) return;
        if (!res.ok) {
          setErrCode(json.error ?? String(res.status));
          setPhase("error");
          return;
        }
        setData(json);
        setSignedName(json.clientName ?? "");
        setPhase("ready");
      } catch {
        if (alive) {
          setErrCode("network");
          setPhase("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [reference, token]);

  async function submit() {
    if (!signedName.trim()) {
      setSubmitErr(L("Please type your full name.", "يرجى كتابة اسمك الكامل."));
      return;
    }
    setSubmitErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/legal-tools/agreement/${encodeURIComponent(reference)}/sign`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, signedByName: signedName.trim(), signatureDataUrl: signature }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setSubmitErr(L(`Signing failed (${json.error ?? res.status}).`, `فشل التوقيع (${json.error ?? res.status}).`));
        return;
      }
      setPhase("done");
    } catch {
      setSubmitErr(L("Network error. Please try again.", "خطأ في الشبكة. حاول مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  }

  const errorMessage = (code: string) => {
    switch (code) {
      case "already_signed":
        return L("This agreement has already been signed.", "تم توقيع هذه الاتفاقية مسبقًا.");
      case "expired":
        return L("This signing link has expired. Please ask the lawyer to resend it.", "انتهت صلاحية رابط التوقيع. يُرجى الطلب من المحامي إعادة إرساله.");
      case "void":
        return L("This agreement was cancelled.", "تم إلغاء هذه الاتفاقية.");
      case "not_found":
      case "missing_token":
        return L("This signing link is invalid.", "رابط التوقيع غير صالح.");
      default:
        return L("Something went wrong. Please try again later.", "حدث خطأ ما. حاول لاحقًا.");
    }
  };

  return (
    <div className="min-h-screen bg-bg-light">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Image src="/images/logo-full.png" alt="Lawyers.bh" width={44} height={44} className="h-11 w-auto" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {L("Electronic Signature", "التوقيع الإلكتروني")}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8">
        {phase === "loading" && (
          <div className="flex items-center justify-center py-20 text-text-muted">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-lg font-extrabold text-text-primary">
              {L("Cannot open agreement", "تعذّر فتح الاتفاقية")}
            </h1>
            <p className="mt-2 text-sm text-text-muted">{errorMessage(errCode)}</p>
          </div>
        )}

        {phase === "done" && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
            <h1 className="text-lg font-extrabold text-text-primary">
              {L("Thank you — agreement signed", "شكرًا — تم توقيع الاتفاقية")}
            </h1>
            <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
              {L(
                `Reference ${reference}. A signed PDF copy has been emailed to you and to your lawyer.`,
                `الرقم المرجعي ${reference}. تم إرسال نسخة PDF موقّعة إليك وإلى محاميك.`,
              )}
            </p>
          </div>
        )}

        {phase === "ready" && data && (
          <div className="space-y-5">
            <div>
              <p className="text-primary text-sm font-semibold tracking-wide uppercase mb-1">
                {L("Review & sign", "مراجعة وتوقيع")}
              </p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary leading-tight">
                {L("Legal Fees & Representation Agreement", "اتفاقية أتعاب المحاماة والتمثيل القانوني")}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {L(
                  `Prepared by ${data.lawyerName}. Reference ${data.reference}.`,
                  `أعدّها ${data.lawyerName}. الرقم المرجعي ${data.reference}.`,
                )}
              </p>
            </div>

            <AgreementPreview sections={data.sections} isAr={isAr} />

            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-text-primary mb-1">
                  {L("Your full name", "اسمك الكامل")}
                </label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                />
              </div>
              <SignaturePad
                value={signature}
                onChange={setSignature}
                label={L("Signature", "التوقيع")}
                clearLabel={L("Clear", "مسح")}
              />
              <p className="text-[11px] text-text-muted leading-relaxed">
                {L(
                  "By signing you confirm you have read and accept the agreement above. This electronic signature is binding under the Bahrain Electronic Transactions Law.",
                  "بالتوقيع تؤكد أنك اطلعت على الاتفاقية أعلاه وتقبلها. هذا التوقيع الإلكتروني ملزم وفق قانون المعاملات الإلكترونية في مملكة البحرين.",
                )}
              </p>
              {submitErr && <p className="text-[13px] text-[#D32F2F]">{submitErr}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />}
                {L("Sign agreement", "توقيع الاتفاقية")}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
