import "server-only";

import { sendEmail } from "@/lib/postmark";
import {
  bookingAdminNotification,
  bookingCustomerConfirmation,
  type EmailLang,
} from "@/lib/emailTemplates";
import {
  bahrainLocalToUtc,
  buildIcs,
  generateBookingId,
  generateVideoRoomName,
} from "@/lib/ics";

export type ConsultMethod =
  | "online"
  | "phone"
  | "whatsapp"
  | "office"
  | "video"
  | "service_request";
export type VideoProvider = "google-meet" | "whatsapp" | null;

const OFFICE_ADDRESS =
  "Saraya Square Complex, Building 1853G, Road 1546, Block 815, Isa Town, Bahrain";

const OFFICE_PHONE = "+973 1753 7070";

export interface BookingInput {
  lang: EmailLang;
  service: string;
  consultationType: string;
  consultationPrice: string;
  consultationMethod: ConsultMethod;
  durationMinutes: number;
  videoProvider: VideoProvider;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  message: string;

  /**
   * Optional: pass from caller so we can tie booking to payment.
   * For paid Tap bookings, pass booking_requests.id here.
   */
  bookingId?: string;

  /**
   * Optional: send admin notification to assigned lawyer/office email.
   * If missing, sendEmail() will use POSTMARK_TO_EMAIL.
   */
  adminEmail?: string;
}

export interface BookingResult {
  bookingId: string;
  startUtc: Date;
  endUtc: Date;
  meetingLocation: string;
  videoCallUrl?: string;
}

function getBookingStartTime(time: string) {
  const normalized = String(time ?? "")
    .trim()
    .replace("–", "-")
    .replace("—", "-")
    .replace(/\s+/g, "");

  return normalized.split("-")[0] || time;
}

function getSafeDurationMinutes(value: number) {
  const duration = Number(value);

  if (!Number.isFinite(duration) || duration <= 0) {
    return 15;
  }

  return duration;
}

export async function processBooking(
  input: BookingInput,
): Promise<BookingResult> {
  const {
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
  } = input;

  const bookingStartTime = getBookingStartTime(time);

  const startUtc = bahrainLocalToUtc(date, bookingStartTime);

  if (!startUtc) {
    throw new Error("Invalid date/time");
  }

  const safeDurationMinutes = getSafeDurationMinutes(durationMinutes);
  const endUtc = new Date(startUtc.getTime() + safeDurationMinutes * 60 * 1000);

  const bookingId = input.bookingId ?? generateBookingId();

  let meetingLocation: string;
  let videoCallUrl: string | undefined;

  switch (consultationMethod) {
    case "whatsapp": {
      videoCallUrl = "https://wa.me/97336470706";
      meetingLocation =
        lang === "ar"
          ? `استشارة عبر واتساب — ${videoCallUrl}`
          : `WhatsApp consultation — ${videoCallUrl}`;
      break;
    }

    case "video": {
      if (videoProvider === "whatsapp") {
        videoCallUrl = "https://wa.me/97336470706";

        meetingLocation =
          lang === "ar"
            ? `مكالمة فيديو عبر واتساب — ${videoCallUrl}`
            : `WhatsApp video call — ${videoCallUrl}`;
      } else {
        const room = generateVideoRoomName(bookingId);
        videoCallUrl = `https://meet.jit.si/${room}`;

        meetingLocation =
          lang === "ar"
            ? `مكالمة فيديو — ${videoCallUrl}`
            : `Video call — ${videoCallUrl}`;
      }

      break;
    }

    case "phone": {
      meetingLocation = OFFICE_PHONE;
      break;
    }

    case "office": {
      meetingLocation = OFFICE_ADDRESS;
      break;
    }

    case "service_request": {
      meetingLocation =
        lang === "ar"
          ? "طلب خدمة قانونية — سيتواصل معك المكتب لتنسيق التفاصيل"
          : "Legal service request — the office will contact you to arrange the details";
      break;
    }

    default: {
      meetingLocation =
        lang === "ar"
          ? "استشارة عبر الإنترنت — سنرسل التفاصيل"
          : "Online — details will follow";
    }
  }

  const icsTitle =
    lang === "ar"
      ? `استشارة قانونية — ${service}`
      : `Legal Consultation — ${service}`;

  const icsDescription = [
    lang === "ar" ? `الرقم المرجعي: ${bookingId}` : `Reference: ${bookingId}`,
    lang === "ar" ? `الخدمة: ${service}` : `Service: ${service}`,
    lang === "ar"
      ? `نوع الاستشارة: ${consultationType} (${consultationPrice})`
      : `Consultation: ${consultationType} (${consultationPrice})`,
    videoCallUrl
      ? lang === "ar"
        ? `رابط الاجتماع: ${videoCallUrl}`
        : `Meeting link: ${videoCallUrl}`
      : "",
    lang === "ar"
      ? "محامون البحرين — +973 1753 7070 — info@lawyers.bh"
      : "Lawyers.bh — +973 1753 7070 — info@lawyers.bh",
  ]
    .filter(Boolean)
    .join("\n");

  const fromEmail = process.env.POSTMARK_FROM_EMAIL ?? "noreply@lawyers.bh";

  const icsContent = buildIcs({
    uid: bookingId,
    title: icsTitle,
    description: icsDescription,
    location: meetingLocation,
    start: startUtc,
    end: endUtc,
    organizer: {
      name: "Lawyers.bh",
      email: fromEmail,
    },
    attendee: {
      name,
      email,
    },
    url: videoCallUrl,
  });

  const icsBase64 = Buffer.from(icsContent, "utf8").toString("base64");

  const icsAttachment = {
    name: `lawyers-bh-${bookingId}.ics`,
    content: icsBase64,
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  };

  const admin = bookingAdminNotification({
    lang,
    bookingId,
    service,
    consultationType,
    consultationPrice,
    date,
    time,
    name,
    phone,
    email,
    message,
    meetingLocation,
    videoCallUrl,
  });

  try {
    await sendEmail({
      to: input.adminEmail,
      subject: admin.subject,
      html: admin.html,
      text: admin.text,
      replyTo: email,
      attachments: [icsAttachment],
    });
  } catch (err) {
    console.error("[processBooking] admin email failed", err);
  }

  const customer = bookingCustomerConfirmation({
    lang,
    bookingId,
    service,
    consultationType,
    consultationPrice,
    date,
    time,
    name,
    meetingLocation,
    videoCallUrl,
  });

  try {
    await sendEmail({
      to: email,
      subject: customer.subject,
      html: customer.html,
      text: customer.text,
      attachments: [icsAttachment],
    });
  } catch (err) {
    console.error("[processBooking] customer email failed", err);
  }

  return {
    bookingId,
    startUtc,
    endUtc,
    meetingLocation,
    videoCallUrl,
  };
}
