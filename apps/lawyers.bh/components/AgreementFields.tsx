"use client";
import { useEffect, useRef, useState } from "react";
import type { BuilderField } from "@/lib/provider-agreement/builder-model";
import { inputClass, apiJson } from "@/lib/careers/ui";
export type AgreementFieldState = {
  values: Record<string, string>;
  token: string;
  fileNames: Record<string, string>;
  uploading: boolean;
  error: string;
};
export const emptyAgreementFields = (): AgreementFieldState => ({
  values: {},
  token: "",
  fileNames: {},
  uploading: false,
  error: "",
});
export default function AgreementFields({
  ar,
  fields,
  versionId,
  onChange,
}: {
  ar: boolean;
  fields: BuilderField[];
  versionId: string;
  onChange: (state: AgreementFieldState) => void;
}) {
  const [state, setState] = useState(emptyAgreementFields),
    running = useRef(false);
  useEffect(() => onChange(state), [state, onChange]);
  const url = "/api/public/provider-agreement/upload";
  const post = (body: unknown) =>
    apiJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  async function upload(field: BuilderField, file: File) {
    if (running.current) return;
    running.current = true;
    setState((s) => ({
      ...s,
      uploading: true,
      error: "",
      values: { ...s.values, [field.id]: "" },
    }));
    try {
      if (
        !["application/pdf", "image/png", "image/jpeg"].includes(file.type) ||
        file.size < 1 ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error("invalid_file");
      const token =
        state.token || (await post({ action: "start", versionId })).token;
      setState((s) => ({ ...s, token }));
      const created = await post({
        action: "file",
        token,
        fieldId: field.id,
        name: file.name,
        size: file.size,
        mime: file.type,
      });
      for (let offset = 0; offset < file.size; offset += 1024 * 1024)
        await apiJson(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/octet-stream",
            "x-upload-token": token,
            "x-file-id": created.id,
            "x-upload-offset": String(offset),
          },
          body: file.slice(offset, offset + 1024 * 1024),
        });
      const done = await post({ action: "finish", token, fileId: created.id });
      setState((s) => ({
        ...s,
        uploading: false,
        values: { ...s.values, [field.id]: done.id },
        fileNames: { ...s.fileNames, [done.id]: done.name },
      }));
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setState((s) => ({
        ...s,
        uploading: false,
        error:
          code === "upload_expired" || code === "agreement_version_stale"
            ? ar
              ? "تغيّرت الاتفاقية أو انتهت جلسة الرفع. حدّث الصفحة وراجع الاتفاقية مجددًا."
              : "Agreement changed or upload expired. Reload and review the agreement again."
            : ar
              ? "تعذر رفع الملف. استخدم PDF أو PNG أو JPEG صالحًا حتى 5 ميغابايت وأعد المحاولة."
              : "Upload failed. Use a valid PDF, PNG or JPEG up to 5 MiB and retry.",
      }));
    } finally {
      running.current = false;
    }
  }
  return (
    <div className="my-4 space-y-4">
      {fields.map((field) => {
        const value = state.values[field.id] ?? "",
          id = `agreement_${field.id}`;
        const common = {
          id,
          name: id,
          required: field.required,
          className: inputClass,
          value,
          onChange: (
            e: React.ChangeEvent<
              HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            >,
          ) =>
            setState((s) => ({
              ...s,
              values: { ...s.values, [field.id]: e.target.value },
            })),
          "aria-describedby": `${id}_help`,
        };
        return (
          <div key={field.id}>
            <label htmlFor={id} className="text-sm font-bold">
              {field.label[ar ? "ar" : "en"]}
              {field.required ? " *" : ""}
            </label>
            {field.kind === "textarea" ? (
              <textarea {...common} maxLength={3000} />
            ) : field.kind === "select" ? (
              <select {...common}>
                <option value="">{ar ? "اختر…" : "Choose…"}</option>
                {field.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label[ar ? "ar" : "en"]}
                  </option>
                ))}
              </select>
            ) : field.kind === "file" ? (
              <div className="space-y-2">
                <input
                  id={id}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  disabled={state.uploading}
                  aria-describedby={`${id}_help`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void upload(field, file);
                  }}
                />
                {value && (
                  <p className="text-sm text-green-800">
                    {state.fileNames[value]}{" "}
                    <button
                      type="button"
                      className="underline"
                      disabled={state.uploading}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          error: "",
                          values: { ...s.values, [field.id]: "" },
                        }))
                      }
                    >
                      {ar ? "إزالة" : "Remove"}
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <input
                {...common}
                type={
                  field.kind === "number"
                    ? "number"
                    : field.kind === "date"
                      ? "date"
                      : "text"
                }
                step={field.kind === "number" ? "any" : undefined}
                maxLength={300}
              />
            )}
            <p id={`${id}_help`} className="mt-1 text-xs text-slate-600">
              {field.help[ar ? "ar" : "en"]}
              {field.kind === "file"
                ? ar
                  ? " — ملف خاص، حتى 5 ميغابايت."
                  : " — Private file, up to 5 MiB."
                : ""}
            </p>
          </div>
        );
      })}
      {state.uploading && (
        <p role="status">
          {ar ? "جارٍ رفع الملف والتحقق منه…" : "Uploading and checking file…"}
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-800">
          {state.error}
        </p>
      )}
    </div>
  );
}
