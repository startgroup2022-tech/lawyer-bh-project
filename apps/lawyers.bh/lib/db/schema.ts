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
  time,
  smallint,
  jsonb,
  numeric,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mobileClientAccounts } from "./client-account-schema";
export * from './client-account-schema';
export * from "./saraya-schema";

// Visibility is deliberately separate from countries.isActive (which provisions tables).
export const countryChannelSettings = pgTable("country_channel_settings", {
  code: varchar("code", { length: 2 }).primaryKey(),
  appEnabled: boolean("app_enabled").default(false).notNull(),
  websiteEnabled: boolean("website_enabled").default(false).notNull(),
  websiteUrl: text("website_url"),
  lawyersPlatformEnabled: boolean("lawyers_platform_enabled")
    .default(false)
    .notNull(),
  legalSosEnabled: boolean("legal_sos_enabled").default(false).notNull(),
  lawyersPlatformUrl: text("lawyers_platform_url"),
  backgroundUrl: text("background_url"),
  // Mobile appearance knobs, managed from the admin panel. Opacity values are
  // whole percentages (0-100) so the admin UI and the app agree exactly.
  backgroundOpacity: integer("background_opacity").default(100).notNull(),
  backgroundOverlayOpacity: integer("background_overlay_opacity").default(0).notNull(),
  backgroundColor: text("background_color"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  "in_progress",
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

export const faqStatusEnum = pgEnum("faq_status", ["draft", "published"]);

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

export const legalSosLawyerOnboarding = pgTable(
  "legalsos_lawyer_onboarding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    professionalIdentifier: text("professional_identifier").notNull(),
    status: text("status")
      .$type<
        | "email_pending"
        | "profile_incomplete"
        | "submitted"
        | "expired"
        | "cancelled"
      >()
      .default("email_pending")
      .notNull(),
    verificationTokenHash: text("verification_token_hash"),
    verificationTokenExpiresAt: timestamp("verification_token_expires_at", {
      withTimezone: true,
    }),
    sessionTokenHash: text("session_token_hash"),
    sessionTokenExpiresAt: timestamp("session_token_expires_at", {
      withTimezone: true,
    }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    linkedLawyerId: uuid("linked_lawyer_id"),
    locale: varchar("locale", { length: 5 }).default("ar").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "legalsos_lawyer_onboarding_status_check",
      sql`${table.status} IN ('email_pending', 'profile_incomplete', 'submitted', 'expired', 'cancelled')`,
    ),
    check(
      "legalsos_lawyer_onboarding_country_check",
      sql`${table.countryCode} ~ '^[A-Z]{2}$'`,
    ),
    uniqueIndex("legalsos_lawyer_onboarding_email_active_uidx")
      .on(table.countryCode, table.normalizedEmail)
      .where(sql`${table.status} IN ('email_pending', 'profile_incomplete')`),
    uniqueIndex("legalsos_lawyer_onboarding_identifier_active_uidx")
      .on(table.countryCode, table.professionalIdentifier)
      .where(sql`${table.status} IN ('email_pending', 'profile_incomplete')`),
    uniqueIndex("legalsos_lawyer_onboarding_verification_token_uidx")
      .on(table.verificationTokenHash)
      .where(sql`${table.verificationTokenHash} IS NOT NULL`),
    uniqueIndex("legalsos_lawyer_onboarding_session_token_uidx")
      .on(table.sessionTokenHash)
      .where(sql`${table.sessionTokenHash} IS NOT NULL`),
    index("legalsos_lawyer_onboarding_status_idx").on(table.status),
    index("legalsos_lawyer_onboarding_linked_lawyer_idx")
      .on(table.linkedLawyerId)
      .where(sql`${table.linkedLawyerId} IS NOT NULL`),
  ],
);

export const legalSosLawyerOnboardingRateLimits = pgTable(
  "legalsos_lawyer_onboarding_rate_limits",
  {
    bucket: text("bucket").primaryKey(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .notNull(),
    count: integer("count").default(1).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "legalsos_lawyer_onboarding_rate_limit_count_check",
      sql`${table.count} > 0`,
    ),
    index("legalsos_lawyer_onboarding_rate_limits_updated_idx").on(
      table.updatedAt,
    ),
  ],
);

export const consentLog = pgTable(
  "bahrain_consent_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
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
    index("bahrain_consent_log_country_code_idx").on(t.countryCode),
  ],
);


export const bahrainLawyers = pgTable("bahrain_lawyers", {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),

    // Optional source id used when a profile is pre-filled from an external list.
    notaryId: text("notary_id"),

    subscriptionType: providerSubscriptionTypeEnum("subscription_type")
      .default("lawyer")
      .notNull(),
    subscriptionTypes: jsonb("subscription_types")
      .$type<
        (
          | "lawyer"
          | "consultant"
          | "mediator"
          | "arbitrator"
          | "expert"
          | "private_executor"
          | "private_notary"
          | "translator"
        )[]
      >()
      .default([])
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

    providerAgreementVersionId: uuid("provider_agreement_version_id"),
    providerAgreementDisclosed: boolean("provider_agreement_disclosed").default(false).notNull(),
    providerAgreementExtras: jsonb("provider_agreement_extras").$type<Record<string,string>>().default({}).notNull(),
    providerAgreementUploadHash: text("provider_agreement_upload_hash"),

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
    liveLocation: json("live_location").$type<{
      lat: number;
      lng: number;
      accuracy?: number;
      reportedAt: string;
    }>(),
    liveLocationUpdatedAt: timestamp("live_location_updated_at", {
      withTimezone: true,
    }),
    locationSharingEnabled: boolean("location_sharing_enabled")
      .default(false)
      .notNull(),

    consentId: uuid("consent_id").references(() => consentLog.id),
    membershipNo: text("membership_no"),
    isActive: boolean("is_active").default(false).notNull(),
    isReviewAccount: boolean("is_review_account").default(false).notNull(),
    isPublicDirectoryVisible: boolean("is_public_directory_visible")
      .default(true)
      .notNull(),

    locale: varchar("locale", { length: 5 }).default("ar").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    // Self-published profile fields, editable by the lawyer in the app.
    bio: text("bio"),
    city: text("city"),
    professionalTitle: text("professional_title"),
    professionalTitleEn: text("professional_title_en"),
    officeLocation: text("office_location"),
    languages: json("languages").$type<string[]>().default([]).notNull(),
    qualifications: json("qualifications")
      .$type<Array<{ title: string; institution?: string; year?: number }>>()
      .default([])
      .notNull(),
    consultationFee: decimal("consultation_fee", { precision: 10, scale: 3 }),
    acceptsOnline: boolean("accepts_online").default(false).notNull(),
    acceptsInperson: boolean("accepts_inperson").default(false).notNull(),
    profileStatus: text("profile_status").default("draft").notNull(),

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
    index("bahrain_lawyers_notary_id_idx").on(t.notaryId),
    uniqueIndex("bahrain_lawyers_registration_no_unique_idx").on(t.registrationNo),
    uniqueIndex("bahrain_lawyers_membership_no_unique_idx").on(t.membershipNo),
    uniqueIndex("bahrain_lawyers_email_unique_idx").on(t.email),
    index("bahrain_lawyers_phone_idx").on(t.phone),
    index("bahrain_lawyers_status_idx").on(t.status),
    index("bahrain_lawyers_subscription_type_idx").on(t.subscriptionType),
    index("bahrain_lawyers_active_idx").on(t.isActive),
    index("bahrain_lawyers_review_account_idx").on(t.isReviewAccount),
    index("bahrain_lawyers_public_directory_visible_idx").on(
      t.isPublicDirectoryVisible,
    ),
    index("bahrain_lawyers_created_idx").on(t.createdAt),
    index("bahrain_lawyers_country_code_idx").on(t.countryCode),
    check(
      "bahrain_lawyers_approved_membership_no_check",
      sql`${t.status} <> 'approved' OR NULLIF(btrim(${t.membershipNo}), '') IS NOT NULL`,
    ),
  ],
);


export const lawyerLicenseNotifications = pgTable(
  "lawyer_license_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => bahrainLawyers.id, { onDelete: "cascade" }),
    licenseExpiryDate: date("license_expiry_date", { mode: "string" }).notNull(),
    reminderKind: text("reminder_kind")
      .$type<"30_days" | "7_days">()
      .notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    lastError: text("last_error"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("lawyer_license_notifications_delivery_uidx").on(
      t.lawyerId,
      t.licenseExpiryDate,
      t.reminderKind,
    ),
    index("lawyer_license_notifications_pending_idx").on(t.sentAt, t.claimedAt),
    check(
      "lawyer_license_notifications_kind_check",
      sql`${t.reminderKind} IN ('30_days', '7_days')`,
    ),
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

export const platformLanguages = pgTable(
  "platform_languages",
  {
    code: varchar("code", { length: 35 }).primaryKey(),
    adminName: text("admin_name").notNull(),
    nativeName: text("native_name").notNull(),
    direction: varchar("direction", { length: 3 })
      .$type<"rtl" | "ltr">()
      .notNull(),
    status: varchar("status", { length: 10 })
      .$type<"draft" | "published">()
      .default("draft")
      .notNull(),
    updatedBy: uuid("updated_by").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "platform_languages_code_check",
      sql`${t.code} ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'`,
    ),
    check("platform_languages_admin_name_check", sql`btrim(${t.adminName}) <> ''`),
    check("platform_languages_native_name_check", sql`btrim(${t.nativeName}) <> ''`),
    check("platform_languages_direction_check", sql`${t.direction} IN ('rtl', 'ltr')`),
    check("platform_languages_status_check", sql`${t.status} IN ('draft', 'published')`),
  ],
);

export const countryTranslations = pgTable(
  "country_translations",
  {
    countryCode: varchar("country_code", { length: 2 })
      .notNull()
      .references(() => countries.code, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 35 })
      .notNull()
      .references(() => platformLanguages.code),
    name: text("name").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.countryCode, t.languageCode] }),
    check("country_translations_name_check", sql`btrim(${t.name}) <> ''`),
  ],
);

export const countryLanguageSettings = pgTable(
  "country_language_settings",
  {
    countryCode: varchar("country_code", { length: 2 })
      .notNull()
      .references(() => countries.code, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 35 })
      .notNull()
      .references(() => platformLanguages.code),
    isDefault: boolean("is_default").default(false).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.countryCode, t.languageCode] }),
    uniqueIndex("country_language_settings_one_default_idx")
      .on(t.countryCode)
      .where(sql`${t.isDefault} = true`),
  ],
);

export const mobileAdminSessions = pgTable(
  "mobile_admin_sessions",
  {
    tokenDigest: text("token_digest").primaryKey(),
    adminId: uuid("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("mobile_admin_sessions_expires_at_idx").on(t.expiresAt)],
);

export const mobileAdminPushInstallations = pgTable(
  "mobile_admin_push_installations",
  {
    fcmToken: text("fcm_token").primaryKey(),
    adminId: uuid("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    sessionDigest: text("session_digest").notNull().references(() => mobileAdminSessions.tokenDigest, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 16 }).$type<"ios" | "android">().notNull(),
    locale: varchar("locale", { length: 5 }).$type<"ar" | "en" | "tr">().default("ar").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("mobile_admin_push_installations_admin_idx").on(t.adminId)],
);

export const termsVersions = pgTable(
  "terms_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentType: varchar("document_type", { length: 32 })
      .$type<"general" | "privacy" | "refund" | "lawyer_registration" | "legalsos_terms" | "legalsos_privacy" | "legalsos_lawyer_agreement">()
      .notNull(),
    countryCode: varchar("country_code", { length: 2 }),
    version: integer("version").notNull(),
    status: varchar("status", { length: 16 })
      .$type<"draft" | "published" | "archived">()
      .default("draft")
      .notNull(),
    contentAr: text("content_ar").notNull(),
    contentEn: text("content_en").notNull(),
    platformPercentageYearOne: numeric("platform_percentage_year_one", {
      precision: 5,
      scale: 2,
    }),
    platformPercentageYearTwo: numeric("platform_percentage_year_two", {
      precision: 5,
      scale: 2,
    }),
    createdByAdminId: uuid("created_by_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    updatedByAdminId: uuid("updated_by_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    publishedByAdminId: uuid("published_by_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    archivedByAdminId: uuid("archived_by_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true, precision: 3 }),
    archivedAt: timestamp("archived_at", { withTimezone: true, precision: 3 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("terms_versions_document_version_unique_idx")
      .on(t.documentType, t.version)
      .where(sql`${t.documentType} <> 'legalsos_lawyer_agreement'`),
    uniqueIndex("terms_versions_country_document_version_unique_idx")
      .on(t.documentType, t.countryCode, t.version)
      .where(sql`${t.documentType} = 'legalsos_lawyer_agreement'`),
    uniqueIndex("terms_versions_one_published_per_document_idx")
      .on(t.documentType)
      .where(sql`${t.status} = 'published' AND ${t.documentType} <> 'legalsos_lawyer_agreement'`),
    uniqueIndex("terms_versions_one_published_per_country_document_idx")
      .on(t.documentType, t.countryCode)
      .where(sql`${t.status} = 'published' AND ${t.documentType} = 'legalsos_lawyer_agreement'`),
    index("terms_versions_current_publication_idx")
      .on(t.documentType, t.publishedAt)
      .where(sql`${t.status} = 'published'`),
    check(
      "terms_versions_document_type_check",
      sql`${t.documentType} IN ('general', 'privacy', 'refund', 'lawyer_registration', 'legalsos_terms', 'legalsos_privacy', 'legalsos_lawyer_agreement')`,
    ),
    check(
      "terms_versions_status_check",
      sql`${t.status} IN ('draft', 'published', 'archived')`,
    ),
    check(
      "terms_versions_country_scope_check",
      sql`(${t.documentType} = 'legalsos_lawyer_agreement' AND ${t.countryCode} ~ '^[A-Z]{2}$') OR (${t.documentType} <> 'legalsos_lawyer_agreement' AND ${t.countryCode} IS NULL)`,
    ),
    check("terms_versions_content_ar_check", sql`length(btrim(${t.contentAr})) > 0`),
    check("terms_versions_content_en_check", sql`length(btrim(${t.contentEn})) > 0`),
    check("terms_versions_version_check", sql`${t.version} > 0`),
    check(
      "terms_versions_year_one_percentage_check",
      sql`${t.platformPercentageYearOne} IS NULL OR ${t.platformPercentageYearOne} BETWEEN 0 AND 100`,
    ),
    check(
      "terms_versions_year_two_percentage_check",
      sql`${t.platformPercentageYearTwo} IS NULL OR ${t.platformPercentageYearTwo} BETWEEN 0 AND 100`,
    ),
    check(
      "terms_versions_commission_scope_check",
      sql`(${t.documentType} IN ('general', 'privacy', 'refund', 'legalsos_terms', 'legalsos_privacy', 'legalsos_lawyer_agreement') AND ${t.platformPercentageYearOne} IS NULL AND ${t.platformPercentageYearTwo} IS NULL) OR (${t.documentType} = 'lawyer_registration' AND ${t.platformPercentageYearOne} IS NOT NULL AND ${t.platformPercentageYearTwo} IS NOT NULL)`,
    ),
  ],
);

export const lawyerTermsAcceptances = pgTable(
  "lawyer_terms_acceptances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => bahrainLawyers.id, { onDelete: "restrict" }),
    termsVersionId: uuid("terms_version_id")
      .notNull()
      .references(() => termsVersions.id, { onDelete: "restrict" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
    acceptedIp: varchar("accepted_ip", { length: 64 }),
    acceptedUserAgent: text("accepted_user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("lawyer_terms_acceptances_lawyer_version_unique_idx").on(
      t.lawyerId,
      t.termsVersionId,
    ),
    index("lawyer_terms_acceptances_lawyer_idx").on(t.lawyerId, t.acceptedAt),
  ],
);

export const lawyerTermsAcceptanceRequests = pgTable(
  "lawyer_terms_acceptance_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => bahrainLawyers.id, { onDelete: "restrict" }),
    termsVersionId: uuid("terms_version_id")
      .notNull()
      .references(() => termsVersions.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 16 })
      .$type<"pending" | "accepted" | "cancelled">()
      .default("pending")
      .notNull(),
    notificationStatus: varchar("notification_status", { length: 16 })
      .$type<"pending" | "delivered" | "failed">()
      .default("pending")
      .notNull(),
    notificationAttemptCount: integer("notification_attempt_count").default(0).notNull(),
    notificationLastError: text("notification_last_error"),
    notificationLastAttemptAt: timestamp("notification_last_attempt_at", {
      withTimezone: true,
      precision: 3,
    }),
    notificationDeliveredAt: timestamp("notification_delivered_at", {
      withTimezone: true,
      precision: 3,
    }),
    requestedByAdminId: uuid("requested_by_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    requestedAt: timestamp("requested_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, precision: 3 }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, precision: 3 }),
    cancelledByAdminId: uuid("cancelled_by_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("lawyer_terms_acceptance_requests_lawyer_version_unique_idx").on(
      t.lawyerId,
      t.termsVersionId,
    ),
    index("lawyer_terms_acceptance_requests_campaign_idx").on(t.campaignId),
    index("lawyer_terms_acceptance_requests_pending_idx")
      .on(t.lawyerId, t.termsVersionId)
      .where(sql`${t.status} = 'pending'`),
    check(
      "lawyer_terms_acceptance_requests_status_check",
      sql`${t.status} IN ('pending', 'accepted', 'cancelled')`,
    ),
    check(
      "lawyer_terms_acceptance_requests_notification_status_check",
      sql`${t.notificationStatus} IN ('pending', 'delivered', 'failed')`,
    ),
    check(
      "lawyer_terms_acceptance_requests_attempt_count_check",
      sql`${t.notificationAttemptCount} >= 0`,
    ),
  ],
);

export const faqCategories = pgTable(
  "faq_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 64 }).notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar").notNull(),
    descriptionEn: text("description_en").notNull(),
    iconKey: varchar("icon_key", { length: 32 }).notNull(),
    status: faqStatusEnum("status").default("draft").notNull(),
    position: integer("position").default(0).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedByAdminId: uuid("archived_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdByAdminId: uuid("created_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    updatedByAdminId: uuid("updated_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("faq_categories_key_uidx").on(t.key),
    index("faq_categories_public_order_idx").on(t.status, t.archivedAt, t.position),
    check("faq_categories_position_check", sql`${t.position} >= 0`),
  ],
);

export const faqQuestions = pgTable(
  "faq_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").references(() => faqCategories.id, { onDelete: "restrict" }).notNull(),
    questionAr: text("question_ar").notNull(),
    questionEn: text("question_en").notNull(),
    answerAr: text("answer_ar").notNull(),
    answerEn: text("answer_en").notNull(),
    status: faqStatusEnum("status").default("draft").notNull(),
    position: integer("position").default(0).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedByAdminId: uuid("archived_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdByAdminId: uuid("created_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    updatedByAdminId: uuid("updated_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (t) => [
    index("faq_questions_category_order_idx").on(t.categoryId, t.archivedAt, t.position),
    index("faq_questions_public_order_idx").on(t.status, t.archivedAt, t.categoryId, t.position),
    check("faq_questions_position_check", sql`${t.position} >= 0`),
  ],
);

export const aboutSections = pgTable("about_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  seedKey: varchar("seed_key", { length: 96 }).unique(),
  romanLabel: varchar("roman_label", { length: 24 }).notNull(),
  headingAr: text("heading_ar").notNull(),
  headingEn: text("heading_en").notNull(),
  position: integer("position").default(0).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedByAdminId: uuid("archived_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdByAdminId: uuid("created_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (t) => [index("about_sections_public_order_idx").on(t.archivedAt, t.position), check("about_sections_position_check", sql`${t.position} >= 0`)]);

export const aboutMembers = pgTable("about_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  seedKey: varchar("seed_key", { length: 128 }).unique(),
  sectionId: uuid("section_id").notNull().references(() => aboutSections.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").default("").notNull(), nameEn: text("name_en").default("").notNull(),
  titleAr: text("title_ar").notNull(), titleEn: text("title_en").notNull(),
  slug: varchar("slug", { length: 160 }), schemaType: varchar("schema_type", { length: 16 }).default("Person").notNull(),
  featured: boolean("featured").default(false).notNull(), photoUrl: text("photo_url"), photoStorageKey: text("photo_storage_key"),
  previousExperienceAr: jsonb("previous_experience_ar").$type<string[]>().default([]).notNull(),
  previousExperienceEn: jsonb("previous_experience_en").$type<string[]>().default([]).notNull(),
  experienceAr: jsonb("experience_ar").$type<string[]>().default([]).notNull(), experienceEn: jsonb("experience_en").$type<string[]>().default([]).notNull(),
  yearsOfExperienceAr: text("years_of_experience_ar").default("").notNull(), yearsOfExperienceEn: text("years_of_experience_en").default("").notNull(),
  previousEmployerAr: text("previous_employer_ar").default("").notNull(), previousEmployerEn: text("previous_employer_en").default("").notNull(),
  tasksAr: jsonb("tasks_ar").$type<string[]>().default([]).notNull(), tasksEn: jsonb("tasks_en").$type<string[]>().default([]).notNull(),
  tasksLabelAr: text("tasks_label_ar").default("").notNull(), tasksLabelEn: text("tasks_label_en").default("").notNull(),
  position: integer("position").default(0).notNull(), archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedByAdminId: uuid("archived_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdByAdminId: uuid("created_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (t) => [index("about_members_section_order_idx").on(t.sectionId, t.archivedAt, t.position), check("about_members_position_check", sql`${t.position} >= 0`), check("about_members_schema_type_check", sql`${t.schemaType} IN ('Person', 'Organization')`)]);

export const providerProfileChangeRequests = pgTable(
  "provider_profile_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .references(() => bahrainLawyers.id, { onDelete: "restrict" })
      .notNull(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    status: varchar("status", { length: 16 }).default("pending").notNull(),
    proposedValues: jsonb("proposed_values")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    proposedFiles: jsonb("proposed_files")
      .$type<Record<string, { fileName: string; mimeType: string; url: string; blobPath: string }>>()
      .default({})
      .notNull(),
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuid("reviewed_by").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("provider_profile_changes_provider_idx").on(t.providerId, t.createdAt),
    index("provider_profile_changes_status_idx").on(t.status, t.updatedAt),
    uniqueIndex("provider_profile_changes_one_pending_uidx")
      .on(t.providerId, t.countryCode)
      .where(sql`${t.status} = 'pending'`),
    check(
      "provider_profile_changes_status_check",
      sql`${t.status} IN ('pending', 'approved', 'rejected', 'cancelled')`,
    ),
    check(
      "provider_profile_changes_review_check",
      sql`${t.status} IN ('pending', 'cancelled') OR (${t.reviewedAt} IS NOT NULL AND ${t.reviewedBy} IS NOT NULL)`,
    ),
  ],
);

export const providerEmailChangeChallenges = pgTable(
  "provider_email_change_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id").references(() => bahrainLawyers.id, { onDelete: "cascade" }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    email: text("email").notNull(),
    codeDigest: text("code_digest").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    delivered: boolean("delivered").default(false).notNull(),
    consumed: boolean("consumed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("provider_email_change_provider_idx").on(t.providerId, t.createdAt)],
);

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull(),
    scope: varchar("scope", { length: 16 }).$type<"website" | "app" | "both">().default("website").notNull(),
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
    check("discount_codes_scope_check", sql`${t.scope} IN ('website', 'app', 'both')`),
    index("discount_codes_active_window_idx").on(t.isActive, t.startsAt, t.endsAt),
    check("discount_codes_value_check", sql`${t.discountValue} > 0 AND (${t.discountType} <> 'percentage' OR ${t.discountValue} <= 100)`),
    check("discount_codes_window_check", sql`${t.startsAt} IS NULL OR ${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`),
    check("discount_codes_total_limit_check", sql`${t.totalUsageLimit} IS NULL OR ${t.totalUsageLimit} > 0`),
    check("discount_codes_user_limit_check", sql`${t.perUserUsageLimit} IS NULL OR ${t.perUserUsageLimit} > 0`),
  ],
);


export const advocateShifts = pgTable(
  "bahrain_advocate_shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    advocateId: uuid("advocate_id")
      .references(() => bahrainLawyers.id, { onDelete: "cascade" })
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
    index("bahrain_advocate_shifts_country_code_idx").on(t.countryCode),
  ],
);

export const lawyerPushSubscriptions = pgTable(
  "bahrain_lawyer_push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    advocateId: uuid("advocate_id")
      .references(() => bahrainLawyers.id, { onDelete: "cascade" })
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
    index("bahrain_lawyer_push_subscriptions_country_code_idx").on(
      t.countryCode,
    ),
  ],
);

export const emergencyCaseTypes = pgTable(
  "bahrain_emergency_case_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    slug: text("slug").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar").notNull(),
    descriptionEn: text("description_en").notNull(),
    actionTypeAr: text("action_type_ar").notNull(),
    actionTypeEn: text("action_type_en").notNull(),
    price: decimal("price", { precision: 10, scale: 3 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).default("BHD").notNull(),
    iconKey: varchar("icon_key", { length: 64 })
      .default("shield-alert")
      .notNull(),
    workflowType: varchar("workflow_type", { length: 32 })
      .default("emergency_dispatch")
      .notNull(),
    iconAssetUrl: text("icon_asset_url"),
    iconStorageKey: text("icon_storage_key"),
    createdByAdminId: uuid("created_by_admin_id").references(
      () => adminUsers.id,
      { onDelete: "set null" },
    ),
    updatedByAdminId: uuid("updated_by_admin_id").references(
      () => adminUsers.id,
      { onDelete: "set null" },
    ),
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
    uniqueIndex("bahrain_emergency_case_types_slug_unique_idx").on(t.slug),
    index("bahrain_emergency_case_types_active_sort_idx").on(
      t.isActive,
      t.sortOrder,
    ),
    index("bahrain_emergency_case_types_country_code_idx").on(t.countryCode),
    index("bahrain_emergency_case_types_workflow_idx").on(
      t.workflowType,
      t.isActive,
      t.sortOrder,
    ),
  ],
);

export const consultationMethods = pgTable(
  "bahrain_consultation_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    price: decimal("price", { precision: 10, scale: 3 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).default("BHD").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    iconKey: varchar("icon_key", { length: 64 }).default("phone").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdByAdminId: uuid("created_by_admin_id"),
    updatedByAdminId: uuid("updated_by_admin_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedByAdminId: uuid("archived_by_admin_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("bahrain_consultation_methods_code_unique_idx").on(t.code),
    index("bahrain_consultation_methods_active_sort_idx").on(
      t.isActive,
      t.sortOrder,
    ),
    index("bahrain_consultation_methods_country_code_idx").on(t.countryCode),
  ],
);

export const whatsappConversations = pgTable(
  "whatsapp_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneNumberId: text("phone_number_id").notNull(),
    customerWaId: text("customer_wa_id").notNull(),
    language: varchar("language", { length: 2 }).default("ar").notNull(),
    workflowState: text("workflow_state").default("discovery").notNull(),
    selections: jsonb("selections").$type<Record<string, string>>().default({}).notNull(),
    customerDetails: jsonb("customer_details").$type<Record<string, string>>().default({}).notNull(),
    openaiResponseId: text("openai_response_id"),
    humanHandoff: boolean("human_handoff").default(false).notNull(),
    humanHandoffReason: text("human_handoff_reason"),
    humanHandoffAt: timestamp("human_handoff_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("whatsapp_conversations_identity_unique_idx").on(
      t.phoneNumberId,
      t.customerWaId,
    ),
    index("whatsapp_conversations_handoff_idx").on(t.humanHandoff, t.updatedAt),
  ],
);

export const whatsappProcessedEvents = pgTable(
  "whatsapp_processed_events",
  {
    messageId: text("message_id").primaryKey(),
    conversationId: uuid("conversation_id").references(
      () => whatsappConversations.id,
      { onDelete: "set null" },
    ),
    status: text("status").default("processing").notNull(),
    failureCode: text("failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("whatsapp_processed_events_created_idx").on(t.createdAt)],
);

export const whatsappConfirmationSnapshots = pgTable(
  "whatsapp_confirmation_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenDigest: text("token_digest").notNull().unique(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => whatsappConversations.id, { onDelete: "cascade" }),
    selections: jsonb("selections").$type<Record<string, string>>().notNull(),
    valueFingerprint: text("value_fingerprint").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("whatsapp_confirmation_snapshots_expiry_idx").on(t.expiresAt)],
);

export const emergencyRequests = pgTable(
  "bahrain_emergency_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
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
    clientAccountId: uuid("client_account_id").references(
      () => mobileClientAccounts.id,
      { onDelete: "set null" },
    ),
    baseFeeBhd: decimal("base_fee_bhd", {
      precision: 10,
      scale: 3,
    }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status")
      .default("pending")
      .notNull(),
    paymentRef: text("payment_ref"),
    mobilePaymentIdempotencyKey: uuid("mobile_payment_idempotency_key"),
    mobilePaymentCaseId: text("mobile_payment_case_id"),
    mobileRequestAccessDigest: text("mobile_request_access_digest"),
    clientAccessRevokedAt: timestamp("client_access_revoked_at", { withTimezone: true }),
    clientDataPurgedAt: timestamp("client_data_purged_at", { withTimezone: true }),
    tapChargeId: text("tap_charge_id"),
    tapStatus: text("tap_status"),
    tapPayload: jsonb("tap_payload"),
    serviceStatus: serviceStatusEnum("service_status")
      .default("pending")
      .notNull(),
    assignedLawyerId: uuid("assigned_lawyer_id").references(
      () => bahrainLawyers.id,
    ),
    candidateLawyerId: uuid("candidate_lawyer_id").references(
      () => bahrainLawyers.id,
      { onDelete: "set null" },
    ),
    candidateOfferedAt: timestamp("candidate_offered_at", {
      withTimezone: true,
    }),
    lawyerResponseDeadline: timestamp("lawyer_response_deadline", {
      withTimezone: true,
    }),
    adminEscalatedAt: timestamp("admin_escalated_at", {
      withTimezone: true,
    }),
    customerApprovedAt: timestamp("customer_approved_at", {
      withTimezone: true,
    }),
    excludedLawyerIds: json("excluded_lawyer_ids")
      .$type<string[]>()
      .default([])
      .notNull(),
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
    uniqueIndex("bahrain_emergency_one_active_lawyer").on(t.assignedLawyerId)
      .where(sql`${t.assignedLawyerId} IS NOT NULL AND ${t.serviceStatus} NOT IN ('completed','cancelled','disputed')`),
    index("emergency_requests_status_idx").on(t.serviceStatus),
    index("emergency_requests_created_idx").on(t.createdAt),
    index("bahrain_emergency_requests_country_code_idx").on(t.countryCode),
    index("bahrain_emergency_requests_client_account_idx").on(
      t.clientAccountId,
      t.createdAt,
    ),
    uniqueIndex("bahrain_emergency_mobile_payment_idempotency_uidx")
      .on(t.mobilePaymentIdempotencyKey)
      .where(sql`${t.mobilePaymentIdempotencyKey} IS NOT NULL`),
    index("bahrain_emergency_mobile_payment_case_idx")
      .on(t.mobilePaymentCaseId)
      .where(sql`${t.mobilePaymentCaseId} IS NOT NULL`),
    uniqueIndex("bahrain_emergency_tap_charge_uidx")
      .on(t.tapChargeId)
      .where(sql`${t.tapChargeId} IS NOT NULL`),
  ],
);

export const mobileAdminEscalationOutbox = pgTable(
  "mobile_admin_escalation_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => emergencyRequests.id, { onDelete: "cascade" }),
    eventType: text("event_type").$type<"admin_request_escalated" | "moderation_report">().notNull(),
    reportId: uuid("report_id").references(() => communicationReports.id, { onDelete: "cascade" }),
    status: text("status").$type<"pending" | "leased" | "delivered" | "failed">().default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("mobile_admin_escalation_request_uidx").on(t.requestId, t.eventType).where(sql`${t.eventType} = 'admin_request_escalated'`),
    uniqueIndex("mobile_admin_moderation_report_uidx").on(t.reportId, t.eventType).where(sql`${t.eventType} = 'moderation_report'`),
    index("mobile_admin_escalation_outbox_due_idx").on(t.nextAttemptAt)
      .where(sql`${t.status} IN ('pending', 'leased')`),
  ],
);

export const mobileAdminPaidRequestOutbox = pgTable(
  "mobile_admin_paid_request_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => emergencyRequests.id, { onDelete: "cascade" }),
    emailStatus: text("email_status").$type<"pending" | "leased" | "delivered" | "failed">().default("pending").notNull(),
    emailAttemptCount: integer("email_attempt_count").default(0).notNull(),
    emailNextAttemptAt: timestamp("email_next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
    emailLeaseExpiresAt: timestamp("email_lease_expires_at", { withTimezone: true }),
    emailLastErrorCode: text("email_last_error_code"),
    emailDeliveredAt: timestamp("email_delivered_at", { withTimezone: true }),
    pushStatus: text("push_status").$type<"pending" | "leased" | "delivered" | "failed">().default("pending").notNull(),
    pushAttemptCount: integer("push_attempt_count").default(0).notNull(),
    pushNextAttemptAt: timestamp("push_next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
    pushLeaseExpiresAt: timestamp("push_lease_expires_at", { withTimezone: true }),
    pushLastErrorCode: text("push_last_error_code"),
    pushDeliveredAt: timestamp("push_delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("mobile_admin_paid_request_outbox_request_uidx").on(t.requestId),
    index("mobile_admin_paid_request_email_due_idx").on(t.emailNextAttemptAt)
      .where(sql`${t.emailStatus} IN ('pending', 'leased')`),
    index("mobile_admin_paid_request_push_due_idx").on(t.pushNextAttemptAt)
      .where(sql`${t.pushStatus} IN ('pending', 'leased')`),
    check("mobile_admin_paid_request_outbox_email_status_check", sql`${t.emailStatus} IN ('pending', 'leased', 'delivered', 'failed')`),
    check("mobile_admin_paid_request_outbox_push_status_check", sql`${t.pushStatus} IN ('pending', 'leased', 'delivered', 'failed')`),
  ],
);

export const mobilePushInstallations = pgTable(
  "bahrain_mobile_push_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fcmToken: text("fcm_token").notNull(),
    lawyerId: uuid("lawyer_id").references(() => bahrainLawyers.id, {
      onDelete: "set null",
    }),
    audienceRole: text("audience_role")
      .$type<"client" | "lawyer">()
      .default("client")
      .notNull(),
    platform: varchar("platform", { length: 16 }).default("ios").notNull(),
    locale: varchar("locale", { length: 5 }).default("ar").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("bahrain_mobile_push_installations_token_uidx").on(
      t.fcmToken,
    ),
    index("bahrain_mobile_push_installations_lawyer_idx").on(t.lawyerId),
    index("bahrain_mobile_push_installations_audience_role_idx").on(
      t.audienceRole,
    ),
  ],
);

export const adminMobileNotificationSends = pgTable(
  "bahrain_admin_mobile_notification_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id")
      .references(() => adminUsers.id)
      .notNull(),
    audience: text("audience")
      .$type<
        | "clients"
        | "active_lawyers"
        | "pending_lawyers"
        | "all_lawyers"
        | "everyone"
      >()
      .notNull(),
    titleAr: varchar("title_ar", { length: 100 }).notNull(),
    bodyAr: varchar("body_ar", { length: 500 }).notNull(),
    titleEn: varchar("title_en", { length: 100 }).notNull(),
    bodyEn: varchar("body_en", { length: 500 }).notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    state: text("state")
      .$type<"sending" | "completed" | "failed">()
      .notNull(),
    targetedCount: integer("targeted_count").default(0).notNull(),
    successCount: integer("success_count").default(0).notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    prunedCount: integer("pruned_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("bahrain_admin_mobile_notification_sends_idempotency_uidx").on(
      t.idempotencyKey,
    ),
    index("bahrain_admin_mobile_notification_sends_created_idx").on(
      t.createdAt,
    ),
  ],
);

export const mobilePushRequestSubscriptions = pgTable(
  "bahrain_mobile_push_request_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: uuid("installation_id")
      .references(() => mobilePushInstallations.id, { onDelete: "cascade" })
      .notNull(),
    requestId: uuid("request_id")
      .references(() => emergencyRequests.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("bahrain_mobile_push_request_subscription_uidx").on(
      t.installationId,
      t.requestId,
    ),
    index("bahrain_mobile_push_request_subscription_request_idx").on(
      t.requestId,
    ),
  ],
);

export const communicationMessages = pgTable(
  "bahrain_communication_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .references(() => emergencyRequests.id, { onDelete: "cascade" })
      .notNull(),
    senderRole: text("sender_role")
      .$type<"client" | "lawyer">()
      .notNull(),
    senderId: text("sender_id").notNull(),
    clientMessageId: uuid("client_message_id").notNull(),
    body: varchar("body", { length: 4000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "bahrain_communication_messages_sender_role_check",
      sql`${t.senderRole} in ('client', 'lawyer')`,
    ),
    check(
      "bahrain_communication_messages_body_check",
      sql`char_length(btrim(${t.body})) between 1 and 4000`,
    ),
    uniqueIndex("bahrain_communication_messages_idempotency_uidx").on(
      t.requestId,
      t.senderRole,
      t.senderId,
      t.clientMessageId,
    ),
    index("bahrain_communication_messages_request_cursor_idx").on(
      t.requestId,
      t.createdAt,
      t.id,
    ),
  ],
);

export const communicationBlocks = pgTable(
  "bahrain_communication_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerRole: text("blocker_role").$type<"client" | "lawyer">().notNull(),
    blockerId: text("blocker_id").notNull(),
    blockedRole: text("blocked_role").$type<"client" | "lawyer">().notNull(),
    blockedId: text("blocked_id").notNull(),
    requestId: uuid("request_id").references(() => emergencyRequests.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "bahrain_communication_blocks_roles_check",
      sql`${t.blockerRole} in ('client', 'lawyer') and ${t.blockedRole} in ('client', 'lawyer')`,
    ),
    check(
      "bahrain_communication_blocks_distinct_actor_check",
      sql`${t.blockerRole} <> ${t.blockedRole} or ${t.blockerId} <> ${t.blockedId}`,
    ),
    uniqueIndex("bahrain_communication_blocks_active_uidx")
      .on(t.blockerRole, t.blockerId, t.blockedRole, t.blockedId)
      .where(sql`${t.revokedAt} is null`),
    index("bahrain_communication_blocks_blocked_idx")
      .on(t.blockedRole, t.blockedId)
      .where(sql`${t.revokedAt} is null`),
  ],
);

export const communicationReports = pgTable(
  "bahrain_communication_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").references(() => emergencyRequests.id, {
      onDelete: "set null",
    }),
    reporterRole: text("reporter_role").$type<"client" | "lawyer">().notNull(),
    reporterId: text("reporter_id").notNull(),
    reportedRole: text("reported_role").$type<"client" | "lawyer">().notNull(),
    reportedId: text("reported_id").notNull(),
    category: text("category")
      .$type<"harassment" | "threat_or_hate" | "fraud_or_spam" | "sexual_or_inappropriate" | "privacy" | "other">()
      .notNull(),
    description: varchar("description", { length: 1000 }),
    status: text("status").$type<"open" | "dismissed" | "actioned">().default("open").notNull(),
    evidenceMessageIds: jsonb("evidence_message_ids").$type<string[]>().default([]).notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => adminUsers.id, { onDelete: "set null" }),
    resolutionNote: varchar("resolution_note", { length: 2000 }),
  },
  (t) => [
    check("bahrain_communication_reports_roles_check", sql`${t.reporterRole} in ('client', 'lawyer') and ${t.reportedRole} in ('client', 'lawyer')`),
    check("bahrain_communication_reports_category_check", sql`${t.category} in ('harassment', 'threat_or_hate', 'fraud_or_spam', 'sexual_or_inappropriate', 'privacy', 'other')`),
    check("bahrain_communication_reports_status_check", sql`${t.status} in ('open', 'dismissed', 'actioned')`),
    check("bahrain_communication_reports_description_check", sql`${t.description} is null or char_length(btrim(${t.description})) between 1 and 1000`),
    uniqueIndex("bahrain_communication_reports_idempotency_uidx").on(t.reporterRole, t.reporterId, t.idempotencyKey),
    index("bahrain_communication_reports_queue_idx").on(t.status, t.createdAt),
    index("bahrain_communication_reports_reported_idx").on(t.reportedRole, t.reportedId, t.createdAt),
  ],
);

export const communicationModerationActions = pgTable(
  "bahrain_communication_moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id").references(() => communicationReports.id, { onDelete: "set null" }),
    targetRole: text("target_role").$type<"client" | "lawyer">().notNull(),
    targetId: text("target_id").notNull(),
    action: text("action").$type<"dismissal" | "warning" | "chat_suspension" | "account_suspension" | "chat_reactivation" | "account_reactivation">().notNull(),
    adminId: uuid("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    internalReason: varchar("internal_reason", { length: 2000 }).notNull(),
    publicMessageAr: varchar("public_message_ar", { length: 2000 }),
    publicMessageEn: varchar("public_message_en", { length: 2000 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversedBy: uuid("reversed_by").references(() => adminUsers.id, { onDelete: "set null" }),
    reversalReason: varchar("reversal_reason", { length: 2000 }),
  },
  (t) => [
    check("bahrain_communication_moderation_actions_role_check", sql`${t.targetRole} in ('client', 'lawyer')`),
    check("bahrain_communication_moderation_actions_action_check", sql`${t.action} in ('dismissal', 'warning', 'chat_suspension', 'account_suspension', 'chat_reactivation', 'account_reactivation')`),
    check("bahrain_communication_moderation_actions_reason_check", sql`char_length(btrim(${t.internalReason})) between 1 and 2000`),
    check("bahrain_communication_moderation_actions_expiry_check", sql`${t.action} <> 'chat_suspension' or ${t.expiresAt} is not null`),
    index("bahrain_communication_moderation_actions_target_idx").on(t.targetRole, t.targetId, t.createdAt),
    index("bahrain_communication_moderation_actions_active_chat_idx")
      .on(t.targetRole, t.targetId, t.expiresAt)
      .where(sql`${t.action} = 'chat_suspension' and ${t.reversedAt} is null`),
  ],
);

export const communicationCalls = pgTable(
  "bahrain_communication_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .references(() => emergencyRequests.id, { onDelete: "cascade" })
      .notNull(),
    initiatorRole: text("initiator_role")
      .$type<"client" | "lawyer">()
      .notNull(),
    initiatorId: text("initiator_id").notNull(),
    initiatorDataPurgedAt: timestamp("initiator_data_purged_at", { withTimezone: true }),
    mediaKind: text("media_kind").$type<"audio" | "video">().notNull(),
    status: text("status")
      .$type<
        | "ringing"
        | "accepted"
        | "connected"
        | "ended"
        | "rejected"
        | "missed"
        | "cancelled"
        | "failed"
      >()
      .default("ringing")
      .notNull(),
    ringingAt: timestamp("ringing_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    endReason: text("end_reason"),
    endedByRole: text("ended_by_role").$type<"client" | "lawyer">(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "bahrain_communication_calls_initiator_role_check",
      sql`${t.initiatorRole} in ('client', 'lawyer')`,
    ),
    check(
      "bahrain_communication_calls_media_kind_check",
      sql`${t.mediaKind} in ('audio', 'video')`,
    ),
    check(
      "bahrain_communication_calls_status_check",
      sql`${t.status} in ('ringing', 'accepted', 'connected', 'ended', 'rejected', 'missed', 'cancelled', 'failed')`,
    ),
    check(
      "bahrain_communication_calls_ended_by_role_check",
      sql`${t.endedByRole} is null or ${t.endedByRole} in ('client', 'lawyer')`,
    ),
    check(
      "bahrain_communication_calls_duration_check",
      sql`${t.durationSeconds} is null or ${t.durationSeconds} >= 0`,
    ),
    uniqueIndex("bahrain_communication_calls_one_active_uidx")
      .on(t.requestId)
      .where(sql`${t.status} in ('ringing', 'accepted', 'connected')`),
    index("bahrain_communication_calls_request_created_idx").on(
      t.requestId,
      t.createdAt,
    ),
  ],
);

export const communicationCallPushRegistrations = pgTable(
  "bahrain_communication_call_push_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .references(() => emergencyRequests.id, { onDelete: "cascade" })
      .notNull(),
    actorRole: text("actor_role")
      .$type<"client" | "lawyer">()
      .notNull(),
    actorId: text("actor_id").notNull(),
    platform: varchar("platform", { length: 16 })
      .$type<"ios" | "android">()
      .notNull(),
    tokenType: varchar("token_type", { length: 16 })
      .$type<"voip" | "fcm">()
      .notNull(),
    token: text("token").notNull(),
    locale: varchar("locale", { length: 5 }).default("ar").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "bahrain_communication_call_push_actor_role_check",
      sql`${t.actorRole} in ('client', 'lawyer')`,
    ),
    check(
      "bahrain_communication_call_push_platform_check",
      sql`${t.platform} in ('ios', 'android')`,
    ),
    check(
      "bahrain_communication_call_push_token_type_check",
      sql`${t.tokenType} in ('voip', 'fcm')`,
    ),
    uniqueIndex("bahrain_communication_call_push_token_uidx").on(t.token),
    uniqueIndex("bahrain_communication_call_push_actor_request_uidx").on(
      t.requestId,
      t.actorRole,
      t.actorId,
      t.platform,
      t.tokenType,
    ),
    index("bahrain_communication_call_push_request_actor_idx").on(
      t.requestId,
      t.actorRole,
      t.actorId,
    ),
  ],
);

export const communicationSignalEvents = pgTable(
  "bahrain_communication_signal_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .references(() => emergencyRequests.id, { onDelete: "cascade" })
      .notNull(),
    senderRole: text("sender_role")
      .$type<"client" | "lawyer">()
      .notNull(),
    event: jsonb("event").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .default(sql`now() + interval '2 minutes'`)
      .notNull(),
  },
  (t) => [
    check(
      "bahrain_communication_signal_events_sender_role_check",
      sql`${t.senderRole} in ('client', 'lawyer')`,
    ),
    index("bahrain_communication_signal_events_expiry_idx").on(t.expiresAt),
    index("bahrain_communication_signal_events_request_idx").on(
      t.requestId,
      t.createdAt,
    ),
  ],
);

export const lawyerAgreements = pgTable(
  "bahrain_lawyer_agreements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
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
    index("bahrain_lawyer_agreements_country_code_idx").on(t.countryCode),
  ],
);

export const legalCaseCategories = pgTable(
  "bahrain_legal_case_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),

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
    index("bahrain_legal_case_categories_country_code_idx").on(t.countryCode),
  ],
);

export const legalCases = pgTable(
  "bahrain_legal_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),

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
    index("bahrain_legal_cases_country_code_idx").on(t.countryCode),
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
  "bahrain_lawyer_legal_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),

    lawyerId: uuid("lawyer_id")
      .references(() => bahrainLawyers.id, { onDelete: "cascade" })
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
    index("bahrain_lawyer_legal_cases_country_code_idx").on(t.countryCode),
  ],
);

export const bookingRequests = pgTable(
  "bahrain_booking_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),

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
    selectedLawyerId: uuid("selected_lawyer_id").references(() => bahrainLawyers.id),
    selectedLawyerName: text("selected_lawyer_name"),

    assignedToEmail: text("assigned_to_email").notNull(),

    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerMessage: text("customer_message"),
    clientAccountId: uuid("client_account_id").references(
      () => mobileClientAccounts.id,
      { onDelete: "set null" },
    ),

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
    uniqueIndex("bahrain_booking_mobile_payment_idempotency_uidx")
      .on(t.mobilePaymentIdempotencyKey)
      .where(sql`${t.mobilePaymentIdempotencyKey} IS NOT NULL`),
    index("bahrain_booking_mobile_payment_case_idx")
      .on(t.mobilePaymentCaseId)
      .where(sql`${t.mobilePaymentCaseId} IS NOT NULL`),
    index("booking_requests_selected_lawyer_id_idx").on(t.selectedLawyerId),
    index("booking_requests_legal_case_idx").on(t.legalCaseId),
    index("booking_requests_created_at_idx").on(t.createdAt),
    index("bahrain_booking_requests_country_code_idx").on(t.countryCode),
    index("bahrain_booking_requests_client_account_idx").on(
      t.clientAccountId,
      t.createdAt,
    ),
  ],
);

export const discountRedemptions = pgTable(
  "discount_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discountCodeId: uuid("discount_code_id").references(() => discountCodes.id, { onDelete: "restrict" }).notNull(),
    bookingRequestId: uuid("booking_request_id").references(() => bookingRequests.id, { onDelete: "set null" }),
    emergencyRequestId: uuid("emergency_request_id").references(() => emergencyRequests.id, { onDelete: "set null" }),
    customerDataPurgedAt: timestamp("customer_data_purged_at", { withTimezone: true }),
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
    uniqueIndex("discount_redemptions_emergency_unique").on(t.emergencyRequestId),
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
  "bahrain_tap_retailer_onboarding",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => bahrainLawyers.id, { onDelete: "cascade" }),
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
  "bahrain_provider_commission_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    countryCode: varchar("country_code", { length: 2 })
      .default("BH")
      .notNull(),

    providerId: uuid("provider_id")
      .notNull()
      .references(() => bahrainLawyers.id, {
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
export const providerCustomerBalances = pgTable(
  "provider_customer_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicReference: varchar("public_reference", { length: 32 }).notNull(),
    providerId: uuid("provider_id").references(() => bahrainLawyers.id, { onDelete: "restrict" }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    providerNameAr: text("provider_name_ar").notNull(),
    providerNameEn: text("provider_name_en").notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).default("BHD").notNull(),
    dueDate: date("due_date", { mode: "string" }),
    status: varchar("status", { length: 24 }).default("draft").notNull(),
    tapChargeId: text("tap_charge_id"),
    tapStatus: text("tap_status"),
    paymentUrl: text("payment_url"),
    paymentLinkCreatedAt: timestamp("payment_link_created_at", { withTimezone: true }),
    paymentLinkExpiresAt: timestamp("payment_link_expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("provider_customer_balances_reference_uidx").on(t.publicReference),
    index("provider_customer_balances_provider_idx").on(t.providerId, t.createdAt),
    index("provider_customer_balances_status_idx").on(t.status, t.updatedAt),
    uniqueIndex("provider_customer_balances_charge_uidx").on(t.tapChargeId).where(sql`${t.tapChargeId} IS NOT NULL`),
    check("provider_customer_balances_status_check", sql`${t.status} IN ('draft', 'pending_payment', 'paid', 'expired', 'cancelled')`),
    check("provider_customer_balances_amount_check", sql`${t.amount} > 0`),
  ],
);

export const paymentAllocations = pgTable(
  "bahrain_payment_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    countryCode: varchar("country_code", { length: 2 })
      .default("BH")
      .notNull(),

    bookingRequestId: uuid("booking_request_id")
      .references(() => bookingRequests.id, {
        onDelete: "cascade",
      }),

    emergencyRequestId: uuid("emergency_request_id").references(
      () => emergencyRequests.id,
      { onDelete: "cascade" },
    ),

    providerBalanceId: uuid("provider_balance_id").references(
      () => providerCustomerBalances.id,
      { onDelete: "restrict" },
    ),

    providerId: uuid("provider_id").references(
      () => bahrainLawyers.id,
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
      .default("BHD")
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

    providerNameSnapshot: text("provider_name_snapshot"),
    customerNameSnapshot: text("customer_name_snapshot"),
    customerDataPurgedAt: timestamp("customer_data_purged_at", { withTimezone: true }),
    providerIbanSnapshot: text("provider_iban_snapshot"),
    settlementStatus: text("settlement_status")
      .$type<"not_applicable" | "bank_pending" | "processing" | "paid_bank" | "paid_tap" | "failed" | "cancelled">()
      .default("not_applicable")
      .notNull(),
    settlementMethod: text("settlement_method"),
    settlementReference: text("settlement_reference"),
    settlementTransferredAt: timestamp("settlement_transferred_at", { withTimezone: true }),
    settlementRecordedAt: timestamp("settlement_recorded_at", { withTimezone: true }),
    settlementRecordedBy: uuid("settlement_recorded_by").references(
      () => adminUsers.id,
      { onDelete: "set null" },
    ),
    reconciliationError: text("reconciliation_error"),

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
    check(
      "payment_allocations_exactly_one_request_check",
      sql`(((${t.bookingRequestId} IS NOT NULL)::int + (${t.emergencyRequestId} IS NOT NULL)::int + (${t.providerBalanceId} IS NOT NULL)::int) = 1)`,
    ),
    uniqueIndex("payment_allocations_provider_balance_uidx").on(t.providerBalanceId).where(sql`${t.providerBalanceId} IS NOT NULL`),
    check(
      "bahrain_payment_allocations_settlement_status_check",
      sql`${t.settlementStatus} IN ('not_applicable', 'bank_pending', 'processing', 'paid_bank', 'paid_tap', 'failed', 'cancelled')`,
    ),
    check(
      "bahrain_payment_allocations_settlement_paid_check",
      sql`${t.settlementStatus} NOT IN ('paid_bank', 'paid_tap') OR (${t.settlementMethod} IS NOT NULL AND ${t.settlementReference} IS NOT NULL AND ${t.settlementTransferredAt} IS NOT NULL AND ${t.settlementRecordedAt} IS NOT NULL AND ${t.settlementRecordedBy} IS NOT NULL)`,
    ),
    uniqueIndex(
      "payment_allocations_booking_unique_idx",
    ).on(t.bookingRequestId),

    uniqueIndex(
      "payment_allocations_emergency_unique_idx",
    ).on(t.emergencyRequestId),

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

    index("bahrain_payment_allocations_settlement_status_captured_idx").on(
      t.settlementStatus,
      t.capturedAt,
    ),
  ],
);

export const lawyerWithdrawalRequests = pgTable(
  "lawyer_withdrawal_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id").notNull().references(() => bahrainLawyers.id, { onDelete: "restrict" }),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).default("BHD").notNull(),
    status: text("status").$type<"pending" | "approved" | "rejected" | "paid">().default("pending").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => adminUsers.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    settlementReference: text("settlement_reference"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("lawyer_withdrawal_requests_amount_check", sql`${t.amount} > 0`),
    check("lawyer_withdrawal_requests_status_check", sql`${t.status} IN ('pending', 'approved', 'rejected', 'paid')`),
    index("lawyer_withdrawal_requests_lawyer_status_idx").on(t.lawyerId, t.status, t.requestedAt),
    index("lawyer_withdrawal_requests_admin_queue_idx").on(t.status, t.requestedAt),
  ],
);

export const lawyerWithdrawalAllocations = pgTable(
  "lawyer_withdrawal_allocations",
  {
    withdrawalId: uuid("withdrawal_id").notNull().references(() => lawyerWithdrawalRequests.id, { onDelete: "cascade" }),
    allocationId: uuid("allocation_id").notNull().references(() => paymentAllocations.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.withdrawalId, t.allocationId] }),
    uniqueIndex("lawyer_withdrawal_allocations_allocation_uidx").on(t.allocationId),
  ],
);

export const bookingReviews = pgTable(
  "bahrain_booking_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),

    bookingRequestId: uuid("booking_request_id")
      .notNull()
      .references(() => bookingRequests.id, { onDelete: "cascade" }),

    lawyerId: uuid("lawyer_id").references(() => bahrainLawyers.id, {
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
    index("bahrain_booking_reviews_country_code_idx").on(t.countryCode),
  ],
);

/**
 * A lawyer's recurring weekly availability window. `weekday` follows the app's
 * convention: 0 = Sunday .. 6 = Saturday (the same numbering as Dart's
 * `DateTime.weekday - 1`). Windows of the same weekday may not overlap; that
 * invariant is enforced with a per-lawyer advisory lock in the writer, and
 * cross-window conflicts are rejected on read and on booking.
 */
export const lawyerAvailability = pgTable(
  "bahrain_lawyer_availability",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => bahrainLawyers.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    slotDurationMinutes: integer("slot_duration_minutes").default(30).notNull(),
    consultationType: text("consultation_type").default("any").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("lawyer_availability_lawyer_idx").on(t.lawyerId, t.weekday),
    index("bahrain_lawyer_availability_country_code_idx").on(t.countryCode),
    check(
      "lawyer_availability_weekday_check",
      sql`${t.weekday} BETWEEN 0 AND 6`,
    ),
    check(
      "lawyer_availability_time_check",
      sql`${t.startTime} < ${t.endTime}`,
    ),
    check(
      "lawyer_availability_duration_check",
      sql`${t.slotDurationMinutes} BETWEEN 5 AND 480`,
    ),
  ],
);

/**
 * A date a lawyer will not accept appointments on, either the whole day or a
 * time range inside it. `start_time`/`end_time` are both NULL for an all-day
 * block, which is the common case (vacation, holiday, court).
 */
export const lawyerBlockedDates = pgTable(
  "bahrain_lawyer_blocked_dates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => bahrainLawyers.id, { onDelete: "cascade" }),
    blockedDate: date("blocked_date", { mode: "string" }).notNull(),
    allDay: boolean("all_day").default(true).notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    reasonType: text("reason_type").default("other").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("lawyer_blocked_dates_lawyer_idx").on(t.lawyerId, t.blockedDate),
    index("bahrain_lawyer_blocked_dates_country_code_idx").on(t.countryCode),
    check(
      "lawyer_blocked_dates_range_check",
      sql`${t.allDay} OR (${t.startTime} IS NOT NULL AND ${t.endTime} IS NOT NULL AND ${t.startTime} < ${t.endTime})`,
    ),
  ],
);

/**
 * A confirmed slot on a booking request. One row per booking, created when the
 * request is booked and released when it is cancelled/rejected, so the partial
 * unique index below is the database-level guarantee against double booking.
 * `status` is denormalised from the booking's `admin_status` for cheap reads.
 */
export const appointmentSlots = pgTable(
  "bahrain_appointment_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: varchar("country_code", { length: 2 }).default("BH").notNull(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => bahrainLawyers.id, { onDelete: "cascade" }),
    bookingRequestId: uuid("booking_request_id")
      .notNull()
      .references(() => bookingRequests.id, { onDelete: "cascade" }),
    appointmentDate: date("appointment_date", { mode: "string" }).notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    status: text("status").default("booked").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("appointment_slots_booking_unique_idx").on(t.bookingRequestId),
    // Double-booking guard: a lawyer may hold at most one active slot for a
    // given date + start time. Cancelled/rejected rows drop out of the index.
    uniqueIndex("appointment_slots_lawyer_date_start_active_uidx")
      .on(t.lawyerId, t.appointmentDate, t.startTime)
      .where(sql`${t.status} IN ('booked','confirmed')`),
    index("appointment_slots_lawyer_date_idx").on(t.lawyerId, t.appointmentDate),
    index("bahrain_appointment_slots_country_code_idx").on(t.countryCode),
    check(
      "appointment_slots_time_check",
      sql`${t.startTime} < ${t.endTime}`,
    ),
  ],
);


export type CountryRow = typeof countries.$inferSelect;
export type CountryInsert = typeof countries.$inferInsert;

export type ConsentLogRow = typeof consentLog.$inferSelect;
export type ConsentLogInsert = typeof consentLog.$inferInsert;

export type LawyerMetaRow = typeof bahrainLawyers.$inferSelect;
export type LawyerMetaInsert = typeof bahrainLawyers.$inferInsert;

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

export type LawyerWithdrawalRequestRow =
  typeof lawyerWithdrawalRequests.$inferSelect;
export type LawyerWithdrawalRequestInsert =
  typeof lawyerWithdrawalRequests.$inferInsert;
export type LawyerWithdrawalAllocationRow =
  typeof lawyerWithdrawalAllocations.$inferSelect;

export const mobileClientNotifications = pgTable('mobile_client_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestId: uuid('request_id').references(() => emergencyRequests.id, {onDelete:'cascade'}),
  kind: text('kind').notNull(),
  sourceKey: text('source_key').unique(),
  titleAr: text('title_ar'), bodyAr: text('body_ar'),
  titleEn: text('title_en'), bodyEn: text('body_en'),
  createdAt: timestamp('created_at',{withTimezone:true,precision:3}).default(sql`clock_timestamp()`).notNull(),
}, t => [
  index('mobile_client_notifications_request_cursor_idx').on(t.requestId,t.createdAt.desc(),t.id.desc()),
  check('mobile_client_notifications_check',sql`(${t.kind} = 'announcement' AND ${t.requestId} IS NULL) OR (${t.kind} <> 'announcement' AND ${t.requestId} IS NOT NULL)`),
]);
export const mobileClientNotificationReads = pgTable('mobile_client_notification_reads', {
  ownerKey:text('owner_key').notNull(),
  notificationId:uuid('notification_id').notNull().references(()=>mobileClientNotifications.id,{onDelete:'cascade'}),
  readAt:timestamp('read_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[primaryKey({columns:[t.ownerKey,t.notificationId]})]);

export const mobileNotificationDevicePreferences = pgTable('mobile_notification_device_preferences',{
  deviceKey:text('device_key').primaryKey(),
  enabled:boolean('enabled').notNull().default(true),
  requests:boolean('requests').notNull().default(true),
  communications:boolean('communications').notNull().default(true),
  advertising:boolean('advertising').notNull().default(true),
  updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
});
export const mobileNotificationTokenBindings = pgTable('mobile_notification_token_bindings',{
  tokenDigest:text('token_digest').primaryKey(),
  deviceKey:text('device_key').notNull().references(()=>mobileNotificationDevicePreferences.deviceKey,{onDelete:'cascade'}),
  lastSeenAt:timestamp('last_seen_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[index('mobile_notification_token_bindings_device_idx').on(t.deviceKey)]);

/**
 * Admin-managed Tap payment credentials. Single row (`id` is always true).
 * Secret keys are encrypted at rest and never serialized back to a client.
 */
export const tapGatewaySettings = pgTable("tap_gateway_settings", {
  id: boolean("id").primaryKey().default(true),
  activeEnvironment: text("active_environment").default("test").notNull(),
  liveEnabled: boolean("live_enabled").default(false).notNull(),
  testSecretKeyEncrypted: text("test_secret_key_encrypted"),
  testPublicKey: text("test_public_key"),
  testMerchantId: text("test_merchant_id"),
  testMarketplaceMid: text("test_marketplace_mid"),
  liveSecretKeyEncrypted: text("live_secret_key_encrypted"),
  livePublicKey: text("live_public_key"),
  liveMerchantId: text("live_merchant_id"),
  liveMarketplaceMid: text("live_marketplace_mid"),
  lastTestStatus: text("last_test_status"),
  lastTestAt: timestamp("last_test_at", { withTimezone: true }),
  lastTestMessage: text("last_test_message"),
  updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
