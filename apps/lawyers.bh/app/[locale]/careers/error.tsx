"use client";
import { useLocale } from "next-intl";
import { buttonClass } from "@/lib/careers/ui";
export default function CareersErrorPage({ reset }: { reset: () => void }) {
  const ar = useLocale() === "ar";
  return <main dir={ar ? "rtl" : "ltr"} className="bg-[#F3F6FA] px-5 py-20 text-center text-[#082B67]"><h1 className="text-2xl font-black">{ar ? "تعذر تحميل الوظائف الآن" : "Careers are temporarily unavailable"}</h1><p className="my-5">{ar ? "يرجى المحاولة مرة أخرى بعد قليل." : "Please try again in a moment."}</p><button className={buttonClass} onClick={reset}>{ar ? "إعادة المحاولة" : "Retry"}</button></main>;
}
