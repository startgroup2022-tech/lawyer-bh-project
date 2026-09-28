"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Building2,
  Users,
  Scale,
  Shield,
  Gavel,
  Briefcase,
  User,
  Languages,
  BadgeCheck,
  FileText,
  Clock,
} from "lucide-react";
import { useLocale } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import type {
  PublicLawyer,
  PublicLawyerSpecialty,
} from "@/lib/publicLawyers";
import { Link } from "@/i18n/navigation";
import { SHOW_PUBLIC_PROVIDER_CARDS } from "@/lib/public-ui-features";
import {
  displayMembershipNumber,
  displayProviderName,
  providerMatchesCategory,
  providerRoleLabels,
  providerRoles,
  type ProviderRole,
} from "@/lib/directory/provider-display";

type Office = {
  name: string;
  nameAr: string;
  image?: string;
  children?: Office[];
};

type Props = {
  lawyers: PublicLawyer[];
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.lawyers.bh";

function getLawyerProfileUrl(isAr: boolean, slug: string) {
  return `${SITE_URL}/${isAr ? "ar" : "en"}/directory/${encodeURIComponent(
    slug,
  )}`;
}

const licensedByMinistryofJusticeIslamicAffairsandEndowment = {
  en: "Licensed by the Ministry of Justice, Islamic Affairs and Endowments",
  ar: "مرخص من وزارة العدل والشؤون الإسلامية والأوقاف",
};

const licensedByMinistryOfIndustryAndCommerce = {
  en: "Licensed by the Ministry of Industry and Commerce and all competent authorities",
  ar: "مرخصة من وزارة الصناعة والتجارة وجميع الجهات المختصة",
};

const offices: Office[] = [
  {
    name: "Gulf International Collection and Consulting W.L.L (PB)",
    nameAr: "شركة الخليج الدولية للتحصيل والاستشارات ش.ذ.م.م (المكتب المحترف)",
    image: "/images/GICC_logo.jpg",
    children: [
      {
        name: "Bahrain National Law Firm & Legal Consultancy",
        nameAr: "البحرين الوطنية للمحاماة والاستشارات القانونية",
        image: "/images/BNFLAL_LOGO.jpg",
      },
      {
        name: "Saraya Square Law Firm & Legal Consultancy",
        nameAr: "سرايا سكوير للمحاماة والاستشارات القانونية",
        image: "/images/SAQUERLOGO.jpg",
      },
      {
        name: "Al Khudair Law Firm & Legal Consultancy",
        nameAr: "مكتب الخضير للمحاماة والاستشارات القانونية",
        image: "/images/ALKHUDAIR_LoGo.jpg",
      },
      {
        name: "Abdulla Al Buti Law Firm & Legal Consultancy",
        nameAr: "مكتب عبدالله البطي للمحاماة والاستشارات القانونية",
        image: "/images/logo_abdulla_albuti.jpg",
      },
    ],
  },
];

const specialtyLabels: Record<PublicLawyerSpecialty, { en: string; ar: string }> =
  {
    administrative: { en: "Administrative", ar: "إداري" },
    civil: { en: "Civil", ar: "مدني" },
    commercial: { en: "Commercial", ar: "تجاري" },
    labor: { en: "Labor", ar: "عمالي" },
    criminal: { en: "Criminal", ar: "جنائي" },
    sharia: { en: "Sharia", ar: "شرعي" },
    constitutional: { en: "Constitutional", ar: "دستوري" },
    cassation: { en: "Cassation", ar: "تمييز" },
    sports: { en: "Sports", ar: "رياضي" },
  };

const specialtyOptions: {
  key: "all" | PublicLawyerSpecialty;
  en: string;
  ar: string;
}[] = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "criminal", en: "Criminal", ar: "جنائي" },
  { key: "civil", en: "Civil", ar: "مدني" },
  { key: "sharia", en: "Sharia", ar: "شرعي" },
  { key: "commercial", en: "Commercial", ar: "تجاري" },
  { key: "labor", en: "Labor", ar: "عمالي" },
  { key: "administrative", en: "Administrative", ar: "إداري" },
  { key: "constitutional", en: "Constitutional", ar: "دستوري" },
  { key: "cassation", en: "Cassation", ar: "تمييز" },
  { key: "sports", en: "Sports", ar: "رياضي" },
];

function formatCardDate(value: string | Date | null | undefined) {
  if (!value) return "--/--/----";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--/----";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}/${mm}/${dd}`;
}

type ProviderSubscriptionType = ProviderRole;

function LawyerMembershipCard({
  lawyer,
  isAr,
}: {
  lawyer: PublicLawyer;
  isAr: boolean;
}) {
  const lawyerProfileUrl = getLawyerProfileUrl(isAr, lawyer.slug);

  const mainSpecialty = lawyer.specialtyMain;
  const subSpecialties = lawyer.specialtySubs.slice(0, 2);

  const mainSpecialtyLabel = mainSpecialty
    ? isAr
      ? specialtyLabels[mainSpecialty].ar
      : specialtyLabels[mainSpecialty].en
    : null;

  const subSpecialtyLabels = subSpecialties
    .filter(Boolean)
    .map((specialty) =>
      isAr ? specialtyLabels[specialty].ar : specialtyLabels[specialty].en,
    );

  const experienceYears = Number(
    (lawyer as PublicLawyer & {
      experienceYears?: number | string | null;
    }).experienceYears ?? 0,
  );

  const experienceLabel =
    experienceYears > 0
      ? isAr
        ? `${experienceYears} سنوات`
        : `${experienceYears} years experience`
      : isAr
        ? "سنوات الخبرة غير محددة"
        : "Experience not specified";

  const membershipNo = displayMembershipNumber(lawyer.membershipNo, isAr);
  const issueDate = formatCardDate(lawyer.createdAt);
  const expiryDate = formatCardDate(lawyer.licenseExpiryDate);

  const cardDir = isAr ? "rtl" : "ltr";

  const displayName = displayProviderName(lawyer, isAr);
  const roleLabels = providerRoleLabels(providerRoles(lawyer), isAr);

  const displaySubtitle = isAr ? lawyer.subtitleAr : lawyer.subtitleEn;

  return (
    <motion.div
      dir={cardDir}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden rounded-[22px] border border-[#E9E4D8] bg-[#FAFAF8] shadow-[0_14px_34px_rgba(7,17,31,0.08)] transform-gpu will-change-transform [backface-visibility:hidden]"
    >
      <div className="relative overflow-hidden px-3 pb-3 pt-4">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(10,34,78,0.26) 1px, transparent 0)",
            backgroundSize: "14px 14px",
          }}
        />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="relative z-10 h-[72px]">
            <div className="absolute -left-[185px] -top-[20px] h-16 w-35 -translate-x-1/2">
              <Image
                src="/images/logo-full7.png"
                alt="Lawyers.bh"
                fill
                className="object-contain"
                sizes="176px"
                priority
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-[35px] min-h-[120px] ps-[112px] text-start">
          <div className="absolute start-0 top-0 h-[110px] w-[96px] overflow-hidden rounded-[20px] border-[2px] border-[#08285F] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
            {lawyer.image ? (
              <Image
                src={lawyer.image}
                alt={`${lawyer.nameAr} - ${lawyer.nameEn}`}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized={lawyer.image.startsWith("data:")}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#F8F9FB]">
                <User className="h-10 w-10 text-[#B7C0CF]" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-start gap-1">
            <h2 className="line-clamp-1 text-[14px] font-black leading-8 text-[#08285F]">
              {displayName}
            </h2>
          </div>

          <p className="-mt-0.5 line-clamp-1 text-[9.5px] font-bold text-[#12326E]">
            {displaySubtitle}
          </p>

          <div className="mt-1 flex flex-wrap gap-1">
            {roleLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-[#D7E0EF] bg-white px-2 py-0.5 text-[8.5px] font-extrabold text-[#08285F]"
              >
                {label}
              </span>
            ))}
          </div>

          <p className="mt-0.5 line-clamp-1 text-[9.5px] font-extrabold text-[#B4232A]">
            {isAr ? "سنوات الخبرة:" : "Experience:"} {experienceLabel}
          </p>

          <div className="mt-2 space-y-1.5">
            {mainSpecialtyLabel && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[8.5px] font-black text-[#667085]">
                  {isAr ? "التخصص الرئيسي:" : "Main:"}
                </span>

                <span className="rounded-full border border-[#D5DAE2] bg-white px-2.5 py-1 text-[9px] font-black leading-none text-[#08285F]">
                  {mainSpecialtyLabel}
                </span>
              </div>
            )}

            {subSpecialtyLabels.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[8.5px] font-black text-[#667085]">
                  {isAr ? "التخصصات الفرعية:" : "Sub:"}
                </span>

                {subSpecialtyLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-[#D5DAE2] bg-white px-2.5 py-1 text-[9px] font-bold leading-none text-[#12326E]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-3 h-px w-full bg-[#D8DDE5]" />

        <div className="relative z-10 mt-3 flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-3 text-center">
            <div>
              <p className="mb-0.5 text-[8.5px] font-bold text-[#667085]">
                {isAr ? "رقم العضوية" : "Member"}
              </p>
              <p className="truncate text-[13px] font-black tracking-wide text-[#0B2C67]">
                {membershipNo}
              </p>
            </div>

            <div className="border-x border-[#D6DAE2] px-1">
              <p className="mb-0.5 text-[8.5px] font-bold text-[#667085]">
                {isAr ? "الإصدار" : "Issue"}
              </p>
              <p className="text-[11px] font-bold text-[#0B2C67]">
                {issueDate}
              </p>
            </div>

            <div>
              <p className="mb-0.5 text-[8.5px] font-bold text-[#667085]">
                {isAr ? "الانتهاء" : "Expiry"}
              </p>
              <p className="text-[11px] font-bold text-[#0B2C67]">
                {expiryDate}
              </p>
            </div>
          </div>
            <div className="rounded-xl border border-gray-200 bg-white p-0 shadow-sm transition hover:scale-105">
              <QRCodeSVG
                value={lawyerProfileUrl}
                size={58}
                level="M"
                includeMargin
              />
            </div>
        </div>
      </div>

      <div className="relative h-[58px] overflow-hidden bg-[#082B67] text-white">
        <svg
          viewBox="0 0 600 70"
          preserveAspectRatio="none"
          className={`absolute left-0 top-0 h-[34px] w-full ${
            isAr ? "" : "scale-x-[-1]"
          }`}
        >
          <path
            d="M0,33 C130,48 230,48 330,35 C430,22 505,7 600,2 L600,0 L0,0 Z"
            fill="#FAFAF8"
          />
          <path
            d="M0,34 C130,49 230,49 330,36 C430,23 505,8 600,3"
            fill="none"
            stroke="#C89A45"
            strokeWidth="3"
          />
        </svg>

        <div
          className="absolute inset-0 opacity-[0.055]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.38) 1px, transparent 0)",
            backgroundSize: "12px 12px",
          }}
        />

        <div className="relative z-10 flex h-full items-end justify-between gap-2 px-4 pb-3">
          <div className="flex min-w-0 items-end gap-2">
            <Image
              src="/images/logo-BH.png"
              alt={isAr ? "شعار مملكة البحرين" : "Kingdom of Bahrain emblem"}
              width={24}
              height={24}
              className="-mb-0.5 h-8 w-8 shrink-0 object-contain"
            />

            <p className="line-clamp-1 translate-y-1 text-[10px] font-semibold leading-4">
              {isAr
                ? "مرخص من وزارة العدل والشؤون الإسلامية والأوقاف"
                : "Licensed by the Ministry of Justice"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DirectoryPage({ lawyers }: Props) {
  const isAr = useLocale() === "ar";
  const [activeTab, setActiveTab] = useState(0);
  const [activeSpecialty, setActiveSpecialty] = useState(0);
  const [search, setSearch] = useState("");

  const providerCounts = useMemo(() => {
    const counts: Record<ProviderSubscriptionType, number> = {
      lawyer: 0,
      consultant: 0,
      mediator: 0,
      arbitrator: 0,
      expert: 0,
      private_executor: 0,
      private_notary: 0,
      translator: 0,
    };

    lawyers.forEach((lawyer) => {
      providerRoles(lawyer).forEach((role) => {
        counts[role] += 1;
      });
    });

    return counts;
  }, [lawyers]);

  const cats = useMemo(
    () =>
      isAr
        ? [
            {
              key: "offices" as const,
              icon: Building2,
              label: "المكاتب",
              count: offices.length,
            },
            {
              key: "lawyer" as const,
              icon: Users,
              label: "المحامون",
              count: providerCounts.lawyer,
            },
            {
              key: "consultant" as const,
              icon: Shield,
              label: "المستشارون",
              count: providerCounts.consultant,
            },
            {
              key: "expert" as const,
              icon: Briefcase,
              label: "الخبراء",
              count: providerCounts.expert,
            },
            {
              key: "arbitrator" as const,
              icon: Gavel,
              label: "المحكمون",
              count: providerCounts.arbitrator,
            },
            {
              key: "mediator" as const,
              icon: Scale,
              label: "الوسطاء",
              count: providerCounts.mediator,
            },
            {
              key: "private_executor" as const,
              icon: FileText,
              label: "المنفذين الخاصين",
              count: providerCounts.private_executor,
            },
            {
              key: "private_notary" as const,
              icon: BadgeCheck,
              label: "الموثقين الخاصين",
              count: providerCounts.private_notary,
            },
            {
              key: "translator" as const,
              icon: Languages,
              label: "المترجمين",
              count: providerCounts.translator,
            },
          ]
        : [
            {
              key: "offices" as const,
              icon: Building2,
              label: "Offices",
              count: offices.length,
            },
            {
              key: "lawyer" as const,
              icon: Users,
              label: "Lawyers",
              count: providerCounts.lawyer,
            },
            {
              key: "consultant" as const,
              icon: Shield,
              label: "Consultants",
              count: providerCounts.consultant,
            },
            {
              key: "expert" as const,
              icon: Briefcase,
              label: "Experts",
              count: providerCounts.expert,
            },
            {
              key: "arbitrator" as const,
              icon: Gavel,
              label: "Arbitrators",
              count: providerCounts.arbitrator,
            },
            {
              key: "mediator" as const,
              icon: Scale,
              label: "Mediators",
              count: providerCounts.mediator,
            },
            {
              key: "private_executor" as const,
              icon: FileText,
              label: "Private Executors",
              count: providerCounts.private_executor,
            },
            {
              key: "private_notary" as const,
              icon: BadgeCheck,
              label: "Private Notaries",
              count: providerCounts.private_notary,
            },
            {
              key: "translator" as const,
              icon: Languages,
              label: "Translators",
              count: providerCounts.translator,
            },
          ],
    [isAr, providerCounts],
  );

  const selectedSpecialty = specialtyOptions[activeSpecialty]?.key ?? "all";
  const selectedCategory = cats[activeTab]?.key ?? "offices";

  const filteredProviders = lawyers
    .filter((lawyer) => {
      const matchesCategory =
        selectedCategory !== "offices" &&
        providerMatchesCategory(lawyer, selectedCategory);

      const searchValue = `${lawyer.nameEn} ${lawyer.nameAr} ${
        lawyer.registrationNo
      } ${lawyer.membershipNo ?? ""} ${providerRoleLabels(
        providerRoles(lawyer),
        isAr,
      ).join(" ")}`.toLowerCase();

      const matchesSearch = searchValue.includes(search.toLowerCase().trim());

      const matchesSpecialty =
        selectedSpecialty === "all" ||
        lawyer.specialties.includes(selectedSpecialty);

      return matchesCategory && matchesSearch && matchesSpecialty;
    })
    .sort((a, b) => {
      const aPriority = a.badgeType === "premium" ? 0 : 1;
      const bPriority = b.badgeType === "premium" ? 0 : 1;

      return aPriority - bPriority;
    });

  const activeCategoryLabel = cats[activeTab]?.label ?? "";
  const showUnderUpdate =
    selectedCategory !== "offices" && !SHOW_PUBLIC_PROVIDER_CARDS;

  return (
    <div className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <h1 className="mb-2 text-3xl font-extrabold text-text-primary sm:text-4xl">
            {isAr ? "الدليل المهني" : "Professional Directory"}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-text-muted">
            {isAr
              ? "تصفح المحامين ومقدمي الخدمات القانونية المعتمدين في منصة محامون البحرين."
              : "Browse approved lawyers and legal service providers registered on Lawyers.bh."}
          </p>
        </motion.div>

        <div className="mb-8 flex flex-wrap gap-2">
          {cats.map((cat, index) => (
            <button
              key={cat.label}
              onClick={() => {
                setActiveTab(index);
                setSearch("");
                setActiveSpecialty(0);
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[15.5px] font-semibold transition-colors ${
                activeTab === index
                  ? "bg-primary text-white"
                  : "bg-bg-light text-text-secondary hover:bg-gray-200"
              }`}
            >
              <cat.icon size={16} />
              {cat.label}
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  activeTab === index ? "bg-white/20" : "bg-gray-300/50"
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {selectedCategory === "offices" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {offices.map((office) => (
              <div
                key={office.name}
                className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm"
              >
                <div className="relative p-5">
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary/30 via-primary/10 to-transparent rtl:bg-gradient-to-l" />

                  <div className="flex items-center gap-4">
                    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-primary/[0.07] ring-4 ring-primary/[0.025]">
                      {office.image ? (
                        <Image
                          src={office.image}
                          alt={isAr ? office.nameAr : office.name}
                          fill
                          className="object-contain"
                          sizes="112px"
                        />
                      ) : (
                        <Building2 className="h-10 w-10 text-primary" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 text-center">
                      <h2 className="pb-3 pt-3 text-[27px] font-bold leading-7 text-text-primary">
                        {isAr ? office.nameAr : office.name}
                      </h2>

                      <p className="mt-3 flex items-center justify-center gap-1.5 text-[18px] font-normal text-text-muted">
                        <Image
                          src="/images/logo-BH.png"
                          alt={
                            isAr
                              ? "شعار مملكة البحرين"
                              : "Kingdom of Bahrain emblem"
                          }
                          width={18}
                          height={18}
                          className="h-8 w-8 shrink-0 object-contain"
                        />
                        {isAr
                          ? licensedByMinistryOfIndustryAndCommerce.ar
                          : licensedByMinistryOfIndustryAndCommerce.en}
                      </p>
                    </div>
                  </div>
                </div>

                {office.children && office.children.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {office.children.map((child) => (
                        <div
                          key={child.name}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-primary/20"
                        >
                          <div className="relative flex h-22 w-22 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/[0.06]">
                            {child.image ? (
                              <Image
                                src={child.image}
                                alt={isAr ? child.nameAr : child.name}
                                fill
                                className="object-cover"
                                sizes="88px"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-primary" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 text-center">
                            <h3 className="line-clamp-2 text-sm font-bold leading-6 text-text-primary">
                              {isAr ? child.nameAr : child.name}
                            </h3>

                            <p className="mb-0 mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-text-muted">
                              <Image
                                src="/images/logo-BH.png"
                                alt={
                                  isAr
                                    ? "شعار مملكة البحرين"
                                    : "Kingdom of Bahrain emblem"
                                }
                                width={18}
                                height={18}
                                className="h-6 w-6 shrink-0 object-contain"
                              />
                              {isAr
                                ? licensedByMinistryofJusticeIslamicAffairsandEndowment.ar
                                : licensedByMinistryofJusticeIslamicAffairsandEndowment.en}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {selectedCategory !== "offices" && showUnderUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border border-primary/10 bg-white p-10 text-center shadow-sm"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary">
              <Clock className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-extrabold text-text-primary">
              {isAr ? "القسم تحت التحديث" : "Section under update"}
            </h2>

            <button
              type="button"
              onClick={() => {
                setActiveTab(0);
                setSearch("");
                setActiveSpecialty(0);
              }}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-dark"
            >
              <Building2 size={17} />
              {isAr ? "العودة لمكاتبنا" : "Back to Our Offices"}
            </button>
          </motion.div>
        )}

        {selectedCategory !== "offices" && !showUnderUpdate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder={
                    isAr
                      ? "ابحث بالاسم أو رقم الرخصة..."
                      : "Search by name or license number..."
                  }
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pe-4 ps-10 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {specialtyOptions.map((specialty, index) => (
                  <button
                    key={specialty.key}
                    onClick={() => setActiveSpecialty(index)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeSpecialty === index
                        ? "bg-primary text-white"
                        : "bg-bg-light text-text-muted hover:bg-gray-200"
                    }`}
                  >
                    {isAr ? specialty.ar : specialty.en}
                  </button>
                ))}
              </div>
            </div>

            {filteredProviders.length === 0 ? (
              <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
                <Users className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                <h2 className="text-lg font-extrabold text-text-primary">
                  {isAr
                    ? `لا يوجد مسجلون حالياً في ${activeCategoryLabel}`
                    : `No approved ${activeCategoryLabel.toLowerCase()} yet`}
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {isAr
                    ? "ستظهر هنا الحسابات بعد موافقة الإدارة وتفعيل الحساب."
                    : "Profiles will appear here after admin approval and activation."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {filteredProviders.map((lawyer) => (
                  <Link
                    key={lawyer.id}
                    href={`/directory/${lawyer.slug}`}
                    className="block"
                  >
                    <LawyerMembershipCard lawyer={lawyer} isAr={isAr} />
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
