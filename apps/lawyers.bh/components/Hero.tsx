"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Building2,
  Handshake,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Video,
  X,
  Sparkles,
  Siren,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const slideKeys = ["slide1", "slide3", "slide4"] as const;

const slideIcons = [Scale, Building2, Handshake];

const slideImages = [
  "/images/banner-img-1.jpg",
  "/images/banner-img-2.jpg",
  "/images/banner-img-3.jpg",
];

export default function Hero() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const tHero = useTranslations("hero");
const tsos = useTranslations("sos");
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    direction: isAr ? "rtl" : "ltr",
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [bannerOpen, setBannerOpen] = useState(true);
const [bannerTop, setBannerTop] = useState(0);
const [bannerScrolled, setBannerScrolled] = useState(false);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
useEffect(() => {
  const onScroll = () => {
    setBannerScrolled(window.scrollY > 40);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  return () => window.removeEventListener("scroll", onScroll);
}, []);
useEffect(() => {
  const updateBannerTop = () => {
    const header = document.getElementById("main-header");
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0;

    setBannerTop(Math.max(0, headerBottom));
  };

  updateBannerTop();

  window.addEventListener("scroll", updateBannerTop, { passive: true });
  window.addEventListener("resize", updateBannerTop);

  return () => {
    window.removeEventListener("scroll", updateBannerTop);
    window.removeEventListener("resize", updateBannerTop);
  };
}, []);
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const id = setInterval(() => {
      emblaApi.scrollNext();
    }, 7000);

    return () => clearInterval(id);
  }, [emblaApi]);

  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <section
      id="home"
      className="relative h-[82vh] sm:h-[88vh] min-h-[540px] max-h-[900px] overflow-hidden bg-[#07111F]"
    >

{/* Decorative background glow - يظهر فقط على الشاشات الكبيرة */}
<div className="pointer-events-none absolute -top-24 -start-24 z-[1] hidden h-72 w-72 rounded-full bg-primary/25 blur-[90px] lg:block" />
<div className="pointer-events-none absolute bottom-0 end-0 z-[1] hidden h-96 w-96 rounded-full bg-[#2c3e5a]/40 blur-[120px] lg:block" />


      <div className="embla h-full" ref={emblaRef}>
        <div className="embla__container h-full">
          {slideKeys.map((key, index) => {
            const Icon = slideIcons[index];

            return (
              <div key={key} className="embla__slide h-full w-full overflow-hidden">
  <div className="relative h-full w-full overflow-hidden bg-[#07111F]">
    <Image
      src={slideImages[index]}
      alt=""
      fill
      className="object-cover"
      priority={index === 0}
      sizes="100vw"
    />

                  {/* Modern overlays */}
                  

                  <div
                    className={`relative z-10 mx-auto flex h-full w-full max-w-7xl items-center px-5 sm:px-6 ${
                      bannerOpen ? "pt-20 sm:pt-16" : "pt-6"
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {activeIndex === index && (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -14 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                          className="w-full max-w-[790px]"
                        >
                          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/30 backdrop-blur-[2.5px] sm:p-8 lg:p-10">
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.12, duration: 0.35 }}
                              className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-bold text-white/75 sm:mb-6 sm:text-sm"
                            >
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                                <Icon className="h-4 w-4" />
                              </span>
                              {tHero(`${key}.badge`)}
                            </motion.div>
<motion.h3
  initial={{ opacity: 0, y: 18 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.22, duration: 0.5 }}
  className="mb-4 max-w-none text-balance text-[clamp(1.55rem,4vw,3rem)] font-medium leading-[1.35] tracking-normal text-white"
>
  {tHero(`${key}.title`)}
</motion.h3>

                            <motion.p
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.36, duration: 0.45 }}
                              className="mb-7 max-w-2xl text-sm leading-8 text-white/65 sm:text-lg"
                            >
                              {tHero(`${key}.subtitle`)}
                            </motion.p>

                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.48, duration: 0.4 }}
                              className="flex flex-wrap items-center gap-3"
                            >
                              <motion.a
                                href={
  index === 0
    ? `/${locale}/book-appointment?service=legal`
    : index === 1
      ? `/${locale}/book-appointment?service=business`
      : index === 2
        ? `/${locale}/book-appointment?service=comprehensive`
        : "#services"
}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="group inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-dark sm:px-7 sm:py-3.5"
                              >
                                {tHero(`${key}.cta`)}
                                <Arrow
                                  size={17}
                                  className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                                />
                              </motion.a>

                             
                               
                            </motion.div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrows */}
<button
  type="button"
  onClick={scrollPrev}
  aria-label={isAr ? "الشريحة السابقة" : "Previous slide"}
  className="absolute start-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-white backdrop-blur-md transition-all hover:-translate-y-[52%] hover:bg-white/[0.16] sm:flex lg:start-8"
>
  {isAr ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
</button>

<button
  type="button"
  onClick={scrollNext}
  aria-label={isAr ? "الشريحة التالية" : "Next slide"}
  className="absolute end-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-white backdrop-blur-md transition-all hover:-translate-y-[52%] hover:bg-white/[0.16] sm:flex lg:end-8"
>
  {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
</button>

      {/* Dots */}
      <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-md">
        {slideKeys.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === activeIndex
                ? "w-8 bg-primary shadow-[0_0_18px_rgba(0,0,0,0.2)]"
                : "w-2 bg-white/35 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* Video banner */}
      <AnimatePresence>
        {bannerOpen && (
          <motion.div
  initial={{ y: -70, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -70, opacity: 0 }}
  transition={{ duration: 0.32, ease: "easeOut" }}
  style={{ top: bannerTop }}
  className={`fixed left-0 right-0 z-[49] border-b border-white/0 duration-300 ${
    bannerScrolled
      ? "bg-[#2c3e5a]/85 shadow-lg shadow-black/10"
      : "bg-[#07111F]/10"
  }`}
>
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
              <div className="hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 sm:flex">
                <Siren className="animate-pulse h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="hidden h-2 w-2 rounded-full bg-primary sm:block" />
                  <h3 className="truncate text-xs font-extrabold text-white sm:text-sm">
                    {tsos("heroTitle")}
                  </h3>
                </div>

                <p className="hidden truncate text-xs text-white/80 sm:block">
                  {tsos("heroSubtitle")}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
               <Link
  href="/sos"
  className="quick-action-red-pulse rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-[11px] font-extrabold text-white transition-colors hover:border-primary hover:bg-primary sm:px-4 sm:text-sm"
>
  {isAr ? "إجراء سريع" : "Quick Action"}
</Link>

                <button
                  type="button"
                  onClick={() => setBannerOpen(false)}
                  aria-label="Close banner"
                  className="rounded-xl p-2 text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}