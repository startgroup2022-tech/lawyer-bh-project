"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Props = {
  isAr: boolean;
  service: string;
  bookingId: string | null;
  currentMethodLabel: string;
  currentDuration: { minutes: number; price: number };
  currentPriceLabel: string;
  selectedDate: string | null;
  selectedTime: string | null;
  isVideo: boolean;
  videoProvider: string;
  videoProviders: { value: string; label: { en: string; ar: string } }[];
};

export default function SubmittedSuccess({
  isAr,
  service,
  bookingId,
  currentMethodLabel,
  currentDuration,
  currentPriceLabel,
  selectedDate,
  selectedTime,
  isVideo,
  videoProvider,
  videoProviders,
}: Props) {
  return (
    <div className="py-24 lg:py-32">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto px-6 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>

        <h1 className="text-2xl font-extrabold text-text-primary mb-2">
          {isAr ? "تم تأكيد موعدك!" : "Appointment Confirmed!"}
        </h1>

        <p className="text-text-muted mb-3">
          {isAr ? "تم إرسال تفاصيل الموعد إلى بريدك الإلكتروني" : "Appointment details have been sent to your email"}
        </p>

        <div className="bg-bg-light rounded-xl p-5 text-start mb-6 space-y-2 text-sm">
          {bookingId && (
            <div className="flex justify-between pb-2 mb-1 border-b border-gray-200">
              <span className="text-text-muted">{isAr ? "الرقم المرجعي" : "Reference"}</span>
              <span className="font-bold text-primary tracking-wider">{bookingId}</span>
            </div>
          )}

          <SummaryRow label={isAr ? "الخدمة" : "Service"} value={service} />
          <SummaryRow label={isAr ? "النوع" : "Type"} value={currentMethodLabel} />
          <SummaryRow label={isAr ? "المدة" : "Duration"} value={`${currentDuration.minutes} ${isAr ? "دقيقة" : "min"}`} />

          {isVideo && (
            <SummaryRow
              label={isAr ? "منصة الفيديو" : "Video Platform"}
              value={videoProviders.find((p) => p.value === videoProvider)?.label[isAr ? "ar" : "en"] ?? ""}
            />
          )}

          <SummaryRow label={isAr ? "التاريخ" : "Date"} value={selectedDate ?? ""} />
          <SummaryRow label={isAr ? "الوقت" : "Time"} value={selectedTime ?? ""} />
          <SummaryRow label={isAr ? "السعر" : "Price"} value={currentPriceLabel} strong />
        </div>

        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors">
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {isAr ? "العودة للرئيسية" : "Back to Home"}
        </Link>
      </motion.div>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className={`font-semibold ${strong ? "text-primary font-bold" : "text-text-primary"}`}>{value}</span>
    </div>
  );
}
