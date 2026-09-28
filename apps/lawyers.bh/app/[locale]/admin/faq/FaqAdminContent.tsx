"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ArrowDown, ArrowUp, CheckCircle2, Eye, GripVertical, HelpCircle, Loader2, Pencil, RotateCcw, Search, Send, X } from "lucide-react";
import type { FaqCategoryAdminRow, FaqIconKey, FaqQuestionAdminRow, FaqStatus } from "@/lib/faq/types";
import { FAQ_ICON_KEYS } from "@/lib/faq/validation";
import { filterFaqQuestions, moveOrderedId, summarizeFaq } from "./presentation";
import AdminPagination from "../_components/AdminPagination";
import { paginateItems } from "../_components/pagination";

type Tab = "categories" | "questions" | "archive";
type CategoryForm = { key: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; iconKey: FaqIconKey; status: FaqStatus };
type QuestionForm = { categoryId: string; questionAr: string; questionEn: string; answerAr: string; answerEn: string; status: FaqStatus };
const emptyCategory: CategoryForm = { key: "", nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", iconKey: "help-circle", status: "draft" };
const emptyQuestion: QuestionForm = { categoryId: "", questionAr: "", questionEn: "", answerAr: "", answerEn: "", status: "draft" };
const fieldClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-[#082B67] outline-none focus:border-[#B4232A]";

export default function FaqAdminContent({ isAr }: { isAr: boolean }) {
  const [categories, setCategories] = useState<FaqCategoryAdminRow[]>([]);
  const [questions, setQuestions] = useState<FaqQuestionAdminRow[]>([]);
  const [counts, setCounts] = useState({ published: 0, draft: 0, archived: 0 });
  const [tab, setTab] = useState<Tab>("categories");
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestion);
  const [editing, setEditing] = useState<{ kind: "category" | "question"; id: string; updatedAt: string } | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FaqStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [preview, setPreview] = useState<"ar" | "en" | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setBusy(true);
    const response = await fetch("/api/admin/faq", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setCategories(data.categories ?? []); setQuestions(data.questions ?? []); setCounts(data.counts ?? { published: 0, draft: 0, archived: 0 }); }
    else setMessage({ tone: "error", text: isAr ? "تعذر تحميل الأسئلة الشائعة." : "Could not load FAQ content." });
    setBusy(false);
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);
  const activeCategories = useMemo(() => categories.filter((item) => !item.archivedAt), [categories]);
  const stats = useMemo(() => summarizeFaq(categories, questions), [categories, questions]);
  const visibleQuestions = useMemo(() => filterFaqQuestions(questions, { query, categoryId: categoryFilter, status: statusFilter, archived: false }), [questions, query, categoryFilter, statusFilter]);
  const visibleCategories = useMemo(() => activeCategories.filter((item) => (statusFilter === "all" || item.status === statusFilter) && (!query || `${item.nameAr} ${item.nameEn} ${item.descriptionAr} ${item.descriptionEn}`.toLowerCase().includes(query.toLowerCase()))), [activeCategories, query, statusFilter]);
  const archivedItems = useMemo(() => [
    ...categories.filter((item) => item.archivedAt).map((item) => ({ ...item, kind: "categories" as const, label: isAr ? item.nameAr : item.nameEn })),
    ...questions.filter((item) => item.archivedAt).map((item) => ({ ...item, kind: "questions" as const, label: isAr ? item.questionAr : item.questionEn })),
  ], [categories, questions, isAr]);
  const categoryPagination = paginateItems(visibleCategories, page);
  const questionPagination = paginateItems(visibleQuestions, page);
  const archivePagination = paginateItems(archivedItems, page);
  const activePagination = tab === "categories" ? categoryPagination : tab === "questions" ? questionPagination : archivePagination;

  function resetForms() { setCategoryForm(emptyCategory); setQuestionForm({ ...emptyQuestion, categoryId: activeCategories[0]?.id ?? "" }); setEditing(null); setPreview(null); }
  function editCategory(item: FaqCategoryAdminRow) { setTab("categories"); setEditing({ kind: "category", id: item.id, updatedAt: item.updatedAt }); setCategoryForm({ key: item.key, nameAr: item.nameAr, nameEn: item.nameEn, descriptionAr: item.descriptionAr, descriptionEn: item.descriptionEn, iconKey: item.iconKey, status: item.status }); }
  function editQuestion(item: FaqQuestionAdminRow) { setTab("questions"); setEditing({ kind: "question", id: item.id, updatedAt: item.updatedAt }); setQuestionForm({ categoryId: item.categoryId, questionAr: item.questionAr, questionEn: item.questionEn, answerAr: item.answerAr, answerEn: item.answerEn, status: item.status }); }

  async function request(url: string, method: "POST" | "PATCH", body: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "request_failed");
    return data;
  }

  async function saveCategory() {
    setSaving(true); setMessage(null);
    try {
      const isEdit = editing?.kind === "category";
      await request(isEdit ? `/api/admin/faq/categories/${editing.id}` : "/api/admin/faq/categories", isEdit ? "PATCH" : "POST", { ...categoryForm, action: "update", expectedUpdatedAt: editing?.updatedAt });
      setMessage({ tone: "success", text: isAr ? "تم حفظ التصنيف." : "Category saved." }); resetForms(); await load();
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error && error.message === "bilingual_content_required" ? (isAr ? "أكمل الحقول العربية والإنجليزية قبل النشر." : "Complete Arabic and English fields before publishing.") : (isAr ? "تعذر حفظ التصنيف." : "Could not save category.") }); }
    finally { setSaving(false); }
  }

  async function saveQuestion() {
    setSaving(true); setMessage(null);
    try {
      const isEdit = editing?.kind === "question";
      await request(isEdit ? `/api/admin/faq/questions/${editing.id}` : "/api/admin/faq/questions", isEdit ? "PATCH" : "POST", { ...questionForm, action: "update", expectedUpdatedAt: editing?.updatedAt });
      setMessage({ tone: "success", text: isAr ? "تم حفظ السؤال." : "Question saved." }); resetForms(); await load();
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error && error.message === "category_not_published" ? (isAr ? "انشر التصنيف أولًا." : "Publish the category first.") : (isAr ? "تعذر حفظ السؤال. أكمل اللغتين." : "Could not save question. Complete both languages.") }); }
    finally { setSaving(false); }
  }

  async function lifecycle(kind: "categories" | "questions", item: FaqCategoryAdminRow | FaqQuestionAdminRow, action: "draft" | "publish" | "archive" | "restore") {
    if (kind === "categories" && action === "draft" && !window.confirm(isAr ? "سيتحول التصنيف وجميع أسئلته إلى مسودة. متابعة؟" : "The category and all questions will become drafts. Continue?")) return;
    if (kind === "categories" && action === "archive" && !window.confirm(isAr ? "سيتم أرشفة التصنيف وجميع أسئلته. متابعة؟" : "The category and all questions will be archived. Continue?")) return;
    try {
      await request(`/api/admin/faq/${kind}/${item.id}`, "PATCH", { ...item, action, expectedUpdatedAt: item.updatedAt });
      setMessage({ tone: "success", text: action === "restore" ? (isAr ? "تم الاسترجاع كمسودة." : "Restored as draft.") : (isAr ? "تم تحديث الحالة." : "Status updated.") }); await load();
    } catch { setMessage({ tone: "error", text: isAr ? "تعذر تحديث الحالة. حدّث الصفحة وحاول مجددًا." : "Could not update status. Refresh and try again." }); }
  }

  async function persistOrder(kind: "categories" | "questions", orderedIds: string[], categoryId?: string) {
    const oldCategories = categories; const oldQuestions = questions;
    if (kind === "categories") setCategories(orderedIds.map((id, position) => ({ ...categories.find((row) => row.id === id)!, position })).concat(categories.filter((row) => row.archivedAt)));
    else setQuestions(questions.map((row) => row.categoryId === categoryId ? { ...row, position: orderedIds.indexOf(row.id) } : row));
    try { await request(`/api/admin/faq/${kind}/reorder`, "PATCH", { ids: orderedIds, categoryId }); await load(); }
    catch { setCategories(oldCategories); setQuestions(oldQuestions); setMessage({ tone: "error", text: isAr ? "تعذر حفظ الترتيب." : "Could not save order." }); }
  }

  function dropCategory(targetId: string) { if (!draggedId) return; void persistOrder("categories", moveOrderedId(activeCategories.map((row) => row.id), draggedId, targetId)); setDraggedId(null); }
  function dropQuestion(targetId: string, categoryId: string) { if (!draggedId) return; const scoped = questions.filter((row) => !row.archivedAt && row.categoryId === categoryId).map((row) => row.id); void persistOrder("questions", moveOrderedId(scoped, draggedId, targetId), categoryId); setDraggedId(null); }
  function move(kind: "categories" | "questions", id: string, direction: -1 | 1, categoryId?: string) { const ids = kind === "categories" ? activeCategories.map((row) => row.id) : questions.filter((row) => !row.archivedAt && row.categoryId === categoryId).map((row) => row.id); const index = ids.indexOf(id); const target = index + direction; if (target < 0 || target >= ids.length) return; const next = [...ids]; [next[index], next[target]] = [next[target], next[index]]; void persistOrder(kind, next, categoryId); }

  const tabs: Array<{ id: Tab; ar: string; en: string }> = [{ id: "categories", ar: "التصنيفات", en: "Categories" }, { id: "questions", ar: "الأسئلة", en: "Questions" }, { id: "archive", ar: "الأرشيف", en: "Archive" }];
  const categoryName = (id: string) => { const item = categories.find((row) => row.id === id); return item ? (isAr ? item.nameAr : item.nameEn) : "—"; };

  return <main className="min-h-screen bg-[#F7F8FA] px-3 py-6 sm:px-5 sm:py-10"><div className="mx-auto max-w-7xl">
    <header className="rounded-[2rem] bg-gradient-to-br from-[#B4232A] to-[#74171C] p-7 text-white shadow-xl"><HelpCircle className="h-10 w-10" /><h1 className="mt-4 text-3xl font-black">{isAr ? "إدارة الأسئلة الشائعة" : "FAQ Management"}</h1><p className="mt-2 text-sm text-white/75">{isAr ? "تحكم كامل في التصنيفات والأسئلة العربية والإنجليزية." : "Full control of Arabic and English categories and questions."}</p></header>
    <section className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{([['published', counts.published, 'المنشور', 'Published'], ['draft', counts.draft, 'المسودات', 'Drafts'], ['archived', counts.archived, 'المؤرشف', 'Archived'], ['total', stats.total, 'الإجمالي', 'Total']] as const).map(([key,value,ar,en]) => <div key={key} className="rounded-2xl border border-transparent bg-white p-4 transition hover:border-[#B4232A] focus-within:border-[#B4232A]"><p className="text-xs font-bold text-gray-500">{isAr ? ar : en}</p><p className="mt-1 text-2xl font-black text-[#082B67]">{value}</p></div>)}</section>
    {message ? <div className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}><CheckCircle2 className="h-4 w-4" /><span className="flex-1">{message.text}</span><button onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div> : null}
    <div className="flex flex-wrap gap-2">{tabs.map((item) => <button key={item.id} onClick={() => { setTab(item.id); setPage(1); resetForms(); }} className={`rounded-full px-5 py-2 text-sm font-black ${tab === item.id ? "bg-[#082B67] text-white" : "border bg-white text-gray-600"}`}>{isAr ? item.ar : item.en}</button>)}</div>
    {tab !== "archive" ? <section className="mt-5 rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-[#B4232A] focus-within:border-[#B4232A]"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#082B67]">{tab === "categories" ? (editing ? (isAr ? "تعديل التصنيف" : "Edit category") : (isAr ? "تصنيف جديد" : "New category")) : (editing ? (isAr ? "تعديل السؤال" : "Edit question") : (isAr ? "سؤال جديد" : "New question"))}</h2><button onClick={resetForms} className="text-xs font-bold text-gray-500">{isAr ? "نموذج جديد" : "New form"}</button></div>
      {tab === "categories" ? <div className="mt-4 grid gap-3 md:grid-cols-2"><input className={fieldClass} placeholder={isAr ? "المفتاح الإنجليزي" : "English key"} value={categoryForm.key} onChange={(e) => setCategoryForm({ ...categoryForm, key: e.target.value })}/><select className={fieldClass} value={categoryForm.iconKey} onChange={(e) => setCategoryForm({ ...categoryForm, iconKey: e.target.value as FaqIconKey })}>{FAQ_ICON_KEYS.map((key) => <option key={key}>{key}</option>)}</select><input className={fieldClass} placeholder="اسم التصنيف بالعربية" value={categoryForm.nameAr} onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}/><input className={fieldClass} placeholder="Category name in English" value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}/><textarea className={fieldClass} placeholder="الوصف بالعربية" value={categoryForm.descriptionAr} onChange={(e) => setCategoryForm({ ...categoryForm, descriptionAr: e.target.value })}/><textarea className={fieldClass} placeholder="Description in English" value={categoryForm.descriptionEn} onChange={(e) => setCategoryForm({ ...categoryForm, descriptionEn: e.target.value })}/><select className={fieldClass} value={categoryForm.status} onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value as FaqStatus })}><option value="draft">{isAr ? "مسودة" : "Draft"}</option><option value="published">{isAr ? "منشور" : "Published"}</option></select><button disabled={saving} onClick={() => void saveCategory()} className="rounded-xl bg-[#B4232A] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin"/> : (isAr ? "حفظ التصنيف" : "Save category")}</button></div>
      : <div className="mt-4 grid gap-3 md:grid-cols-2"><select className={fieldClass} value={questionForm.categoryId} onChange={(e) => setQuestionForm({ ...questionForm, categoryId: e.target.value })}><option value="">{isAr ? "اختر التصنيف" : "Choose category"}</option>{activeCategories.map((item) => <option key={item.id} value={item.id}>{isAr ? item.nameAr : item.nameEn}</option>)}</select><select className={fieldClass} value={questionForm.status} onChange={(e) => setQuestionForm({ ...questionForm, status: e.target.value as FaqStatus })}><option value="draft">{isAr ? "مسودة" : "Draft"}</option><option value="published">{isAr ? "منشور" : "Published"}</option></select><textarea className={fieldClass} placeholder="السؤال بالعربية" value={questionForm.questionAr} onChange={(e) => setQuestionForm({ ...questionForm, questionAr: e.target.value })}/><textarea className={fieldClass} placeholder="Question in English" value={questionForm.questionEn} onChange={(e) => setQuestionForm({ ...questionForm, questionEn: e.target.value })}/><textarea className={`${fieldClass} min-h-28`} placeholder="الإجابة بالعربية" value={questionForm.answerAr} onChange={(e) => setQuestionForm({ ...questionForm, answerAr: e.target.value })}/><textarea className={`${fieldClass} min-h-28`} placeholder="Answer in English" value={questionForm.answerEn} onChange={(e) => setQuestionForm({ ...questionForm, answerEn: e.target.value })}/><button onClick={() => setPreview(preview ? null : (isAr ? "ar" : "en"))} className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black"><Eye className="h-4 w-4" />{isAr ? "معاينة" : "Preview"}</button><button disabled={saving} onClick={() => void saveQuestion()} className="rounded-xl bg-[#B4232A] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{isAr ? "حفظ السؤال" : "Save question"}</button>{preview ? <div dir={preview === "ar" ? "rtl" : "ltr"} className="md:col-span-2 rounded-2xl bg-[#F7F8FA] p-5"><div className="mb-3 flex gap-2"><button onClick={() => setPreview("ar")} className="rounded-full bg-white px-3 py-1 text-xs font-bold">العربية</button><button onClick={() => setPreview("en")} className="rounded-full bg-white px-3 py-1 text-xs font-bold">English</button></div><h3 className="font-black text-[#082B67]">{preview === "ar" ? questionForm.questionAr : questionForm.questionEn}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">{preview === "ar" ? questionForm.answerAr : questionForm.answerEn}</p></div> : null}</div>}
    </section> : null}
    {tab !== "archive" ? <section className="mt-5 rounded-3xl border border-transparent bg-white p-4 transition hover:border-[#B4232A] focus-within:border-[#B4232A]"><div className="grid gap-3 md:grid-cols-3"><div className="relative"><Search className="absolute start-3 top-3 h-4 w-4 text-gray-400"/><input className={`${fieldClass} ps-9`} value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={isAr ? "بحث..." : "Search..."}/></div><select className={fieldClass} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as FaqStatus | "all"); setPage(1); }}><option value="all">{isAr ? "كل الحالات" : "All statuses"}</option><option value="published">{isAr ? "منشور" : "Published"}</option><option value="draft">{isAr ? "مسودة" : "Draft"}</option></select>{tab === "questions" ? <select className={fieldClass} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}><option value="all">{isAr ? "كل التصنيفات" : "All categories"}</option>{activeCategories.map((item) => <option key={item.id} value={item.id}>{isAr ? item.nameAr : item.nameEn}</option>)}</select> : <div/>}</div></section> : null}
    <section className="mt-5 space-y-3">{busy ? <div className="flex justify-center p-16"><Loader2 className="h-7 w-7 animate-spin text-[#B4232A]"/></div> : tab === "categories" ? categoryPagination.items.map((item) => <article key={item.id} draggable onDragStart={() => setDraggedId(item.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropCategory(item.id)} className="flex flex-wrap items-center gap-3 rounded-2xl border border-transparent bg-white p-4 transition hover:border-[#B4232A] focus-within:border-[#B4232A]"><GripVertical className="h-5 w-5 cursor-grab text-gray-400"/><div className="min-w-52 flex-1"><h3 className="font-black text-[#082B67]">{isAr ? item.nameAr : item.nameEn}</h3><p className="text-xs text-gray-500">{item.status === "published" ? (isAr ? "منشور" : "Published") : (isAr ? "مسودة" : "Draft")}</p></div><OrderButtons isAr={isAr} onUp={() => move("categories", item.id, -1)} onDown={() => move("categories", item.id, 1)}/><button aria-label={isAr ? "تعديل التصنيف" : "Edit category"} title={isAr ? "تعديل التصنيف" : "Edit category"} onClick={() => editCategory(item)} className="icon"><Pencil className="h-4 w-4"/></button><button aria-label={item.status === "published" ? (isAr ? "تحويل التصنيف إلى مسودة" : "Move category to draft") : (isAr ? "نشر التصنيف" : "Publish category")} title={item.status === "published" ? (isAr ? "تحويل التصنيف إلى مسودة" : "Move category to draft") : (isAr ? "نشر التصنيف" : "Publish category")} onClick={() => void lifecycle("categories", item, item.status === "published" ? "draft" : "publish")} className="icon"><Send className="h-4 w-4"/></button><button aria-label={isAr ? "أرشفة التصنيف" : "Archive category"} title={isAr ? "أرشفة التصنيف" : "Archive category"} onClick={() => void lifecycle("categories", item, "archive")} className="icon text-red-600"><Archive className="h-4 w-4"/></button></article>)
      : tab === "questions" ? questionPagination.items.map((item) => <article key={item.id} draggable onDragStart={() => setDraggedId(item.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropQuestion(item.id, item.categoryId)} className="flex flex-wrap items-center gap-3 rounded-2xl border border-transparent bg-white p-4 transition hover:border-[#B4232A] focus-within:border-[#B4232A]"><GripVertical className="h-5 w-5 cursor-grab text-gray-400"/><div className="min-w-52 flex-1"><p className="text-[11px] font-bold text-[#B4232A]">{categoryName(item.categoryId)}</p><h3 className="font-black text-[#082B67]">{isAr ? item.questionAr : item.questionEn}</h3><p className="text-xs text-gray-500">{item.status === "published" ? (isAr ? "منشور" : "Published") : (isAr ? "مسودة" : "Draft")}</p></div><OrderButtons isAr={isAr} onUp={() => move("questions", item.id, -1, item.categoryId)} onDown={() => move("questions", item.id, 1, item.categoryId)}/><button aria-label={isAr ? "تعديل السؤال" : "Edit question"} title={isAr ? "تعديل السؤال" : "Edit question"} onClick={() => editQuestion(item)} className="icon"><Pencil className="h-4 w-4"/></button><button aria-label={item.status === "published" ? (isAr ? "تحويل السؤال إلى مسودة" : "Move question to draft") : (isAr ? "نشر السؤال" : "Publish question")} title={item.status === "published" ? (isAr ? "تحويل السؤال إلى مسودة" : "Move question to draft") : (isAr ? "نشر السؤال" : "Publish question")} onClick={() => void lifecycle("questions", item, item.status === "published" ? "draft" : "publish")} className="icon"><Send className="h-4 w-4"/></button><button aria-label={isAr ? "أرشفة السؤال" : "Archive question"} title={isAr ? "أرشفة السؤال" : "Archive question"} onClick={() => void lifecycle("questions", item, "archive")} className="icon text-red-600"><Archive className="h-4 w-4"/></button></article>)
      : archivePagination.items.map((item) => <article key={`${item.kind}-${item.id}`} className="flex items-center gap-3 rounded-2xl border border-transparent bg-white p-4 transition hover:border-[#B4232A] focus-within:border-[#B4232A]"><Archive className="h-5 w-5 text-gray-400"/><span className="flex-1 font-bold text-[#082B67]">{item.label}</span><button onClick={() => void lifecycle(item.kind, item, "restore")} className="inline-flex items-center gap-2 rounded-xl bg-[#082B67] px-4 py-2 text-xs font-black text-white"><RotateCcw className="h-4 w-4"/>{isAr ? "استرجاع كمسودة" : "Restore as draft"}</button></article>)}</section>
    <AdminPagination isAr={isAr} currentPage={activePagination.currentPage} totalPages={activePagination.totalPages} onPageChange={setPage} />
  </div></main>;
}

function OrderButtons({ isAr, onUp, onDown }: { isAr: boolean; onUp: () => void; onDown: () => void }) { return <div className="flex gap-1"><button type="button" onClick={onUp} className="rounded-lg border p-2" aria-label={isAr ? "تحريك لأعلى" : "Move up"} title={isAr ? "تحريك لأعلى" : "Move up"}><ArrowUp className="h-4 w-4"/></button><button type="button" onClick={onDown} className="rounded-lg border p-2" aria-label={isAr ? "تحريك لأسفل" : "Move down"} title={isAr ? "تحريك لأسفل" : "Move down"}><ArrowDown className="h-4 w-4"/></button></div>; }
