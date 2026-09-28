export const TRAINING_TYPES = ["law", "other"] as const;
export const TRAINING_STATUSES = ["new", "review", "interview", "accepted", "rejected"] as const;
export const FILE_KINDS = ["cv", "university_letter"] as const;
export const FILE_MAX_BYTES = 5 * 1024 * 1024;
export const CHUNK_BYTES = 1024 * 1024;
export type FileKind = typeof FILE_KINDS[number];
export type ManifestFile = { kind: FileKind; name: string; size: number };
export type TrainingInput = {
  type: typeof TRAINING_TYPES[number]; field: string; fullName: string; email: string;
  phone: string; location: string; university: string; qualification: string; specialization: string;
  startDate: string; durationWeeks: number; message: string; consent: true;
};
export type TrainingSummary = {
  id: string; reference: string; fullName: string; email: string; type: TrainingInput["type"];
  status: typeof TRAINING_STATUSES[number]; createdAt: string; archivedAt: string | null; version: number;
};
export type TrainingApplication = TrainingSummary & TrainingInput & { notes: string; updatedAt: string; files: ManifestFile[] };
export type TrainingFilters = { type: "" | TrainingInput["type"]; status: "" | TrainingSummary["status"]; query: string; page: number; archived: boolean };
export class TrainingError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
