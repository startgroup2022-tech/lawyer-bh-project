"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { governmentPartners } from "@/lib/practiceAreas";
import PartnerLogo from "@/components/PartnerLogo";
import Image from "next/image";

export default function ClearanceServices() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const t = useTranslations("clearance");
  const tNav = useTranslations("nav");
  const Arrow = isAr ? ArrowLeft : ArrowRight;
const [emblaRef, emblaApi] = useEmblaCarousel(
  {
    loop: true,
    align: "start",
    dragFree: true,
    direction: "ltr",
  },
  [
    AutoScroll({
      playOnInit: true,
      speed: 1.1,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  ],
);

const scrollPrev = useCallback(() => {
  emblaApi?.scrollPrev();
}, [emblaApi]);

const scrollNext = useCallback(() => {
  emblaApi?.scrollNext();
}, [emblaApi]);
  return (
<section className="hide-in-app relative overflow-hidden bg-white py-20 lg:py-28">
  {/* Bahrain logo background */}
  <div
    aria-hidden
    className={`pointer-events-none absolute top-[46%] z-0 -translate-y-1/2 opacity-[0.085] ${
      isAr ? "-left-1" : "-right-1"
    }`}
  >
    <Image
      src="/images/logo-BH.png"
      alt=""
      width={720}
      height={720}
      className="h-auto w-[420px] object-contain sm:w-[560px] lg:w-[520px]"
    />
  </div>

  {/* Soft overlay */}
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 z-0"
    style={{
      background:
        "radial-gradient(circle at 18% 15%, rgba(122,22,22,0.04), transparent 34%), radial-gradient(circle at 85% 70%, rgba(44,62,90,0.05), transparent 38%)",
    }}
  />

  <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-6">

        <motion.div

        className="mx-auto mb-10 max-w-2xl text-center"
        
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
                    <div className="mb-4 inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-4 py-2">
            <span
  className={`text-xs font-extrabold text-primary ${
    isAr ? "tracking-normal" : "uppercase tracking-[0.22em]"
  }`}
>
 {t("label")}
 </span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-primary leading-tight">         {t("title")}
          </h2>
          <p className="mt-3 text-text-muted leading-relaxed">{t("description")}</p>
        </motion.div>

{/* Professional Logo Carousel */}
<div className="relative mb-12 w-full">
  {/* Prev / Next buttons */}
<button
  type="button"
  onClick={isAr ? scrollNext : scrollPrev}
  aria-label={isAr ? "السابق" : "Previous"}
  className="absolute -start-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-[#07111F] shadow-lg shadow-black/5 backdrop-blur transition-all hover:bg-primary hover:text-white sm:-start-5"
>
  {isAr ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
</button>

<button
  type="button"
  onClick={isAr ? scrollPrev : scrollNext}
  aria-label={isAr ? "التالي" : "Next"}
  className="absolute -end-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-[#07111F] shadow-lg shadow-black/5 backdrop-blur transition-all hover:bg-primary hover:text-white sm:-end-5"
>
  {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
</button>

  <div
    ref={emblaRef}
    dir="ltr"
    className="overflow-hidden"
    style={{
      maskImage:
        "linear-gradient(to right, transparent 0%, white 10%, white 90%, transparent 100%)",
      WebkitMaskImage:
        "linear-gradient(to right, transparent 0%, white 10%, white 90%, transparent 100%)",
    }}
  >
   <div className="flex touch-pan-y items-stretch gap-5 py-5">
      {governmentPartners.map((p, i) => (
<div
  key={`logo-${p.key}-${i}`}
  className="min-w-0 flex-[0_0_185px] sm:flex-[0_0_210px]"
>
  <a
    href={p.url ?? "#"}
    target={p.url ? "_blank" : undefined}
    rel={p.url ? "noopener noreferrer" : undefined}
    aria-label={isAr ? p.ar : p.en}
    className={`group relative flex h-full min-h-[190px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-[#2c3e5a]/10 bg-white/90 px-5 py-6 text-center shadow-[0_14px_40px_rgba(7,17,31,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:bg-white hover:shadow-[0_24px_70px_rgba(7,17,31,0.12)] ${
      p.url ? "cursor-pointer" : "cursor-default"
    }`}
  >
    <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

    <div className="pointer-events-none absolute -bottom-10 -end-10 h-28 w-28 rounded-full bg-[#2c3e5a]/[0.035] transition-all duration-500 group-hover:scale-125 group-hover:bg-primary/[0.045]" />

    <div className="relative z-10 mb-4 flex h-[104px] w-[156px] items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 shadow-inner">
      <PartnerLogo partner={p} size="fixed" bare />
    </div>

    <h3 className="relative z-10 line-clamp-2 min-h-[42px] px-1 text-[13px] font-extrabold leading-6 text-[#07111F] transition-colors group-hover:text-primary sm:text-sm">
      {isAr ? p.ar : p.en}
    </h3>

    {p.acronym && (
      <span className="relative z-10 mt-2 rounded-full border border-[#2c3e5a]/10 bg-[#2c3e5a]/[0.035] px-3 py-1 text-[10px] font-extrabold tracking-[0.12em] text-[#2c3e5a]/70">
        {p.acronym}
      </span>
    )}
  </a>
</div>
      ))}
    </div>
  </div>
</div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/book-appointment?service=business"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors"
          >
            {tNav("requestService")}
            <Arrow size={15} className="group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
