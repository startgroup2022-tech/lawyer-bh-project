"use client";

import { motion } from "framer-motion";
import { bookingServiceCopy, LAWYER_AUTHORIZATION_SERVICE_KEY } from "./constants";

type Props = {
  isAr: boolean;
  service: string;
  serviceKey?: string | null;
  cardKey?: string | null;
  isLawyerAuthorizationBooking?: boolean;
};

function normalizeBookingServiceKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

export default function BookingHeader({
  isAr,
  service,
  serviceKey,
  cardKey,
  isLawyerAuthorizationBooking = false,
}: Props) {
  const langKey = isAr ? "ar" : "en";
  const normalizedServiceParamKey = normalizeBookingServiceKey(
    isLawyerAuthorizationBooking ? LAWYER_AUTHORIZATION_SERVICE_KEY : serviceKey,
  );
  const normalizedCardKey = normalizeBookingServiceKey(cardKey);
  const normalizedServiceKey = normalizeBookingServiceKey(service);
  const serviceCopy =
    bookingServiceCopy[normalizedServiceParamKey] ??
    bookingServiceCopy[normalizedCardKey] ??
    bookingServiceCopy[normalizedServiceKey] ??
    null;

  const title =
    serviceCopy?.title[langKey] ||
    service ||
    (isAr ? "احجز موعداً" : "Book an Appointment");

  const description =
    serviceCopy?.desc[langKey] ||
    (isAr
      ? "اختر الخدمة والوقت المناسب واحجز موعدك مع متخصص قانوني."
      : "Pick the consultation method, a convenient time, and confirm your booking with a registered legal specialist.");

  return (
    <div className="relative overflow-hidden text-white bg-gradient-to-br from-primary-dark via-primary to-primary-dark">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.45) 0, transparent 35%), radial-gradient(circle at 90% 100%, rgba(255,255,255,0.25) 0, transparent 45%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-12 pb-10 lg:pt-16 lg:pb-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/75 mb-2">
            {isAr ? "طلب خدمة" : "Request Service"}
          </p>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-2 break-words">
            {title}
          </h1>

          <p className="max-w-3xl text-sm sm:text-base text-white/80 leading-relaxed">
            {description}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
