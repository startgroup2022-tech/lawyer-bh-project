"use client";

import { motion } from "framer-motion";
import {
  ScrollText,
  Video,
  Landmark,
  Handshake,
  Gavel,
  FileSignature,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";


const serviceCards: {
  key: string;
  icon: LucideIcon;
  href?: string;
}[] = [
  { key: "legal", icon: ScrollText },
  { key: "comprehensive", icon: Video },
{ 
  key: "lawyerAuthorization", 
  icon: Landmark, 
  href: "/book-appointment?service=lawyer_authorization" 
},  { key: "business", icon: Handshake },
  { key: "execution", icon: Gavel },
  { key: "notary", icon: FileSignature },
];

export default function Services() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const t = useTranslations("services");

  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
<section
  id="services"
  className="relative overflow-hidden bg-[#2c3e5a]/10 py-20 lg:py-28"
>
  {/* Bahrain map background */}
<div
  aria-hidden
  className={`pointer-events-none absolute top-8 z-0 h-[1020px] w-[1020px] opacity-[0.10] ${
    isAr ? "-left-28" : "-right-28"
  }`}
>
  <Image
    src="/images/bahrain.svg"
    alt=""
    fill
    loading="eager"
    className="object-contain"
    sizes="1020px"
  />
</div>

  {/* Soft overlay */}
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 z-0"
    style={{
      background:
        "radial-gradient(circle at 18% 15%, rgba(122,22,22,0.08), transparent 34%), radial-gradient(circle at 85% 70%, rgba(7,17,31,0.08), transparent 38%)",
    }}
  />

  <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6">
        {/* Header */}
        <motion.div
          className="mx-auto mb-14  text-center "
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
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

          <h2 className="text-3xl font-black leading-tight tracking-[-0.03em] text-[#07111F] sm:text-4xl lg:text-5xl">
  {t("title")}
</h2>

         
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {serviceCards.map(({ key, icon: Icon, href }, i) => (
            <motion.div
              key={key}
              className="h-full [perspective:1200px]"
              initial={{ opacity: 0, y: 26, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-70px" }}
              transition={{
                duration: 0.45,
                delay: i * 0.06,
                ease: "easeOut",
              }}
              whileHover={{
                y: -8,
                rotateX: 4,
                rotateY: isAr ? 4 : -4,
              }}
            >
              <Link
                href={href ?? `/book-appointment?service=${key}`}
                aria-label={t(`${key}.title`)}
                className="group relative flex h-[300px] flex-col overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/75 p-6 text-start shadow-[0_18px_55px_rgba(7,17,31,0.08)] backdrop-blur-2xl transition-all duration-500 hover:border-slate-300 hover:bg-white hover:shadow-[0_30px_90px_rgba(7,17,31,0.14)]"
                style={{
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Big background icon */}
                <Icon
                  aria-hidden
                  className="pointer-events-none absolute -bottom-12 -end-10 h-52 w-52 stroke-[1.05] text-[#07111F]/[0.04] transition-all duration-700 group-hover:-bottom-8 group-hover:-end-7 group-hover:scale-110 group-hover:text-[#07111F]/[0.06]"
                />

                {/* Glass layer */}
                <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/80 via-white/25 to-transparent" />

                {/* Top line shine */}
                <div className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

                {/* Icon box */}
<div
  className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center text-primary transition-all duration-500 group-hover:-translate-y-1 group-hover:text-[#07111F]"
  style={{
    transform: "translateZ(24px)",
  }}
>
  <Icon
    className="h-10 w-10 stroke-[1.6] transition-all duration-500 group-hover:scale-110"
    aria-hidden
  />
</div>

                {/* Text */}
                <div
                  className="relative z-10 flex flex-1 flex-col"
                  style={{
                    transform: "translateZ(18px)",
                  }}
                >
                 <h3
  className={`mb-3 line-clamp-2 min-h-[72px] max-w-[92%] text-2xl font-black leading-[1.45] text-[#07111F] transition-colors duration-300 group-hover:text-primary ${
    isAr ? "tracking-normal pt-1" : "tracking-[-0.025em]"
  }`}
>
  {t(`${key}.title`)}
</h3>

                  <p className="line-clamp-2 max-w-[88%] text-sm leading-7 text-slate-500">
                    {t(`${key}.desc`)}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-4 border-t border-slate-200/70 pt-5">
                    <span className="text-sm font-extrabold text-[#07111F] transition-colors group-hover:text-primary">
                      {t("requestService")}
                    </span>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#07111F] text-white shadow-lg shadow-[#07111F]/15 transition-all duration-500 group-hover:scale-105 group-hover:bg-primary group-hover:shadow-[#07111F]/20">
                      <Arrow
                        size={18}
                        className={`transition-transform duration-300 ${
                          isAr
                            ? "group-hover:-translate-x-1"
                            : "group-hover:translate-x-1"
                        }`}
                      />
                    </span>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 start-0 h-1 w-0 bg-primary transition-all duration-700 group-hover:w-full" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}