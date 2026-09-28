"use client";
import type { FirstParty } from "@/lib/provider-agreement/model";
import { inputClass } from "@/lib/careers/ui";
export default function FirstPartyFields({
  ar,
  value,
  disabled,
  onChange,
  onUpload,
}: {
  ar: boolean;
  value: FirstParty;
  disabled: boolean;
  onChange: (value: FirstParty) => void;
  onUpload: (
    key: "signatureDataUrl" | "stampDataUrl",
    file: File,
  ) => Promise<void>;
}) {
  const t = (a: string, b: string) => (ar ? a : b);
  return (
    <section className="space-y-4 rounded-2xl bg-slate-50 p-5">
      <h2 className="text-lg font-bold">
        {t(
          "الطرف الأول — توقيع وختم المنصة",
          "First party — platform signature and stamp",
        )}
      </h2>
      <p className="text-sm leading-7 text-slate-600">
        {t(
          "التصميم الرسمي العصري. تحفظ هذه البيانات مع النسخة؛ تغييرها لا يؤثر على العقود السابقة. الصور اختيارية، ولا يُضاف توقيع أو ختم تلقائيًا.",
          "Modern formal layout. These details are frozen with each version; existing contracts do not change. Images are optional; no signature or stamp is added automatically.",
        )}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {(["nameAr", "nameEn", "roleAr", "roleEn"] as const).map((key) => (
          <label key={key} className="text-sm font-bold">
            {
              {
                nameAr: t(
                  "اسم المفوّض بالعربية",
                  "Representative name (Arabic)",
                ),
                nameEn: t(
                  "اسم المفوّض بالإنجليزية",
                  "Representative name (English)",
                ),
                roleAr: t("الصفة بالعربية", "Role (Arabic)"),
                roleEn: t("الصفة بالإنجليزية", "Role (English)"),
              }[key]
            }
            <input
              value={value[key]}
              maxLength={120}
              disabled={disabled}
              dir={key.endsWith("Ar") ? "rtl" : "ltr"}
              className={inputClass}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-600">
        {t(
          "PNG أو JPEG، حتى 2 ميغابايت للصورة. يفضّل PNG بخلفية شفافة. تُجهّز الصورة للحفظ عند رفعها؛ احفظ المسودة لتثبيتها.",
          "PNG or JPEG, up to 2 MiB per image. Transparent PNG is recommended. Images are prepared on upload; save the draft to retain them.",
        )}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {(["signatureDataUrl", "stampDataUrl"] as const).map((key) => (
          <div key={key} className="space-y-3 rounded-xl bg-white p-4">
            <label className="block text-sm font-bold">
              {key === "signatureDataUrl"
                ? t("توقيع المفوّض", "Representative signature")
                : t("ختم المنصة", "Platform stamp")}
              <input
                type="file"
                accept="image/png,image/jpeg"
                disabled={disabled}
                className={`${inputClass} text-xs`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void onUpload(key, file);
                }}
              />
            </label>
            {value[key] ? (
              <>
                {/* Private data URLs deliberately bypass image optimization and external storage. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value[key]}
                  alt={
                    key === "signatureDataUrl"
                      ? t("معاينة توقيع المنصة", "Platform signature preview")
                      : t("معاينة ختم المنصة", "Platform stamp preview")
                  }
                  className="h-28 w-full object-contain"
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...value, [key]: "" })}
                  className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-800 disabled:opacity-50"
                >
                  {key === "signatureDataUrl"
                    ? t("إزالة التوقيع", "Remove signature")
                    : t("إزالة الختم", "Remove stamp")}
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {t("لم تُرفع صورة", "No image uploaded")}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
