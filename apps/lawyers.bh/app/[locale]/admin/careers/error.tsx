"use client";
import { useLocale } from "next-intl";
import { buttonClass } from "@/lib/careers/ui";
export default function CareersAdminError({ reset }: { reset: () => void }) {
  const ar = useLocale() === "ar";
  return <main className="px-5 py-16 text-center text-[#082B67]"><h1 className="text-2xl font-black">{ar ? "تعذر تحميل إدارة التوظيف" : "Recruitment management is unavailable"}</h1><p className="my-5">{ar ? "أعد المحاولة بعد قليل." : "Please try again shortly."}</p><button className={buttonClass} onClick={reset}>{ar ? "إعادة المحاولة" : "Retry"}</button></main>;
}
