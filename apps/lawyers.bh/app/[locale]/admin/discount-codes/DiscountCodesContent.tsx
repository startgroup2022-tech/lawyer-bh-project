"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleOff,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tag,
  TicketPercent,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import AdminPagination from "../_components/AdminPagination";
import { paginateItems } from "../_components/pagination";
import {
  filterDiscountCodes,
  getDiscountStatus,
  summarizeDiscountCodes,
  type DiscountFilter,
  type DiscountStatus,
} from "./presentation";

type CodeRow = {
  scope: "website" | "app" | "both";
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  totalUsageLimit: number | null;
  perUserUsageLimit: number | null;
  redeemedCount: number;
};

type DiscountForm = {
  scope: "website" | "app" | "both";
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  totalUsageLimit: string;
  perUserUsageLimit: string;
};

const emptyForm: DiscountForm = {
  scope: "website",
  code: "",
  discountType: "percentage",
  discountValue: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
  totalUsageLimit: "",
  perUserUsageLimit: "",
};

const inputClass =
  "h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-[#082B67] outline-none transition placeholder:text-gray-400 focus:border-[#B4232A] focus:ring-4 focus:ring-red-50";

function StatCard({ icon: Icon, label, value, description, tone = "blue" }: { icon: LucideIcon; label: string; value: number; description: string; tone?: "blue" | "red" | "amber" | "green" }) {
  const tones = {
    blue: "bg-[#082B67]/8 text-[#082B67]",
    red: "bg-[#B4232A]/10 text-[#B4232A]",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
  };
  return <article className="rounded-3xl border border-transparent bg-white p-5 shadow-[0_12px_35px_rgba(7,17,31,0.055)] transition hover:-translate-y-0.5 hover:border-[#B4232A] hover:shadow-[0_18px_45px_rgba(7,17,31,0.08)]">
    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
    <p className="mt-5 text-xs font-extrabold text-gray-500">{label}</p>
    <p className="mt-1 text-3xl font-black text-[#082B67]">{value}</p>
    <p className="mt-2 text-xs leading-6 text-gray-500">{description}</p>
  </article>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-extrabold text-[#082B67]">{label}</span>{children}{hint ? <span className="mt-1.5 block text-[11px] leading-5 text-gray-400">{hint}</span> : null}</label>;
}

function statusStyle(status: DiscountStatus) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "scheduled") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "expired") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-gray-200 bg-gray-100 text-gray-600";
}

export default function DiscountCodesContent({ isAr }: { isAr: boolean }) {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [form, setForm] = useState<DiscountForm>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DiscountFilter>("all");
  const [page, setPage] = useState(1);
  const formRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    setBusy(true);
    const response = await fetch("/api/admin/discount-codes", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setCodes(data.codes ?? []);
      setCanWrite(Boolean(data.canWrite));
    } else {
      setMessage({ tone: "error", text: isAr ? "تعذر تحميل أكواد الخصم." : "Could not load discount codes." });
    }
    setBusy(false);
  }, [isAr]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/discount-codes", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (response.ok) {
          setCodes(data.codes ?? []);
          setCanWrite(Boolean(data.canWrite));
        } else {
          setMessage({ tone: "error", text: isAr ? "تعذر تحميل أكواد الخصم." : "Could not load discount codes." });
        }
        setBusy(false);
      });
    return () => { cancelled = true; };
  }, [isAr]);

  const now = useMemo(() => new Date(), []);
  const visible = useMemo(() => filterDiscountCodes(codes, search, filter, now), [codes, filter, now, search]);
  const pagination = paginateItems(visible, page);
  const stats = useMemo(() => summarizeDiscountCodes(codes, now), [codes, now]);
  const filterItems: Array<{ key: DiscountFilter; ar: string; en: string }> = [
    { key: "all", ar: "الكل", en: "All" },
    { key: "active", ar: "المفعّلة", en: "Active" },
    { key: "scheduled", ar: "المجدولة", en: "Scheduled" },
    { key: "expired", ar: "المنتهية", en: "Expired" },
    { key: "disabled", ar: "المعطّلة", en: "Disabled" },
  ];

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    const response = await fetch(editingId ? `/api/admin/discount-codes/${editingId}` : "/api/admin/discount-codes", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      const text = data.error === "duplicate_code"
        ? isAr ? "هذا الكود موجود مسبقًا." : "This code already exists."
        : isAr ? "تعذر الحفظ. تحقق من جميع البيانات." : "Could not save. Check all entered values.";
      setMessage({ tone: "error", text });
      return;
    }
    resetForm();
    setMessage({ tone: "success", text: isAr ? "تم حفظ كود الخصم بنجاح." : "Discount code saved successfully." });
    await load();
  }

  function edit(item: CodeRow) {
    setEditingId(item.id);
    setForm({
      code: item.code,
      scope: item.scope ?? "website",
      discountType: item.discountType,
      discountValue: item.discountValue,
      isActive: item.isActive,
      startsAt: item.startsAt?.slice(0, 16) ?? "",
      endsAt: item.endsAt?.slice(0, 16) ?? "",
      totalUsageLimit: item.totalUsageLimit?.toString() ?? "",
      perUserUsageLimit: item.perUserUsageLimit?.toString() ?? "",
    });
    setMessage(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function remove(id: string) {
    if (deletingId || !window.confirm(isAr ? "هل تريد حذف أو تعطيل هذا الكود؟" : "Delete or disable this code?")) return;
    setDeletingId(id);
    const response = await fetch(`/api/admin/discount-codes/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!response.ok) {
      setMessage({ tone: "error", text: isAr ? "تعذر حذف الكود." : "Could not delete the code." });
      return;
    }
    setMessage({ tone: "success", text: isAr ? "تم تحديث قائمة الأكواد." : "Discount list updated." });
    await load();
  }

  function statusLabel(status: DiscountStatus) {
    const labels = {
      active: isAr ? "مفعّل" : "Active",
      scheduled: isAr ? "مجدول" : "Scheduled",
      expired: isAr ? "منتهي" : "Expired",
      disabled: isAr ? "معطّل" : "Disabled",
    };
    return labels[status];
  }

  function formatDate(value: string | null) {
    if (!value) return isAr ? "بدون تحديد" : "No limit";
    return new Intl.DateTimeFormat(isAr ? "ar-BH" : "en-BH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  return <main className="min-h-screen bg-[#F7F8FA] px-3 py-6 sm:px-5 sm:py-10">
    <div className="mx-auto max-w-7xl">
      <section className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#B4232A] via-[#9D1F25] to-[#74171C] p-6 text-white shadow-[0_22px_55px_rgba(180,35,42,0.24)] sm:p-8">
        <div className="absolute -end-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 start-1/3 h-44 w-44 rounded-full bg-[#082B67]/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur"><TicketPercent className="h-7 w-7" /></div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-extrabold"><Sparkles className="h-3.5 w-3.5" />{isAr ? "إدارة العروض" : "Offers Management"}</div><h1 className="text-3xl font-black sm:text-4xl">{isAr ? "أكواد الخصم" : "Discount Codes"}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">{isAr ? "أنشئ عروضًا مرنة وحدد صلاحيتها وحدود استخدامها، وتابع أداء كل كود من مكان واحد." : "Create flexible offers, control validity and limits, and track each code from one polished workspace."}</p></div>
          {canWrite ? <button type="button" onClick={() => { resetForm(); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth" })); }} className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#B4232A] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"><Plus className="h-4 w-4" />{isAr ? "إضافة كود جديد" : "Add New Code"}</button> : null}
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Tag} label={isAr ? "إجمالي الأكواد" : "Total Codes"} value={stats.total} description={isAr ? "جميع أكواد الخصم المسجلة" : "All registered discount codes"} />
        <StatCard icon={CheckCircle2} label={isAr ? "الأكواد المفعّلة" : "Active Codes"} value={stats.active} description={isAr ? "جاهزة للاستخدام الآن" : "Ready to use now"} tone="green" />
        <StatCard icon={Clock3} label={isAr ? "الأكواد المنتهية" : "Expired Codes"} value={stats.expired} description={isAr ? "انتهت فترة صلاحيتها" : "Past their validity period"} tone="amber" />
        <StatCard icon={Users} label={isAr ? "مرات الاستخدام" : "Total Redemptions"} value={stats.redeemed} description={isAr ? "إجمالي الاستخدامات الناجحة" : "Successful redemptions"} tone="red" />
      </section>

      {message ? <div className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}><span className="mt-0.5">{message.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <CircleOff className="h-4 w-4" />}</span><span className="flex-1">{message.text}</span><button onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div> : null}

      {canWrite ? <section ref={formRef} className="scroll-mt-5 rounded-3xl border border-transparent bg-white p-5 shadow-[0_14px_40px_rgba(7,17,31,0.055)] transition hover:border-[#B4232A] focus-within:border-[#B4232A] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#B4232A]">{editingId ? (isAr ? "وضع التعديل" : "Edit Mode") : (isAr ? "عرض جديد" : "New Offer")}</p><h2 className="mt-2 text-2xl font-black text-[#082B67]">{editingId ? (isAr ? "تعديل كود الخصم" : "Edit Discount Code") : (isAr ? "إنشاء كود خصم" : "Create Discount Code")}</h2><p className="mt-2 text-sm text-gray-500">{isAr ? "أدخل البيانات وحدد القيود المطلوبة. الحقول الاختيارية يمكن تركها فارغة." : "Enter offer details and limits. Optional fields may be left empty."}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B4232A]/10 text-[#B4232A]"><TicketPercent className="h-6 w-6" /></div></div>
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label={isAr ? "كود الخصم" : "Discount code"} hint={isAr ? "حروف إنجليزية وأرقام بدون مسافات" : "Letters and numbers without spaces"}><input aria-label="code" placeholder="WELCOME20" value={form.code} maxLength={32} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={`${inputClass} font-black uppercase tracking-wider`} /></Field>
          <Field label={isAr ? "صالح للاستخدام في" : "Available on"}><select aria-label={isAr ? "نطاق الكود" : "Code scope"} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as DiscountForm["scope"] })} className={inputClass}><option value="website">{isAr ? "الموقع فقط" : "Website only"}</option><option value="app">{isAr ? "التطبيق فقط (النجدة القانونية)" : "App only (LegalSOS)"}</option><option value="both">{isAr ? "التطبيق والموقع" : "App and website"}</option></select></Field>
          <Field label={isAr ? "نوع الخصم" : "Discount type"}><select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })} className={inputClass}><option value="percentage">{isAr ? "نسبة مئوية %" : "Percentage %"}</option><option value="fixed">{isAr ? "مبلغ ثابت BHD" : "Fixed amount BHD"}</option></select></Field>
          <Field label={isAr ? "قيمة الخصم" : "Discount value"} hint={form.discountType === "percentage" ? (isAr ? "من 0.001 حتى 100" : "From 0.001 to 100") : (isAr ? "بالدينار البحريني" : "In Bahraini dinars")}><div className="relative"><input type="number" min="0.001" max={form.discountType === "percentage" ? "100" : undefined} step="0.001" placeholder="20" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className={`${inputClass} pe-14`} /><span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">{form.discountType === "percentage" ? "%" : "BHD"}</span></div></Field>
          <Field label={isAr ? "حالة الكود" : "Code status"}><button type="button" role="switch" aria-checked={form.isActive} onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`flex h-12 w-full items-center justify-between rounded-xl border px-4 transition ${form.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}><span className="text-sm font-extrabold">{form.isActive ? (isAr ? "مفعّل" : "Active") : (isAr ? "معطّل" : "Disabled")}</span><span className={`relative h-6 w-11 rounded-full transition ${form.isActive ? "bg-emerald-500" : "bg-gray-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${form.isActive ? "end-1" : "start-1"}`} /></span></button></Field>
          <Field label={isAr ? "تاريخ البداية" : "Start date"} hint={isAr ? "اختياري" : "Optional"}><input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputClass} /></Field>
          <Field label={isAr ? "تاريخ الانتهاء" : "End date"} hint={isAr ? "اختياري" : "Optional"}><input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputClass} /></Field>
          <Field label={isAr ? "حد الاستخدام الإجمالي" : "Total usage limit"} hint={isAr ? "اتركه فارغًا للاستخدام غير المحدود" : "Leave empty for unlimited use"}><input type="number" min="1" placeholder={isAr ? "غير محدود" : "Unlimited"} value={form.totalUsageLimit} onChange={(e) => setForm({ ...form, totalUsageLimit: e.target.value })} className={inputClass} /></Field>
          <Field label={isAr ? "الحد لكل مستخدم" : "Per-user limit"} hint={isAr ? "يُحسب حسب البريد الإلكتروني" : "Calculated by customer email"}><input type="number" min="1" placeholder={isAr ? "غير محدود" : "Unlimited"} value={form.perUserUsageLimit} onChange={(e) => setForm({ ...form, perUserUsageLimit: e.target.value })} className={inputClass} /></Field>
        </div>
        <div className="mt-7 flex flex-wrap gap-3"><button type="button" disabled={saving} onClick={save} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#B4232A] px-6 py-3 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(180,35,42,0.22)] transition hover:bg-[#951D23] disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ الكود" : "Save Code")}</button>{editingId ? <button type="button" onClick={resetForm} className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-extrabold text-gray-600 transition hover:border-[#082B67]/30 hover:text-[#082B67]">{isAr ? "إلغاء التعديل" : "Cancel Edit"}</button> : null}</div>
      </section> : null}

      <section className="mt-6 rounded-3xl border border-transparent bg-white p-4 shadow-[0_12px_35px_rgba(7,17,31,0.045)] transition hover:border-[#B4232A] focus-within:border-[#B4232A] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]"><div className="relative"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={isAr ? "ابحث باسم كود الخصم..." : "Search by discount code..."} className={`${inputClass} ps-10`} /></div><div className="flex items-center rounded-xl bg-[#F7F8FA] px-4 text-xs font-bold text-gray-500">{isAr ? `${visible.length} نتيجة` : `${visible.length} results`}</div></div>
        <div className="mt-4 flex flex-wrap gap-2">{filterItems.map((item) => <button key={item.key} type="button" onClick={() => { setFilter(item.key); setPage(1); }} className={filter === item.key ? "rounded-full border border-[#B4232A] bg-[#B4232A] px-4 py-2 text-xs font-extrabold text-white shadow-sm" : "rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-600 transition hover:border-[#B4232A]/30 hover:text-[#B4232A]"}>{isAr ? item.ar : item.en}</button>)}</div>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-transparent bg-white shadow-[0_14px_40px_rgba(7,17,31,0.05)] transition hover:border-[#B4232A] focus-within:border-[#B4232A]">
        {busy ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-gray-500"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B4232A]/8 text-[#B4232A]"><Loader2 className="h-6 w-6 animate-spin" /></div><p className="text-sm font-bold">{isAr ? "جاري تحميل أكواد الخصم..." : "Loading discount codes..."}</p></div> : visible.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400"><TicketPercent className="h-8 w-8" /></div><h3 className="mt-5 text-xl font-black text-[#082B67]">{isAr ? "لا توجد أكواد مطابقة" : "No matching codes"}</h3><p className="mt-2 text-sm text-gray-500">{isAr ? "غيّر البحث أو الفلتر، أو أنشئ كود خصم جديدًا." : "Adjust the search or filter, or create a new discount code."}</p></div> : <>
          <div className="grid gap-3 p-4 lg:hidden">{pagination.items.map((item) => { const status = getDiscountStatus(item, now); return <article key={item.id} className="rounded-2xl border border-transparent bg-white p-4 shadow-sm transition hover:border-[#B4232A] focus-within:border-[#B4232A]"><div className="flex items-start justify-between gap-3"><div><span className="inline-flex rounded-lg bg-[#082B67]/7 px-3 py-1.5 font-black tracking-wider text-[#082B67]">{item.code}</span><p className="mt-2 text-xs text-gray-500">{item.scope === "app" ? (isAr ? "التطبيق فقط" : "App only") : item.scope === "both" ? (isAr ? "التطبيق والموقع" : "App and website") : (isAr ? "الموقع فقط" : "Website only")}</p><p className="mt-3 text-2xl font-black text-[#B4232A]">{item.discountValue}{item.discountType === "percentage" ? "%" : " BHD"}</p></div><span className={`rounded-full border px-3 py-1 text-[11px] font-extrabold ${statusStyle(status)}`}>{statusLabel(status)}</span></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F7F8FA] p-3 text-xs text-gray-500"><div><span className="block font-bold">{isAr ? "الاستخدام" : "Usage"}</span><strong className="mt-1 block text-[#082B67]">{item.redeemedCount}{item.totalUsageLimit ? ` / ${item.totalUsageLimit}` : " / ∞"}</strong></div><div><span className="block font-bold">{isAr ? "الانتهاء" : "Expires"}</span><strong className="mt-1 block text-[#082B67]">{formatDate(item.endsAt)}</strong></div></div>{canWrite ? <div className="mt-4 flex gap-2"><button onClick={() => edit(item)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#082B67] px-4 py-2.5 text-xs font-extrabold text-white"><Pencil className="h-3.5 w-3.5" />{isAr ? "تعديل" : "Edit"}</button><button disabled={deletingId === item.id} onClick={() => remove(item.id)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 disabled:opacity-50">{deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div> : null}</article>; })}</div>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full text-start text-sm"><thead className="bg-[#F7F8FA] text-xs font-extrabold text-gray-500"><tr><th className="px-6 py-4">{isAr ? "الكود والخصم" : "Code & Discount"}</th><th className="px-6 py-4">{isAr ? "فترة الصلاحية" : "Validity"}</th><th className="px-6 py-4">{isAr ? "الاستخدام" : "Usage"}</th><th className="px-6 py-4">{isAr ? "الحالة" : "Status"}</th><th className="px-6 py-4 text-end">{isAr ? "الإجراءات" : "Actions"}</th></tr></thead><tbody>{pagination.items.map((item) => { const status = getDiscountStatus(item, now); const percent = item.totalUsageLimit ? Math.min(100, (item.redeemedCount / item.totalUsageLimit) * 100) : 0; return <tr key={item.id} className="border-t border-gray-100 transition hover:bg-[#F7F8FA]/70"><td className="px-6 py-5"><span className="inline-flex rounded-lg bg-[#082B67]/7 px-3 py-1.5 font-black tracking-wider text-[#082B67]">{item.code}</span><p className="mt-2 text-xs text-gray-500">{item.scope === "app" ? (isAr ? "التطبيق فقط" : "App only") : item.scope === "both" ? (isAr ? "التطبيق والموقع" : "App and website") : (isAr ? "الموقع فقط" : "Website only")}</p><p className="mt-2 font-black text-[#B4232A]">{item.discountValue}{item.discountType === "percentage" ? "%" : " BHD"}<span className="ms-2 text-xs font-bold text-gray-400">{item.discountType === "percentage" ? (isAr ? "نسبة" : "Percentage") : (isAr ? "ثابت" : "Fixed")}</span></p></td><td className="px-6 py-5 text-xs leading-6 text-gray-500"><p><CalendarClock className="me-1.5 inline h-3.5 w-3.5" />{formatDate(item.startsAt)}</p><p className="mt-1"><Clock3 className="me-1.5 inline h-3.5 w-3.5" />{formatDate(item.endsAt)}</p></td><td className="px-6 py-5"><div className="flex items-center justify-between gap-4 text-xs"><strong className="text-[#082B67]">{item.redeemedCount}{item.totalUsageLimit ? ` / ${item.totalUsageLimit}` : " / ∞"}</strong>{item.perUserUsageLimit ? <span className="text-gray-400">{isAr ? `${item.perUserUsageLimit} لكل مستخدم` : `${item.perUserUsageLimit} per user`}</span> : null}</div>{item.totalUsageLimit ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#B4232A]" style={{ width: `${percent}%` }} /></div> : null}</td><td className="px-6 py-5"><span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-extrabold ${statusStyle(status)}`}>{statusLabel(status)}</span></td><td className="px-6 py-5"><div className="flex justify-end gap-2">{canWrite ? <><button onClick={() => edit(item)} title={isAr ? "تعديل" : "Edit"} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#082B67]/10 bg-[#082B67]/5 text-[#082B67] transition hover:bg-[#082B67] hover:text-white"><Pencil className="h-4 w-4" /></button><button disabled={deletingId === item.id} onClick={() => remove(item.id)} title={isAr ? "حذف" : "Delete"} className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50">{deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></> : <span className="text-xs font-bold text-gray-400">{isAr ? "عرض فقط" : "Read only"}</span>}</div></td></tr>; })}</tbody></table></div>
        </>}
      </section>
      <AdminPagination isAr={isAr} currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
    </div>
  </main>;
}
