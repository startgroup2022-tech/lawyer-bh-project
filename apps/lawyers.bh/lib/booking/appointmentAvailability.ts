const ZONE = "Asia/Bahrain";

function dateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function listAppointmentAvailability(language: "ar" | "en", now = new Date()) {
  const current = dateKey(now);
  const noon = new Date(`${current}T12:00:00+03:00`);
  const locale = language === "ar" ? "ar-BH-u-nu-arab" : "en-GB";
  const weekday = new Intl.DateTimeFormat(locale, { timeZone: ZONE, weekday: "long" });
  const dayMonth = new Intl.DateTimeFormat(locale, { timeZone: ZONE, day: "numeric", month: "long" });
  const weekdayKey = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, weekday: "short" });
  const dates: Array<{ value: string; label: string }> = [];

  for (let offset = 1; dates.length < 3 && offset <= 14; offset += 1) {
    const candidate = new Date(noon.getTime() + offset * 86_400_000);
    if (["Fri", "Sat"].includes(weekdayKey.format(candidate))) continue;
    dates.push({ value: dateKey(candidate), label: `${weekday.format(candidate)} ${dayMonth.format(candidate)}` });
  }

  return {
    dates,
    periods: [
      { value: "09:00-13:00", label: language === "ar" ? "9 صباحاً - 1 ظهراً" : "9:00 AM - 1:00 PM" },
      { value: "13:00-17:00", label: language === "ar" ? "1 ظهراً - 5 عصراً" : "1:00 PM - 5:00 PM" },
      { value: "09:00-17:00", label: language === "ar" ? "9 صباحاً - 5 عصراً" : "9:00 AM - 5:00 PM" },
    ],
  };
}
