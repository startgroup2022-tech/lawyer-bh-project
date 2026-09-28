import { canManuallyAssign, type ManualAssignmentCase, type ManualAssignmentLawyer } from "./escalated-requests-core";

export type ManualAssignmentInput = { requestId: string; lawyerId: string; adminId: string };
export type ManualAssignmentResult = { status: "assigned" | "request_unavailable" | "lawyer_unavailable" };
export type ManualAssignmentTransaction = {
  getRequestForUpdate(requestId: string): Promise<ManualAssignmentCase | null>;
  getLawyerForUpdate(lawyerId: string): Promise<ManualAssignmentLawyer | null>;
  assign(requestId: string, lawyerId: string, adminId: string): Promise<void>;
};
export type ManualAssignmentStore = {
  transaction(work: (tx: ManualAssignmentTransaction) => Promise<ManualAssignmentResult>): Promise<ManualAssignmentResult>;
};

export function createManualAssignmentService(store: ManualAssignmentStore) {
  return async (input: ManualAssignmentInput): Promise<ManualAssignmentResult> => store.transaction(async (tx) => {
    const request = await tx.getRequestForUpdate(input.requestId);
    if (!request) return { status: "request_unavailable" };
    const lawyer = await tx.getLawyerForUpdate(input.lawyerId);
    if (!lawyer) return { status: "lawyer_unavailable" };
    const status = canManuallyAssign(request, lawyer);
    if (status !== "eligible") return { status };
    await tx.assign(input.requestId, input.lawyerId, input.adminId);
    return { status: "assigned" };
  });
}
