"use client";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Plus, Save, Upload } from "lucide-react";

type Item = {
  id: string;
  countryCode: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  actionTypeAr: string;
  actionTypeEn: string;
  price: string;
  currencyCode: string;
  workflowType: "emergency_dispatch" | "direct_consultation";
  iconAssetUrl: string;
  iconStorageKey: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};
const empty: Omit<Item, "id" | "updatedAt"> = {
  countryCode: "BH",
  slug: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  actionTypeAr: "طلب مساعدة",
  actionTypeEn: "Request help",
  price: "",
  currencyCode: "BHD",
  workflowType: "emergency_dispatch",
  iconAssetUrl: "",
  iconStorageKey: "",
  sortOrder: 0,
  isActive: true,
};

export default function SosCaseTypesContent({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<typeof empty | Item>(empty);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    const r = await fetch("/api/admin/sos-case-types?countryCode=BH", {
      cache: "no-store",
    });
    const d = await r.json();
    if (r.ok) setItems(d.cases ?? []);
    else setMessage(ar ? "تعذر تحميل الحالات" : "Could not load cases");
    setBusy(false);
  }, [ar]);
  useEffect(() => {
    // Loading is intentionally triggered when the localized loader changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const set = (key: string, value: unknown) =>
    setForm((v) => ({ ...v, [key]: value }));
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(ar ? "جاري رفع الأيقونة..." : "Uploading icon...");
    const body = new FormData();
    body.set("icon", file);
    const r = await fetch("/api/admin/sos-case-types/icon", {
      method: "POST",
      body,
    });
    const d = await r.json();
    if (r.ok) {
      set("iconAssetUrl", d.iconUrl);
      set("iconStorageKey", d.iconStorageKey);
      setMessage(ar ? "تم رفع الأيقونة" : "Icon uploaded");
    } else setMessage(ar ? "تعذر رفع الأيقونة" : "Icon upload failed");
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const editing = "id" in form;
    const r = await fetch(
      editing
        ? `/api/admin/sos-case-types/${form.id}`
        : "/api/admin/sos-case-types",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const d = await r.json();
    if (r.ok) {
      setForm(empty);
      setMessage(ar ? "تم حفظ الحالة" : "Case saved");
      await load();
    } else {
      setMessage(
        (ar ? "تعذر الحفظ: " : "Could not save: ") + (d.error ?? "error"),
      );
      setBusy(false);
    }
  };
  const field =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-[#B4232A]";
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-8 text-[#082B67]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl bg-[#B4232A] p-6 text-white">
          <h1 className="text-2xl font-black">
            {ar ? "أنواع حالات النجدة القانونية" : "Legal SOS case types"}
          </h1>
          <p className="mt-2 text-white/75">
            {ar
              ? "أضف الحالة ووصفها وسعرها وأيقونتها وحدد مسار تنفيذها."
              : "Manage case content, pricing, icon, and workflow."}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form
            onSubmit={submit}
            className="space-y-3 rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-[#B4232A] focus-within:border-[#B4232A]"
          >
            <h2 className="font-black">
              {"id" in form
                ? ar
                  ? "تعديل الحالة"
                  : "Edit case"
                : ar
                  ? "إضافة حالة"
                  : "Add case"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={field}
                placeholder={ar ? "الاسم بالعربي" : "Arabic name"}
                value={form.nameAr}
                onChange={(e) => set("nameAr", e.target.value)}
                required
              />
              <input
                className={field}
                placeholder="English name"
                value={form.nameEn}
                onChange={(e) => set("nameEn", e.target.value)}
                required
              />
            </div>
            <input
              className={field}
              placeholder="slug-example"
              value={form.slug}
              disabled={"id" in form}
              onChange={(e) => set("slug", e.target.value)}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <textarea
                className={field}
                placeholder={ar ? "الوصف بالعربي" : "Arabic description"}
                value={form.descriptionAr}
                onChange={(e) => set("descriptionAr", e.target.value)}
                required
              />
              <textarea
                className={field}
                placeholder="English description"
                value={form.descriptionEn}
                onChange={(e) => set("descriptionEn", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={field}
                placeholder={ar ? "نص الإجراء بالعربي" : "Arabic action"}
                value={form.actionTypeAr}
                onChange={(e) => set("actionTypeAr", e.target.value)}
                required
              />
              <input
                className={field}
                placeholder="English action"
                value={form.actionTypeEn}
                onChange={(e) => set("actionTypeEn", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                min="0.001"
                step="0.001"
                className={field}
                placeholder={ar ? "السعر" : "Price"}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                required
              />
              <input
                className={field}
                value={form.currencyCode}
                maxLength={3}
                onChange={(e) =>
                  set("currencyCode", e.target.value.toUpperCase())
                }
              />
              <input
                type="number"
                min="0"
                className={field}
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
              />
            </div>
            <select
              className={field}
              value={form.workflowType}
              onChange={(e) => set("workflowType", e.target.value)}
            >
              <option value="emergency_dispatch">
                {ar ? "طوارئ مع الموقع" : "Emergency with location"}
              </option>
              <option value="direct_consultation">
                {ar
                  ? "استشارة مباشرة بعد الدفع"
                  : "Direct consultation after payment"}
              </option>
            </select>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-3 font-bold">
              <Upload className="h-4 w-4" />
              {ar ? "رفع أيقونة SVG أو PNG" : "Upload SVG or PNG"}
              <input
                className="hidden"
                type="file"
                accept="image/svg+xml,image/png"
                onChange={upload}
              />
            </label>
            {form.iconAssetUrl && (
              <img
                src={form.iconAssetUrl}
                alt=""
                className="mx-auto h-20 w-20 object-contain"
              />
            )}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
              />
              {ar ? "الحالة مفعلة" : "Active"}
            </label>
            <div className="flex gap-2">
              <button
                disabled={busy || !form.iconAssetUrl}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B4232A] px-4 py-3 font-black text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {ar ? "حفظ" : "Save"}
              </button>
              {"id" in form && (
                <button
                  type="button"
                  onClick={() => setForm(empty)}
                  className="rounded-xl border px-4"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            {message && <p className="text-sm font-bold">{message}</p>}
          </form>
          <section className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setForm(item)}
                className="flex w-full items-center gap-4 rounded-3xl border border-transparent bg-white p-4 text-start shadow-sm transition hover:border-[#B4232A] focus-visible:border-[#B4232A]"
              >
                <img
                  src={item.iconAssetUrl}
                  alt=""
                  className="h-14 w-14 rounded-2xl bg-slate-50 object-contain p-2"
                />
                <span className="min-w-0 flex-1">
                  <strong className="block">
                    {ar ? item.nameAr : item.nameEn}
                  </strong>
                  <span className="line-clamp-2 text-sm text-slate-500">
                    {ar ? item.descriptionAr : item.descriptionEn}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-[#B4232A]">
                    {item.price} {item.currencyCode} ·{" "}
                    {item.workflowType === "direct_consultation"
                      ? ar
                        ? "استشارة مباشرة"
                        : "Direct consultation"
                      : ar
                        ? "طوارئ"
                        : "Emergency"}
                  </span>
                </span>
                <span
                  className={`h-3 w-3 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                />
              </button>
            ))}
            {!busy && !items.length && (
              <div className="rounded-3xl border border-transparent bg-white p-10 text-center text-slate-500 shadow-sm">
                {ar ? "لا توجد حالات" : "No cases"}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
