const BAHRAIN_TIME_ZONE = "Asia/Bahrain";

export function formatBahrainTime(value: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: BAHRAIN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatBahrainDateTime(
  value: Date | string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: BAHRAIN_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatBahrainLongDateTime(
  value: Date | string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: BAHRAIN_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
