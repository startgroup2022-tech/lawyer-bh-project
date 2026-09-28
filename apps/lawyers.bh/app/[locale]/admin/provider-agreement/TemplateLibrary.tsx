"use client";
import { useState } from "react";
import type { AgreementLibrary } from "@/lib/provider-agreement/library-store";
import { buttonClass, cardClass, inputClass } from "@/lib/careers/ui";

export type LibraryAction = {
  action: "create" | "copy" | "update";
  name: string;
  description: string;
  id?: string;
  revision?: number;
  archived?: boolean;
  versionId?: string;
};
export default function TemplateLibrary({
  ar,
  templates,
  selectedId,
  versionId,
  disabled,
  onChoose,
  onAction,
}: {
  ar: boolean;
  templates: AgreementLibrary[];
  selectedId: string;
  versionId?: string;
  disabled: boolean;
  onChoose: (id: string) => void;
  onAction: (action: LibraryAction) => void;
}) {
  const t = (a: string, b: string) => (ar ? a : b);
  const [query, setQuery] = useState(""),
    [mode, setMode] = useState<"create" | "copy" | "update" | null>(null),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  const selected = templates.find((g) => g.id === selectedId);
  function edit(next: "create" | "copy" | "update") {
    setMode(next);
    setName(
      next === "update"
        ? (selected?.name ?? "")
        : next === "copy"
          ? `${selected?.name ?? ""} — ${t("نسخة", "Copy")}`
          : "",
    );
    setDescription(next === "create" ? "" : (selected?.description ?? ""));
  }
  return (
    <section
      className={`${cardClass} space-y-4`}
      aria-label={t("مكتبة قوالب الاتفاقية", "Agreement template library")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          {t("مكتبة القوالب", "Template library")}
        </h2>
        <button
          type="button"
          className={buttonClass}
          disabled={disabled}
          onClick={() => edit("create")}
        >
          {t("إنشاء قالب", "Create template")}
        </button>
      </div>
      <p className="text-sm text-slate-600">
        {t(
          "قالب واحد معتمد لجميع التسجيلات الجديدة. الاتفاقيات الموقّعة سابقًا لا تتغير.",
          "One active template for every new registration. Previously signed agreements remain unchanged.",
        )}
      </p>
      <input
        type="search"
        className={inputClass}
        placeholder={t("ابحث عن قالب…", "Search templates…")}
        aria-label={t("بحث القوالب", "Search templates")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates
          .filter((g) =>
            (g.name + " " + g.description)
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
          )
          .map((g) => (
            <button
              type="button"
              key={g.id}
              disabled={disabled}
              aria-pressed={selectedId === g.id}
              onClick={() => {
                setMode(null);
                onChoose(g.id);
              }}
              className={`rounded-2xl p-5 text-start outline outline-1 outline-transparent hover:outline-white ${selectedId === g.id ? "bg-red-50" : "bg-slate-50"}`}
            >
              <span className="block font-bold">{g.name}</span>
              <span className="mt-2 block text-sm text-slate-600">
                {g.description}
              </span>
              <span
                className={`mt-3 inline-block rounded-lg px-3 py-1 text-xs font-bold ${g.activeVersionId ? "bg-green-100 text-green-900" : "bg-white text-slate-600"}`}
              >
                {g.activeVersionId
                  ? t("المعتمد للجميع", "Active for everyone")
                  : g.archived
                    ? t("مؤرشف", "Archived")
                    : t("غير مفعّل", "Inactive")}
              </span>
              <span className="ms-3 text-xs">
                {g.versionCount} {t("إصدار", "versions")}
              </span>
            </button>
          ))}
      </div>
      {selected && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClass}
            disabled={disabled}
            onClick={() => edit("update")}
          >
            {t("تعديل اسم القالب ووصفه", "Edit name and description")}
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={disabled || !versionId}
            onClick={() => edit("copy")}
          >
            {t(
              "نسخ الإصدار المحدد إلى قالب مستقل",
              "Copy selected version to a separate template",
            )}
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={disabled || !!selected.activeVersionId}
            onClick={() => {
              if (
                confirm(
                  selected.archived
                    ? t("استعادة هذا القالب؟", "Restore this template?")
                    : t(
                        "أرشفة القالب؟ لن تتمكن من نشر إصداراته حتى استعادته.",
                        "Archive this template? Its versions cannot be published until restored.",
                      ),
                )
              )
                onAction({
                  action: "update",
                  ...selected,
                  archived: !selected.archived,
                });
            }}
          >
            {selected.archived
              ? t("استعادة القالب", "Restore template")
              : t("أرشفة القالب", "Archive template")}
          </button>
        </div>
      )}
      {mode && (
        <form
          className="space-y-3 rounded-2xl bg-slate-50 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            onAction({
              action: mode,
              name,
              description,
              ...(mode === "update" && selected
                ? {
                    id: selected.id,
                    revision: selected.revision,
                    archived: selected.archived,
                  }
                : {}),
              ...(mode === "copy" ? { versionId } : {}),
            });
          }}
        >
          <label className="block text-sm font-bold">
            {t("اسم القالب للإدارة", "Internal template name")}
            <input
              className={inputClass}
              required
              maxLength={120}
              value={name}
              disabled={disabled}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm font-bold">
            {t("الوصف", "Description")}
            <textarea
              className={inputClass}
              maxLength={600}
              value={description}
              disabled={disabled}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <button className={buttonClass} disabled={disabled} type="submit">
              {t("حفظ بيانات القالب", "Save template details")}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={disabled}
              onClick={() => setMode(null)}
            >
              {t("إغلاق", "Close")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
