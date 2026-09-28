import { NextResponse } from "next/server";
import { isEmail, str } from "@/lib/postmark";
import type { EmailLang } from "@/lib/emailTemplates";
import {
  processBooking,
  type ConsultMethod,
  type VideoProvider,
} from "@/lib/bookingConfirmation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const service = str(data.service, 200);
  const consultationType = str(data.consultationType, 100);
  const consultationPrice = str(data.consultationPrice, 50) ?? "";
  const consultationMethodRaw = str(data.consultationMethod, 20);
  const durationRaw = typeof data.durationMinutes === "number" ? data.durationMinutes : 30;
  const durationMinutes = [15, 30, 45].includes(durationRaw) ? durationRaw : 30;
  const videoProviderRaw = str(data.videoProvider, 20);
  const videoProvider: VideoProvider =
    videoProviderRaw === "google-meet" || videoProviderRaw === "whatsapp"
      ? videoProviderRaw
      : null;
  const date = str(data.date, 50);
  const time = str(data.time, 20);
  const name = str(data.name, 120);
  const phone = str(data.phone, 40);
  const email = str(data.email, 120);
  const message = typeof data.message === "string" ? data.message.trim().slice(0, 2000) : "";
  const lang: EmailLang = data.lang === "ar" ? "ar" : "en";

  if (!service || !consultationType || !date || !time || !name || !phone || !email) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ ok: false, error: "Invalid date or time format" }, { status: 400 });
  }

  const consultationMethod: ConsultMethod =
    consultationMethodRaw === "online" ||
    consultationMethodRaw === "phone" ||
    consultationMethodRaw === "office" ||
    consultationMethodRaw === "video"
      ? consultationMethodRaw
      : "online";

  try {
    const result = await processBooking({
      lang,
      service,
      consultationType,
      consultationPrice,
      consultationMethod,
      durationMinutes,
      videoProvider,
      date,
      time,
      name,
      phone,
      email,
      message,
    });
    return NextResponse.json({ ok: true, bookingId: result.bookingId });
  } catch (err) {
    console.error("[contact] processBooking failed", err);
    return NextResponse.json({ ok: false, error: "Email delivery failed" }, { status: 502 });
  }
}
