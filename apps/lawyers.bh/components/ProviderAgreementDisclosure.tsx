"use client";
import { useEffect, useRef, useState } from "react";
import {
  renderTemplate,
  type Template,
  type SigningData,
} from "@/lib/provider-agreement/model";
import AgreementFields, { emptyAgreementFields } from "./AgreementFields";
import { parseBuilderValues } from "@/lib/provider-agreement/builder-values";
import { materializeBuilder, materializeAdditionalLanguage, disclosureLanguage } from "@/lib/provider-agreement/builder-materialize";

export default function ProviderAgreementDisclosure({
  ar,
  onReady,
}: {
  ar: boolean;
  onReady: (ready: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [extra, setExtra] = useState(emptyAgreementFields);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [record, setRecord] = useState<{
      versionId: string;
      template: Template;
    } | null>(null),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  const [data, setData] = useState<SigningData>({
    fullNameAr: "",
    fullNameEn: "",
    email: "",
    phone: "",
    registrationNo: "",
    reference: "",
    signedAt: new Date().toISOString(),
    signatureDataUrl: "",
  });
  useEffect(() => {
    let active = true;
    fetch("/api/public/provider-agreement", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((v) => {
        if (active) {
          setRecord(v);
          onReady(!v.template?.builder);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          onReady(false);
        }
      });
    return () => {
      active = false;
    };
  }, [retry, onReady]);
  useEffect(() => {
    if (!record?.template.builder) return;
    try {
      parseBuilderValues(record.template.builder.fields, extra.values);
      onReady(!failed && !extra.uploading && !extra.error);
    } catch {
      onReady(false);
    }
  }, [record, extra, failed, onReady]);
  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const update = () => {
      const fields = new FormData(form);
      const text = (name: string) => String(fields.get(name) ?? "");
      const license = text("licenseNumber");
      setData({
        fullNameAr: text("fullNameAr"),
        fullNameEn: text("fullNameEn"),
        email: text("email"),
        phone: text("phone"),
        registrationNo: license,
        reference: `PROVIDER-${license}`,
        signedAt: new Date().toISOString(),
        signatureDataUrl: "",
      });
    };
    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);
  const rendered = record
    ? renderTemplate(
        record.template,
        record.versionId === "legacy"
          ? { ...data, fullNameEn: data.fullNameAr || data.fullNameEn }
          : data,
      )
    : null;
  const builder = record?.template.builder;
  const availableLanguages = builder?.pdfLanguages ?? ["ar", "en"];
  const activeLanguage = builder ? availableLanguages.includes(selectedLanguage)
    ? selectedLanguage : disclosureLanguage(builder, ar ? "ar" : "en") : ar ? "ar" : "en";
  const customLanguage = builder?.additionalLanguages?.find((entry) => entry.code === activeLanguage);
  const structured = builder
    ? customLanguage
      ? materializeAdditionalLanguage(builder, customLanguage, data, extra.values, extra.fileNames)
      : materializeBuilder(builder, data, extra.values, activeLanguage as "ar" | "en", extra.fileNames)
    : null;
  const contentRtl = customLanguage ? customLanguage.direction === "rtl" : activeLanguage === "ar";
  return (
    <div ref={root} className="my-5 rounded-2xl bg-slate-50 p-5 text-[#082B67]">
      {record && !failed && (
        <input
          type="hidden"
          name="providerAgreementVersionId"
          value={record.versionId}
        />
      )}
      <h3 className="font-bold">
        {ar
          ? "اتفاقية المحامي التي ستظهر في PDF"
          : "Provider agreement included in the PDF"}
      </h3>
      {record?.template.builder && !failed && (
        <>
          <AgreementFields
            key={record.versionId}
            ar={ar}
            fields={record.template.builder.fields}
            versionId={record.versionId}
            onChange={setExtra}
          />
          <input
            type="hidden"
            name="providerAgreementValues"
            value={JSON.stringify(extra.values)}
          />
          <input
            type="hidden"
            name="providerAgreementUploadToken"
            value={extra.token}
          />
        </>
      )}
      {failed ? (
        <p role="alert" className="mt-3 text-sm text-red-800">
          {ar
            ? "تعذر تحميل الاتفاقية. أعد المحاولة قبل التوقيع."
            : "Could not load the agreement. Retry before signing."}{" "}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => {
              setFailed(false);
              setRecord(null);
              onReady(false);
              setRetry((n) => n + 1);
            }}
          >
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </p>
      ) : !rendered ? (
        <p className="mt-3 text-sm">
          {ar ? "جارٍ تحميل الاتفاقية…" : "Loading agreement…"}
        </p>
      ) : (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-bold">
            {ar
              ? "اقرأ الاتفاقية قبل الموافقة والتوقيع"
              : "Read the agreement before accepting and signing"}
          </summary>
          {builder && availableLanguages.length > 1 && <div className="mt-3 flex flex-wrap gap-2">
            {availableLanguages.map((code) => <button key={code} type="button" onClick={() => setSelectedLanguage(code)}
              aria-pressed={activeLanguage === code} className="rounded-lg border px-3 py-1 text-sm font-bold">
              {code === "ar" ? "العربية" : code === "en" ? "English" : builder.additionalLanguages?.find((entry) => entry.code === code)?.name || code}
            </button>)}
          </div>}
          <div
            className="mt-4 max-h-96 overflow-auto rounded-xl bg-white p-4"
            dir={contentRtl ? "rtl" : "ltr"}
          >
            {structured ? (
              <div className="space-y-4 text-sm leading-8">
                <h4 className="font-bold">{structured.title}</h4>
                {(["first", "second"] as const).map((side) => (
                  <section key={side}>
                    <h5 className="font-bold">
                      {structured.parties[side].title}
                    </h5>
                    {structured.parties[side].rows
                      .filter((r) => r.visible)
                      .map((row) => (
                        <p key={row.id}>
                          {row.label ? `${row.label}: ` : ""}{row.value}
                        </p>
                      ))}
                  </section>
                ))}
                <p>
                  {activeLanguage === "ar" ? "هوية مقدم الخدمة الموقّع" : activeLanguage === "en" ? "Signing provider identity" : customLanguage?.identity}
                  : {structured.providerIdentity.name} |{" "}
                  {structured.providerIdentity.license}
                </p>
                {structured.clauses.map((c) => (
                  <section key={c.id}>
                    <h5 className="font-bold">{c.title}</h5>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                  </section>
                ))}
                <div className="text-slate-600">
                  {structured.footer.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <p>
                  {structured.signatures.firstLabel}:{" "}
                  {structured.signatures.representative} ·{" "}
                  {structured.signatures.role}
                </p>
                <p>
                  {structured.signatures.secondLabel}:{" "}
                  {structured.providerIdentity.name}
                </p>
              </div>
            ) : (
              <>
                <h4 className="mb-4 font-bold">
                  {ar ? rendered.titleAr : rendered.titleEn}
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-8">
                  {ar ? rendered.contentAr : rendered.contentEn}
                </p>
              </>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
