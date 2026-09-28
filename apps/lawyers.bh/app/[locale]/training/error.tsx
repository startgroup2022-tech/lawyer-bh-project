"use client";
import { useLocale } from "next-intl";
import { buttonClass } from "@/lib/training/ui";
export default function TrainingErrorPage({ reset }: { reset: () => void }) {
  const ar = useLocale() === "ar";
  return <div className="px-5 py-20 text-center text-[#082B67]"><h1 className="mb-5 text-2xl font-black">{ar ? "تعذر تحميل صفحة التدريب" : "Training is temporarily unavailable"}</h1><button className={buttonClass} onClick={reset}>{ar ? "إعادة المحاولة" : "Retry"}</button></div>;
}
