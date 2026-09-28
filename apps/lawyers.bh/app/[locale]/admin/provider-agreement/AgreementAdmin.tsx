"use client";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Copy, Eye, FileText, Save, Upload } from "lucide-react";
import {
  legacyTemplate,
  modernDraft,
  PLACEHOLDERS,
  type Template,
  type Version,
} from "@/lib/provider-agreement/model";
import {
  apiJson,
  buttonClass,
  cardClass,
  inputClass,
  label,
} from "@/lib/careers/ui";
import FirstPartyFields from "./FirstPartyFields";
import BuilderEditor, { type BuilderAssetSlot } from "./BuilderEditor";
import TemplateLibrary, { type LibraryAction } from "./TemplateLibrary";
import type { AgreementLibrary } from "@/lib/provider-agreement/library-store";
const defaultGroup = "84008400-0000-4000-8000-000000000001";

export default function AgreementAdmin({ locale }: { locale: string }) {
  const ar = locale === "ar",
    t = (a: string, b: string) => (ar ? a : b);
  const [versions, setVersions] = useState<Version[]>([]),
    [selected, setSelected] = useState<Version | null>(null);
  const [groups, setGroups] = useState<AgreementLibrary[]>([]),
    [groupId, setGroupId] = useState(defaultGroup);
  const [template, setTemplate] = useState<Template>(() =>
      modernDraft(legacyTemplate()),
    ),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState(""),
    [pdf, setPdf] = useState("");
  const [previewValues, setPreviewValues] = useState<Record<string, string>>(
    {},
  );
  const signature = useRef<SignatureCanvas | null>(null);
  const groupArchived = groups.find((g) => g.id === groupId)?.archived ?? false;
  const locked = groupArchived || (!!selected && selected.status !== "draft");
  const dirty = selected
    ? JSON.stringify(template) !== JSON.stringify(selected.template)
    : true;
  async function refresh(id = groupId) {
    const data = await apiJson(
      `/api/admin/provider-agreement?templateId=${encodeURIComponent(id)}`,
    );
    setVersions(data.versions);
    setGroups(data.templates ?? []);
    setLoaded(true);
  }
  useEffect(() => {
    let active = true;
    apiJson(`/api/admin/provider-agreement?templateId=${defaultGroup}`)
      .then((data) => {
        if (active) {
          setVersions(data.versions);
          setGroups(data.templates ?? []);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active)
          setMessage(
            ar
              ? "تعذر تحميل الاتفاقيات. حدّث الصفحة لإعادة المحاولة."
              : "Could not load agreements. Reload to retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [ar]);
  useEffect(() => {
    if (locked || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [locked, dirty]);
  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf);
    },
    [pdf],
  );
  function failure(error: unknown) {
    const code = error instanceof Error ? error.message : "";
    if (
      [
        "invalid_builder",
        "invalid_field_reference",
        "duplicate_id",
        "footer_too_large",
        "signature_details_too_large",
        "builder_not_ready",
      ].includes(code)
    ) {
      setMessage(
        code === "builder_not_ready"
          ? t(
              "المحرّر الجديد متاح للمسودات والمعاينة فقط حتى اكتمال ربط التسجيل.",
              "The new editor is available for drafts and previews until registration integration is complete.",
            )
          : code === "footer_too_large"
            ? t(
                "الفوتر طويل جدًا. اختصر السطور أو أخفِ بعضها ثم أعد المعاينة.",
                "The footer is too long. Shorten or hide some rows and preview again.",
              )
            : t(
                "راجع نصوص اللغات المختارة والحقول المطلوبة ومراجع الحقول المحذوفة. قد تحتاج إلى اختصار معلومات التوقيع الطويلة.",
                "Check the selected-language text, required fields and references to deleted fields. Long signature details may need shortening.",
              ),
      );
      return;
    }
    if (code === "unsupported_pdf_glyph") {
      setMessage(t(
        "الخط الحالي لا يدعم بعض حروف اللغة الإضافية. اختر لغة تستخدم حروفًا يدعمها خط Cairo أو غيّر النص ثم أعد المعاينة.",
        "The current Cairo PDF font does not support some characters in the additional language. Change the text and preview again.",
      ));
      return;
    }
    if (code === "active_template" || code === "archived_template") {
      setMessage(
        code === "active_template"
          ? t(
              "اعتمد قالبًا بديلًا قبل أرشفة القالب الحالي.",
              "Activate another template before archiving this one.",
            )
          : t(
              "استعد القالب من الأرشيف قبل تعديله أو نشره.",
              "Restore this template before editing or publishing.",
            ),
      );
      return;
    }
    setMessage(
      code === "invalid_asset" ||
        code === "asset_too_large" ||
        code === "request_too_large"
        ? t(
            "تعذر قبول الصورة. استخدم PNG أو JPEG واضحة بحجم لا يتجاوز 2 ميغابايت وأبعاد لا تتجاوز 4000 بكسل. للصور الكبيرة بصريًا، قصّها حول التوقيع أو الختم ثم أعد الرفع.",
            "Image rejected. Use a valid PNG/JPEG up to 2 MiB and 4000 pixels per side. Crop large images around the signature or stamp and retry.",
          )
        : code === "stale_draft"
          ? t(
              "تغيّرت النسخة في جلسة أخرى. حدّث الصفحة قبل المتابعة.",
              "This version changed elsewhere. Reload before continuing.",
            )
          : code === "invalid_placeholder"
            ? t(
                "يوجد رمز متغيّر غير معتمد. استخدم الرموز الموضحة أسفل المحرر.",
                "Unknown placeholder. Use the listed placeholders.",
              )
            : t(
                "تعذر إتمام العملية. تحقق من الحقول والاتصال ثم أعد المحاولة.",
                "Could not complete this action. Check the fields and connection, then retry.",
              ),
    );
  }
  async function chooseGroup(id: string) {
    if (
      !locked &&
      dirty &&
      !confirm(t("تجاهل التعديلات غير المحفوظة؟", "Discard unsaved changes?"))
    )
      return;
    setBusy(true);
    try {
      await refresh(id);
      setGroupId(id);
      setSelected(null);
      setTemplate(modernDraft(legacyTemplate()));
      setPdf("");
      setMessage("");
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function libraryAction(action: LibraryAction) {
    if (
      action.action !== "update" &&
      !locked &&
      dirty &&
      !confirm(t("تجاهل التعديلات غير المحفوظة؟", "Discard unsaved changes?"))
    )
      return;
    setBusy(true);
    try {
      const data = await apiJson("/api/admin/provider-agreement/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      await refresh(data.template.id);
      setGroupId(data.template.id);
      if (action.action !== "update") {
        setSelected(null);
        setTemplate(modernDraft(legacyTemplate()));
        setPdf("");
      }
      setMessage(
        t(
          "تم حفظ بيانات القالب. لم يتغيّر الإصدار المعتمد للجميع.",
          "Template details saved. The globally active version has not changed.",
        ),
      );
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function choose(v: Version | null) {
    if (
      !locked &&
      dirty &&
      !confirm(t("تجاهل التعديلات غير المحفوظة؟", "Discard unsaved changes?"))
    )
      return;
    setBusy(true);
    try {
      const full = v
        ? ((
            await apiJson(
              `/api/admin/provider-agreement?id=${encodeURIComponent(v.id)}`,
            )
          ).version as Version)
        : null;
      setSelected(full);
      setTemplate(full?.template ?? modernDraft(legacyTemplate()));
      setMessage("");
      setPdf("");
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function enableBuilder() {
    if (locked || busy) return;
    setBusy(true);
    try {
      const data = await apiJson("/api/admin/provider-agreement/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      setTemplate(data.template);
      setPdf("");
      setMessage(
        t(
          "تم نقل النص كاملًا للمحرّر المنظّم. احفظه كمسودة؛ لا يتغيّر القالب المعتمد.",
          "Full text imported into the structured editor. Save as a draft; the active template is unchanged.",
        ),
      );
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function uploadBuilder(slot: BuilderAssetSlot, file: File) {
    if (locked || busy) return;
    setBusy(true);
    try {
      if (
        !["image/png", "image/jpeg"].includes(file.type) ||
        file.size > 2 * 1024 * 1024
      )
        throw new Error("invalid_asset");
      const result = await apiJson("/api/admin/provider-agreement/asset", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setTemplate((current) => {
        if (!current.builder) return current;
        const builder = structuredClone(current.builder);
        if (slot === "header" || slot === "watermark") {
          builder[slot].dataUrl = result.dataUrl;
          builder[slot].visible = true;
        } else
          builder.signatures[
            slot === "signature" ? "signatureDataUrl" : "stampDataUrl"
          ] = result.dataUrl;
        return { ...current, builder };
      });
      setPdf("");
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function upload(key: "signatureDataUrl" | "stampDataUrl", file: File) {
    if (locked || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (
        !["image/png", "image/jpeg"].includes(file.type) ||
        file.size > 2 * 1024 * 1024
      )
        throw new Error("invalid_asset");
      const result = await apiJson("/api/admin/provider-agreement/asset", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setTemplate((current) => {
        const next = modernDraft(current);
        return {
          ...next,
          presentation: {
            ...next.presentation!,
            firstParty: {
              ...next.presentation!.firstParty,
              [key]: result.dataUrl,
            },
          },
        };
      });
      setPdf("");
      setMessage(
        t(
          "تم تجهيز الصورة. احفظ المسودة لتثبيتها.",
          "Image ready. Save the draft to retain it.",
        ),
      );
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const data = await apiJson("/api/admin/provider-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected?.id,
          revision: selected?.revision,
          templateId: groupId,
          template,
        }),
      });
      setSelected(data.version);
      setTemplate(data.version.template);
      await refresh();
      setMessage(
        t(
          "تم حفظ المسودة. لم تُنشر بعد.",
          "Draft saved. It has not been published.",
        ),
      );
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (
      !selected ||
      dirty ||
      !confirm(
        t(
          "نشر هذه النسخة وأرشفة النسخة المنشورة الحالية؟ تسري على التوقيعات الجديدة فقط، ولا تتغير الاتفاقيات الموقّعة سابقًا.",
          "Publish this version and archive the current one? Existing signed agreements will not change.",
        ),
      )
    )
      return;
    setBusy(true);
    try {
      const data = await apiJson("/api/admin/provider-agreement/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          revision: selected.revision,
          confirmation: "PUBLISH",
        }),
      });
      setSelected(data.version);
      await refresh();
      setMessage(
        t(
          "تم نشر الاتفاقية للتوقيعات الجديدة.",
          "Agreement published for new signatures.",
        ),
      );
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/provider-agreement/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          signatureDataUrl: signature.current?.isEmpty()
            ? ""
            : signature.current?.toDataURL("image/png"),
          extraValues: Object.fromEntries(
            (template.builder?.fields ?? [])
              .filter(
                (f) => f.kind !== "file" && Object.hasOwn(previewValues, f.id),
              )
              .map((f) => [f.id, previewValues[f.id]]),
          ),
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setPdf(URL.createObjectURL(await response.blob()));
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen px-5 py-10 text-[#082B67]"
    >
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-sm font-bold text-[#B4232A]">
            {t("إدارة الاتفاقيات", "AGREEMENTS")}
          </p>
          <h1 className="mt-2 text-3xl font-black">
            {t("اتفاقية المحامي — PDF", "Provider agreement — PDF")}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {t(
              "اختر لغات الاتفاقية، حرّر نص كل لغة، وعاين ملف PDF مع توقيع تجريبي. هذا القالب مستقل عن شروط التسجيل وإعدادات النسب.",
              "Choose the agreement languages, edit each text, and preview the PDF with a test signature. This template is separate from registration terms and commission settings.",
            )}
          </p>
        </header>
        {message && (
          <p
            role="status"
            className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950"
          >
            {message}
          </p>
        )}
        <TemplateLibrary
          key={`${groupId}-${groups.find((g) => g.id === groupId)?.revision ?? 0}`}
          ar={ar}
          templates={groups}
          selectedId={groupId}
          versionId={selected?.id}
          disabled={busy || !loaded}
          onChoose={chooseGroup}
          onAction={libraryAction}
        />
        <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
          <aside className={`${cardClass} space-y-4`}>
            <h2 className="font-bold">{t("النسخ", "Versions")}</h2>
            <button
              disabled={busy || !loaded || groupArchived}
              className={buttonClass}
              onClick={() => choose(null)}
            >
              <FileText size={17} />
              {t("مسودة جديدة", "New draft")}
            </button>
            {!loaded && <p>{t("جارٍ التحميل…", "Loading…")}</p>}
            {loaded && !versions.length && (
              <p className="text-sm leading-7 text-slate-500">
                {t(
                  "لا توجد إصدارات لهذا القالب. احفظ مسودة لبدء التحرير؛ الحفظ لا يغيّر القالب المعتمد.",
                  "No versions in this template. Save a draft to begin; saving does not change the active template.",
                )}
              </p>
            )}
            {versions.map((v) => (
              <button
                key={v.id}
                disabled={busy}
                onClick={() => choose(v)}
                className={`w-full rounded-2xl p-4 text-start ${selected?.id === v.id ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50 hover:bg-slate-100"}`}
              >
                <span className="block font-bold">
                  {t("نسخة", "Version")} {v.number}
                </span>
                <span className="mt-1 block text-sm">
                  {label(v.status, ar)}
                </span>
              </button>
            ))}
          </aside>
          <section className={`${cardClass} space-y-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {selected
                  ? `${t("نسخة", "Version")} ${selected.number} · ${label(selected.status, ar)}`
                  : t(
                      "مسودة جديدة من القالب السابق",
                      "New draft from legacy template",
                    )}
              </h2>
              {locked && !groupArchived && (
                <button
                  disabled={busy}
                  className={buttonClass}
                  onClick={() => {
                    setSelected(null);
                    setTemplate(modernDraft(template));
                    setPdf("");
                    setMessage(
                      t(
                        "نسخة جديدة قابلة للتعديل. احفظها كمسودة قبل النشر.",
                        "Editable copy. Save it as a draft before publishing.",
                      ),
                    );
                  }}
                >
                  <Copy size={16} />
                  {t("نسخ إلى مسودة", "Copy to draft")}
                </button>
              )}
            </div>
            {locked && (
              <p className="text-sm text-slate-600">
                {t(
                  "هذه النسخة محفوظة وغير قابلة للتعديل. أنشئ نسخة منها للتغيير.",
                  "This version is immutable. Copy it to make changes.",
                )}
              </p>
            )}
            {template.builder ? (
              <>
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  {t(
                    "احفظ المسودة ثم عاينها قبل اعتمادها. نشر النسخة يجعلها المعتمدة لجميع التسجيلات الجديدة فقط.",
                    "Save and preview the draft before activation. Publishing applies it to all new registrations only.",
                  )}
                </p>
                <BuilderEditor
                  ar={ar}
                  value={template.builder}
                  disabled={locked || busy}
                  onChange={(builder) => {
                    setTemplate({ ...template, builder });
                    setPdf("");
                  }}
                  onUpload={uploadBuilder}
                />
              </>
            ) : (
              <>
                {!locked && (
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={busy}
                    onClick={enableBuilder}
                  >
                    {t(
                      "فتح المحرّر الكامل للطرفين والشعار والفوتر",
                      "Open full editor for parties, logo and footer",
                    )}
                  </button>
                )}
                {template.presentation ? (
                  <FirstPartyFields
                    ar={ar}
                    value={template.presentation.firstParty}
                    disabled={locked || busy}
                    onUpload={upload}
                    onChange={(firstParty) => {
                      setTemplate({
                        ...template,
                        presentation: { layout: "modern-v1", firstParty },
                      });
                      setPdf("");
                    }}
                  />
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                    <p>
                      {t(
                        "هذه النسخة تستخدم التصميم السابق.",
                        "This version uses the previous layout.",
                      )}
                    </p>
                    {!locked && (
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() => {
                          setTemplate(modernDraft(template));
                          setPdf("");
                        }}
                      >
                        {t(
                          "اعتماد التصميم الرسمي العصري",
                          "Use modern formal layout",
                        )}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {!template.builder &&
              (["titleAr", "contentAr", "titleEn", "contentEn"] as const).map(
                (key) => (
                  <label key={key} className="block text-sm font-bold">
                    {
                      {
                        titleAr: t("العنوان بالعربية", "Arabic title"),
                        contentAr: t(
                          "نص الاتفاقية بالعربية",
                          "Arabic agreement",
                        ),
                        titleEn: t("العنوان بالإنجليزية", "English title"),
                        contentEn: t(
                          "نص الاتفاقية بالإنجليزية",
                          "English agreement",
                        ),
                      }[key]
                    }
                    {key.startsWith("title") ? (
                      <input
                        className={inputClass}
                        dir={key.endsWith("Ar") ? "rtl" : "ltr"}
                        value={template[key]}
                        maxLength={200}
                        disabled={locked || busy}
                        onChange={(e) => {
                          setTemplate({ ...template, [key]: e.target.value });
                          setPdf("");
                        }}
                      />
                    ) : (
                      <textarea
                        className={`${inputClass} min-h-72 leading-8`}
                        dir={key.endsWith("Ar") ? "rtl" : "ltr"}
                        value={template[key]}
                        maxLength={30000}
                        disabled={locked || busy}
                        onChange={(e) => {
                          setTemplate({ ...template, [key]: e.target.value });
                          setPdf("");
                        }}
                      />
                    )}
                  </label>
                ),
              )}
            {!template.builder && (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="mb-3 font-bold">
                  {t(
                    "متغيرات تُستبدل ببيانات المحامي تلقائيًا",
                    "Placeholders filled from provider details",
                  )}
                </p>
                <div dir="ltr" className="flex flex-wrap gap-2">
                  {PLACEHOLDERS.map((p) => (
                    <code
                      key={p}
                      className="select-all rounded-lg bg-white px-2 py-1 text-xs"
                    >{`{{${p}}}`}</code>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {!locked && (
                <button
                  disabled={busy || !loaded}
                  className={buttonClass}
                  onClick={save}
                >
                  <Save size={17} />
                  {t("حفظ المسودة", "Save draft")}
                </button>
              )}
              {selected &&
                selected.status !== "published" &&
                !groupArchived && (
                  <button
                    disabled={busy || dirty}
                    className={buttonClass}
                    onClick={publish}
                  >
                    <Upload size={17} />
                    {t("نشر النسخة", "Publish version")}
                  </button>
                )}
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-6">
              {template.builder?.fields.length ? (
                <div className="space-y-3">
                  <h3 className="font-bold">
                    {t(
                      "بيانات الحقول للمعاينة فقط",
                      "Field values for preview only",
                    )}
                  </h3>
                  {template.builder.fields.map((field) => (
                    <label key={field.id} className="block text-sm">
                      {field.label[ar ? "ar" : "en"] || field.id}
                      {field.kind === "file" ? (
                        <p className="text-xs text-slate-500">
                          {t(
                            "يُستخدم اسم ملف تجريبي، دون رفع ملف حقيقي.",
                            "A sample filename is used; no real file is uploaded.",
                          )}
                        </p>
                      ) : field.kind === "select" ? (
                        <select
                          className={inputClass}
                          value={
                            previewValues[field.id] ??
                            field.options[0]?.id ??
                            ""
                          }
                          onChange={(e) => {
                            setPreviewValues((v) => ({
                              ...v,
                              [field.id]: e.target.value,
                            }));
                            setPdf("");
                          }}
                        >
                          {field.options.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label[ar ? "ar" : "en"] || o.id}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className={inputClass}
                          type={
                            field.kind === "date"
                              ? "date"
                              : field.kind === "number"
                                ? "number"
                                : "text"
                          }
                          step={field.kind === "number" ? "any" : undefined}
                          maxLength={field.kind === "textarea" ? 3000 : 300}
                          placeholder={t(
                            "قيمة تجريبية تلقائية",
                            "Automatic sample value",
                          )}
                          value={previewValues[field.id] ?? ""}
                          onChange={(e) => {
                            setPreviewValues((v) => ({
                              ...v,
                              [field.id]: e.target.value,
                            }));
                            setPdf("");
                          }}
                        />
                      )}
                    </label>
                  ))}
                </div>
              ) : null}
              <h2 className="text-lg font-bold">
                {t("تجربة شكل التوقيع", "Test signature appearance")}
              </h2>
              <p className="text-sm text-slate-600">
                {t(
                  "بيانات وهمية وتوقيع تجريبي فقط؛ لا يُحفظ كتوقيع محامي ولا يُرسل لأحد.",
                  "Sample details only. This signature is not recorded as a provider signature or sent to anyone.",
                )}
              </p>
              <div className="max-w-full overflow-hidden rounded-xl bg-slate-50">
                <SignatureCanvas
                  ref={signature}
                  onEnd={() => setPdf("")}
                  penColor="#082B67"
                  canvasProps={{
                    width: 500,
                    height: 180,
                    className: "max-w-full touch-none",
                    "aria-label": t("توقيع تجريبي", "Test signature"),
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={busy}
                  onClick={() => {
                    signature.current?.clear();
                    setPdf("");
                  }}
                  className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold"
                >
                  {t("مسح التوقيع", "Clear signature")}
                </button>
                <button
                  disabled={busy || !loaded}
                  onClick={preview}
                  className={buttonClass}
                >
                  <Eye size={17} />
                  {busy
                    ? t("جارٍ التنفيذ…", "Working…")
                    : t("معاينة PDF", "Preview PDF")}
                </button>
              </div>
            </div>
            {pdf && (
              <div className="space-y-3">
                <a
                  href={pdf}
                  download="agreement-preview.pdf"
                  className="inline-block font-bold text-[#B4232A] underline"
                >
                  {t("تحميل المعاينة التجريبية", "Download test preview")}
                </a>
                <iframe
                  src={pdf}
                  title={t("معاينة الاتفاقية", "Agreement preview")}
                  className="h-[750px] w-full rounded-xl bg-slate-100"
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
