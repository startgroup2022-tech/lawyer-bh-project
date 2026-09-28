export type AddSubmissionSource = "final-add-button" | "implicit";

export function isExplicitAddSubmission(source: AddSubmissionSource) {
  return source === "final-add-button";
}

export async function runExplicitAdd(
  source: AddSubmissionSource,
  request: () => Promise<void>,
) {
  if (!isExplicitAddSubmission(source)) return false;
  await request();
  return true;
}
