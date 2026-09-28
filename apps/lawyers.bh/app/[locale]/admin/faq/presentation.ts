type Status = "draft" | "published";
type RecordState = { id: string; status: string; archivedAt: string | null };
type QuestionState = RecordState & { categoryId: string; questionAr: string; questionEn: string; answerAr: string; answerEn: string };

export function normalizeFaqSearch(value: string) {
  return value.trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ");
}

export function summarizeFaq(categories: RecordState[], questions: RecordState[]) {
  const rows = [...categories, ...questions];
  return {
    published: rows.filter((row) => !row.archivedAt && row.status === "published").length,
    draft: rows.filter((row) => !row.archivedAt && row.status === "draft").length,
    archived: rows.filter((row) => Boolean(row.archivedAt)).length,
    total: rows.length,
  };
}

export function filterFaqQuestions<T extends QuestionState>(questions: T[], filters: { query: string; categoryId: string; status: Status | "all"; archived: boolean }) {
  const query = normalizeFaqSearch(filters.query);
  return questions.filter((row) => {
    if (Boolean(row.archivedAt) !== filters.archived) return false;
    if (filters.categoryId !== "all" && row.categoryId !== filters.categoryId) return false;
    if (filters.status !== "all" && row.status !== filters.status) return false;
    return !query || normalizeFaqSearch(`${row.questionAr} ${row.questionEn} ${row.answerAr} ${row.answerEn}`).includes(query);
  });
}

export function moveOrderedId(ids: string[], movingId: string, targetId: string) {
  if (movingId === targetId || !ids.includes(movingId) || !ids.includes(targetId)) return [...ids];
  const next = ids.filter((id) => id !== movingId);
  next.splice(next.indexOf(targetId), 0, movingId);
  return next;
}
