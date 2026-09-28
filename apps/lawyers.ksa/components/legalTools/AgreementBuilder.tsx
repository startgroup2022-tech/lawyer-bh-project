"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  PenLine,
  Mail,
  CheckCircle2,
  ScrollText,
} from "lucide-react";
import {
  renderAgreement,
  type AgreementData,
  type FeeBasis,
} from "@/lib/contract/agreementTemplate";
import { REGISTERED_LAWYERS, isRegisteredLawyer } from "@/lib/registeredLawyers";
import AgreementPreview from "./AgreementPreview";
import SignaturePad from "./SignaturePad";

type Step = "form" | "preview" | "sign" | "sent" | "done";
type FeeType = "fixed" | "contingency";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AgreementBuilder() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const [step, setStep] = useState<Step>("form");

  // Lawyer (First Party) — must be picked from the registered roster.
  const [lwName, setLwName] = useState("");
  const [lawyerListOpen, setLawyerListOpen] = useState(false);
  const [lwLicense, setLwLicense] = useState("");
  const [lwAddress, setLwAddress] = useState("");
  const [lwPhone, setLwPhone] = useState("");
  const [lwEmail, setLwEmail] = useState("");
  // Client (Second Party)
  const [clName, setClName] = useState("");
  const [clId, setClId] = useState("");
  const [clNationality, setClNationality] = useState("");
  const [clAddress, setClAddress] = useState("");
  const [clPhone, setClPhone] = useState("");
  const [clEmail, setClEmail] = useState("");
  // Subject + fee
  const [subject, setSubject] = useState("");
  const [feeType, setFeeType] = useState<FeeType>("fixed");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeInstallment, setFeeInstallment] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [feeBasis, setFeeBasis] = useState<FeeBasis>("judgment");

  // Signing
  const [reference, setReference] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [signedName, setSignedName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

const lawyerSuggestions = useMemo(() => {
  const q = lwName.trim().toLowerCase();

  if (!q) return REGISTERED_LAWYERS;

  return REGISTERED_LAWYERS.filter((lawyer) =>
    `${lawyer.nameEn} ${lawyer.nameAr}`.toLowerCase().includes(q)
  );
}, [lwName]);

  const formError = useMemo(() => {
    if (!lwName.trim()) return L("Select the lawyer (First Party).", "اختر المحامي (الطرف الأول).");
    if (!isRegisteredLawyer(lwName)) return L("Choose a lawyer from the registered list.", "اختر محاميًا من القائمة المسجلة.");
    if (!EMAIL_RE.test(lwEmail)) return L("Valid lawyer email is required.", "بريد إلكتروني صحيح للمحامي مطلوب.");
    if (!clName.trim()) return L("Client name is required.", "اسم الموكل مطلوب.");
    if (!EMAIL_RE.test(clEmail)) return L("Valid client email is required.", "بريد إلكتروني صحيح للموكل مطلوب.");
    if (!subject.trim()) return L("The scope of services is required.", "نطاق الخدمات مطلوب.");
    if (feeType === "fixed") {
      if (!/^\d+(\.\d{1,3})?$/.test(feeAmount.trim()))
        return L("Enter a valid fixed fee amount.", "أدخل مبلغ أتعاب ثابت صحيح.");
    } else {
      const n = Number(feePercent);
      if (!feePercent || Number.isNaN(n) || n <= 0 || n > 25)
        return L("Enter a percentage between 0 and 25.", "أدخل نسبة بين 0 و25.");
    }
    return null;
  }, [lwName, lwEmail, clName, clEmail, subject, feeType, feeAmount, feePercent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build AgreementData for the live preview (date filled in at save time
  // server-side; here we show today's date for review).
  const previewData: AgreementData = useMemo(() => {
    const now = new Date();
    return {
      reference: reference ?? "AGR-PREVIEW",
      dateLabel: now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      weekday: {
        en: now.toLocaleDateString("en-GB", { weekday: "long" }),
        ar: now.toLocaleDateString("ar-SA", { weekday: "long" }),
      },
      lawyer: { name: lwName, idOrLicense: lwLicense, address: lwAddress, phone: lwPhone, email: lwEmail },
      client: {
        name: clName,
        idOrLicense: clId,
        nationality: clNationality,
        address: clAddress,
        phone: clPhone,
        email: clEmail,
      },
      subject,
      fee:
        feeType === "fixed"
          ? { type: "fixed", amountBhd: feeAmount, installment: feeInstallment }
          : { type: "contingency", percent: feePercent, basis: feeBasis },
    };
  }, [
    reference, lwName, lwLicense, lwAddress, lwPhone, lwEmail, clName, clId,
    clNationality, clAddress, clPhone, clEmail, subject, feeType, feeAmount,
    feeInstallment, feePercent, feeBasis,
  ]);

  const sections = useMemo(() => renderAgreement(previewData), [previewData]);

  function buildBody(mode: "in_person" | "remote") {
    return {
      mode,
      locale,
      lawyer: { name: lwName, idOrLicense: lwLicense, address: lwAddress, phone: lwPhone, email: lwEmail },
      client: {
        name: clName, idOrLicense: clId, nationality: clNationality,
        address: clAddress, phone: clPhone, email: clEmail,
      },
      subject,
      fee:
        feeType === "fixed"
          ? { type: "fixed", amountBhd: feeAmount, installment: feeInstallment }
          : { type: "contingency", percent: feePercent, basis: feeBasis },
    };
  }

  async function createAgreement(mode: "in_person" | "remote") {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/legal-tools/agreement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildBody(mode)),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reference?: string; token?: string; error?: string; emailed?: boolean; signUrl?: string;
      };
      if (!res.ok || !data.reference) {
        setError(L(`Could not create the agreement (${data.error ?? res.status}).`, `تعذّر إنشاء الاتفاقية (${data.error ?? res.status}).`));
        return;
      }
      setReference(data.reference);
      if (mode === "in_person") {
        setToken(data.token ?? null);
        setStep("sign");
      } else {
        setStep("sent");
      }
    } catch {
      setError(L("Network error. Please try again.", "خطأ في الشبكة. حاول مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSignature() {
    if (!reference || !token) return;
    if (!signedName.trim()) {
      setError(L("Please type the client's full name.", "يرجى كتابة اسم الموكل الكامل."));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/legal-tools/agreement/${encodeURIComponent(reference)}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, signedByName: signedName.trim(), signatureDataUrl: signature }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(L(`Signing failed (${data.error ?? res.status}).`, `فشل التوقيع (${data.error ?? res.status}).`));
        return;
      }
      setStep("done");
    } catch {
      setError(L("Network error. Please try again.", "خطأ في الشبكة. حاول مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary";
  const labelCls = "block text-[12px] font-semibold text-text-primary mb-1";
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  // ── DONE ──
  if (step === "done") {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-lg font-extrabold text-text-primary">
          {L("Agreement signed", "تم توقيع الاتفاقية")}
        </h3>
        <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
          {L(
            `Reference ${reference}. A signed PDF copy has been emailed to both the lawyer and the client.`,
            `الرقم المرجعي ${reference}. تم إرسال نسخة PDF موقّعة إلى بريد كل من المحامي والموكل.`,
          )}
        </p>
      </div>
    );
  }

  // ── REMOTE SENT ──
  if (step === "sent") {
    return (
      <div className="text-center py-8">
        <Mail className="w-14 h-14 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-extrabold text-text-primary">
          {L("Signing link sent", "تم إرسال رابط التوقيع")}
        </h3>
        <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
          {L(
            `Reference ${reference}. We've emailed ${clEmail} a secure link to review and sign the agreement. Once signed, both parties receive the signed PDF.`,
            `الرقم المرجعي ${reference}. أرسلنا إلى ${clEmail} رابطًا آمنًا لمراجعة وتوقيع الاتفاقية. بعد التوقيع يستلم الطرفان نسخة PDF موقّعة.`,
          )}
        </p>
      </div>
    );
  }

  // ── IN-PERSON SIGN ──
  if (step === "sign") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[13px] text-amber-900">
          {L(
            "Hand the device to the client. By typing their name and signing below, the client accepts the agreement.",
            "سلّم الجهاز للموكل. بكتابة الاسم والتوقيع أدناه، يقبل الموكل الاتفاقية.",
          )}
        </div>
        <div>
          <label className={labelCls}>{L("Client full name", "اسم الموكل الكامل")}</label>
          <input className={inputCls} value={signedName} onChange={(e) => setSignedName(e.target.value)} placeholder={clName} />
        </div>
        <SignaturePad
          value={signature}
          onChange={setSignature}
          label={L("Signature", "التوقيع")}
          clearLabel={L("Clear", "مسح")}
        />
        {error && <p className="text-[13px] text-[#D32F2F]">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={submitSignature}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />}
            {L("Sign & email both parties", "توقيع وإرسال للطرفين")}
          </button>
          <button
            type="button"
            onClick={() => setStep("preview")}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-text-secondary"
          >
            {L("Back", "رجوع")}
          </button>
        </div>
      </div>
    );
  }

  // ── PREVIEW ──
  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <ScrollText size={18} className="text-primary" />
          <h3 className="text-base font-extrabold">
            {L("Review the agreement", "مراجعة الاتفاقية")}
          </h3>
        </div>
        <AgreementPreview sections={sections} isAr={isAr} />
        {error && <p className="text-[13px] text-[#D32F2F]">{error}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => createAgreement("in_person")}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />}
            {L("Client signs now (in person)", "الموكل يوقّع الآن (حضوريًا)")}
          </button>
          <button
            type="button"
            onClick={() => createAgreement("remote")}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.04] px-5 py-2.5 text-sm font-extrabold text-primary disabled:opacity-60"
          >
            <Mail size={15} />
            {L("Email link to client", "إرسال رابط للموكل")}
          </button>
          <button
            type="button"
            onClick={() => setStep("form")}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-text-secondary"
          >
            {L("Edit details", "تعديل البيانات")}
          </button>
        </div>
      </div>
    );
  }

  // ── FORM ──
  return (
    <div className="space-y-6">
      <p className="text-[13px] text-text-muted leading-relaxed">
        {L(
          "Fill in both parties' details and the fee terms to generate the bilingual Legal Fees & Representation Agreement. You can preview it, then have the client sign in person or email them a signing link.",
          "املأ بيانات الطرفين وشروط الأتعاب لإنشاء اتفاقية أتعاب المحاماة والتمثيل القانوني بنسختيها العربية والإنجليزية. يمكنك معاينتها ثم توقيع الموكل حضوريًا أو إرسال رابط توقيع إليه.",
        )}
      </p>

      {/* First Party */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-extrabold text-text-primary mb-1">
          {L("First Party — Lawyer / Law Firm", "الطرف الأول — المحامي/المكتب")}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <label className={labelCls}>{L("Name (registered lawyer)", "الاسم (محامي مسجل)")} *</label>
            <input
              className={inputCls}
              value={lwName}
              onChange={(e) => { setLwName(e.target.value); setLawyerListOpen(true); }}
              onFocus={() => setLawyerListOpen(true)}
              onBlur={() => setTimeout(() => setLawyerListOpen(false), 150)}
              placeholder={L("Type to search registered lawyers…", "اكتب للبحث في المحامين المسجلين…")}
              autoComplete="off"
              role="combobox"
              aria-expanded={lawyerListOpen}
            />
            {lawyerListOpen &&
  lawyerSuggestions.length > 0 &&
  !isRegisteredLawyer(lwName) && (
    <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
      {lawyerSuggestions.map((lawyer) => {
        const displayName = isAr ? lawyer.nameAr : lawyer.nameEn;
        const secondaryName = isAr ? lawyer.nameEn : lawyer.nameAr;

        return (
          <li key={lawyer.nameEn}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setLwName(displayName);
                setLawyerListOpen(false);
              }}
              className="block w-full px-3.5 py-2 text-start text-sm text-text-secondary hover:bg-primary/[0.06] hover:text-primary"
            >
              <span className="block font-semibold">{displayName}</span>
              <span className="block text-[11px] text-text-muted">
                {secondaryName}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  )}
            {lwName.trim() !== "" && !isRegisteredLawyer(lwName) && !lawyerListOpen && (
              <p className="mt-1 text-[11px] text-[#D32F2F]">
                {L("Not in the registered list.", "غير موجود في القائمة المسجلة.")}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>{L("License / Registration No.", "رقم الترخيص/القيد")}</label>
            <input className={inputCls} value={lwLicense} onChange={(e) => setLwLicense(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{L("Email", "البريد الإلكتروني")} *</label>
            <input className={inputCls} type="email" dir="ltr" value={lwEmail} onChange={(e) => setLwEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{L("Phone", "الهاتف")}</label>
            <input className={inputCls} dir="ltr" value={lwPhone} onChange={(e) => setLwPhone(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{L("Address", "العنوان")}</label>
            <input className={inputCls} value={lwAddress} onChange={(e) => setLwAddress(e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Second Party */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-extrabold text-text-primary mb-1">
          {L("Second Party — Client", "الطرف الثاني — الموكل")}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{L("Name / Capacity", "الاسم/الصفة")} *</label>
            <input className={inputCls} value={clName} onChange={(e) => setClName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{L("ID / CR No.", "رقم الهوية/السجل")}</label>
            <input className={inputCls} value={clId} onChange={(e) => setClId(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{L("Email", "البريد الإلكتروني")} *</label>
            <input className={inputCls} type="email" dir="ltr" value={clEmail} onChange={(e) => setClEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{L("Phone", "الهاتف")}</label>
            <input className={inputCls} dir="ltr" value={clPhone} onChange={(e) => setClPhone(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{L("Nationality", "الجنسية")}</label>
            <input className={inputCls} value={clNationality} onChange={(e) => setClNationality(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{L("Address", "العنوان")}</label>
            <input className={inputCls} value={clAddress} onChange={(e) => setClAddress(e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Subject */}
      <div>
        <label className={labelCls}>{L("Scope of Legal Services (Article 2)", "نطاق الأعمال القانونية (المادة 2)")} *</label>
        <textarea
          rows={3}
          className={inputCls}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={L("e.g. Representation in Case No. … before the …", "مثال: التمثيل في القضية رقم … أمام …")}
        />
      </div>

      {/* Fee */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-extrabold text-text-primary mb-1">
          {L("Fee Structure (Article 3)", "طريقة تحديد الأتعاب (المادة 3)")}
        </legend>
        <div className="flex gap-2">
          {(["fixed", "contingency"] as FeeType[]).map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => setFeeType(ft)}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all ${
                feeType === ft ? "border-primary bg-primary/[0.04] ring-1 ring-primary text-primary" : "border-gray-200 text-text-secondary"
              }`}
            >
              {ft === "fixed" ? L("Fixed Fee", "أتعاب ثابتة") : L("Contingency Fee", "أتعاب نسبية")}
            </button>
          ))}
        </div>

        {feeType === "fixed" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{L("Total fixed fee (SAR)", "الأتعاب الإجمالية (ر.س)")} *</label>
              <input className={inputCls} inputMode="decimal" dir="ltr" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} placeholder="0.000" />
            </div>
            <div>
              <label className={labelCls}>{L("Instalments (optional)", "الأقساط (اختياري)")}</label>
              <input className={inputCls} value={feeInstallment} onChange={(e) => setFeeInstallment(e.target.value)} placeholder={L("e.g. 3 × 500 SAR", "مثال: 3 × 500 ر.س")} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{L("Percentage (max 25%)", "النسبة (بحد أقصى 25%)")} *</label>
              <input className={inputCls} inputMode="decimal" dir="ltr" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>{L("Calculated on", "تحتسب على")}</label>
              <select className={`${inputCls} bg-white`} value={feeBasis} onChange={(e) => setFeeBasis(e.target.value as FeeBasis)}>
                <option value="judgment">{L("Final judgment amount", "المبلغ المحكوم به النهائي")}</option>
                <option value="settlement">{L("Written settlement amount", "مبلغ الصلح المكتوب")}</option>
                <option value="enforcement">{L("Amount recovered via enforcement", "المتحصل من التنفيذ")}</option>
              </select>
            </div>
          </div>
        )}
      </fieldset>

      {(error || formError) && step === "form" && (
        <p className="text-[13px] text-[#D32F2F]">{error ?? formError}</p>
      )}

      <button
        type="button"
        onClick={() => {
          if (formError) { setError(formError); return; }
          setError(null);
          setStep("preview");
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-extrabold text-white"
      >
        {L("Preview agreement", "معاينة الاتفاقية")}
        <Arrow size={15} />
      </button>
    </div>
  );
}
