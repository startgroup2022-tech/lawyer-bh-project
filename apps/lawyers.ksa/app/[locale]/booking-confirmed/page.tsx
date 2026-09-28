import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { retrieveCharge } from "@/lib/tap";
import { db, schema } from "@/lib/db/client";
import { processBooking } from "@/lib/bookingConfirmation";
import Content from "./Content";

const PATH = "/booking-confirmed";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tap_id?: string; status?: string }>;
};

type RetrievedTapCharge = Awaited<ReturnType<typeof retrieveCharge>>;

type BookingConsultMethod =
  | "online"
  | "phone"
  | "whatsapp"
  | "office"
  | "video"
  | "service_request";

type ReceiptData = {
  id: string;
  tapChargeId: string;
  tapStatus: string;
  paymentStatus: string;
  service: string;
  consultationType: string;
  consultationPrice: string;
  amountBd: string;
  appointmentDate: string;
  appointmentTime: string;
  assignedToName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  issuedAt: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";

  return {
    title: {
      absolute: isAr
        ? "تأكيد الحجز | محامون البحرين"
        : "Booking Confirmation | Lawyers.bh",
    },
    description: isAr
      ? "صفحة تأكيد الحجز والدفع في منصة محامون البحرين."
      : "Booking and payment confirmation page for Lawyers.bh.",
    alternates: {
      canonical: `/${locale}${PATH}`,
      languages: {
        en: `/en${PATH}`,
        ar: `/ar${PATH}`,
        "x-default": `/en${PATH}`,
      },
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

function mapTapStatusToPaymentStatus(status: string | null) {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "CAPTURED") {
    return "paid";
  }

  if (
    normalized === "FAILED" ||
    normalized === "DECLINED" ||
    normalized === "CANCELLED" ||
    normalized === "CANCELED" ||
    normalized === "VOID" ||
    normalized === "ABANDONED"
  ) {
    return "failed";
  }

  return "pending_payment";
}

function normalizeConsultMethod(value: unknown): BookingConsultMethod {
  const method = String(value ?? "").trim().toLowerCase();

  if (
    method === "online" ||
    method === "phone" ||
    method === "whatsapp" ||
    method === "office" ||
    method === "video" ||
    method === "service_request"
  ) {
    return method;
  }

  return "online";
}

function normalizeVideoProvider(value: unknown) {
  const provider = String(value ?? "").trim().toLowerCase();

  if (provider === "google-meet" || provider === "whatsapp") {
    return provider;
  }

  return null;
}

async function updateBookingFromCharge(
  charge: RetrievedTapCharge,
): Promise<ReceiptData | null> {
  const tapChargeId = String(charge.id ?? "").trim();
  const tapStatus = String(charge.status ?? "").trim().toUpperCase();

  if (!tapChargeId) return null;

  const paymentStatus = mapTapStatusToPaymentStatus(tapStatus);

  const [booking] = await db
    .select({
      id: schema.bookingRequests.id,

      lang: schema.bookingRequests.lang,

      service: schema.bookingRequests.service,
      consultationType: schema.bookingRequests.consultationType,
      consultationPrice: schema.bookingRequests.consultationPrice,
      consultationMethod: schema.bookingRequests.consultationMethod,
      durationMinutes: schema.bookingRequests.durationMinutes,
      videoProvider: schema.bookingRequests.videoProvider,
      amountBd: schema.bookingRequests.amountBd,

      appointmentDate: schema.bookingRequests.appointmentDate,
      appointmentTime: schema.bookingRequests.appointmentTime,

      assignmentMode: schema.bookingRequests.assignmentMode,
      selectedOfficeName: schema.bookingRequests.selectedOfficeName,
      selectedLawyerName: schema.bookingRequests.selectedLawyerName,
      assignedToEmail: schema.bookingRequests.assignedToEmail,

      customerName: schema.bookingRequests.customerName,
      customerPhone: schema.bookingRequests.customerPhone,
      customerEmail: schema.bookingRequests.customerEmail,
      customerMessage: schema.bookingRequests.customerMessage,

      currentPaymentStatus: schema.bookingRequests.paymentStatus,
    })
    .from(schema.bookingRequests)
    .where(eq(schema.bookingRequests.tapChargeId, tapChargeId))
    .limit(1);

  await db
    .update(schema.bookingRequests)
    .set({
      paymentStatus,
      tapStatus,
      tapPayload: charge,
      updatedAt: new Date(),
    })
    .where(eq(schema.bookingRequests.tapChargeId, tapChargeId));

  if (booking && paymentStatus === "paid" && booking.currentPaymentStatus !== "paid") {
    try {
      await processBooking({
        lang: booking.lang === "ar" ? "ar" : "en",
        bookingId: booking.id,

        service: booking.service,
        consultationType: booking.consultationType,
        consultationPrice: booking.consultationPrice,

        consultationMethod: normalizeConsultMethod(
          booking.consultationMethod,
        ),

        durationMinutes: Number(booking.durationMinutes) || 15,

        videoProvider: normalizeVideoProvider(booking.videoProvider),

        date: booking.appointmentDate,
        time: booking.appointmentTime,

        name: booking.customerName,
        phone: booking.customerPhone,
        email: booking.customerEmail,
        message: booking.customerMessage || "",

        adminEmail: booking.assignedToEmail ?? undefined,
      });
    } catch (err) {
      console.error("[booking-confirmed] processBooking failed", err);
    }
  }

  if (!booking) return null;

  const assignedToName =
    booking.assignmentMode === "lawyer"
      ? booking.selectedLawyerName || "Lawyers.bh"
      : booking.selectedOfficeName || "Lawyers.bh";

  return {
    id: booking.id,
    tapChargeId,
    tapStatus,
    paymentStatus,
    service: booking.service,
    consultationType: booking.consultationType,
    consultationPrice: booking.consultationPrice,
    amountBd: String(booking.amountBd ?? ""),
    appointmentDate: booking.appointmentDate,
    appointmentTime: booking.appointmentTime,
    assignedToName,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    customerEmail: booking.customerEmail,
    issuedAt: new Date().toISOString(),
  };
}


async function getBookingReceiptByTapChargeId(
  tapChargeId: string,
  fallbackTapStatus: string | null,
): Promise<ReceiptData | null> {
  if (!tapChargeId) return null;

  const [booking] = await db
    .select({
      id: schema.bookingRequests.id,

      service: schema.bookingRequests.service,
      consultationType: schema.bookingRequests.consultationType,
      consultationPrice: schema.bookingRequests.consultationPrice,
      amountBd: schema.bookingRequests.amountBd,

      appointmentDate: schema.bookingRequests.appointmentDate,
      appointmentTime: schema.bookingRequests.appointmentTime,

      assignmentMode: schema.bookingRequests.assignmentMode,
      selectedOfficeName: schema.bookingRequests.selectedOfficeName,
      selectedLawyerName: schema.bookingRequests.selectedLawyerName,

      customerName: schema.bookingRequests.customerName,
      customerPhone: schema.bookingRequests.customerPhone,
      customerEmail: schema.bookingRequests.customerEmail,

      tapStatus: schema.bookingRequests.tapStatus,
      paymentStatus: schema.bookingRequests.paymentStatus,
    })
    .from(schema.bookingRequests)
    .where(eq(schema.bookingRequests.tapChargeId, tapChargeId))
    .limit(1);

  if (!booking) return null;

  const assignedToName =
    booking.assignmentMode === "lawyer"
      ? booking.selectedLawyerName || "Lawyers.bh"
      : booking.selectedOfficeName || "Lawyers.bh";

  return {
    id: booking.id,
    tapChargeId,
    tapStatus: fallbackTapStatus || booking.tapStatus || "VERIFY_FAILED",
    paymentStatus: booking.paymentStatus || "pending_payment",
    service: booking.service,
    consultationType: booking.consultationType,
    consultationPrice: booking.consultationPrice,
    amountBd: String(booking.amountBd ?? ""),
    appointmentDate: booking.appointmentDate,
    appointmentTime: booking.appointmentTime,
    assignedToName,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    customerEmail: booking.customerEmail,
    issuedAt: new Date().toISOString(),
  };
}

async function markBookingVerifyFailed(tapChargeId: string) {
  if (!tapChargeId) return;

  await db
    .update(schema.bookingRequests)
    .set({
      tapStatus: "VERIFY_FAILED",
      updatedAt: new Date(),
    })
    .where(eq(schema.bookingRequests.tapChargeId, tapChargeId));
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  setRequestLocale(locale);

  let status = sp.status ?? null;
  let receipt: ReceiptData | null = null;

  if (sp.tap_id) {
    try {
      const charge = await retrieveCharge(sp.tap_id);

      status = charge.status ?? status;

      receipt = await updateBookingFromCharge(charge);
    } catch (err) {
      console.error("[booking-confirmed] retrieveCharge failed", err);

      status = status ?? "VERIFY_FAILED";

      await markBookingVerifyFailed(sp.tap_id);
      receipt = await getBookingReceiptByTapChargeId(sp.tap_id, status);
    }
  }

  return (
    <Content
      tapId={sp.tap_id ?? null}
      status={status}
      receipt={receipt}
    />
  );
}
