import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const PUBLIC_LAWYERS_BH_COUNTRY = "BH" as const;
import { providerServiceEligibilityCondition } from "@/lib/providers/service-eligibility";
import { providerRoles, type ProviderRole } from "@/lib/directory/provider-display";

export type PublicLawyerSpecialty =
  | "administrative"
  | "civil"
  | "commercial"
  | "labor"
  | "criminal"
  | "sharia"
  | "constitutional"
  | "cassation"
  | "sports";

export type PublicProviderSubscriptionType = ProviderRole;

export type PublicLawyerReviewComment = {
  stars: number;
  comment: string;
  createdAt: string | null;
  customerName: string;
};

export type PublicLawyer = {
  id: string;
  countryCode: string;
  slug: string;
  subscriptionType: PublicProviderSubscriptionType;
  subscriptionTypes: PublicProviderSubscriptionType[];
  nameAr: string;
  nameEn: string;
  subtitleAr: string;
  subtitleEn: string;
  registrationNo: string;
  membershipNo: string | null;
  registrationLevel: string | null;
  experienceYears: number;
  language: string;
  workingHours: string;
  specialtyMain: PublicLawyerSpecialty | "";
  specialtySubs: PublicLawyerSpecialty[];
  specialties: PublicLawyerSpecialty[];
  image: string | null;
  badgeType: "premium" | "registered";
  rating: number;
  reviewCount: number;
  reviewComments: PublicLawyerReviewComment[];
  licenseExpiryDate: string | null;
  createdAt: Date;
};

const allowedSpecialties = [
  "administrative",
  "civil",
  "commercial",
  "labor",
  "criminal",
  "sharia",
  "constitutional",
  "cassation",
  "sports",
] as const;

function isPublicLawyerSpecialty(value: string): value is PublicLawyerSpecialty {
  return allowedSpecialties.includes(value as PublicLawyerSpecialty);
}

function normalizeSpecialty(value: unknown): PublicLawyerSpecialty | "" {
  if (typeof value !== "string") return "";

  return isPublicLawyerSpecialty(value) ? value : "";
}

function normalizeSpecialtySubs(value: unknown): PublicLawyerSpecialty[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter(
        (item): item is PublicLawyerSpecialty =>
          typeof item === "string" && isPublicLawyerSpecialty(item),
      ),
    ),
  ).slice(0, 2);
}

function normalizeReviewComments(value: unknown): PublicLawyerReviewComment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((review) => {
      const item = review as {
        stars?: unknown;
        comment?: unknown;
        createdAt?: unknown;
        customerName?: unknown;
      };

      const stars = Math.max(0, Math.min(5, Math.floor(Number(item.stars) || 0)));
      const comment = String(item.comment ?? "").trim();
      const createdAt =
        typeof item.createdAt === "string" ? item.createdAt : null;
      const customerName = String(item.customerName ?? "").trim();

      return {
        stars,
        comment,
        createdAt,
        customerName,
      };
    })
    .filter((review) => review.stars > 0 || review.comment.length > 0)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    });
}

function normalizeSubscriptionType(
  value: unknown,
): PublicProviderSubscriptionType {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  const map: Record<string, PublicProviderSubscriptionType> = {
    lawyer: "lawyer",
    محامي: "lawyer",

    consultant: "consultant",
    مستشار: "consultant",

    mediator: "mediator",
    وسيط: "mediator",

    arbitrator: "arbitrator",
    محكم: "arbitrator",

    expert: "expert",
    خبير: "expert",

    private_executor: "private_executor",
    منفذ_خاص: "private_executor",

    private_notary: "private_notary",
    notary: "private_notary",
    موثق_خاص: "private_notary",

    translator: "translator",
    مترجم: "translator",
  };

  return map[raw] ?? "lawyer";
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getLawyerSlug(input: {
  id: string;
  fullNameEn?: string | null;
  fullNameAr?: string | null;
  registrationNo?: string | null;
}) {
  const nameSlug = slugify(input.fullNameEn || input.fullNameAr || "");

  if (nameSlug) return `${nameSlug}-${input.id.slice(0, 8)}`;

  return `lawyer-${input.id.slice(0, 8)}`;
}

function getRegistrationSubtitleAr(
  level: string | null,
  subscriptionType?: PublicProviderSubscriptionType | string | null,
) {
  const type = normalizeSubscriptionType(subscriptionType);

  if (type === "consultant") {
    return "مستشار قانوني في مملكة البحرين";
  }

  if (type === "mediator") {
    return "وسيط قانوني في مملكة البحرين";
  }

  if (type === "arbitrator") {
    return "محكم قانوني في مملكة البحرين";
  }

  if (type === "expert") {
    return "خبير معتمد في مملكة البحرين";
  }

  if (type === "private_executor") {
    return "منفذ خاص في مملكة البحرين";
  }

  if (type === "private_notary") {
    return "موثق خاص في مملكة البحرين";
  }

  if (type === "translator") {
    return "مترجم قانوني في مملكة البحرين";
  }

  switch (level) {
    case "cassation_lawyer":
      return "محامي أمام محكمة التمييز";
    case "practicing_lawyer":
      return "محامي مشتغل";
    case "trainee_lawyer":
      return "محامي تحت التمرين";
    default:
      return "محامي مرخص في مملكة البحرين";
  }
}

function getRegistrationSubtitleEn(
  level: string | null,
  subscriptionType?: PublicProviderSubscriptionType | string | null,
) {
  const type = normalizeSubscriptionType(subscriptionType);

  if (type === "consultant") {
    return "Legal Consultant in the Kingdom of Bahrain";
  }

  if (type === "mediator") {
    return "Legal Mediator in the Kingdom of Bahrain";
  }

  if (type === "arbitrator") {
    return "Legal Arbitrator in the Kingdom of Bahrain";
  }

  if (type === "expert") {
    return "Certified Expert in the Kingdom of Bahrain";
  }

  if (type === "private_executor") {
    return "Private Executor in the Kingdom of Bahrain";
  }

  if (type === "private_notary") {
    return "Private Notary in the Kingdom of Bahrain";
  }

  if (type === "translator") {
    return "Legal Translator in the Kingdom of Bahrain";
  }

  switch (level) {
    case "cassation_lawyer":
      return "Lawyer before the Court of Cassation";
    case "practicing_lawyer":
      return "Practicing Lawyer";
    case "trainee_lawyer":
      return "Trainee Lawyer";
    default:
      return "Licensed Lawyer in the Kingdom of Bahrain";
  }
}

function getBadgeType(
  level: string | null,
  subscriptionType: PublicProviderSubscriptionType,
): "premium" | "registered" {
  if (subscriptionType !== "lawyer") {
    return "registered";
  }

  return level === "cassation_lawyer" ? "premium" : "registered";
}

function getProfileImage(row: {
  profileImageUrl: string | null;
  profileImageMimeType: string | null;
  profileImageBase64: string | null;
}) {
  if (row.profileImageUrl) {
    return row.profileImageUrl;
  }

  if (!row.profileImageBase64) return null;

  const mimeType = row.profileImageMimeType || "image/jpeg";

  return `data:${mimeType};base64,${row.profileImageBase64}`;
}

function toNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function getPublicLawyers(
  countryCode: string = PUBLIC_LAWYERS_BH_COUNTRY,
): Promise<PublicLawyer[]> {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  const rows = await db
    .select({
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      subscriptionType: schema.bahrainLawyers.subscriptionType,
      subscriptionTypes: schema.bahrainLawyers.subscriptionTypes,
      fullNameAr: schema.bahrainLawyers.fullNameAr,
      fullNameEn: schema.bahrainLawyers.fullNameEn,
      registrationNo: schema.bahrainLawyers.registrationNo,
      membershipNo: schema.bahrainLawyers.membershipNo,
      registrationLevel: schema.bahrainLawyers.registrationLevel,
      experienceYears: schema.bahrainLawyers.experienceYears,
      language: schema.bahrainLawyers.language,
      workingHours: schema.bahrainLawyers.workingHours,
      specialtyMain: schema.bahrainLawyers.specialtyMain,
      specialtySubs: schema.bahrainLawyers.specialtySubs,
      profileImageUrl: schema.bahrainLawyers.profileImageUrl,
      profileImageMimeType: schema.bahrainLawyers.profileImageMimeType,
      profileImageBase64: schema.bahrainLawyers.profileImageBase64,
      licenseExpiryDate: schema.bahrainLawyers.licenseExpiryDate,
      createdAt: schema.bahrainLawyers.createdAt,

      rating: sql<number>`coalesce((
        select avg(review_rows.rating)::float
        from (
          select ${schema.emergencyRequests.ratingStars}::float as rating
          from ${schema.emergencyRequests}
          where ${schema.emergencyRequests.assignedLawyerId} = "bahrain_lawyers"."id"
            and ${schema.emergencyRequests.countryCode} = "bahrain_lawyers"."country_code"
            and ${schema.emergencyRequests.ratingStars} is not null

          union all

          select ${schema.bookingReviews.lawyerRating}::float as rating
          from ${schema.bookingReviews}
          where ${schema.bookingReviews.lawyerId} = "bahrain_lawyers"."id"
            and ${schema.bookingReviews.countryCode} = "bahrain_lawyers"."country_code"
            and ${schema.bookingReviews.status} = 'submitted'
            and ${schema.bookingReviews.lawyerRating} is not null
        ) review_rows
        where review_rows.rating between 1 and 5
      ), 0)`,

      reviewCount: sql<number>`coalesce((
        select count(*)::int
        from (
          select ${schema.emergencyRequests.ratingStars}::float as rating
          from ${schema.emergencyRequests}
          where ${schema.emergencyRequests.assignedLawyerId} = "bahrain_lawyers"."id"
            and ${schema.emergencyRequests.countryCode} = "bahrain_lawyers"."country_code"
            and ${schema.emergencyRequests.ratingStars} is not null

          union all

          select ${schema.bookingReviews.lawyerRating}::float as rating
          from ${schema.bookingReviews}
          where ${schema.bookingReviews.lawyerId} = "bahrain_lawyers"."id"
            and ${schema.bookingReviews.countryCode} = "bahrain_lawyers"."country_code"
            and ${schema.bookingReviews.status} = 'submitted'
            and ${schema.bookingReviews.lawyerRating} is not null
        ) review_rows
        where review_rows.rating between 1 and 5
      ), 0)`,

      reviewComments: sql<PublicLawyerReviewComment[]>`coalesce((
        select json_agg(
          json_build_object(
            'stars', review_rows.rating_stars,
            'comment', coalesce(review_rows.rating_comment, ''),
            'createdAt', review_rows.created_at,
            'customerName', coalesce(review_rows.customer_name, '')
          )
          order by review_rows.created_at desc
        )
        from (
          select *
          from (
            select
              ${schema.emergencyRequests.ratingStars}::int as rating_stars,
              ${schema.emergencyRequests.ratingComment} as rating_comment,
              ${schema.emergencyRequests.createdAt} as created_at,
              ${schema.emergencyRequests.contactName} as customer_name
            from ${schema.emergencyRequests}
            where ${schema.emergencyRequests.assignedLawyerId} = "bahrain_lawyers"."id"
              and ${schema.emergencyRequests.countryCode} = "bahrain_lawyers"."country_code"
              and ${schema.emergencyRequests.ratingStars} is not null

            union all

            select
              ${schema.bookingReviews.lawyerRating}::int as rating_stars,
              ${schema.bookingReviews.lawyerComment} as rating_comment,
              ${schema.bookingReviews.submittedAt} as created_at,
              ${schema.bookingReviews.customerName} as customer_name
            from ${schema.bookingReviews}
            where ${schema.bookingReviews.lawyerId} = "bahrain_lawyers"."id"
              and ${schema.bookingReviews.countryCode} = "bahrain_lawyers"."country_code"
              and ${schema.bookingReviews.status} = 'submitted'
              and ${schema.bookingReviews.publicComment} = true
              and ${schema.bookingReviews.lawyerRating} is not null
          ) all_reviews
          where all_reviews.rating_stars between 1 and 5
          order by all_reviews.created_at desc
        ) review_rows
      ), '[]'::json)`,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.countryCode, normalizedCountryCode),
        eq(schema.bahrainLawyers.isReviewAccount, false),
        eq(schema.bahrainLawyers.isPublicDirectoryVisible, true),
        providerServiceEligibilityCondition(),
      ),
    )
    .orderBy(desc(schema.bahrainLawyers.createdAt));

  return rows.map((row) => {
    const subscriptionType = normalizeSubscriptionType(row.subscriptionType);
    const subscriptionTypes = providerRoles({
      subscriptionType,
      subscriptionTypes: row.subscriptionTypes,
    });

    const specialtyMain = normalizeSpecialty(row.specialtyMain);
    const specialtySubs = normalizeSpecialtySubs(row.specialtySubs);
    const specialties = Array.from(
      new Set([specialtyMain, ...specialtySubs].filter(Boolean)),
    ) as PublicLawyerSpecialty[];

    return {
      id: row.id,
      countryCode: row.countryCode,
      slug: getLawyerSlug(row),

      subscriptionType,
      subscriptionTypes,

      nameAr: row.fullNameAr ?? "",
      nameEn: row.fullNameEn ?? row.fullNameAr ?? "",

      subtitleAr: getRegistrationSubtitleAr(
        row.registrationLevel,
        subscriptionType,
      ),
      subtitleEn: getRegistrationSubtitleEn(
        row.registrationLevel,
        subscriptionType,
      ),

      registrationNo: row.registrationNo ?? "",
      membershipNo: row.membershipNo ?? null,
      registrationLevel: row.registrationLevel ?? null,

      experienceYears: row.experienceYears ?? 0,
      language: row.language ?? "",
      workingHours: row.workingHours ?? "",

      specialtyMain,
      specialtySubs,
      specialties,

      image: getProfileImage(row),
      badgeType: getBadgeType(row.registrationLevel, subscriptionType),

      rating: toNumber(row.rating),
      reviewCount: toNumber(row.reviewCount),
      reviewComments: normalizeReviewComments(row.reviewComments),

      licenseExpiryDate: row.licenseExpiryDate ?? null,
      createdAt: row.createdAt,
    };
  });
}

export async function getPublicLawyerBySlug(
  slug: string,
  countryCode: string = PUBLIC_LAWYERS_BH_COUNTRY,
) {
  const lawyers = await getPublicLawyers(countryCode);

  return lawyers.find((lawyer) => lawyer.slug === slug) ?? null;
}
