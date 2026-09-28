import type { CommunicationActorRole } from "./message-store";

export type CommunicationCallStatus = "ringing" | "accepted" | "connected" | "ended" | "rejected" | "missed" | "cancelled" | "failed";
export type CommunicationCall = {
  id: string; requestId: string; initiatorRole: CommunicationActorRole; initiatorId: string;
  mediaKind: "audio" | "video"; status: CommunicationCallStatus; ringingAt: Date;
  acceptedAt: Date | null; connectedAt: Date | null; endedAt: Date | null;
  durationSeconds: number | null; endReason: string | null; endedByRole: CommunicationActorRole | null;
};

type CallRepository = {
  create(input: { requestId: string; initiatorRole: CommunicationActorRole; initiatorId: string; mediaKind: "audio" | "video" }): Promise<CommunicationCall>;
  get(callId: string): Promise<CommunicationCall | null>;
  transition(input: { call: CommunicationCall; to: CommunicationCallStatus; actorRole: CommunicationActorRole; at: Date; reason?: string }): Promise<CommunicationCall>;
};

const transitions: Record<CommunicationCallStatus, ReadonlySet<CommunicationCallStatus>> = {
  ringing: new Set(["accepted", "rejected", "missed", "cancelled"]),
  accepted: new Set(["connected", "ended", "failed"]),
  connected: new Set(["ended", "failed"]),
  ended: new Set(), rejected: new Set(), missed: new Set(), cancelled: new Set(), failed: new Set(),
};

export class CallTransitionError extends Error {}

export function createCallStore(repository: CallRepository) {
  return {
    createCall: repository.create,
    getCall: repository.get,
    async transitionCall(input: { callId: string; to: CommunicationCallStatus; actorRole: CommunicationActorRole; at: Date; reason?: string }) {
      const call = await repository.get(input.callId);
      if (!call) throw new CallTransitionError("call_not_found");
      if (call.status === input.to) return call;
      if (!transitions[call.status].has(input.to)) throw new CallTransitionError("invalid_call_transition");
      return repository.transition({ call, to: input.to, actorRole: input.actorRole, at: input.at, ...(input.reason ? { reason: input.reason } : {}) });
    },
  };
}
