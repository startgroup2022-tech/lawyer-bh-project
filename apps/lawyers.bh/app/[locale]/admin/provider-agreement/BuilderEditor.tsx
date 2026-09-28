"use client";
import { useState } from "react";
import type {
  BuilderTemplate,
  BuilderField,
  Alignment,
} from "@/lib/provider-agreement/builder-model";
import { PLACEHOLDERS } from "@/lib/provider-agreement/model";
import {
  builderFieldInUse,
  builderRowInUse,
} from "@/lib/provider-agreement/builder-references";
import { buttonClass, inputClass } from "@/lib/careers/ui";
import {
  Bilingual,
  Toggle,
  RowActions,
  SourceEditor,
  moveItem,
  builderId,
  emptyText,
  PdfLanguageContext,
} from "./BuilderControls";
export type BuilderAssetSlot = "header" | "watermark" | "signature" | "stamp";
const panel = "space-y-4 rounded-2xl bg-slate-50 p-5";
export default function BuilderEditor({
  ar,
  value,
  disabled,
  onChange,
  onUpload,
}: {
  ar: boolean;
  value: BuilderTemplate;
  disabled: boolean;
  onChange: (value: BuilderTemplate) => void;
  onUpload: (slot: BuilderAssetSlot, file: File) => Promise<void>;
}) {
  const [tab, setTab] = useState("info");
  const [newLanguageCode, setNewLanguageCode] = useState("");
  const t = (a: string, b: string) => (ar ? a : b);
  const tabs = [
    ["info", "معلومات الاتفاقية", "Agreement"],
    ["languages", "لغات PDF", "PDF languages"],
    ["parties", "الطرفان", "Parties"],
    ["fields", "حقول التسجيل", "Registration fields"],
    ["clauses", "مواد الاتفاقية", "Clauses"],
    ["branding", "الهيدر والعلامة المائية", "Header & watermark"],
    ["footer", "الفوتر", "Footer"],
    ["signatures", "التوقيع والختم", "Signatures & stamp"],
  ];
  const edit = (change: (draft: BuilderTemplate) => void) => {
    const draft = structuredClone(value);
    change(draft);
    for (const language of draft.additionalLanguages ?? []) {
      for (const [fieldId, options] of Object.entries(language.selectOptionLabels ?? {})) {
        const field = draft.fields.find((item) => item.id === fieldId && item.kind === "select");
        if (!field) { delete language.selectOptionLabels![fieldId]; continue; }
        for (const optionId of Object.keys(options))
          if (!field.options.some((option) => option.id === optionId)) delete options[optionId];
      }
    }
    onChange(draft);
  };
  const variables = [
    ...PLACEHOLDERS,
    ...value.fields.map((f) => `field.${f.id}`),
    ...(["first", "second"] as const).flatMap((side) =>
      value.parties[side].rows.map((r) => `${side}.${r.id}`),
    ),
  ];
  const variableLabels: Record<string, string> = {
    provider_name: t("اسم مقدم الخدمة", "Provider name"),
    license_number: t("رقم الرخصة / الرقم الشخصي", "License / personal number"),
    email: t("البريد الإلكتروني", "Email"),
    phone: t("الهاتف", "Phone"),
    reference: t("مرجع الاتفاقية", "Agreement reference"),
    date: t("تاريخ التوقيع", "Signing date"),
    weekday_ar: t("اليوم بالعربية", "Weekday in Arabic"),
    weekday_en: t("اليوم بالإنجليزية", "Weekday in English"),
  };
  for (const field of value.fields)
    variableLabels[`field.${field.id}`] =
      `${t("حقل التسجيل", "Registration field")}: ${field.label[ar ? "ar" : "en"] || t("بدون عنوان", "Untitled")}`;
  for (const side of ["first", "second"] as const)
    for (const row of value.parties[side].rows)
      variableLabels[`${side}.${row.id}`] =
        `${value.parties[side].title[ar ? "ar" : "en"]}: ${row.label[ar ? "ar" : "en"] || t("بدون عنوان", "Untitled")}`;
  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("أقسام محرر الاتفاقية", "Agreement editor sections")}
      >
        {tabs.map(([key, a, b]) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === key}
            key={key}
            className={`${buttonClass} ${tab === key ? "ring-2 ring-red-200" : ""}`}
            onClick={() => setTab(key)}
          >
            {t(a, b)}
          </button>
        ))}
      </div>
      <PdfLanguageContext.Provider value={tab === "fields" ? ["ar", "en"] : (["ar", "en"] as const).filter((lang) => (value.pdfLanguages ?? ["ar", "en"]).includes(lang))}>
      <fieldset disabled={disabled} className="space-y-5" role="tabpanel">
        {tab === "languages" && (
          <section className={panel}>
            <h3 className="font-bold">{t("اللغات التي ستظهر في PDF", "Languages included in the PDF")}</h3>
            <p className="text-sm text-slate-600">{t("يُحفظ هذا الاختيار مع النسخة. أدخل الترجمة القانونية لكل لغة إضافية بنفسك.", "This selection is saved with the version. Enter each additional legal translation yourself.")}</p>
            <div className="flex flex-wrap gap-4">
              {(["ar", "en"] as const).map((lang) => (
                <label key={lang} className="flex items-center gap-2 font-bold">
                  <input type="checkbox" aria-label={lang === "ar" ? t("تضمين العربية في PDF", "Include Arabic in PDF") : t("تضمين الإنجليزية في PDF", "Include English in PDF")}
                    checked={(value.pdfLanguages ?? ["ar", "en"]).includes(lang)}
                    onChange={(event) => edit((draft) => {
                      const current = draft.pdfLanguages ?? ["ar", "en"];
                      draft.pdfLanguages = event.target.checked ? [...current, lang] : current.filter((code) => code !== lang);
                    })} />
                  {lang === "ar" ? "العربية" : "English"}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-bold">{t("رمز اللغة", "Language code")}
                <input className={inputClass} aria-label={t("رمز اللغة", "Language code")} placeholder="fr" maxLength={8} value={newLanguageCode}
                  onChange={(event) => setNewLanguageCode(event.target.value.toLowerCase().trim())} />
              </label>
              <button type="button" className={buttonClass}
                disabled={!/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(newLanguageCode) || ["ar", "en"].includes(newLanguageCode) || (value.pdfLanguages ?? ["ar", "en"]).includes(newLanguageCode) || (value.additionalLanguages?.length ?? 0) >= 4}
                onClick={() => {
                  edit((draft) => {
                    draft.pdfLanguages = [...(draft.pdfLanguages ?? ["ar", "en"]), newLanguageCode];
                    draft.additionalLanguages = [...(draft.additionalLanguages ?? []), {
                      code: newLanguageCode, name: "", direction: "ltr", title: "", content: "",
                      firstParty: "", secondParty: "", firstPartyDetails: "", secondPartyDetails: "", identity: "", signatures: "",
                      firstSignature: "", secondSignature: "", stamp: "", footer: "",
                    }];
                  });
                  setNewLanguageCode("");
                }}>{t("إضافة لغة", "Add language")}</button>
            </div>
            <div className="space-y-2">
              {(value.pdfLanguages ?? ["ar", "en"]).map((code, index, ordered) => (
                <div key={code} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-bold">
                  <span className="flex-1">{index + 1}. {code === "ar" ? "العربية" : code === "en" ? "English" : value.additionalLanguages?.find((entry) => entry.code === code)?.name || code}</span>
                  <button type="button" className={buttonClass} disabled={index === 0} onClick={() => edit((draft) => { const list = draft.pdfLanguages ?? ["ar", "en"]; [list[index - 1], list[index]] = [list[index], list[index - 1]]; draft.pdfLanguages = list; })}>{t("للأعلى", "Up")}</button>
                  <button type="button" className={buttonClass} disabled={index === ordered.length - 1} onClick={() => edit((draft) => { const list = draft.pdfLanguages ?? ["ar", "en"]; [list[index], list[index + 1]] = [list[index + 1], list[index]]; draft.pdfLanguages = list; })}>{t("للأسفل", "Down")}</button>
                </div>
              ))}
            </div>
            {(value.additionalLanguages ?? []).map((language, index) => (
              <section key={language.code} className="space-y-3 rounded-xl bg-white p-4">
                <div className="flex items-center justify-between"><h4 className="font-bold">{language.code}</h4>
                  <button type="button" className={buttonClass} onClick={() => edit((draft) => {
                    draft.additionalLanguages = draft.additionalLanguages?.filter((entry) => entry.code !== language.code);
                    draft.pdfLanguages = draft.pdfLanguages?.filter((code) => code !== language.code);
                  })}>{t("حذف اللغة", "Remove language")}</button></div>
                <label className="block text-sm font-bold">{t("اسم اللغة", "Language name")}
                  <input className={inputClass} maxLength={80} value={language.name} onChange={(event) => edit((draft) => { draft.additionalLanguages![index].name = event.target.value; })} />
                </label>
                <label className="block text-sm font-bold">{t("اتجاه النص", "Text direction")}
                  <select className={inputClass} value={language.direction} onChange={(event) => edit((draft) => { draft.additionalLanguages![index].direction = event.target.value as "ltr" | "rtl"; })}>
                    <option value="ltr">LTR</option><option value="rtl">RTL</option>
                  </select>
                </label>
                {([
                  ["title", t("العنوان", "Title")], ["content", t("نص الاتفاقية", "Agreement text")],
                  ["firstParty", t("مسمى الطرف الأول", "First party")], ["secondParty", t("مسمى الطرف الثاني", "Second party")],
                  ["firstPartyDetails", t("تفاصيل الطرف الأول", "First party details")], ["secondPartyDetails", t("تفاصيل الطرف الثاني", "Second party details")],
                  ["identity", t("تسمية هوية الموقّع", "Signer identity label")], ["signatures", t("عنوان التوقيعات", "Signature heading")],
                  ["firstSignature", t("توقيع الطرف الأول", "First signature label")], ["secondSignature", t("توقيع المحامي", "Lawyer signature label")],
                  ["stamp", t("الختم", "Stamp label")], ["footer", t("التذييل", "Footer")],
                ] as const).map(([key, fieldLabel]) => (
                  <label key={key} className="block text-sm font-bold">{fieldLabel}
                    {key === "content" || key === "footer" || key === "firstPartyDetails" || key === "secondPartyDetails" ?
                      <textarea className={`${inputClass} min-h-28`} dir={language.direction} aria-label={`${fieldLabel} ${language.code}`} maxLength={key === "content" ? 30000 : key === "footer" ? 600 : 3000}
                        value={language[key] ?? ""} onChange={(event) => edit((draft) => { draft.additionalLanguages![index][key] = event.target.value; })} /> :
                      <input className={inputClass} dir={language.direction} aria-label={`${fieldLabel} ${language.code}`} maxLength={key === "title" ? 200 : 120}
                        value={language[key]} onChange={(event) => edit((draft) => { draft.additionalLanguages![index][key] = event.target.value; })} />}
                  </label>
                ))}
                {value.fields.filter((field) => field.kind === "select").map((field) => (
                  <div key={field.id} className="space-y-2 rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-bold">{t("ترجمة خيارات", "Translate choices")}: {field.label[ar ? "ar" : "en"]}</p>
                    {field.options.map((option) => (
                      <label key={option.id} className="block text-sm font-bold">{option.label[ar ? "ar" : "en"]} ({option.id})
                        <input className={inputClass} dir={language.direction} maxLength={120}
                          aria-label={`${t("ترجمة خيار", "Choice translation")} ${option.id} ${language.code}`}
                          value={language.selectOptionLabels?.[field.id]?.[option.id] ?? ""}
                          onChange={(event) => edit((draft) => {
                            const current = draft.additionalLanguages![index];
                            current.selectOptionLabels ??= {};
                            current.selectOptionLabels[field.id] ??= {};
                            if (event.target.value) current.selectOptionLabels[field.id][option.id] = event.target.value;
                            else delete current.selectOptionLabels[field.id][option.id];
                          })} />
                      </label>
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </section>
        )}
        {tab === "info" && (
          <>
            <Bilingual
              label={t("عنوان الاتفاقية", "Agreement title")}
              value={value.title}
              max={200}
              onChange={(title) =>
                edit((d) => {
                  d.title = title;
                })
              }
            />
            <p className="text-sm text-slate-600">
              {t(
                "تنسيق A4 وصفحة توقيعات حسب اللغات المختارة. معلومات كل محامي تُملأ من تسجيله؛ القالب فقط ثابت للجميع.",
                "A4 and a signature page in the selected languages. Provider identity is populated from registration; only the template is shared.",
              )}
            </p>
          </>
        )}
        {tab === "parties" &&
          (["first", "second"] as const).map((side) => (
            <section className={panel} key={side}>
              <Bilingual
                label={t(
                  side === "first" ? "مسمى الطرف الأول" : "مسمى الطرف الثاني",
                  side === "first" ? "First party title" : "Second party title",
                )}
                value={value.parties[side].title}
                max={120}
                onChange={(title) =>
                  edit((d) => {
                    d.parties[side].title = title;
                  })
                }
              />
              {value.parties[side].rows.map((row, i) => (
                <div className="space-y-3 rounded-xl bg-white p-4" key={row.id}>
                  <Bilingual
                    label={t("عنوان السطر", "Row label")}
                    value={row.label}
                    max={120}
                    onChange={(label) =>
                      edit((d) => {
                        d.parties[side].rows[i].label = label;
                      })
                    }
                  />
                  <Toggle
                    label={t("إظهار السطر", "Show row")}
                    value={row.visible}
                    onChange={(visible) =>
                      edit((d) => {
                        d.parties[side].rows[i].visible = visible;
                      })
                    }
                  />
                  <SourceEditor
                    ar={ar}
                    value={row.source}
                    fields={value.fields}
                    onChange={(source) =>
                      edit((d) => {
                        d.parties[side].rows[i].source = source;
                      })
                    }
                  />
                  <RowActions
                    ar={ar}
                    index={i}
                    count={value.parties[side].rows.length}
                    onMove={(to) =>
                      edit((d) => {
                        d.parties[side].rows = moveItem(
                          d.parties[side].rows,
                          i,
                          to,
                        );
                      })
                    }
                    onDelete={
                      builderRowInUse(value, side, row.id)
                        ? undefined
                        : () =>
                            edit((d) => {
                              d.parties[side].rows.splice(i, 1);
                            })
                    }
                  />
                  {builderRowInUse(value, side, row.id) && (
                    <p className="text-xs text-amber-900">
                      {t(
                        "هذا السطر مستخدم في النص أو الفوتر. أزل استخدامه أولًا للسماح بحذفه.",
                        "This row is used in the agreement or footer. Remove its references before deleting it.",
                      )}
                    </p>
                  )}
                </div>
              ))}
              <button
                type="button"
                className={buttonClass}
                disabled={value.parties[side].rows.length >= 30}
                onClick={() =>
                  edit((d) => {
                    d.parties[side].rows.push({
                      id: builderId(),
                      label: emptyText(),
                      visible: true,
                      source: { kind: "fixed", value: emptyText() },
                    });
                  })
                }
              >
                {t("إضافة سطر بيانات", "Add details row")}
              </button>
            </section>
          ))}
        {tab === "fields" && (
          <>
            {value.fields.map((field, i) => (
              <section
                key={field.id}
                data-field-id={field.id}
                className={panel}
              >
                <Bilingual
                  label={t("عنوان الحقل", "Field label")}
                  value={field.label}
                  max={120}
                  onChange={(label) =>
                    edit((d) => {
                      d.fields[i].label = label;
                    })
                  }
                />
                <Bilingual
                  label={t("النص المساعد", "Help text")}
                  value={field.help}
                  onChange={(help) =>
                    edit((d) => {
                      d.fields[i].help = help;
                    })
                  }
                />
                <label className="block text-sm font-bold">
                  {t("نوع الحقل", "Field type")}
                  <select
                    className={inputClass}
                    value={field.kind}
                    onChange={(e) =>
                      edit((d) => {
                        const f = d.fields[i];
                        f.kind = e.target.value as BuilderField["kind"];
                        f.options =
                          f.kind === "select"
                            ? [{ id: builderId(), label: emptyText() }]
                            : [];
                      })
                    }
                  >
                    {[
                      ["text", "نص قصير", "Short text"],
                      ["textarea", "نص طويل", "Long text"],
                      ["number", "رقم", "Number"],
                      ["date", "تاريخ", "Date"],
                      ["select", "قائمة اختيار", "Select"],
                      ["file", "ملف", "File"],
                    ].map(([key, a, b]) => (
                      <option
                        key={key}
                        value={key}
                        disabled={
                          key === "file" &&
                          field.kind !== "file" &&
                          value.fields.filter((f) => f.kind === "file")
                            .length >= 3
                        }
                      >
                        {t(a, b)}
                      </option>
                    ))}
                  </select>
                </label>
                <Toggle
                  label={t("إلزامي", "Required")}
                  value={field.required}
                  onChange={(required) =>
                    edit((d) => {
                      d.fields[i].required = required;
                    })
                  }
                />
                {field.kind === "file" && (
                  <p className="text-sm">
                    {t(
                      "PDF أو PNG أو JPEG، حتى 5 ميغابايت. حد أقصى ثلاثة ملفات للتسجيل.",
                      "PDF, PNG or JPEG up to 5 MiB. Maximum three files per registration.",
                    )}
                  </p>
                )}
                {field.kind === "select" && (
                  <div className="space-y-3">
                    {field.options.map((option, j) => (
                      <div
                        className="space-y-2 rounded-xl bg-white p-3"
                        key={option.id}
                      >
                        <Bilingual
                          label={t("خيار", "Option")}
                          value={option.label}
                          max={120}
                          onChange={(label) =>
                            edit((d) => {
                              d.fields[i].options[j].label = label;
                            })
                          }
                        />
                        <RowActions
                          ar={ar}
                          index={j}
                          count={field.options.length}
                          onMove={(to) =>
                            edit((d) => {
                              d.fields[i].options = moveItem(
                                d.fields[i].options,
                                j,
                                to,
                              );
                            })
                          }
                          onDelete={() =>
                            edit((d) => {
                              d.fields[i].options.splice(j, 1);
                            })
                          }
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className={buttonClass}
                      disabled={field.options.length >= 30}
                      onClick={() =>
                        edit((d) => {
                          d.fields[i].options.push({
                            id: builderId(),
                            label: emptyText(),
                          });
                        })
                      }
                    >
                      {t("إضافة خيار", "Add option")}
                    </button>
                  </div>
                )}
                <RowActions
                  ar={ar}
                  index={i}
                  count={value.fields.length}
                  onMove={(to) =>
                    edit((d) => {
                      d.fields = moveItem(d.fields, i, to);
                    })
                  }
                  onDelete={
                    builderFieldInUse(value, field.id)
                      ? undefined
                      : () =>
                          edit((d) => {
                            d.fields.splice(i, 1);
                          })
                  }
                />
                {builderFieldInUse(value, field.id) && (
                  <p className="text-xs text-amber-900">
                    {t(
                      "هذا الحقل مستخدم في الاتفاقية. أزل استخدامه أولًا للسماح بحذفه.",
                      "This field is used in the agreement. Remove its references before deleting it.",
                    )}
                  </p>
                )}
              </section>
            ))}
            <button
              type="button"
              className={buttonClass}
              disabled={value.fields.length >= 30}
              onClick={() =>
                edit((d) => {
                  d.fields.push({
                    id: builderId(),
                    kind: "text",
                    required: false,
                    label: emptyText(),
                    help: emptyText(),
                    options: [],
                  });
                })
              }
            >
              {t("إضافة حقل", "Add field")}
            </button>
          </>
        )}
        {tab === "clauses" && (
          <>
            {value.clauses.map((clause, i) => (
              <section key={clause.id} className={panel}>
                <h3 className="font-bold">
                  {t("المادة", "Clause")} {i + 1}
                </h3>
                <Bilingual
                  label={t("عنوان المادة", "Clause title")}
                  value={clause.title}
                  max={200}
                  onChange={(title) =>
                    edit((d) => {
                      d.clauses[i].title = title;
                    })
                  }
                />
                <Bilingual
                  label={t("نص المادة", "Clause body")}
                  value={clause.body}
                  max={30000}
                  multiline
                  onChange={(body) =>
                    edit((d) => {
                      d.clauses[i].body = body;
                    })
                  }
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {(["ar", "en"] as const).map((lang) => (
                    <label key={lang} className="text-sm font-bold">
                      {t("إدراج بيانات في النص", "Insert data into body")} ·{" "}
                      {lang}
                      <select
                        className={inputClass}
                        value=""
                        onChange={(e) => {
                          if (e.target.value)
                            edit((d) => {
                              d.clauses[i].body[lang] +=
                                ` {{${e.target.value}}}`;
                            });
                        }}
                      >
                        <option value="">
                          {t("اختر البيانات", "Choose data")}
                        </option>
                        {variables.map((key) => (
                          <option value={key} key={key}>
                            {variableLabels[key] ?? key}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <RowActions
                  ar={ar}
                  index={i}
                  count={value.clauses.length}
                  onMove={(to) =>
                    edit((d) => {
                      d.clauses = moveItem(d.clauses, i, to);
                    })
                  }
                  onCopy={
                    value.clauses.length < 60
                      ? () =>
                          edit((d) => {
                            d.clauses.splice(i + 1, 0, {
                              ...structuredClone(clause),
                              id: builderId(),
                            });
                          })
                      : undefined
                  }
                  onDelete={
                    value.clauses.length > 1
                      ? () =>
                          edit((d) => {
                            d.clauses.splice(i, 1);
                          })
                      : undefined
                  }
                />
              </section>
            ))}
            <button
              type="button"
              className={buttonClass}
              disabled={value.clauses.length >= 60}
              onClick={() =>
                edit((d) => {
                  d.clauses.push({
                    id: builderId(),
                    title: emptyText(),
                    body: emptyText(),
                  });
                })
              }
            >
              {t("إضافة مادة", "Add clause")}
            </button>
          </>
        )}
        {tab === "branding" &&
          (["header", "watermark"] as const).map((slot) => (
            <section className={panel} key={slot}>
              <h3 className="font-bold">
                {slot === "header"
                  ? t("شعار الهيدر", "Header logo")
                  : t("العلامة المائية", "Watermark")}
              </h3>
              <Toggle
                label={t("إظهار الصورة", "Show image")}
                value={value[slot].visible}
                onChange={(visible) =>
                  edit((d) => {
                    d[slot].visible = visible;
                  })
                }
              />
              <AssetUpload
                ar={ar}
                slot={slot}
                dataUrl={value[slot].dataUrl}
                onUpload={onUpload}
                onRemove={() =>
                  edit((d) => {
                    d[slot].dataUrl = "";
                    d[slot].visible = false;
                  })
                }
              />
              <label className="block text-sm font-bold">
                {t("الحجم بالنقاط (50–480)", "Size in points (50–480)")}
                <input
                  type="number"
                  className={inputClass}
                  min={50}
                  max={480}
                  value={value[slot].width}
                  onChange={(e) =>
                    edit((d) => {
                      d[slot].width = Number(e.target.value);
                    })
                  }
                />
              </label>
              {slot === "header" ? (
                <AlignmentControl
                  ar={ar}
                  value={value.header.align}
                  onChange={(align) =>
                    edit((d) => {
                      d.header.align = align;
                    })
                  }
                />
              ) : (
                <label className="block text-sm font-bold">
                  {t(
                    "وضوح العلامة المائية (0–30%)",
                    "Watermark opacity (0–30%)",
                  )}
                  <input
                    type="number"
                    className={inputClass}
                    min={0}
                    max={30}
                    step={1}
                    value={Math.round(value.watermark.opacity * 100)}
                    onChange={(e) =>
                      edit((d) => {
                        d.watermark.opacity = Number(e.target.value) / 100;
                      })
                    }
                  />
                </label>
              )}
            </section>
          ))}
        {tab === "footer" && (
          <>
            <Toggle
              label={t("ترقيم الصفحات", "Page numbers")}
              value={value.footer.pageNumbers}
              onChange={(pageNumbers) =>
                edit((d) => {
                  d.footer.pageNumbers = pageNumbers;
                })
              }
            />
            <AlignmentControl
              ar={ar}
              value={value.footer.align}
              onChange={(align) =>
                edit((d) => {
                  d.footer.align = align;
                })
              }
            />
            {value.footer.rows.map((row, i) => (
              <section className={panel} key={row.id}>
                <Bilingual
                  label={t(
                    "عنوان السطر (اسم المنصة، السجل، العنوان، الهاتف…)",
                    "Row label (platform, registration, address, phone…)",
                  )}
                  value={row.label}
                  max={120}
                  onChange={(label) =>
                    edit((d) => {
                      d.footer.rows[i].label = label;
                    })
                  }
                />
                <Toggle
                  label={t("إظهار السطر", "Show row")}
                  value={row.visible}
                  onChange={(visible) =>
                    edit((d) => {
                      d.footer.rows[i].visible = visible;
                    })
                  }
                />
                <label className="block text-sm font-bold">
                  {t("مصدر القيمة", "Value source")}
                  <select
                    className={inputClass}
                    value={row.source.kind}
                    onChange={(e) =>
                      edit((d) => {
                        d.footer.rows[i].source =
                          e.target.value === "fixed"
                            ? { kind: "fixed", value: emptyText() }
                            : {
                                kind: "first",
                                rowId: value.parties.first.rows[0]?.id ?? "",
                              };
                      })
                    }
                  >
                    <option value="fixed">
                      {t("قيمة ثابتة", "Fixed value")}
                    </option>
                    <option
                      value="first"
                      disabled={!value.parties.first.rows.length}
                    >
                      {t("من بيانات الطرف الأول", "First party details")}
                    </option>
                  </select>
                </label>
                {row.source.kind === "fixed" ? (
                  <Bilingual
                    label={t("القيمة", "Value")}
                    value={row.source.value}
                    onChange={(next) =>
                      edit((d) => {
                        d.footer.rows[i].source = {
                          kind: "fixed",
                          value: next,
                        };
                      })
                    }
                  />
                ) : (
                  <select
                    className={inputClass}
                    value={row.source.rowId}
                    onChange={(e) =>
                      edit((d) => {
                        d.footer.rows[i].source = {
                          kind: "first",
                          rowId: e.target.value,
                        };
                      })
                    }
                  >
                    {value.parties.first.rows.map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.label[ar ? "ar" : "en"] || r.id}
                      </option>
                    ))}
                  </select>
                )}
                <RowActions
                  ar={ar}
                  index={i}
                  count={value.footer.rows.length}
                  onMove={(to) =>
                    edit((d) => {
                      d.footer.rows = moveItem(d.footer.rows, i, to);
                    })
                  }
                  onDelete={() =>
                    edit((d) => {
                      d.footer.rows.splice(i, 1);
                    })
                  }
                />
              </section>
            ))}
            <button
              type="button"
              className={buttonClass}
              disabled={value.footer.rows.length >= 12}
              onClick={() =>
                edit((d) => {
                  d.footer.rows.push({
                    id: builderId(),
                    label: emptyText(),
                    visible: true,
                    source: { kind: "fixed", value: emptyText() },
                  });
                })
              }
            >
              {t("إضافة سطر للفوتر", "Add footer row")}
            </button>
            <Bilingual
              label={t("نص إضافي للفوتر", "Additional footer text")}
              value={value.footer.extra}
              max={600}
              multiline
              onChange={(extra) =>
                edit((d) => {
                  d.footer.extra = extra;
                })
              }
            />
          </>
        )}
        {tab === "signatures" && (
          <>
            <Bilingual
              label={t("عنوان توقيع الطرف الأول", "First signature label")}
              value={value.signatures.firstLabel}
              max={120}
              onChange={(v) =>
                edit((d) => {
                  d.signatures.firstLabel = v;
                })
              }
            />
            <Bilingual
              label={t("عنوان توقيع مقدم الخدمة", "Provider signature label")}
              value={value.signatures.secondLabel}
              max={120}
              onChange={(v) =>
                edit((d) => {
                  d.signatures.secondLabel = v;
                })
              }
            />
            <Bilingual
              label={t("اسم المفوّض", "Representative name")}
              value={value.signatures.representative}
              max={120}
              onChange={(v) =>
                edit((d) => {
                  d.signatures.representative = v;
                })
              }
            />
            <Bilingual
              label={t("صفة المفوّض", "Representative role")}
              value={value.signatures.role}
              max={120}
              onChange={(v) =>
                edit((d) => {
                  d.signatures.role = v;
                })
              }
            />
            <Toggle
              label={t("إظهار توقيع الطرف الأول", "Show first party signature")}
              value={value.signatures.showFirst}
              onChange={(v) =>
                edit((d) => {
                  d.signatures.showFirst = v;
                })
              }
            />
            <Toggle
              label={t("إظهار الختم", "Show stamp")}
              value={value.signatures.showStamp}
              onChange={(v) =>
                edit((d) => {
                  d.signatures.showStamp = v;
                })
              }
            />
            <Toggle
              label={t("الطرف الأول على اليمين", "First party on the right")}
              value={value.signatures.firstOnRight}
              onChange={(v) =>
                edit((d) => {
                  d.signatures.firstOnRight = v;
                })
              }
            />
            {(["signature", "stamp"] as const).map((slot) => (
              <section className={panel} key={slot}>
                <h3 className="font-bold">
                  {slot === "signature"
                    ? t(
                        "توقيع مفوّض المنصة",
                        "Platform representative signature",
                      )
                    : t("ختم المنصة", "Platform stamp")}
                </h3>
                <AssetUpload
                  ar={ar}
                  slot={slot}
                  dataUrl={
                    slot === "signature"
                      ? value.signatures.signatureDataUrl
                      : value.signatures.stampDataUrl
                  }
                  onUpload={onUpload}
                  onRemove={() =>
                    edit((d) => {
                      if (slot === "signature")
                        d.signatures.signatureDataUrl = "";
                      else d.signatures.stampDataUrl = "";
                    })
                  }
                />
              </section>
            ))}
            <p className="text-sm text-slate-600">
              {t(
                "توقيع مقدم الخدمة يؤخذ من موافقته الفعلية، ولا يمكن استبداله من هذه الصفحة.",
                "Provider signature comes from actual acceptance and cannot be replaced here.",
              )}
            </p>
          </>
        )}
      </fieldset>
      </PdfLanguageContext.Provider>
    </div>
  );
}
function AlignmentControl({
  ar,
  value,
  onChange,
}: {
  ar: boolean;
  value: Alignment;
  onChange: (v: Alignment) => void;
}) {
  return (
    <label className="block text-sm font-bold">
      {ar ? "المحاذاة" : "Alignment"}
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value as Alignment)}
      >
        <option value="right">{ar ? "يمين" : "Right"}</option>
        <option value="center">{ar ? "وسط" : "Center"}</option>
        <option value="left">{ar ? "يسار" : "Left"}</option>
      </select>
    </label>
  );
}
function AssetUpload({
  ar,
  slot,
  dataUrl,
  onUpload,
  onRemove,
}: {
  ar: boolean;
  slot: BuilderAssetSlot;
  dataUrl: string;
  onUpload: (slot: BuilderAssetSlot, file: File) => Promise<void>;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3">
      <input
        aria-label={ar ? "رفع صورة" : "Upload image"}
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onUpload(slot, file);
        }}
      />
      {dataUrl && (
        <>
          <div className="rounded-xl bg-white p-4">
            {/* Uploaded private draft data, not a remote optimizable asset. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt={ar ? "معاينة الصورة" : "Image preview"}
              className="mx-auto max-h-28 max-w-full object-contain"
            />
          </div>
          <button type="button" className={buttonClass} onClick={onRemove}>
            {ar ? "إزالة الصورة" : "Remove image"}
          </button>
        </>
      )}
    </div>
  );
}
