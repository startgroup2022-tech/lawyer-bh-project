export const notificationAudiences = [
  "clients",
  "active_lawyers",
  "pending_lawyers",
  "all_lawyers",
  "everyone",
] as const;

export type NotificationAudience = (typeof notificationAudiences)[number];
export type MobilePushLocale = "ar" | "en" | "tr";
export type MobileNotificationState = "sending" | "completed" | "failed";

export interface AudienceInstallation {
  token: string;
  locale: MobilePushLocale;
}

export interface MobileNotificationInput {
  adminId: string;
  audience: NotificationAudience;
  titleAr: string;
  bodyAr: string;
  titleEn: string;
  bodyEn: string;
  idempotencyKey: string;
}

export interface MobileNotificationSend extends MobileNotificationInput {
  id: string;
  state: MobileNotificationState;
  targeted: number;
  successful: number;
  failed: number;
  pruned: number;
  createdAt: string;
}

export interface MobileNotificationTotals {
  targeted: number;
  successful: number;
  failed: number;
  pruned: number;
}
