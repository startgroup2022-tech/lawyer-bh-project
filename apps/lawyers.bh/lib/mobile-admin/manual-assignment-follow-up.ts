type AssignedRequest = { countryCode: string; tapChargeId: string; grossAmount: number; locale: "ar" | "en" | "tr" };
type Dependencies = {
  load(requestId: string, lawyerId: string): Promise<AssignedRequest | null>;
  allocate(input: AssignedRequest & { requestId: string; lawyerId: string }): Promise<void>;
  notifyClient(input: { requestId: string; locale: AssignedRequest["locale"] }): Promise<void>;
  notifyLawyer(input: { requestId: string; lawyerId: string; locale: AssignedRequest["locale"] }): Promise<void>;
  recordFailure(kind: "allocation_failed" | "notification_failed", requestId: string): Promise<void>;
};

export async function runManualAssignmentFollowUp(
  input: { requestId: string; lawyerId: string }, deps: Dependencies,
): Promise<{ allocationRecorded: boolean; notificationsSent: boolean }> {
  const assigned = await deps.load(input.requestId, input.lawyerId);
  if (!assigned) return { allocationRecorded: false, notificationsSent: false };
  let allocationRecorded = true;
  try {
    await deps.allocate({ ...assigned, ...input });
  } catch {
    allocationRecorded = false;
    await deps.recordFailure("allocation_failed", input.requestId).catch(() => undefined);
  }
  const notifications = await Promise.allSettled([
    deps.notifyClient({ requestId: input.requestId, locale: assigned.locale }),
    deps.notifyLawyer({ ...input, locale: assigned.locale }),
  ]);
  const notificationsSent = notifications.every((result) => result.status === "fulfilled");
  if (!notificationsSent) {
    await deps.recordFailure("notification_failed", input.requestId).catch(() => undefined);
  }
  return { allocationRecorded, notificationsSent };
}
