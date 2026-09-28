"use client";
import { createContext, useContext } from "react";
import type {
  Localized,
  ValueSource,
  BuilderField,
} from "@/lib/provider-agreement/builder-model";
import { providerKeys } from "@/lib/provider-agreement/builder-model";
import { inputClass, buttonClass } from "@/lib/careers/ui";
export const emptyText = (): Localized => ({ ar: "", en: "" });
export const PdfLanguageContext = createContext<readonly ("ar" | "en")[]>(["ar", "en"]);
export const builderId = () => `f_${crypto.randomUUID().replaceAll("-", "")}`;
export function Bilingual({
  label,
  value,
  onChange,
  max = 600,
  multiline = false,
}: {
  label: string;
  value: Localized;
  onChange: (value: Localized) => void;
  max?: number;
  multiline?: boolean;
}) {
  const languages = useContext(PdfLanguageContext);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {languages.map((lang) => (
        <label key={lang} className="block text-sm font-bold">
          {label} · {lang === "ar" ? "العربية" : "English"}
          {multiline ? (
            <textarea
              className={`${inputClass} min-h-28 leading-7`}
              dir={lang === "ar" ? "rtl" : "ltr"}
              maxLength={max}
              value={value[lang]}
              onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            />
          ) : (
            <input
              className={inputClass}
              dir={lang === "ar" ? "rtl" : "ltr"}
              maxLength={max}
              value={value[lang]}
              onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            />
          )}
        </label>
      ))}
    </div>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-bold">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function RowActions({
  ar,
  index,
  count,
  onMove,
  onDelete,
  onCopy,
}: {
  ar: boolean;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onDelete?: () => void;
  onCopy?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={buttonClass}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
      >
        {ar ? "↑ للأعلى" : "↑ Up"}
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        {ar ? "↓ للأسفل" : "↓ Down"}
      </button>
      {onCopy && (
        <button type="button" className={buttonClass} onClick={onCopy}>
          {ar ? "نسخ" : "Copy"}
        </button>
      )}
      {onDelete && (
        <button type="button" className={buttonClass} onClick={onDelete}>
          {ar ? "حذف" : "Remove"}
        </button>
      )}
    </div>
  );
}
export function moveItem<T>(rows: T[], from: number, to: number) {
  const result = [...rows];
  const [row] = result.splice(from, 1);
  result.splice(to, 0, row);
  return result;
}
export function SourceEditor({
  ar,
  value,
  fields,
  onChange,
}: {
  ar: boolean;
  value: ValueSource;
  fields: BuilderField[];
  onChange: (source: ValueSource) => void;
}) {
  const labels = {
    name: ar ? "اسم مقدم الخدمة" : "Provider name",
    license: ar ? "الرخصة / الرقم الشخصي" : "License / personal number",
    email: ar ? "البريد" : "Email",
    phone: ar ? "الهاتف" : "Phone",
    reference: ar ? "المرجع" : "Reference",
    date: ar ? "التاريخ" : "Date",
  };
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold">
        {ar ? "مصدر القيمة" : "Value source"}
        <select
          className={inputClass}
          value={value.kind}
          onChange={(e) =>
            onChange(
              e.target.value === "fixed"
                ? { kind: "fixed", value: emptyText() }
                : e.target.value === "provider"
                  ? { kind: "provider", key: "name" }
                  : { kind: "field", fieldId: fields[0]?.id ?? "" },
            )
          }
        >
          <option value="fixed">
            {ar ? "قيمة ثابتة من الإدارة" : "Fixed admin value"}
          </option>
          <option value="provider">
            {ar ? "بيانات مقدم الخدمة" : "Provider details"}
          </option>
          <option value="field" disabled={!fields.length}>
            {ar ? "حقل تسجيل إضافي" : "Additional registration field"}
          </option>
        </select>
      </label>
      {value.kind === "fixed" ? (
        <Bilingual
          label={ar ? "القيمة" : "Value"}
          value={value.value}
          onChange={(next) => onChange({ kind: "fixed", value: next })}
        />
      ) : value.kind === "provider" ? (
        <select
          aria-label={ar ? "بيانات مقدم الخدمة" : "Provider data"}
          className={inputClass}
          value={value.key}
          onChange={(e) =>
            onChange({
              kind: "provider",
              key: e.target.value as typeof value.key,
            })
          }
        >
          {providerKeys.map((key) => (
            <option key={key} value={key}>
              {labels[key]}
            </option>
          ))}
        </select>
      ) : (
        <select
          aria-label={ar ? "الحقل الإضافي" : "Additional field"}
          className={inputClass}
          value={value.fieldId}
          onChange={(e) => onChange({ kind: "field", fieldId: e.target.value })}
        >
          <option value="">{ar ? "اختر الحقل" : "Choose a field"}</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label[ar ? "ar" : "en"] || f.id}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
