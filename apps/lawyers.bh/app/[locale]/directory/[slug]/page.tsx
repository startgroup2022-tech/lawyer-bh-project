import type { ElementType, ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Clock,
  Languages,
  MessageCircle,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getPublicLawyerBySlug,
  type PublicLawyerSpecialty,
} from "@/lib/publicLawyers";
import {
  displayMembershipNumber,
  displayProviderName,
  providerRoleLabels,
  providerRoles,
} from "@/lib/directory/provider-display";
import { safeJsonLd } from "@/lib/seo/core";
import { buildProviderGraph, buildProviderMetadata } from "@/lib/seo/provider-profile";
import { getDirectoryDetailPortraitSize } from "../directory-portrait";

type Props = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

type ReviewComment = {
  stars: number;
  comment: string;
  createdAt: string | null;
  customerName?: string | null;
};

const specialtyLabels: Record<PublicLawyerSpecialty, { en: string; ar: string }> = {
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

function isPublicLawyerSpecialty(
  value: unknown,
): value is PublicLawyerSpecialty {
  return typeof value === "string" && value in specialtyLabels;
}

function normalizeSpecialtyKey(value: unknown): PublicLawyerSpecialty | null {
  if (!isPublicLawyerSpecialty(value)) return null;

  return value;
}

function getSpecialtyText(value: PublicLawyerSpecialty, isAr: boolean) {
  return isAr ? specialtyLabels[value].ar : specialtyLabels[value].en;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "--/--/----";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--/----";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}/${mm}/${dd}`;
}

function formatReviewDate(
  value: string | Date | null | undefined,
  isAr: boolean,
) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(isAr ? "ar-BH-u-nu-latn" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function getReviewText(review: ReviewComment, isAr: boolean) {
  const comment = String(review.comment ?? "").trim();

  if (comment) return comment;

  return isAr ? "تقييم بدون تعليق مكتوب." : "Rating without a written comment.";
}

function getExperienceLabel(years: number, isAr: boolean) {
  const safeYears = Math.max(0, Math.floor(Number(years) || 0));

  if (isAr) {
    if (safeYears === 1) return "سنة";
    if (safeYears === 2) return "سنتان";
    return `${safeYears} سنوات`;
  }

  return safeYears === 1 ? "1 year" : `${safeYears} years`;
}

function toArabicDigits(value: string) {
  return value;
}

function formatTime12Hour(time: string, isAr: boolean) {
  const cleanTime = time.trim();
  const [hourPart, minutePart = "00"] = cleanTime.split(":");

  const hour24 = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return cleanTime;
  }

  const period = hour24 >= 12 ? (isAr ? "م" : "PM") : isAr ? "ص" : "AM";
  const hour12 = hour24 % 12 || 12;
  const formatted = `${hour12}:${String(minute).padStart(2, "0")} ${period}`;

  return isAr ? toArabicDigits(formatted) : formatted;
}

function formatWorkingHours(value: string | null | undefined, isAr: boolean) {
  if (!value) return "--";

  const normalized = value
    .replace("–", "-")
    .replace("—", "-")
    .replace(/\s+/g, "");

  const [start, end] = normalized.split("-");

  if (!start || !end) return value;

  return `${formatTime12Hour(start, isAr)} - ${formatTime12Hour(end, isAr)}`;
}


function formatLanguageLabel(value: string | null | undefined, isAr: boolean) {
  if (!value) return "--";

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/-/g, " ");

  const isBoth =
    normalized === "both" ||
    normalized === "both languages" ||
    normalized === "ar en" ||
    normalized === "arabic english" ||
    normalized === "arabic and english" ||
    normalized === "العربية والإنجليزية" ||
    normalized === "عربي وانجليزي" ||
    normalized === "كلاهما";

  const isArabic =
    normalized === "ar" ||
    normalized === "arabic" ||
    normalized === "عربي" ||
    normalized === "العربية";

  const isEnglish =
    normalized === "en" ||
    normalized === "english" ||
    normalized === "انجليزي" ||
    normalized === "إنجليزي" ||
    normalized === "الإنجليزية";

  if (isBoth) return isAr ? "كلاهما" : "Both";
  if (isArabic) return isAr ? "عربي" : "Arabic";
  if (isEnglish) return isAr ? "إنجليزي" : "English";

  return value;
}


function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-[#E6EAF0] bg-white p-4 transition-all hover:border-[#D8C398] hover:shadow-[0_10px_26px_rgba(7,17,31,0.06)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF8EA] text-[#B6842B]">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-[#7A8699]">{label}</p>
        <div className="mt-1 break-words text-sm font-extrabold text-[#082B67]">
          {value}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E6EAF0] bg-white/80 p-4 shadow-[0_8px_20px_rgba(7,17,31,0.035)] backdrop-blur">
      <p className="truncate text-xs font-bold text-[#7A8699]">{label}</p>

      <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 truncate text-base font-black text-[#082B67] sm:text-lg">
          {value}
        </div>

        {subValue ? (
          <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#98A2B3]">
            {subValue}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StarsRow({
  filledStars,
  size = "h-4 w-4",
}: {
  filledStars: number;
  size?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 whitespace-nowrap">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${size} ${
            index < filledStars
              ? "fill-yellow-400 text-yellow-400"
              : "text-[#D0D5DD]"
          }`}
        />
      ))}
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const isAr = locale === "ar";

  const lawyer = await getPublicLawyerBySlug(slug);

  if (!lawyer) {
    return {
      title: isAr ? "محامي غير موجود" : "Lawyer not found",
    };
  }

  const fullName = displayProviderName(lawyer, isAr);

  return buildProviderMetadata({
    locale: isAr ? "ar" : "en",
    slug: lawyer.slug,
    name: fullName,
    alternateName: isAr ? lawyer.nameEn : lawyer.nameAr,
    subtitle: isAr ? lawyer.subtitleAr : lawyer.subtitleEn,
    image: lawyer.image,
    rating: lawyer.rating,
    reviewCount: lawyer.reviewCount,
  });
}

export default async function LawyerProfilePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const isAr = locale === "ar";
  const lawyer = await getPublicLawyerBySlug(slug);

  if (!lawyer) notFound();

  const fullDisplayName = displayProviderName(lawyer, isAr);
  const roleLabels = providerRoleLabels(providerRoles(lawyer), isAr);
  const displaySubtitle = isAr ? lawyer.subtitleAr : lawyer.subtitleEn;

  const experienceLabel = getExperienceLabel(lawyer.experienceYears, isAr);
  const membershipNo = displayMembershipNumber(lawyer.membershipNo, isAr);
  const workingHoursLabel = formatWorkingHours(lawyer.workingHours, isAr);
const languageLabel = formatLanguageLabel(lawyer.language, isAr);

  const lawyerSpecialtyDetails = lawyer as typeof lawyer & {
    specialtyMain?: PublicLawyerSpecialty | string | null;
    specialtySubs?: Array<PublicLawyerSpecialty | string> | null;
  };

  const fallbackSpecialties = lawyer.specialties
    .map((specialty) => normalizeSpecialtyKey(specialty))
    .filter((specialty): specialty is PublicLawyerSpecialty => Boolean(specialty));

  const mainSpecialty =
    normalizeSpecialtyKey(lawyerSpecialtyDetails.specialtyMain) ??
    fallbackSpecialties[0] ??
    null;

  const subSpecialtiesSource =
    Array.isArray(lawyerSpecialtyDetails.specialtySubs) &&
    lawyerSpecialtyDetails.specialtySubs.length > 0
      ? lawyerSpecialtyDetails.specialtySubs
      : fallbackSpecialties.filter((specialty) => specialty !== mainSpecialty);

  const subSpecialties = Array.from(
    new Set(
      subSpecialtiesSource
        .map((specialty) => normalizeSpecialtyKey(specialty))
        .filter(
          (specialty): specialty is PublicLawyerSpecialty =>
            Boolean(specialty) && specialty !== mainSpecialty,
        ),
    ),
  );

  const safeRating =
    lawyer.reviewCount > 0 && Number.isFinite(Number(lawyer.rating))
      ? Math.min(5, Math.max(0, Number(lawyer.rating)))
      : 0;

  const filledStars = Math.floor(safeRating);

  const reviewComments =
    (lawyer as typeof lawyer & {
      reviewComments?: ReviewComment[];
    }).reviewComments ?? [];

  const sortedReviewComments = [...reviewComments]
    .map((review) => ({
      ...review,
      stars: Math.max(0, Math.min(5, Math.floor(Number(review.stars) || 0))),
      comment: String(review.comment ?? "").trim(),
      createdAt: review.createdAt ?? null,
      customerName: String(review.customerName ?? "").trim(),
    }))
    .filter((review) => review.stars > 0 || review.comment.length > 0)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    });

  const jsonLd = buildProviderGraph({ locale: isAr ? "ar" : "en", slug: lawyer.slug, name: fullDisplayName, alternateName: isAr ? lawyer.nameEn : lawyer.nameAr, subtitle: displaySubtitle, image: lawyer.image, rating: safeRating, reviewCount: lawyer.reviewCount });

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen bg-[radial-gradient(circle_at_top,#EEF3FB_0,#F7F8FA_42%,#F7F8FA_100%)] py-10 lg:py-16"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <section className="relative overflow-hidden rounded-[32px] border border-[#E1E7F0] bg-white shadow-[0_24px_70px_rgba(7,17,31,0.09)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C89A45] via-[#E9D6A7] to-[#082B67]" />

          <div className="relative overflow-hidden bg-white p-5 sm:p-7 lg:p-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.45]"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(circle at 12% 10%, rgba(200,154,69,0.16), transparent 30%), radial-gradient(circle at 88% 0%, rgba(8,43,103,0.10), transparent 34%)",
              }}
            />

            <div className="relative z-10 grid gap-7 lg:grid-cols-[176px_1fr] lg:items-center">
              <div className="mx-auto w-full max-w-[176px] lg:mx-0">
                <div
                  className="relative overflow-hidden rounded-[28px] border border-[#E6D6B8] bg-white shadow-[0_18px_40px_rgba(7,17,31,0.12)] ring-4 ring-white"
                  style={getDirectoryDetailPortraitSize()}
                >
                  {lawyer.image ? (
                    <Image
                      src={lawyer.image}
                      alt={isAr ? `صورة ${fullDisplayName}` : `Photo of ${fullDisplayName}`}
                      fill
                      className="object-cover"
                      sizes="176px"
                      unoptimized={lawyer.image.startsWith("data:")}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#F8F9FB]">
                      <User className="h-16 w-16 text-[#B7C0CF]" />
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 text-center lg:text-start">
                <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E9D8B8] bg-[#FFFBF3] px-3 py-1 text-xs font-extrabold text-[#9C6B1F] shadow-sm">
                    <BadgeCheck className="h-4 w-4" />
                    {isAr ? "عضو معتمد" : "Verified Member"}
                  </span>

                  <span className="rounded-full border border-[#D7E0EF] bg-white px-3 py-1 text-xs font-extrabold text-[#082B67] shadow-sm">
                    {isAr ? "رقم العضوية" : "Member"}: {membershipNo}
                  </span>

                  {roleLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-[#D7E0EF] bg-[#F4F7FC] px-3 py-1 text-xs font-extrabold text-[#082B67]"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <h1 className="text-2xl font-black leading-tight text-[#07111F] sm:text-3xl lg:text-4xl">
                  {fullDisplayName}
                </h1>

                <p className="mx-auto mt-3 max-w-3xl text-sm font-semibold leading-7 text-[#475467] lg:mx-0">
                  {displaySubtitle}
                </p>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label={isAr ? "سنوات الخبرة" : "Experience"}
                    value={experienceLabel}
                  />

                  <StatCard
                    label={isAr ? "التقييم" : "Rating"}
                    value={
                      <div className="flex items-center gap-1.5">
                        <span>{safeRating > 0 ? safeRating.toFixed(1) : "0.0"}</span>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                    }
                    subValue={
                      isAr
                        ? `${lawyer.reviewCount} تقييم`
                        : `${lawyer.reviewCount} reviews`
                    }
                  />

                  <StatCard
                    label={isAr ? "انتهاء الترخيص" : "License Expiry"}
                    value={formatDate(lawyer.licenseExpiryDate)}
                  />

                  <StatCard
                    label={isAr ? "ساعات العمل" : "Working Hours"}
                    value={workingHoursLabel}
                  />
                </div>
              </div>
              
            </div>

 <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
  <Link
    href={`/book-appointment?service=legal&lawyer=${lawyer.slug}`}
    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#082B67] px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(8,43,103,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#0A347C] hover:shadow-[0_16px_34px_rgba(8,43,103,0.28)]"
  >
    <MessageCircle className="h-4 w-4" />
    {isAr ? "طلب استشارة" : "Request Consultation"}
  </Link>

  <div className="inline-flex items-end -mb-[58px] justify-center gap-1 px-0 py-0 text-center sm:justify-start">
    <Image
      src="/images/logo-BH.png"
      alt={isAr ? "شعار مملكة البحرين" : "Kingdom of Bahrain emblem"}
      width={28}
      height={28}
      className="h-6 w-6 shrink-0 object-contain"
    />

    <span className="text-[12px] font-bold leading-5 text-[#082B67]">
      {isAr
        ? "مرخص من وزارة العدل والشؤون الإسلامية والأوقاف"
        : "Licensed by the Ministry of Justice, Islamic Affairs and Endowments"}
    </span>
  </div>
</div>
          </div>

        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-[#E1E7F0] bg-white p-5 shadow-[0_14px_36px_rgba(7,17,31,0.055)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#08285F]">
                  {isAr ? "التخصصات القانونية" : "Legal Specialties"}
                </h2>
                <div className="h-px flex-1 bg-[#EAECF0]" />
              </div>

              {mainSpecialty || subSpecialties.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
                  <div className="rounded-3xl border border-[#EAECF0] bg-white p-4">
                    <p className="text-xs font-extrabold text-[#667085]">
                      {isAr ? "التخصص الرئيسي" : "Main Specialty"}
                    </p>

                    {mainSpecialty ? (
                      <div className="mt-3 inline-flex rounded-full border border-[#D5DAE2] bg-[#F8FAFC] px-4 py-3 text-sm font-black text-[#082B67]">
                        {getSpecialtyText(mainSpecialty, isAr)}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-semibold text-[#667085]">
                        {isAr ? "غير محدد" : "Not specified"}
                      </p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-[#EAECF0] bg-white p-4">
                    <p className="text-xs font-extrabold text-[#667085]">
                      {isAr ? "التخصصات الفرعية" : "Sub-specialties"}
                    </p>

                    {subSpecialties.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {subSpecialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="rounded-full border border-[#D5DAE2] bg-[#F8FAFC] px-4 py-2 text-sm font-bold text-[#12326E]"
                          >
                            {getSpecialtyText(specialty, isAr)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-semibold text-[#667085]">
                        {isAr
                          ? "لا توجد تخصصات فرعية مضافة."
                          : "No sub-specialties added."}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#667085]">
                  {isAr ? "لا توجد تخصصات مضافة." : "No specialties added."}
                </p>
              )}
            </div>

            <div className="rounded-[28px] border border-[#E1E7F0] bg-white p-5 shadow-[0_14px_36px_rgba(7,17,31,0.055)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#08285F]">
                  {isAr ? "نبذة مختصرة" : "Profile Summary"}
                </h2>
                <div className="h-px flex-1 bg-[#EAECF0]" />
              </div>

              <p className="mt-4 text-sm leading-8 text-[#475467]">
                {isAr
                  ? `${fullDisplayName} مسجل ضمن محامون البحرين، ولديه ${experienceLabel}. يمكن للعملاء الاطلاع على بيانات العضوية، التخصصات القانونية، وساعات العمل من خلال هذه الصفحة.`
                  : `${fullDisplayName} is listed on Lawyers.bh with ${experienceLabel}. Clients can view membership details, legal specialties, and working hours from this profile page.`}
              </p>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-[#E1E7F0] bg-white shadow-[0_8px_26px_rgba(7,17,31,0.02)]">
              <div className="border-b border-[#EAECF0] bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF8EA] text-[#B6842B] ring-1 ring-[#E6D6B8]">
                        <Star className="h-5 w-5 fill-[#F4D58A] text-[#F4D58A]" />
                      </span>

                      <div>
                        <h2 className="text-xl font-black text-[#08285F]">
                          {isAr ? "التقييمات والتعليقات" : "Ratings & Reviews"}
                        </h2>
                        <p className="mt-1 text-xs font-semibold leading-6 text-[#667085]">
                          {isAr
                            ? "كل آراء العملاء المنشورة بعد إتمام الخدمات القانونية."
                            : "All published client feedback after completed legal services."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full rounded-3xl border border-[#E6D6B8] bg-[#FFFBF3] p-4 sm:w-auto sm:min-w-[280px]">
                    <p className="text-xs font-bold text-[#667085]">
                      {isAr ? "متوسط التقييم" : "Average Rating"}
                    </p>

                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-4xl font-black leading-none text-[#082B67]">
                          {safeRating > 0 ? safeRating.toFixed(1) : "0.0"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#667085]">
                          {isAr
                            ? `${lawyer.reviewCount} تقييم`
                            : `${lawyer.reviewCount} reviews`}
                        </p>
                      </div>

                      <StarsRow filledStars={filledStars} size="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-base font-black text-[#08285F]">
                      {isAr ? "كل التقييمات المنشورة" : "All Published Reviews"}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-[#667085]">
                      {isAr
                        ? `${sortedReviewComments.length} تعليق / تقييم منشور`
                        : `${sortedReviewComments.length} published review(s)`}
                    </p>
                  </div>

                </div>

                 <div className="grid max-h-[360px] gap-4 overflow-y-auto overscroll-contain rounded-3xl pr-1 rtl:pl-1 rtl:pr-0">

                  {sortedReviewComments.length > 0 ? (
                    sortedReviewComments.map((review, index) => {
                      const reviewStars = Math.max(
                        0,
                        Math.min(5, Math.floor(Number(review.stars) || 0)),
                      );
                      const reviewDate = formatReviewDate(review.createdAt, isAr);
                      const reviewText = getReviewText(review, isAr);
                      const reviewerName =
                        review.customerName ||
                        (isAr ? "عميل" : "Client");

                      return (
                        <article
                          key={`${review.createdAt ?? "review"}-${review.comment}-${index}`}
                          className="relative overflow-hidden rounded-3xl border border-[#EAECF0] bg-white p-4 shadow-[0_10px_28px_rgba(7,17,31,0.045)] sm:p-5"
                        >
                          <div className="absolute end-5 top-4 text-6xl font-black leading-none text-[#082B67]/[0.035]">
                            ”
                          </div>

                          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8EA] text-[#B6842B] ring-1 ring-[#E6D6B8]">
                                <User className="h-5 w-5" />
                              </div>

                              <div>
                                <p className="text-sm font-black text-[#082B67]">
                                  {reviewerName}
                                </p>
                                {reviewDate ? (
                                  <p className="mt-0.5 text-xs font-semibold text-[#98A2B3]">
                                    {reviewDate}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 rounded-2xl border border-[#E6D6B8] bg-[#FFFBF3] px-3 py-2">
                              <StarsRow filledStars={reviewStars} size="h-4 w-4" />
                              <span className="text-xs font-black text-[#9C6B1F]">
                                {isAr ? `${reviewStars} من 5` : `${reviewStars}/5`}
                              </span>
                            </div>
                          </div>

                          <p className="relative z-10 mt-4 whitespace-pre-line text-sm font-semibold leading-8 text-[#475467]">
                            {reviewText}
                          </p>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#D0D5DD] bg-white p-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F4F7] text-[#98A2B3]">
                        <Star className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-[#667085]">
                        {isAr
                          ? "لا توجد تقييمات أو تعليقات منشورة حالياً."
                          : "No published ratings or comments yet."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </section>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-[#E1E7F0] bg-white p-5 shadow-[0_14px_36px_rgba(7,17,31,0.055)]">
              <h2 className="mb-4 text-lg font-black text-[#08285F]">
                {isAr ? "بيانات العضوية" : "Membership Details"}
              </h2>

              <div className="space-y-3">
                <InfoRow
                  icon={ShieldCheck}
                  label={isAr ? "رقم العضوية" : "Membership No."}
                  value={membershipNo}
                />

                <InfoRow
                  icon={Briefcase}
                  label={isAr ? "سنوات الخبرة" : "Experience"}
                  value={experienceLabel}
                />

                <InfoRow
                  icon={CalendarDays}
                  label={isAr ? "انتهاء الترخيص" : "License Expiry"}
                  value={formatDate(lawyer.licenseExpiryDate)}
                />

                <InfoRow
                  icon={Clock}
                  label={isAr ? "ساعات العمل" : "Working Hours"}
                  value={workingHoursLabel}
                />

                <InfoRow
                  icon={Languages}
                  label={isAr ? "اللغة" : "Language"}
                  value={languageLabel}
                />
              </div>
            </div>

           
          </aside>
        </div>
      </div>
    </main>
  );
}
