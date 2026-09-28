// components/MaintenancePopup.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useLocale } from "next-intl";


function getBahrainDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bahrain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
}

function isMaintenanceTime() {
  const now = getBahrainDate();

  const day = now.getDay();
  const hour = now.getHours();

  // JavaScript days:
  // Sunday = 0
  // Monday = 1
  // Tuesday = 2
  // Wednesday = 3
  // Thursday = 4
  // Friday = 5
  // Saturday = 6

  const isThursdayAfter7PM = day === 4 && hour >= 19;
  const isFriday = day === 5;
  const isSaturday = day === 6;
  const isSundayBefore7PM = day === 0 && hour < 19;

  return isThursdayAfter7PM || isFriday || isSaturday || isSundayBefore7PM;
}

export default function MaintenancePopup() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setMounted(true);

  if (isMaintenanceTime()) {
    setOpen(true);
  }
}, []);

const closePopup = () => {
  setOpen(false);
};

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#07111F]/70 px-5 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir={isAr ? "rtl" : "ltr"}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/15 bg-white p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,0.25)]"
          >
            <button
              type="button"
              onClick={closePopup}
              className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-primary hover:text-white"
              aria-label={isAr ? "إغلاق" : "Close"}
            >
              <X size={18} />
            </button>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h2 className="mb-3 text-2xl font-black text-[#07111F]">
              {isAr ? "الموقع تحت الصيانة" : "Website Under Maintenance"}
            </h2>

            <p className="mx-auto max-w-sm text-sm leading-7 text-slate-500">
              {isAr ? (
                <>
                  تبدأ أعمال الصيانة{" "}
                  <strong className="font-extrabold text-[#07111F]">
                    يوم الخميس الساعة 7:00 مساءً
                  </strong>{" "}
                  وتستمر حتى{" "}
                  <strong className="font-extrabold text-[#07111F]">
                    يوم الأحد الساعة 7:00 مساءً
                  </strong>{" "}
                  بتوقيت مملكة البحرين. نعتذر عن الإزعاج، وسنعود قريباً.
                </>
              ) : (
                <>
                  Maintenance will begin on{" "}
                  <strong className="font-extrabold text-[#07111F]">
                    Thursday at 7:00 PM
                  </strong>{" "}
                  and continue until{" "}
                  <strong className="font-extrabold text-[#07111F]">
                    Sunday at 7:00 PM
                  </strong>
                  , Bahrain time. We apologize for the inconvenience and will be
                  back soon.
                </>
              )}
            </p>

            <button
              type="button"
              onClick={closePopup}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-white transition hover:bg-primary-dark"
            >
              {isAr ? "حسناً" : "Got it"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
