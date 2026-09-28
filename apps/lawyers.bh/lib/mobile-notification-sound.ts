export const mobileNotificationSound = {
  apns: {
    headers: { "apns-priority": "10" as const },
    payload: { aps: { sound: "legalsos_alarm_classic.caf" as const } },
  },
  android: {
    priority: "high" as const,
    notification: {
      channelId: "legalsos_alarm_classic_v1" as const,
      sound: "legalsos_alarm_classic" as const,
    },
  },
};
