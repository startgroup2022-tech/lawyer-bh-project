export const communicationReportCategories = [
  "harassment",
  "threat_or_hate",
  "fraud_or_spam",
  "sexual_or_inappropriate",
  "privacy",
  "other",
] as const;

export type CommunicationReportCategory =
  (typeof communicationReportCategories)[number];

export type CommunicationActorRole = "client" | "lawyer";

export type CommunicationSafetyState = {
  blockedByMe: boolean;
  blockedByPeer: boolean;
  chatSuspendedUntil: string | null;
};

export type CommunicationCapabilities = {
  read: true;
  send: boolean;
  attach: boolean;
  call: boolean;
  canReport: true;
  canBlock: boolean;
  canUnblock: boolean;
};

export const moderationActions = [
  "dismissal",
  "warning",
  "chat_suspension",
  "account_suspension",
  "chat_reactivation",
  "account_reactivation",
] as const;

export type ModerationAction = (typeof moderationActions)[number];
