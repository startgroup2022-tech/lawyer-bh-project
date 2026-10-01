import "server-only";

import { sqlClient } from "@/lib/db/client";
import { mobilePushSender } from "@/lib/sos/mobile-push";
import type { MobilePushLocale } from "@/lib/sos/mobile-push";

import { insertAppointmentNotification, type AppointmentNotificationKind } from "./notification-store";

type BookingContext = {
  bookingRequestId: string;
  conversationId: string | null;
  countryCode: string;
  clientAccountId: string | null;
  lawyerId: string | null;
  clientName: string | null;
  lawyerName: string | null;
  appointmentDate: string;
  appointmentTime: string;
  service: string;
  locale: string;
};

function normalizeLocale(locale: string | null | undefined): MobilePushLocale {
  return locale === "en" || locale === "tr" ? locale : "ar";
}

async function loadBookingContext(bookingRequestId: string): Promise<BookingContext | null> {
  const rows = await sqlClient<{
    booking_request_id: string;
    conversation_id: string | null;
    country_code: string;
    client_account_id: string | null;
    lawyer_id: string | null;
    customer_name: string | null;
    selected_lawyer_name: string | null;
    lawyer_full_name_ar: string | null;
    lawyer_full_name_en: string | null;
    appointment_date: string;
    appointment_time: string;
    service: string;
    lang: string;
  }[]>`
    SELECT
      b.id::text AS booking_request_id,
      c.id::text AS conversation_id,
      b.country_code,
      b.client_account_id::text AS client_account_id,
      b.selected_lawyer_id::text AS lawyer_id,
      b.customer_name,
      b.selected_lawyer_name,
      l.full_name_ar AS lawyer_full_name_ar,
      l.full_name_en AS lawyer_full_name_en,
      b.appointment_date::text AS appointment_date,
      b.appointment_time,
      b.service,
      b.lang
    FROM public.bahrain_booking_requests b
    LEFT JOIN public.bahrain_appointment_conversations c ON c.booking_request_id = b.id
    LEFT JOIN public.bahrain_lawyers l ON l.id = b.selected_lawyer_id
    WHERE b.id = ${bookingRequestId}::uuid
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    bookingRequestId: row.booking_request_id,
    conversationId: row.conversation_id,
    countryCode: row.country_code,
    clientAccountId: row.client_account_id,
    lawyerId: row.lawyer_id,
    clientName: row.customer_name,
    lawyerName: row.lawyer_full_name_ar || row.lawyer_full_name_en || row.selected_lawyer_name,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time.slice(0, 5),
    service: row.service,
    locale: row.lang,
  };
}

async function sendPush(input: {
  role: "client" | "lawyer";
  recipientId: string;
  requestId: string;
  eventType: Parameters<Awaited<ReturnType<typeof mobilePushSender>>["sendClientPush"]>[0]["eventType"];
  locale: MobilePushLocale;
}) {
  try {
    const sender = await mobilePushSender();
    if (input.role === "lawyer") {
      await sender.sendLawyerPush({
        lawyerId: input.recipientId,
        eventType: input.eventType,
        requestId: input.requestId,
        locale: input.locale,
      });
    } else {
      await sender.sendClientPush({
        eventType: input.eventType,
        requestId: input.requestId,
        locale: input.locale,
      });
    }
  } catch (error) {
    console.warn("[appointment-notifications] push delivery failed", {
      role: input.role,
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

type EmitInput = {
  booking: BookingContext;
  recipientRole: "client" | "lawyer";
  recipientId: string;
  kind: AppointmentNotificationKind;
  sourceKey: string;
  deepLink: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  pushEventType?: Parameters<typeof sendPush>[0]["eventType"];
};

async function emit(input: EmitInput): Promise<boolean> {
  const inserted = await insertAppointmentNotification({
    bookingRequestId: input.booking.bookingRequestId,
    conversationId: input.booking.conversationId,
    recipientRole: input.recipientRole,
    recipientId: input.recipientId,
    kind: input.kind,
    entityId: input.booking.bookingRequestId,
    deepLink: input.deepLink,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    bodyAr: input.bodyAr,
    bodyEn: input.bodyEn,
    sourceKey: input.sourceKey,
  });
  if (inserted && input.pushEventType) {
    await sendPush({
      role: input.recipientRole,
      recipientId: input.recipientId,
      requestId: input.booking.bookingRequestId,
      eventType: input.pushEventType,
      locale: normalizeLocale(input.booking.locale),
    });
  }
  return inserted;
}

/** Client booked and the lawyer has been assigned. Notifies both parties. */
export async function notifyAppointmentBooked(bookingRequestId: string): Promise<void> {
  const booking = await loadBookingContext(bookingRequestId);
  if (!booking) return;
  const when = `${booking.appointmentDate} ${booking.appointmentTime}`;
  const deepLink = `lawyersbh://appointments/${booking.bookingRequestId}`;

  if (booking.clientAccountId) {
    await emit({
      booking,
      recipientRole: "client",
      recipientId: booking.clientAccountId,
      kind: "booking_created",
      sourceKey: `appointment:${bookingRequestId}:client:booking_created`,
      deepLink,
      titleAr: "تم إنشاء الحجز",
      titleEn: "Booking created",
      bodyAr: `تم إنشاء موعدك مع ${booking.lawyerName ?? "المحامي"} في ${when}.`,
      bodyEn: `Your appointment with ${booking.lawyerName ?? "your lawyer"} is created for ${when}.`,
      pushEventType: "payment_confirmed",
    });
  }

  if (booking.lawyerId) {
    await emit({
      booking,
      recipientRole: "lawyer",
      recipientId: booking.lawyerId,
      kind: "booking_created",
      sourceKey: `appointment:${bookingRequestId}:lawyer:booking_created`,
      deepLink,
      titleAr: "حجز موعد جديد",
      titleEn: "New appointment booking",
      bodyAr: `حجز ${booking.clientName ?? "عميل"} موعدًا في ${when}.`,
      bodyEn: `${booking.clientName ?? "A client"} booked an appointment for ${when}.`,
      pushEventType: "lawyer_assigned",
    });
  }
}

/** Payment captured; confirms the booking for both parties. */
export async function notifyAppointmentPaid(bookingRequestId: string): Promise<void> {
  const booking = await loadBookingContext(bookingRequestId);
  if (!booking) return;
  const when = `${booking.appointmentDate} ${booking.appointmentTime}`;
  const deepLink = `lawyersbh://appointments/${booking.bookingRequestId}`;

  if (booking.clientAccountId) {
    await emit({
      booking,
      recipientRole: "client",
      recipientId: booking.clientAccountId,
      kind: "payment_confirmed",
      sourceKey: `appointment:${bookingRequestId}:client:payment_confirmed`,
      deepLink,
      titleAr: "تم تأكيد الدفع",
      titleEn: "Payment confirmed",
      bodyAr: `تم تأكيد دفعتك. موعدك مع ${booking.lawyerName ?? "المحامي"} في ${when}.`,
      bodyEn: `Your payment is confirmed. Your appointment with ${booking.lawyerName ?? "your lawyer"} is on ${when}.`,
      pushEventType: "payment_confirmed",
    });
  }

  if (booking.lawyerId) {
    await emit({
      booking,
      recipientRole: "lawyer",
      recipientId: booking.lawyerId,
      kind: "booking_confirmed",
      sourceKey: `appointment:${bookingRequestId}:lawyer:booking_confirmed`,
      deepLink,
      titleAr: "تم تأكيد حجز جديد",
      titleEn: "New booking confirmed",
      bodyAr: `تم تأكيد حجز ${booking.clientName ?? "عميل"} في ${when}.`,
      bodyEn: `${booking.clientName ?? "A client"}'s booking is confirmed for ${when}.`,
      pushEventType: "lawyer_assigned",
    });
  }
}

/** The lawyer accepted / is confirmed for the appointment. */
export async function notifyAppointmentAccepted(bookingRequestId: string): Promise<void> {
  const booking = await loadBookingContext(bookingRequestId);
  if (!booking || !booking.clientAccountId) return;
  const when = `${booking.appointmentDate} ${booking.appointmentTime}`;
  await emit({
    booking,
    recipientRole: "client",
    recipientId: booking.clientAccountId,
    kind: "lawyer_accepted",
    sourceKey: `appointment:${bookingRequestId}:client:lawyer_accepted`,
    deepLink: `lawyersbh://appointments/${booking.bookingRequestId}`,
    titleAr: "قبل المحامي الموعد",
    titleEn: "Lawyer accepted your appointment",
    bodyAr: `قبل ${booking.lawyerName ?? "المحامي"} موعدك في ${when}.`,
    bodyEn: `${booking.lawyerName ?? "Your lawyer"} accepted your appointment on ${when}.`,
    pushEventType: "lawyer_accepted",
  });
}

/** The appointment was cancelled; notifies the other party. */
export async function notifyAppointmentCancelled(
  bookingRequestId: string,
  byRole: "client" | "lawyer",
): Promise<void> {
  const booking = await loadBookingContext(bookingRequestId);
  if (!booking) return;
  const when = `${booking.appointmentDate} ${booking.appointmentTime}`;
  const deepLink = `lawyersbh://appointments/${booking.bookingRequestId}`;

  if (byRole !== "client" && booking.clientAccountId) {
    await emit({
      booking,
      recipientRole: "client",
      recipientId: booking.clientAccountId,
      kind: "appointment_cancelled",
      sourceKey: `appointment:${bookingRequestId}:client:cancelled`,
      deepLink,
      titleAr: "تم إلغاء الموعد",
      titleEn: "Appointment cancelled",
      bodyAr: `تم إلغاء موعدك في ${when}.`,
      bodyEn: `Your appointment on ${when} was cancelled.`,
      pushEventType: "request_cancelled",
    });
  }
  if (byRole !== "lawyer" && booking.lawyerId) {
    await emit({
      booking,
      recipientRole: "lawyer",
      recipientId: booking.lawyerId,
      kind: "appointment_cancelled",
      sourceKey: `appointment:${bookingRequestId}:lawyer:cancelled`,
      deepLink,
      titleAr: "تم إلغاء الموعد",
      titleEn: "Appointment cancelled",
      bodyAr: `تم إلغاء الموعد في ${when}.`,
      bodyEn: `The appointment on ${when} was cancelled.`,
      pushEventType: "request_cancelled",
    });
  }
}

/** A new chat message arrived; notifies the peer. */
export async function notifyAppointmentMessage(input: {
  bookingRequestId: string;
  senderRole: "client" | "lawyer";
  messageId: string;
}): Promise<void> {
  const booking = await loadBookingContext(input.bookingRequestId);
  if (!booking) return;
  const recipientRole = input.senderRole === "client" ? "lawyer" : "client";
  const recipientId = recipientRole === "lawyer" ? booking.lawyerId : booking.clientAccountId;
  if (!recipientId) return;
  const senderName = input.senderRole === "lawyer" ? booking.lawyerName : booking.clientName;
  const deepLink = `lawyersbh://appointments/${booking.bookingRequestId}/chat`;

  await emit({
    booking,
    recipientRole,
    recipientId,
    kind: "new_message",
    sourceKey: `appointment:${input.messageId}:${recipientRole}:new_message`,
    deepLink,
    titleAr: "رسالة جديدة",
    titleEn: "New message",
    bodyAr: `لديك رسالة جديدة من ${senderName ?? "الطرف الآخر"}.`,
    bodyEn: `You have a new message from ${senderName ?? "the other party"}.`,
    pushEventType: "new_message",
  });
}

/** A reminder for an upcoming appointment. */
export async function notifyAppointmentReminder(input: {
  bookingRequestId: string;
  reminderKind: "reminder_24h" | "reminder_1h" | "reminder_15m" | "starting";
}): Promise<void> {
  const booking = await loadBookingContext(input.bookingRequestId);
  if (!booking) return;
  const when = `${booking.appointmentDate} ${booking.appointmentTime}`;
  const deepLink = `lawyersbh://appointments/${booking.bookingRequestId}`;

  const copy: Record<typeof input.reminderKind, { ar: string; en: string; titleAr: string; titleEn: string }> = {
    reminder_24h: {
      titleAr: "تذكير بالموعد",
      titleEn: "Appointment reminder",
      ar: `لديك موعد غدًا في ${booking.appointmentTime}.`,
      en: `You have an appointment tomorrow at ${booking.appointmentTime}.`,
    },
    reminder_1h: {
      titleAr: "موعدك بعد ساعة",
      titleEn: "Appointment in 1 hour",
      ar: `يبدأ موعدك خلال ساعة (${booking.appointmentTime}).`,
      en: `Your appointment starts in 1 hour (${booking.appointmentTime}).`,
    },
    reminder_15m: {
      titleAr: "موعدك بعد 15 دقيقة",
      titleEn: "Appointment in 15 minutes",
      ar: `يبدأ موعدك خلال 15 دقيقة.`,
      en: `Your appointment starts in 15 minutes.`,
    },
    starting: {
      titleAr: "يبدأ موعدك الآن",
      titleEn: "Your appointment is starting",
      ar: `حان وقت موعدك. يمكنك الانضمام الآن.`,
      en: `Your appointment is starting. You can join now.`,
    },
  };
  const text = copy[input.reminderKind];

  const recipients: Array<{ role: "client" | "lawyer"; id: string }> = [];
  if (booking.clientAccountId) recipients.push({ role: "client", id: booking.clientAccountId });
  if (booking.lawyerId) recipients.push({ role: "lawyer", id: booking.lawyerId });

  for (const recipient of recipients) {
    await emit({
      booking,
      recipientRole: recipient.role,
      recipientId: recipient.id,
      kind: input.reminderKind === "starting" ? "appointment_starting" : "appointment_reminder",
      sourceKey: `appointment:${input.bookingRequestId}:${recipient.role}:${input.reminderKind}`,
      deepLink,
      titleAr: text.titleAr,
      titleEn: text.titleEn,
      bodyAr: text.ar,
      bodyEn: text.en,
      pushEventType: input.reminderKind === "starting" ? "lawyer_found" : "lawyer_offer",
    });
  }
}

/** The appointment was completed. */
export async function notifyAppointmentCompleted(bookingRequestId: string): Promise<void> {
  const booking = await loadBookingContext(bookingRequestId);
  if (!booking) return;
  const when = `${booking.appointmentDate} ${booking.appointmentTime}`;
  const deepLink = `lawyersbh://appointments/${booking.bookingRequestId}`;
  const recipients: Array<{ role: "client" | "lawyer"; id: string }> = [];
  if (booking.clientAccountId) recipients.push({ role: "client", id: booking.clientAccountId });
  if (booking.lawyerId) recipients.push({ role: "lawyer", id: booking.lawyerId });

  for (const recipient of recipients) {
    await emit({
      booking,
      recipientRole: recipient.role,
      recipientId: recipient.id,
      kind: "appointment_completed",
      sourceKey: `appointment:${bookingRequestId}:${recipient.role}:completed`,
      deepLink,
      titleAr: "اكتمل الموعد",
      titleEn: "Appointment completed",
      bodyAr: `اكتمل موعدك في ${when}.`,
      bodyEn: `Your appointment on ${when} is completed.`,
      pushEventType: "lawyer_arrived",
    });
  }
}
