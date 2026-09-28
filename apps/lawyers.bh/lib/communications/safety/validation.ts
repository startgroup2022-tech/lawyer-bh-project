import {
  communicationReportCategories,
  type CommunicationReportCategory,
} from "./types";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CommunicationReportInput = {
  category: CommunicationReportCategory;
  description: string | null;
  idempotencyKey: string;
};

export function parseCommunicationReport(
  value: unknown,
): CommunicationReportInput {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const category = String(input.category ?? "");

  if (
    !communicationReportCategories.includes(
      category as CommunicationReportCategory,
    )
  ) {
    throw new Error("invalid_report_category");
  }

  const idempotencyKey = String(input.idempotencyKey ?? "").trim();
  if (!uuid.test(idempotencyKey)) {
    throw new Error("invalid_idempotency_key");
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  if (description.length > 1000) {
    throw new Error("invalid_report_description");
  }

  return {
    category: category as CommunicationReportCategory,
    description: description || null,
    idempotencyKey,
  };
}
