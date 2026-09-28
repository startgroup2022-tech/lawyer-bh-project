export type CommunicationServiceStatus =
  | "pending"
  | "mobilizing"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export type CommunicationRequestAccessRow = {
  requestId: string;
  clientId: string;
  clientAccountId?: string | null;
  clientDisplayName: string;
  clientPhone: string | null;
  mobileRequestAccessDigest: string | null;
  assignedLawyerId: string | null;
  assignedLawyerDisplayName: string | null;
  assignedLawyerPhone: string | null;
  serviceStatus: CommunicationServiceStatus;
};

export type CommunicationCredential =
  | { kind: "client"; token: string }
  | { kind: "lawyer"; lawyerId: string; countryCode: string };

export type CommunicationParticipant = {
  requestId: string;
  actor: { role: "client" | "lawyer"; id: string; accountId?: string };
  peer: {
    role: "client" | "lawyer";
    id: string;
    accountId?: string;
    displayName: string;
    phone: string | null;
  };
  capabilities: { read: true; send: boolean; call: boolean };
};

type CommunicationAccessDependencies = {
  findRequest(requestId: string): Promise<CommunicationRequestAccessRow | null>;
  verifyClientToken(token: string, digest: string): boolean;
};

const activeStatuses = new Set<CommunicationServiceStatus>([
  "mobilizing",
  "arrived",
  "in_progress",
]);

export async function resolveCommunicationParticipant(
  input: { requestId: string; credential: CommunicationCredential },
  dependencies: CommunicationAccessDependencies,
): Promise<CommunicationParticipant | null> {
  const requestId = input.requestId.trim();
  if (!requestId) return null;

  const request = await dependencies.findRequest(requestId);
  if (!request || request.requestId !== requestId || !request.assignedLawyerId) {
    return null;
  }

  const isCompleted = request.serviceStatus === "completed";
  if (!isCompleted && !activeStatuses.has(request.serviceStatus)) return null;

  const capabilities = {
    read: true as const,
    send: !isCompleted,
    call: !isCompleted,
  };

  if (input.credential.kind === "client") {
    const digest = request.mobileRequestAccessDigest;
    if (
      !digest ||
      !dependencies.verifyClientToken(input.credential.token, digest)
    ) {
      return null;
    }

    return {
      requestId,
      actor: {
        role: "client",
        id: request.clientId,
        ...(request.clientAccountId ? { accountId: request.clientAccountId } : {}),
      },
      peer: {
        role: "lawyer",
        id: request.assignedLawyerId,
        accountId: request.assignedLawyerId,
        displayName: request.assignedLawyerDisplayName ?? "",
        phone: request.assignedLawyerPhone,
      },
      capabilities,
    };
  }

  if (input.credential.lawyerId !== request.assignedLawyerId) return null;

  return {
    requestId,
      actor: { role: "lawyer", id: input.credential.lawyerId, accountId: input.credential.lawyerId },
    peer: {
      role: "client",
      id: request.clientId,
      ...(request.clientAccountId ? { accountId: request.clientAccountId } : {}),
      displayName: request.clientDisplayName,
      phone: request.clientPhone,
    },
    capabilities,
  };
}
