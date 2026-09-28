import type {
  CommunicationCapabilities,
  CommunicationSafetyState,
} from "./types";

export function isActiveChatSuspension(
  suspendedUntil: string | null,
  now = new Date(),
) {
  if (!suspendedUntil) return false;
  const expiresAt = Date.parse(suspendedUntil);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function evaluateCommunicationCapabilities(
  state: CommunicationSafetyState,
  now = new Date(),
): CommunicationCapabilities {
  const personalCommunicationAllowed =
    !state.blockedByMe &&
    !state.blockedByPeer &&
    !isActiveChatSuspension(state.chatSuspendedUntil, now);

  return {
    read: true,
    send: personalCommunicationAllowed,
    attach: personalCommunicationAllowed,
    call: personalCommunicationAllowed,
    canReport: true,
    canBlock: !state.blockedByMe,
    canUnblock: state.blockedByMe,
  };
}
