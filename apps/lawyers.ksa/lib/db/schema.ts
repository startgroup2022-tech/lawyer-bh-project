import {
  check,
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  json,
  varchar,
  decimal,
  index,
  uniqueIndex,
  pgEnum,
  date,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const partyRoleEnum = pgEnum("party_role", ["client", "advocate"]);

export const idTypeEnum = pgEnum("id_type", [
  "cpr",
  "residence",
  "passport",
]);

export const caseTypeEnum = pgEnum("emergency_case_type", [
  "emergency_arrest",
  "emergency_search",
  "emergency_travel_ban",
  "emergency_evidence",
  "emergency_report",
  "emergency_consultation",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "refunded",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "none",
  "pending",
  "completed",
  "failed",
]);

export const serviceStatusEnum = pgEnum("service_status", [
  "pending",
  "mobilizing",
  "arrived",
  "completed",
  "cancelled",
  "disputed",
]);

export const agreementStatusEnum = pgEnum("agreement_status", [
  "draft",
  "sent",
  "signed",
  "void",
]);

export const feeTypeEnum = pgEnum("agreement_fee_type", [
  "fixed",
  "contingency",
]);

export const feeBasisEnum = pgEnum("agreement_fee_basis", [
  "judgment",
  "settlement",
  "enforcement",
]);

export const providerSubscriptionTypeEnum = pgEnum(
  "provider_subscription_type",
  [
    "lawyer",
    "consultant",
    "mediator",
    "arbitrator",
    "expert",
    "private_executor",
    "private_notary",
    "translator",
  ],
);

export const providerApplicationStatusEnum = pgEnum(
  "provider_application_status",
  ["pending", "approved", "rejected", "suspended"],
);

export const adminRoleEnum = pgEnum("admin_role", [
  "super_admin",
  "admin",
  "reviewer",
]);

export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);
export const discountRedemptionStatusEnum = pgEnum("discount_redemption_status", [
  "reserved",
  "redeemed",
  "released",
  "failed",
]);

export const countries = pgTable(
  "countries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 2 }).notNull(),
    tablePrefix: varchar("table_prefix", { length: 16 }).notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    phoneCode: varchar("phone_code", { length: 8 }),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    defaultLocale: varchar("default_locale", { length: 5 }).default("ar").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    tablesProvisioned: boolean("tables_provisioned").default(false).notNull(),
    provisionedAt: timestamp("provisioned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("countries_code_unique_idx").on(t.code),
    uniqueIndex("countries_table_prefix_unique_idx").on(t.tablePrefix),
    index("countries_active_idx").on(t.isActive),
  ],
);

export const consentLog = pgTable(
  "saudi_consent_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),
    fullName: text("full_name").notNull(),
    idType: idTypeEnum("id_type").notNull(),
    idNumber: text("id_number").notNull(),
    role: partyRoleEnum("role").notNull(),
    signatureDataUrl: text("signature_data_url"),
    contractTextHash: text("contract_text_hash").notNull(),
    locale: varchar("locale", { length: 5 }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    signedPdfBase64: text("signed_pdf_base64"),
    consentedAt: timestamp("consented_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("consent_log_id_number_idx").on(t.idNumber),
    index("consent_log_role_idx").on(t.role),
    index("saudi_consent_log_country_code_idx").on(t.countryCode),
  ],
);


export const saudiLawyers = pgTable("saudi_lawyers", {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),

    // Optional source id used when a profile is pre-filled from an external list.
    notaryId: text("notary_id"),

    subscriptionType: providerSubscriptionTypeEnum("subscription_type")
      .default("lawyer")
      .notNull(),

    fullNameAr: text("full_name_ar").notNull(),
    fullNameEn: text("full_name_en").notNull(),

    registrationNo: text("registration_no").notNull(),
    registrationLevel: text("registration_level").$type<
      "cassation_lawyer" | "practicing_lawyer" | "trainee_lawyer" | null
    >(),
    ibanNumber: text("iban_number"),

    crNumber: text("cr_number"),
    institutionLicenseFileName: text("institution_license_file_name"),
    institutionLicenseFileMimeType: text("institution_license_file_mime_type"),
    institutionLicenseFileUrl: text("institution_license_file_url"),
    institutionLicenseFileBlobPath: text("institution_license_file_blob_path"),

    ibanCertificateFileName: text("iban_certificate_file_name"),
    ibanCertificateFileMimeType: text("iban_certificate_file_mime_type"),
    ibanCertificateFileUrl: text("iban_certificate_file_url"),
    ibanCertificateFileBlobPath: text("iban_certificate_file_blob_path"),

    personalIdFileName: text("personal_id_file_name"),
    personalIdFileMimeType: text("personal_id_file_mime_type"),
    personalIdFileUrl: text("personal_id_file_url"),
    personalIdFileBlobPath: text("personal_id_file_blob_path"),

    experienceYears: integer("experience_years").default(0).notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    passwordHash: text("password_hash"),

    language: text("language").default("Arabic").notNull(),
    workingHours: text("working_hours"),
    specialtyMain: text("specialty_main"),
    specialtySubs: json("specialty_subs").$type<string[]>().default([]).notNull(),

    specialties: json("specialties")
      .$type<{
        main: string;
        subs: string[];
      }>()
      .default({ main: "", subs: [] })
      .notNull(),
    profileImageFileName: text("profile_image_file_name"),
    profileImageMimeType: text("profile_image_mime_type"),
    profileImageBase64: text("profile_image_base64"),

    profileImageUrl: text("profile_image_url"),
    profileImageBlobPath: text("profile_image_blob_path"),

    licenseExpiryDate: date("license_expiry_date", { mode: "string" }),
    licenseFileName: text("license_file_name"),
    licenseFileMimeType: text("license_file_mime_type"),
    licenseFileBase64: text("license_file_base64"),
    licenseFileUrl: text("license_file_url"),
    licenseFileBlobPath: text("license_file_blob_path"),

    signatureDataUrl: text("signature_data_url"),
    signatureImageUrl: text("signature_image_url"),
    signatureImageBlobPath: text("signature_image_blob_path"),

    agreementAccepted: boolean("agreement_accepted").default(false).notNull(),

    status: providerApplicationStatusEnum("status").default("pending").notNull(),

    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    rejectionReason: text("rejection_reason"),
    suspensionType: text("suspension_type").$type<
      | "bad_service"
      | "license_expired"
      | "complaints"
      | "documents_invalid"
      | "other"
    >(),
    suspensionReason: text("suspension_reason"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedBy: text("suspended_by"),
    isEmergencyReady: boolean("is_emergency_ready").default(false).notNull(),
    emergencyRadiusKm: integer("emergency_radius_km").default(20).notNull(),

    emergencyRates: json("emergency_rates").$type<{
      emergency_arrest?: number;
      emergency_search?: number;
      emergency_travel_ban?: number;
      emergency_evidence?: number;
      emergency_report?: number;
      emergency_consultation?: number;
    }>(),

    baseLocation: json("base_location").$type<{
      lat: number;
      lng: number;
      address?: string;
    }>(),

    consentId: uuid("consent_id").references(() => consentLog.id),
    membershipNo: text("membership_no"),
    isActive: boolean("is_active").default(false).notNull(),

    locale: varchar("locale", { length: 5 }).default("ar").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    inviteToken: text("invite_token"),
    inviteTokenExpiresAt: timestamp("invite_token_expires_at", {
      withTimezone: true,
    }),
    profileCompleted: boolean("profile_completed").default(false).notNull(),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    completedProfileAt: timestamp("completed_profile_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("saudi_lawyers_notary_id_idx").on(t.notaryId),
    uniqueIndex("saudi_lawyers_registration_no_unique_idx").on(t.registrationNo),
    uniqueIndex("saudi_lawyers_membership_no_unique_idx").on(t.membershipNo),
    uniqueIndex("saudi_lawyers_email_unique_idx").on(t.email),
    index("saudi_lawyers_phone_idx").on(t.phone),
    index("saudi_lawyers_status_idx").on(t.status),
    index("saudi_lawyers_subscription_type_idx").on(t.subscriptionType),
    index("saudi_lawyers_active_idx").on(t.isActive),
    index("saudi_lawyers_created_idx").on(t.createdAt),
    index("saudi_lawyers_country_code_idx").on(t.countryCode),
  ],
);


export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    phone: varchar("phone", { length: 32 }),
    avatarUrl: text("avatar_url"),

    role: adminRoleEnum("role").default("admin").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    permissions: jsonb("permissions").$type<Record<string, boolean>>().default({}).notNull(),

    createdByAdminId: uuid("created_by_admin_id"),
    permissionsUpdatedByAdminId: uuid("permissions_updated_by_admin_id"),
    permissionsUpdatedAt: timestamp("permissions_updated_at", { withTimezone: true }),

    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("admin_users_email_unique_idx").on(t.email),
    index("admin_users_role_idx").on(t.role),
    index("admin_users_active_idx").on(t.isActive),
  ],
);

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull(),
    discountType: discountTypeEnum("discount_type").notNull(),
    discountValue: numeric("discount_value", { precision: 12, scale: 3 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    totalUsageLimit: integer("total_usage_limit"),
    perUserUsageLimit: integer("per_user_usage_limit"),
    createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("discount_codes_code_unique_idx").on(t.code),
    index("discount_codes_active_window_idx").on(t.isActive, t.startsAt, t.endsAt),
    check("discount_codes_value_check", sql`${t.discountValue} > 0 AND (${t.discountType} <> 'percentage' OR ${t.discountValue} <= 100)`),
    check("discount_codes_window_check", sql`${t.startsAt} IS NULL OR ${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`),
    check("discount_codes_total_limit_check", sql`${t.totalUsageLimit} IS NULL OR ${t.totalUsageLimit} > 0`),
    check("discount_codes_user_limit_check", sql`${t.perUserUsageLimit} IS NULL OR ${t.perUserUsageLimit} > 0`),
  ],
);


export const advocateShifts = pgTable(
  "saudi_advocate_shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),
    advocateId: uuid("advocate_id")
      .references(() => saudiLawyers.id, { onDelete: "cascade" })
      .notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    startMinuteUtc: integer("start_minute_utc").notNull(),
    endMinuteUtc: integer("end_minute_utc").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("advocate_shifts_advocate_idx").on(t.advocateId),
    index("saudi_advocate_shifts_country_code_idx").on(t.countryCode),
  ],
);

export const lawyerPushSubscriptions = pgTable(
  "saudi_lawyer_push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),
    advocateId: uuid("advocate_id")
      .references(() => saudiLawyers.id, { onDelete: "cascade" })
      .notNull(),
    endpoint: text("endpoint").notNull().unique(),
    p256dhKey: text("p256dh_key").notNull(),
    authKey: text("auth_key").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("lawyer_push_advocate_idx").on(t.advocateId),
    index("saudi_lawyer_push_subscriptions_country_code_idx").on(
      t.countryCode,
    ),
  ],
);

export const emergencyCaseTypes = pgTable(
  "saudi_emergency_case_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),
    slug: text("slug").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar").notNull(),
    descriptionEn: text("description_en").notNull(),
    actionTypeAr: text("action_type_ar").notNull(),
    actionTypeEn: text("action_type_en").notNull(),
    price: decimal("price", { precision: 10, scale: 3 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).default("SAR").notNull(),
    iconKey: varchar("icon_key", { length: 64 })
      .default("shield-alert")
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("saudi_emergency_case_types_slug_unique_idx").on(t.slug),
    index("saudi_emergency_case_types_active_sort_idx").on(
      t.isActive,
      t.sortOrder,
    ),
    index("saudi_emergency_case_types_country_code_idx").on(t.countryCode),
  ],
);

export const consultationMethods = pgTable(
  "saudi_consultation_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    price: decimal("price", { precision: 10, scale: 3 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).default("SAR").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    iconKey: varchar("icon_key", { length: 64 }).default("phone").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("saudi_consultation_methods_code_unique_idx").on(t.code),
    index("saudi_consultation_methods_active_sort_idx").on(
      t.isActive,
      t.sortOrder,
    ),
    index("saudi_consultation_methods_country_code_idx").on(t.countryCode),
  ],
);

export const emergencyRequests = pgTable(
  "saudi_emergency_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),
    caseRef: text("case_ref").notNull().unique(),
    consentId: uuid("consent_id").references(() => consentLog.id),
    caseType: caseTypeEnum("case_type").notNull(),
    description: text("description"),
    location: json("location").$type<{
      lat: number;
      lng: number;
      accuracy?: number;
      address?: string;
    }>(),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    contactIdNumber: text("contact_id_number"),
    legacyBaseFeeBhd: decimal("base_fee_bhd", {
      precision: 10,
      scale: 3,
    }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).default("SAR").notNull(),
    baseFee: decimal("base_fee", { precision: 10, scale: 3 }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status")
      .default("pending")
      .notNull(),
    paymentRef: text("payment_ref"),
    serviceStatus: serviceStatusEnum("service_status")
      .default("pending")
      .notNull(),
    assignedLawyerId: uuid("assigned_lawyer_id").references(
      () => saudiLawyers.id,
    ),
    responseTimestamp: timestamp("response_timestamp", { withTimezone: true }),
    arrivalTimestamp: timestamp("arrival_timestamp", { withTimezone: true }),
    completedTimestamp: timestamp("completed_timestamp", {
      withTimezone: true,
    }),
    ratingStars: integer("rating_stars"),
    ratingComment: text("rating_comment"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    settledBy: text("settled_by"),
    internalNotes: json("internal_notes")
      .$type<Array<{ id: string; actor: string; body: string; ts: string }>>()
      .default([]),
    cancellationReason: text("cancellation_reason"),
    refundStatus: refundStatusEnum("refund_status").default("none").notNull(),
    refundAmountBhd: decimal("refund_amount_bhd", {
      precision: 10,
      scale: 3,
    }),
    refundAmount: decimal("refund_amount", { precision: 10, scale: 3 }),
    refundRef: text("refund_ref"),
    refundMarkedAt: timestamp("refund_marked_at", { withTimezone: true }),
    refundMarkedBy: text("refund_marked_by"),
    lastAdvocateLocation: json("last_advocate_location").$type<{
      lat: number;
      lng: number;
      accuracy?: number;
      reportedAt: string;
    }>(),
    dispatchActorLog: json("dispatch_actor_log")
      .$type<Array<{ actor: string; action: string; ts: string }>>()
      .default([]),
    locale: varchar("locale", { length: 5 }).default("en").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("emergency_requests_case_ref_idx").on(t.caseRef),
    index("emergency_requests_status_idx").on(t.serviceStatus),
    index("emergency_requests_created_idx").on(t.createdAt),
    index("saudi_emergency_requests_country_code_idx").on(t.countryCode),
  ],
);

export const lawyerAgreements = pgTable(
  "saudi_lawyer_agreements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),
    reference: text("reference").notNull().unique(),
    status: agreementStatusEnum("status").default("draft").notNull(),

    lawyerName: text("lawyer_name").notNull(),
    lawyerLicenseNo: text("lawyer_license_no"),
    lawyerAddress: text("lawyer_address"),
    lawyerPhone: text("lawyer_phone"),
    lawyerEmail: text("lawyer_email").notNull(),

    clientName: text("client_name").notNull(),
    clientIdNo: text("client_id_no"),
    clientNationality: text("client_nationality"),
    clientAddress: text("client_address"),
    clientPhone: text("client_phone"),
    clientEmail: text("client_email").notNull(),

    subject: text("subject").notNull(),

    feeType: feeTypeEnum("fee_type").notNull(),
    feeFixedAmountBhd: decimal("fee_fixed_amount_bhd", {
      precision: 12,
      scale: 3,
    }),
    feeFixedInstallment: text("fee_fixed_installment"),
    feeContingencyPercent: decimal("fee_contingency_percent", {
      precision: 5,
      scale: 2,
    }),
    feeContingencyBasis: feeBasisEnum("fee_contingency_basis"),

    locale: varchar("locale", { length: 5 }).default("en").notNull(),
    contractVersion: text("contract_version").notNull(),
    contractTextHash: text("contract_text_hash").notNull(),

    signToken: text("sign_token"),
    signTokenExpiresAt: timestamp("sign_token_expires_at", {
      withTimezone: true,
    }),

    signedAt: timestamp("signed_at", { withTimezone: true }),
    signedByName: text("signed_by_name"),
    signatureDataUrl: text("signature_data_url"),
    signedIp: text("signed_ip"),
    signedUserAgent: text("signed_user_agent"),
    signedPdfBase64: text("signed_pdf_base64"),

    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("lawyer_agreements_reference_idx").on(t.reference),
    index("lawyer_agreements_status_idx").on(t.status),
    index("lawyer_agreements_created_idx").on(t.createdAt),
    index("saudi_lawyer_agreements_country_code_idx").on(t.countryCode),
  ],
);

export const legalCaseCategories = pgTable(
  "saudi_legal_case_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),

    key: text("key").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),

    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),

    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("legal_case_categories_key_unique_idx").on(t.key),
    index("legal_case_categories_active_idx").on(t.isActive),
    index("legal_case_categories_sort_idx").on(t.sortOrder),
    index("saudi_legal_case_categories_country_code_idx").on(t.countryCode),
  ],
);

export const legalCases = pgTable(
  "saudi_legal_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),

    categoryId: uuid("category_id")
      .references(() => legalCaseCategories.id, { onDelete: "cascade" })
      .notNull(),

    key: text("key").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),

    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),

    keywordsAr: jsonb("keywords_ar").$type<string[]>().default([]).notNull(),
    keywordsEn: jsonb("keywords_en").$type<string[]>().default([]).notNull(),

    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("legal_cases_key_unique_idx").on(t.key),
    index("legal_cases_category_idx").on(t.categoryId),
    index("legal_cases_active_idx").on(t.isActive),
    index("legal_cases_sort_idx").on(t.sortOrder),
    index("saudi_legal_cases_country_code_idx").on(t.countryCode),
  ],
);

export type LegalCaseGuidanceDocuments = string[];

/**
 * إرشادات أولية معتمدة يستخدمها YourGPT بعد تصنيف نوع القضية.
 *
 * هذا الكتالوج عام لكل الدول لأنه مرتبط بالمفتاح الثابت للقضية، وليس بمعرف
 * السجل داخل جدول دولة بعينها.
 */
export const legalCaseGuidance = pgTable(
  "legal_case_guidance",
  {
    legalCaseKey: text("legal_case_key").primaryKey(),
    guidanceAr: text("guidance_ar").notNull(),
    guidanceEn: text("guidance_en").notNull(),
    documentsAr: jsonb("documents_ar")
      .$type<LegalCaseGuidanceDocuments>()
      .default([])
      .notNull(),
    documentsEn: jsonb("documents_en")
      .$type<LegalCaseGuidanceDocuments>()
      .default([])
      .notNull(),
    clarifyingQuestionAr: text("clarifying_question_ar"),
    clarifyingQuestionEn: text("clarifying_question_en"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("legal_case_guidance_active_idx").on(t.isActive),
  ],
);

export const lawyerLegalCases = pgTable(
  "saudi_lawyer_legal_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),

    lawyerId: uuid("lawyer_id")
      .references(() => saudiLawyers.id, { onDelete: "cascade" })
      .notNull(),

    legalCaseId: uuid("legal_case_id")
      .references(() => legalCases.id, { onDelete: "cascade" })
      .notNull(),

    isPrimary: boolean("is_primary").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("lawyer_legal_cases_lawyer_case_unique_idx").on(
      t.lawyerId,
      t.legalCaseId,
    ),
    index("lawyer_legal_cases_lawyer_idx").on(t.lawyerId),
    index("lawyer_legal_cases_case_idx").on(t.legalCaseId),
    index("saudi_lawyer_legal_cases_country_code_idx").on(t.countryCode),
  ],
);

export const bookingRequests = pgTable(
  "saudi_booking_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),

    lang: text("lang").notNull().default("ar"),

    service: text("service").notNull(),

    consultationType: text("consultation_type").notNull(),
    consultationMethod: text("consultation_method").notNull(),
    consultationPrice: text("consultation_price").notNull(),
    amountBd: numeric("amount_bd", { precision: 10, scale: 3 }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(0),
    videoProvider: text("video_provider"),

    appointmentDate: text("appointment_date").notNull(),
    appointmentTime: text("appointment_time").notNull(),

    assignmentMode: text("assignment_mode").notNull(), // office | lawyer

    selectedOfficeId: text("selected_office_id"),
    selectedOfficeName: text("selected_office_name"),
    legalCaseId: uuid("legal_case_id").references(() => legalCases.id),
    selectedLawyerId: uuid("selected_lawyer_id").references(() => saudiLawyers.id),
    selectedLawyerName: text("selected_lawyer_name"),

    assignedToEmail: text("assigned_to_email").notNull(),

    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerMessage: text("customer_message"),

    paymentStatus: text("payment_status").notNull().default("pending_payment"),
    adminStatus: text("admin_status").notNull().default("pending_review"),

    tapChargeId: text("tap_charge_id"),
    tapStatus: text("tap_status"),
    mobilePaymentIdempotencyKey: uuid("mobile_payment_idempotency_key"),
    mobilePaymentCaseId: text("mobile_payment_case_id"),
    discountCodeId: uuid("discount_code_id").references(() => discountCodes.id, { onDelete: "set null" }),
    discountCode: varchar("discount_code", { length: 32 }),
    originalAmountBd: numeric("original_amount_bd", { precision: 10, scale: 3 }),
    discountAmountBd: numeric("discount_amount_bd", { precision: 10, scale: 3 }),
    finalAmountBd: numeric("final_amount_bd", { precision: 10, scale: 3 }),

    requestPayload: jsonb("request_payload").notNull().default({}),
    tapPayload: jsonb("tap_payload"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("booking_requests_assigned_to_email_idx").on(t.assignedToEmail),
    index("booking_requests_payment_status_idx").on(t.paymentStatus),
    index("booking_requests_admin_status_idx").on(t.adminStatus),
    index("booking_requests_tap_charge_id_idx").on(t.tapChargeId),
    uniqueIndex("saudi_booking_mobile_payment_idempotency_uidx")
      .on(t.mobilePaymentIdempotencyKey)
      .where(sql`${t.mobilePaymentIdempotencyKey} IS NOT NULL`),
    index("saudi_booking_mobile_payment_case_idx")
      .on(t.mobilePaymentCaseId)
      .where(sql`${t.mobilePaymentCaseId} IS NOT NULL`),
    index("booking_requests_selected_lawyer_id_idx").on(t.selectedLawyerId),
    index("booking_requests_legal_case_idx").on(t.legalCaseId),
    index("booking_requests_created_at_idx").on(t.createdAt),
    index("saudi_booking_requests_country_code_idx").on(t.countryCode),
  ],
);

export const discountRedemptions = pgTable(
  "discount_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discountCodeId: uuid("discount_code_id").references(() => discountCodes.id, { onDelete: "restrict" }).notNull(),
    bookingRequestId: uuid("booking_request_id").references(() => bookingRequests.id, { onDelete: "set null" }),
    userKey: varchar("user_key", { length: 254 }).notNull(),
    flow: varchar("flow", { length: 32 }).notNull(),
    originalAmountBd: numeric("original_amount_bd", { precision: 10, scale: 3 }).notNull(),
    discountAmountBd: numeric("discount_amount_bd", { precision: 10, scale: 3 }).notNull(),
    finalAmountBd: numeric("final_amount_bd", { precision: 10, scale: 3 }).notNull(),
    status: discountRedemptionStatusEnum("status").default("reserved").notNull(),
    tapChargeId: text("tap_charge_id"),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("discount_redemptions_booking_code_unique_idx").on(t.bookingRequestId, t.discountCodeId),
    index("discount_redemptions_code_status_idx").on(t.discountCodeId, t.status),
    index("discount_redemptions_code_user_status_idx").on(t.discountCodeId, t.userKey, t.status),
    uniqueIndex("discount_redemptions_tap_charge_unique_idx").on(t.tapChargeId),
  ],
);


/**
 * نسب المنصة ومزود الخدمة.
 *
 * يمكن أن يكون لكل محامي أكثر من نسبة بحسب الفترة الزمنية:
 *
 * السنة الأولى:
 * platform_percentage = 20
 * provider_percentage = 80
 *
 * بعد السنة الأولى:
 * platform_percentage = 50
 * provider_percentage = 50
 */
export const tapRetailerOnboarding = pgTable(
  "saudi_tap_retailer_onboarding",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => saudiLawyers.id, { onDelete: "cascade" }),
    environment: text("environment").$type<"test" | "live">().notNull(),
    marketplaceMid: text("marketplace_mid").notNull(),
    stage: text("stage")
      .$type<
        | "pending_admin"
        | "tap_uploading_files"
        | "tap_creating_lead"
        | "tap_creating_retailer"
        | "tap_kyc_pending"
        | "tap_failed"
        | "active"
      >()
      .default("pending_admin")
      .notNull(),
    commercialRegistrationFileId: text("commercial_registration_file_id"),
    personalIdFileId: text("personal_id_file_id"),
    ibanCertificateFileId: text("iban_certificate_file_id"),
    leadId: text("lead_id"),
    retailerId: text("retailer_id"),
    destinationId: text("destination_id"),
    kycStatus: text("kyc_status").default("pending").notNull(),
    payoutEnabled: boolean("payout_enabled").default(false).notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    lastCompletedStage: text("last_completed_stage"),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "tap_retailer_onboarding_environment_check",
      sql`${t.environment} IN ('test', 'live')`,
    ),
    check(
      "tap_retailer_onboarding_stage_check",
      sql`${t.stage} IN ('pending_admin', 'tap_uploading_files', 'tap_creating_lead', 'tap_creating_retailer', 'tap_kyc_pending', 'tap_failed', 'active')`,
    ),
    check(
      "tap_retailer_onboarding_attempt_count_check",
      sql`${t.attemptCount} >= 0`,
    ),
    uniqueIndex("tap_retailer_onboarding_lawyer_env_unique_idx").on(
      t.lawyerId,
      t.environment,
    ),
    uniqueIndex("tap_retailer_onboarding_lead_env_unique_idx")
      .on(t.environment, t.leadId)
      .where(sql`${t.leadId} IS NOT NULL`),
    uniqueIndex("tap_retailer_onboarding_retailer_env_unique_idx")
      .on(t.environment, t.retailerId)
      .where(sql`${t.retailerId} IS NOT NULL`),
    uniqueIndex("tap_retailer_onboarding_destination_env_unique_idx")
      .on(t.environment, t.destinationId)
      .where(sql`${t.destinationId} IS NOT NULL`),
    index("tap_retailer_onboarding_stage_idx").on(t.stage),
    index("tap_retailer_onboarding_retailer_idx").on(t.retailerId),
  ],
);

export const providerCommissionRates = pgTable(
  "saudi_provider_commission_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    countryCode: varchar("country_code", { length: 2 })
      .default("SA")
      .notNull(),

    providerId: uuid("provider_id")
      .notNull()
      .references(() => saudiLawyers.id, {
        onDelete: "cascade",
      }),

    platformPercentage: numeric("platform_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),

    providerPercentage: numeric("provider_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),

    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    }).notNull(),

    effectiveTo: timestamp("effective_to", {
      withTimezone: true,
    }),

    isActive: boolean("is_active").default(true).notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex(
      "provider_commission_rates_provider_start_unique_idx",
    ).on(t.providerId, t.effectiveFrom),

    index("provider_commission_rates_provider_idx").on(
      t.providerId,
    ),

    index("provider_commission_rates_active_idx").on(
      t.isActive,
    ),

    index("provider_commission_rates_effective_idx").on(
      t.effectiveFrom,
      t.effectiveTo,
    ),

    index("provider_commission_rates_country_idx").on(
      t.countryCode,
    ),
  ],
);

/**
 * توزيع المبلغ لكل عملية دفع ناجحة.
 *
 * نحفظ النسب هنا كـ Snapshot حتى لو تغيرت نسبة المحامي
 * مستقبلًا تبقى العمليات السابقة بنفس النسبة التي طُبقت وقت الدفع.
 */
export const paymentAllocations = pgTable(
  "saudi_payment_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    countryCode: varchar("country_code", { length: 2 })
      .default("SA")
      .notNull(),

    bookingRequestId: uuid("booking_request_id")
      .notNull()
      .references(() => bookingRequests.id, {
        onDelete: "cascade",
      }),

    providerId: uuid("provider_id").references(
      () => saudiLawyers.id,
      {
        onDelete: "set null",
      },
    ),

    commissionRateId: uuid("commission_rate_id").references(
      () => providerCommissionRates.id,
      {
        onDelete: "set null",
      },
    ),

    tapChargeId: text("tap_charge_id").notNull(),

    currencyCode: varchar("currency_code", {
      length: 3,
    })
      .default("SAR")
      .notNull(),

    // المبلغ الإجمالي المدفوع من العميل
    grossAmount: numeric("gross_amount", {
      precision: 12,
      scale: 3,
    }).notNull(),

    // النسب وقت تنفيذ العملية
    platformPercentage: numeric("platform_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),

    providerPercentage: numeric("provider_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),

    // مبلغ المنصة
    platformAmount: numeric("platform_amount", {
      precision: 12,
      scale: 3,
    }).notNull(),

    // مبلغ المحامي
    providerAmount: numeric("provider_amount", {
      precision: 12,
      scale: 3,
    }).notNull(),

    // رسوم بوابة الدفع، يمكن تحديثها لاحقًا
    gatewayFeeAmount: numeric("gateway_fee_amount", {
      precision: 12,
      scale: 3,
    })
      .default("0.000")
      .notNull(),

    splitMode: text("split_mode")
      .$type<"legacy" | "platform_only" | "instant" | "delayed">()
      .default("legacy")
      .notNull(),

    destinationId: text("destination_id"),

    splitExecutedAt: timestamp("split_executed_at", {
      withTimezone: true,
    }),

    splitError: text("split_error"),

    allocationStatus: text("allocation_status")
      .default("calculated")
      .notNull(),

    payoutStatus: text("payout_status")
      .default("pending")
      .notNull(),

    capturedAt: timestamp("captured_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    paidOutAt: timestamp("paid_out_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "payment_allocations_split_mode_check",
      sql`${t.splitMode} IN ('legacy', 'platform_only', 'instant', 'delayed')`,
    ),
    uniqueIndex(
      "payment_allocations_booking_unique_idx",
    ).on(t.bookingRequestId),

    uniqueIndex(
      "payment_allocations_tap_charge_unique_idx",
    ).on(t.tapChargeId),

    index("payment_allocations_provider_idx").on(
      t.providerId,
    ),

    index("payment_allocations_payout_status_idx").on(
      t.payoutStatus,
    ),

    index("payment_allocations_captured_at_idx").on(
      t.capturedAt,
    ),

    index("payment_allocations_country_idx").on(
      t.countryCode,
    ),

    index("payment_allocations_split_mode_idx").on(
      t.splitMode,
    ),
  ],
);

export const bookingReviews = pgTable(
  "saudi_booking_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("SA").notNull(),

    bookingRequestId: uuid("booking_request_id")
      .notNull()
      .references(() => bookingRequests.id, { onDelete: "cascade" }),

    lawyerId: uuid("lawyer_id").references(() => saudiLawyers.id, {
      onDelete: "set null",
    }),

    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),

    service: text("service"),
    consultationType: text("consultation_type"),
    appointmentDate: text("appointment_date"),
    appointmentTime: text("appointment_time"),
    providerName: text("provider_name"),

    reviewTokenHash: text("review_token_hash").notNull(),
    reviewUrl: text("review_url"),

    reviewEmailStatus: text("review_email_status").default("pending").notNull(),
    reviewEmailSentAt: timestamp("review_email_sent_at", {
      withTimezone: true,
    }),
    reviewEmailSkippedAt: timestamp("review_email_skipped_at", {
      withTimezone: true,
    }),
    reviewEmailError: text("review_email_error"),

    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),

    status: text("status").default("pending").notNull(),

    lawyerRating: integer("lawyer_rating"),
    serviceSpeedRating: integer("service_speed_rating"),
    serviceQualityRating: integer("service_quality_rating"),
    providerCommunicationRating: integer("provider_communication_rating"),
    appointmentCommitmentRating: integer("appointment_commitment_rating"),
    platformEaseRating: integer("platform_ease_rating"),
    overallRating: integer("overall_rating"),

    lawyerComment: text("lawyer_comment"),
    serviceComment: text("service_comment"),
    publicComment: boolean("public_comment").default(true).notNull(),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("booking_reviews_booking_request_unique_idx").on(
      t.bookingRequestId,
    ),
    uniqueIndex("booking_reviews_token_hash_unique_idx").on(t.reviewTokenHash),
    index("booking_reviews_lawyer_idx").on(t.lawyerId),
    index("booking_reviews_status_idx").on(t.status),
    index("booking_reviews_submitted_at_idx").on(t.submittedAt),
    index("booking_reviews_lawyer_submitted_idx").on(
      t.lawyerId,
      t.submittedAt,
    ),
    index("saudi_booking_reviews_country_code_idx").on(t.countryCode),
  ],
);


export type CountryRow = typeof countries.$inferSelect;
export type CountryInsert = typeof countries.$inferInsert;

export type ConsentLogRow = typeof consentLog.$inferSelect;
export type ConsentLogInsert = typeof consentLog.$inferInsert;

export type LawyerMetaRow = typeof saudiLawyers.$inferSelect;
export type LawyerMetaInsert = typeof saudiLawyers.$inferInsert;

export type EmergencyCaseTypeRow = typeof emergencyCaseTypes.$inferSelect;
export type EmergencyCaseTypeInsert = typeof emergencyCaseTypes.$inferInsert;

export type EmergencyRequestRow = typeof emergencyRequests.$inferSelect;
export type EmergencyRequestInsert = typeof emergencyRequests.$inferInsert;

export type LawyerPushSubRow = typeof lawyerPushSubscriptions.$inferSelect;
export type LawyerPushSubInsert = typeof lawyerPushSubscriptions.$inferInsert;

export type AdvocateShiftRow = typeof advocateShifts.$inferSelect;
export type AdvocateShiftInsert = typeof advocateShifts.$inferInsert;

export type LawyerAgreementRow = typeof lawyerAgreements.$inferSelect;
export type LawyerAgreementInsert = typeof lawyerAgreements.$inferInsert;

export type BookingRequestRow = typeof bookingRequests.$inferSelect;
export type BookingRequestInsert = typeof bookingRequests.$inferInsert;

export type BookingReviewRow = typeof bookingReviews.$inferSelect;
export type BookingReviewInsert = typeof bookingReviews.$inferInsert;

export type LegalCaseCategoryRow = typeof legalCaseCategories.$inferSelect;
export type LegalCaseCategoryInsert = typeof legalCaseCategories.$inferInsert;

export type LegalCaseRow = typeof legalCases.$inferSelect;
export type LegalCaseInsert = typeof legalCases.$inferInsert;
export type LegalCaseGuidanceRow = typeof legalCaseGuidance.$inferSelect;
export type LegalCaseGuidanceInsert = typeof legalCaseGuidance.$inferInsert;

export type LawyerLegalCaseRow = typeof lawyerLegalCases.$inferSelect;
export type LawyerLegalCaseInsert = typeof lawyerLegalCases.$inferInsert;

export type AdminUserRow = typeof adminUsers.$inferSelect;
export type AdminUserInsert = typeof adminUsers.$inferInsert;
export type DiscountCodeRow = typeof discountCodes.$inferSelect;
export type DiscountCodeInsert = typeof discountCodes.$inferInsert;
export type DiscountRedemptionRow = typeof discountRedemptions.$inferSelect;
export type DiscountRedemptionInsert = typeof discountRedemptions.$inferInsert;


export type ProviderCommissionRateRow =
  typeof providerCommissionRates.$inferSelect;

export type ProviderCommissionRateInsert =
  typeof providerCommissionRates.$inferInsert;

export type TapRetailerOnboardingRow =
  typeof tapRetailerOnboarding.$inferSelect;

export type TapRetailerOnboardingInsert =
  typeof tapRetailerOnboarding.$inferInsert;

export type PaymentAllocationRow =
  typeof paymentAllocations.$inferSelect;

export type PaymentAllocationInsert =
  typeof paymentAllocations.$inferInsert;
