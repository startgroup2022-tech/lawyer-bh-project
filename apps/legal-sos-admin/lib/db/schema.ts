// Legal SOS database schema. Mirrors the SOS dispatch concept that
// powers lawyers.bh's /sos page but is hosted in its own Neon database
// for the legalsos.lawyer mobile + web product line.
//
// Drizzle generates SQL migrations from this file. Vercel's build
// command runs `drizzle-kit migrate` against the prod DATABASE_URL
// before `next build`, so deployments are schema-safe.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ───────────────────────────────────────────────────────────

export const caseTypeEnum = pgEnum("case_type", [
  "emergency_consultation",
  "emergency_arrest",
  "emergency_search",
  "emergency_travel_ban",
  "emergency_evidence",
  "emergency_report",
   "emergency_consultation",
]);

export const fulfillmentEnum = pgEnum("fulfillment", ["remote", "field"]);

export const serviceStatusEnum = pgEnum("service_status", [
  "pending",
  "mobilizing",
  "arrived",
  "completed",
  "cancelled",
  "disputed",
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

export const idTypeEnum = pgEnum("id_type", ["cpr", "residence", "passport"]);
export const consentRoleEnum = pgEnum("consent_role", ["client", "advocate"]);
export const consentLocaleEnum = pgEnum("consent_locale", ["en", "ar"]);

export const countryCodeEnum = pgEnum("country_code", [
  "BH",
  "AE",
  "SA",
  "KW",
  "QA",
  "OM",
]);

// ── Lawyers ─────────────────────────────────────────────────────────

export const lawyers = pgTable(
  "lawyers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name").notNull(),
    rollNumber: varchar("roll_number", { length: 64 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: text("email"),
    /** Country this lawyer is licensed to operate in. */
    countryCode: countryCodeEnum("country_code").notNull().default("BH"),
    /** Languages the lawyer can conduct cases in. */
    languages: jsonb("languages").$type<("en" | "ar")[]>().notNull().default([]),
    /** When true, this lawyer is currently on-call. Falls back to shift logic. */
    emergencyReady: boolean("emergency_ready").notNull().default(false),
    /** Max distance the lawyer is willing to dispatch to (kilometres). */
    serviceRadiusKm: integer("service_radius_km").notNull().default(25),
    /** Lawyer's home base coordinates for distance calculations. */
    baseLat: numeric("base_lat", { precision: 9, scale: 6 }),
    baseLng: numeric("base_lng", { precision: 9, scale: 6 }),
    /** Cached rolling rating; refreshed by a job. */
    rating: numeric("rating", { precision: 3, scale: 2 }),
    totalCases: integer("total_cases").notNull().default(0),
    /** Whether the lawyer has signed the SOS Service Agreement. */
    consentId: uuid("consent_id").references(() => consentLog.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    rollIdx: uniqueIndex("lawyers_roll_idx").on(t.rollNumber),
    phoneIdx: uniqueIndex("lawyers_phone_idx").on(t.phone),
    activeReadyIdx: index("lawyers_active_ready_idx").on(t.isActive, t.emergencyReady),
  }),
);

// ── Consent log (client + advocate signed records) ──────────────────

export const consentLog = pgTable("consent_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: consentRoleEnum("role").notNull(),
  fullName: text("full_name").notNull(),
  idType: idTypeEnum("id_type").notNull(),
  idNumber: text("id_number").notNull(),
  /** Base64 PNG dataURL of the signature pad output. */
  signatureDataUrl: text("signature_data_url").notNull(),
  /** SHA-256 hash of the contract text the user agreed to. Proves which
   *  version was signed even if the wording is later changed. */
  contractTextHash: varchar("contract_text_hash", { length: 64 }).notNull(),
  locale: consentLocaleEnum("locale").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentedAt: timestamp("consented_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Emergency requests (cases) ──────────────────────────────────────

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Human-readable case reference shown in URLs and WhatsApp. */
    caseRef: varchar("case_ref", { length: 32 }).notNull(),
    caseType: caseTypeEnum("case_type").notNull(),
    fulfillment: fulfillmentEnum("fulfillment").notNull(),
    /** Country market this case was created in. */
    countryCode: countryCodeEnum("country_code").notNull().default("BH"),
    /** Consultation language preference (remote cases). */
    language: consentLocaleEnum("language"),

    // Client identity
    clientName: text("client_name").notNull(),
    clientPhone: varchar("client_phone", { length: 32 }).notNull(),
    clientIdType: idTypeEnum("client_id_type").notNull(),
    clientIdNumber: text("client_id_number").notNull(),
    clientDescription: text("client_description"),

    // Location (null for remote consultations)
    locationLat: numeric("location_lat", { precision: 9, scale: 6 }),
    locationLng: numeric("location_lng", { precision: 9, scale: 6 }),
    locationAddress: text("location_address"),
    locationAccuracyM: integer("location_accuracy_m"),

    // Consent linkage
    consentId: uuid("consent_id").references(() => consentLog.id),

    // Assignment
    assignedLawyerId: uuid("assigned_lawyer_id").references(() => lawyers.id),
    /** Last reported GPS of the advocate while mobilizing. */
    lastAdvocateLat: numeric("last_advocate_lat", { precision: 9, scale: 6 }),
    lastAdvocateLng: numeric("last_advocate_lng", { precision: 9, scale: 6 }),
    lastAdvocateAt: timestamp("last_advocate_at", { withTimezone: true }),

    // Lifecycle
    serviceStatus: serviceStatusEnum("service_status").notNull().default("pending"),
    responseTimestamp: timestamp("response_timestamp", { withTimezone: true }),
    arrivalTimestamp: timestamp("arrival_timestamp", { withTimezone: true }),
    completedTimestamp: timestamp("completed_timestamp", { withTimezone: true }),

    // Money
    baseFeeBhd: numeric("base_fee_bhd", { precision: 10, scale: 3 }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    paymentRef: text("payment_ref"),
    refundStatus: refundStatusEnum("refund_status").notNull().default("none"),
    refundAmountBhd: numeric("refund_amount_bhd", { precision: 10, scale: 3 }),
    refundRef: text("refund_ref"),
    refundMarkedBy: text("refund_marked_by"),

    // Payout tracking
    settledAt: timestamp("settled_at", { withTimezone: true }),
    settledBy: text("settled_by"),

    // Rating
    ratingStars: integer("rating_stars"),
    ratingComment: text("rating_comment"),

    // Operator audit log (chronological actor events)
    operatorLog: jsonb("operator_log")
      .$type<Array<{ at: string; actor: string; action: string; meta?: unknown }>>()
      .notNull()
      .default([]),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    caseRefIdx: uniqueIndex("cases_case_ref_idx").on(t.caseRef),
    statusIdx: index("cases_status_idx").on(t.serviceStatus),
    paymentIdx: index("cases_payment_idx").on(t.paymentStatus),
    createdIdx: index("cases_created_idx").on(t.createdAt),
    assignedIdx: index("cases_assigned_idx").on(t.assignedLawyerId),
  }),
);

// ── Advocate shifts (on-call windows) ───────────────────────────────

export const advocateShifts = pgTable(
  "advocate_shifts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    /** Day-of-week (0 = Sunday, 6 = Saturday). */
    dayOfWeek: integer("day_of_week").notNull(),
    /** Shift start as UTC minute-of-day (0–1439). */
    startMinute: integer("start_minute").notNull(),
    /** Shift end as UTC minute-of-day (0–1439). May be < start to span midnight. */
    endMinute: integer("end_minute").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    lawyerDayIdx: index("shifts_lawyer_day_idx").on(t.lawyerId, t.dayOfWeek),
  }),
);

// ── Push subscriptions (Web Push + Expo Push) ───────────────────────

export const pushKindEnum = pgEnum("push_kind", ["web", "expo"]);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    kind: pushKindEnum("kind").notNull().default("web"),
    /** For "web": full Web Push endpoint URL. For "expo": Expo push token. */
    endpoint: text("endpoint").notNull(),
    /** Only set for "web" subscriptions — ECDH P-256 public key. */
    p256dh: text("p256dh"),
    /** Only set for "web" — auth secret. */
    auth: text("auth"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    endpointIdx: uniqueIndex("push_endpoint_idx").on(t.endpoint),
    lawyerKindIdx: index("push_lawyer_kind_idx").on(t.lawyerId, t.kind),
  }),
);

// ── Admin operators (dashboard users) ───────────────────────────────

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    /** Bcrypt or argon2 hash. Sign-in flow added in a later phase. */
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("admin_email_idx").on(t.email),
  }),
);

// ── Platform users (mobile app: clients + lawyers) ──────────────────
//
// `adminUsers` above is for back-office staff who log into the admin
// console with email+password. This `users` table is for mobile-app
// identities that authenticate with phone+OTP. A `lawyer` row in
// `lawyers` is linked 1:1 to a `users` row via lawyers.userId once
// the lawyer signs in on their phone.

export const userRoleEnum = pgEnum("user_role", ["client", "lawyer"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** E.164-formatted mobile number, e.g. +97333224471. Globally unique. */
    phone: varchar("phone", { length: 32 }).notNull(),
    role: userRoleEnum("role").notNull(),
    fullName: text("full_name"),
    email: text("email"),
    locale: consentLocaleEnum("locale").notNull().default("en"),
    countryCode: countryCodeEnum("country_code").notNull().default("BH"),
    /** Bahrain CPR or equivalent national ID (clients only). */
    idType: idTypeEnum("id_type"),
    idNumber: text("id_number"),
    /** True once phone OTP has been verified at least once. */
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    /** Soft-disable without losing history. */
    isActive: boolean("is_active").notNull().default(true),
    /** Last successful auth — used for re-KYC prompts. */
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    phoneIdx: uniqueIndex("users_phone_idx").on(t.phone),
    roleActiveIdx: index("users_role_active_idx").on(t.role, t.isActive),
  }),
);

// ── OTP codes (Twilio Verify-backed SMS verification) ───────────────
//
// We still keep our own row per attempt for rate-limiting + audit even
// though Twilio Verify holds the canonical code server-side. Row exists
// so we can show "5 attempts left", block phone after N failed tries,
// and produce a tamper-evident audit log.

export const otpPurposeEnum = pgEnum("otp_purpose", ["signin", "rekyc"]);
export const otpStatusEnum = pgEnum("otp_status", [
  "pending",
  "verified",
  "expired",
  "consumed",
  "abandoned",
]);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** E.164 phone. Not FK to users — we send OTPs before the user row exists. */
    phone: varchar("phone", { length: 32 }).notNull(),
    purpose: otpPurposeEnum("purpose").notNull().default("signin"),
    /** Provider reference (Twilio Verify SID) for the verification attempt. */
    providerRef: text("provider_ref"),
    status: otpStatusEnum("status").notNull().default("pending"),
    /** Count of failed code submissions for this attempt. */
    attempts: integer("attempts").notNull().default(0),
    /** When the OTP is no longer accepted by Twilio (10 min by default). */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    phoneStatusIdx: index("otp_phone_status_idx").on(t.phone, t.status),
    expiresIdx: index("otp_expires_idx").on(t.expiresAt),
  }),
);

// ── Sessions (mobile JWT refresh tokens + admin web cookies) ────────
//
// Mobile: long-lived refresh token stored client-side in SecureStore.
// Server stores a hash. Short-lived access JWT issued from refresh.
// Admin: server-set HttpOnly cookie containing a session reference.

export const sessionSubjectEnum = pgEnum("session_subject", [
  "mobile_user",
  "admin_user",
]);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subject: sessionSubjectEnum("subject").notNull(),
    /** users.id when subject=mobile_user; admin_users.id when subject=admin_user. */
    subjectId: uuid("subject_id").notNull(),
    /** SHA-256 of the refresh token (mobile) or session secret (admin). */
    tokenHash: text("token_hash").notNull(),
    /** Free-form context: { ua, ip, deviceModel, osVersion, appVersion }. */
    deviceInfo: jsonb("device_info").$type<Record<string, string>>(),
    /** Hard expiry — sessions are deleted past this. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Updated every time the session is refreshed. */
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tokenIdx: uniqueIndex("sessions_token_idx").on(t.tokenHash),
    subjectIdx: index("sessions_subject_idx").on(t.subject, t.subjectId),
    expiresIdx: index("sessions_expires_idx").on(t.expiresAt),
  }),
);

// ── Live lawyer locations (dispatch + tracking) ─────────────────────
//
// One row per lawyer, upserted by `expo-location` background updates
// every ~15s while the lawyer is mobilizing. Trimmed of historical
// pings — for audit history use `audit_log` or a future ts_lawyer_pings
// table partitioned by day.

export const lawyerLocations = pgTable(
  "lawyer_locations",
  {
    lawyerId: uuid("lawyer_id")
      .notNull()
      .primaryKey()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
    lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
    accuracyM: integer("accuracy_m"),
    headingDeg: integer("heading_deg"),
    speedMps: numeric("speed_mps", { precision: 5, scale: 2 }),
    /** If currently mobilizing on a case, this links to it. */
    activeCaseId: uuid("active_case_id").references(() => cases.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    activeCaseIdx: index("lawyer_loc_active_case_idx").on(t.activeCaseId),
    updatedIdx: index("lawyer_loc_updated_idx").on(t.updatedAt),
  }),
);

// ── Payments (Tap charges + Tap refunds — granular ledger) ──────────
//
// The `cases` table already has `paymentStatus`/`paymentRef` as a quick
// rollup. This table is the full append-only ledger that the Tap webhook
// writes to: every authorize, capture, refund, chargeback gets its own
// row. Reconciliation jobs trust this table over the rollup.

export const paymentProviderEnum = pgEnum("payment_provider", [
  "tap",
  "manual",
]);
export const paymentKindEnum = pgEnum("payment_kind", [
  "authorize",
  "capture",
  "refund",
  "chargeback",
  "void",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    provider: paymentProviderEnum("provider").notNull().default("tap"),
    kind: paymentKindEnum("kind").notNull(),
    /** Tap charge ID (chg_xxx) or refund ID (re_xxx). Idempotency anchor. */
    providerRef: text("provider_ref").notNull(),
    amountBhd: numeric("amount_bhd", { precision: 10, scale: 3 }).notNull(),
    /** Last status reported by the provider (e.g. "CAPTURED", "FAILED"). */
    providerStatus: text("provider_status").notNull(),
    /** Raw webhook body kept verbatim for audit + debugging. */
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    providerRefIdx: uniqueIndex("payments_provider_ref_idx").on(
      t.provider,
      t.providerRef,
    ),
    caseIdx: index("payments_case_idx").on(t.caseId),
    createdIdx: index("payments_created_idx").on(t.createdAt),
  }),
);

// ── Lawyer payouts (earnings statements + transfers out) ────────────

export const payoutStatusEnum = pgEnum("payout_status", [
  "draft",
  "approved",
  "transferred",
  "failed",
]);

export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "restrict" }),
    /** Statement period start (inclusive). */
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    /** Statement period end (exclusive). */
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    /** Sum of net lawyer earnings (after platform fee) across cases in period. */
    grossBhd: numeric("gross_bhd", { precision: 10, scale: 3 }).notNull(),
    platformFeeBhd: numeric("platform_fee_bhd", { precision: 10, scale: 3 })
      .notNull(),
    netBhd: numeric("net_bhd", { precision: 10, scale: 3 }).notNull(),
    status: payoutStatusEnum("status").notNull().default("draft"),
    /** Set once a bank/IBAN transfer is initiated. */
    transferRef: text("transfer_ref"),
    transferredAt: timestamp("transferred_at", { withTimezone: true }),
    /** Operator who approved/issued. */
    approvedByAdminId: uuid("approved_by_admin_id").references(() => adminUsers.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    lawyerPeriodIdx: uniqueIndex("payouts_lawyer_period_idx").on(
      t.lawyerId,
      t.periodStart,
    ),
    statusIdx: index("payouts_status_idx").on(t.status),
  }),
);

// ── Evidence files (R2/S3-backed uploads attached to cases) ─────────

export const evidenceKindEnum = pgEnum("evidence_kind", [
  "photo",
  "document",
  "audio",
  "video",
  "signature",
]);

export const evidenceFiles = pgTable(
  "evidence_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    /** Who uploaded — links to either users.id or lawyers.id. */
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
    uploadedByLawyerId: uuid("uploaded_by_lawyer_id").references(() => lawyers.id),
    kind: evidenceKindEnum("kind").notNull(),
    /** Object key inside the R2 bucket (no leading slash). */
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** Optional caption shown in the admin viewer. */
    caption: text("caption"),
    /** SHA-256 of bytes for tamper detection. */
    sha256: varchar("sha256", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    caseIdx: index("evidence_case_idx").on(t.caseId),
    storageKeyIdx: uniqueIndex("evidence_storage_key_idx").on(t.storageKey),
  }),
);

// ── Audit log (PDPL compliance — every actor event, append-only) ────
//
// Required by Bahrain PDPL for traceability of access to personal data.
// Cannot be deleted via the app — rotation is handled by a DBA task that
// archives rows older than the legal retention window (currently 5y).

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Who acted: admin_users.id, users.id, lawyers.id, or NULL for system. */
    actorAdminId: uuid("actor_admin_id").references(() => adminUsers.id),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorLawyerId: uuid("actor_lawyer_id").references(() => lawyers.id),
    /** Machine-readable action key, e.g. "case.create", "admin.signin". */
    action: varchar("action", { length: 64 }).notNull(),
    /** Type of the affected entity. */
    targetType: varchar("target_type", { length: 32 }),
    targetId: uuid("target_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    actionIdx: index("audit_action_idx").on(t.action),
    targetIdx: index("audit_target_idx").on(t.targetType, t.targetId),
    createdIdx: index("audit_created_idx").on(t.createdAt),
  }),
);

// ── Relations ───────────────────────────────────────────────────────

export const lawyersRelations = relations(lawyers, ({ many, one }) => ({
  cases: many(cases),
  shifts: many(advocateShifts),
  pushSubs: many(pushSubscriptions),
  consent: one(consentLog, {
    fields: [lawyers.consentId],
    references: [consentLog.id],
  }),
  location: one(lawyerLocations, {
    fields: [lawyers.id],
    references: [lawyerLocations.lawyerId],
  }),
  payouts: many(payouts),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  assignedLawyer: one(lawyers, {
    fields: [cases.assignedLawyerId],
    references: [lawyers.id],
  }),
  consent: one(consentLog, {
    fields: [cases.consentId],
    references: [consentLog.id],
  }),
  payments: many(payments),
  evidence: many(evidenceFiles),
}));

export const usersRelations = relations(users, ({ many }) => ({
  uploads: many(evidenceFiles),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  case: one(cases, {
    fields: [payments.caseId],
    references: [cases.id],
  }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  lawyer: one(lawyers, {
    fields: [payouts.lawyerId],
    references: [lawyers.id],
  }),
  approvedBy: one(adminUsers, {
    fields: [payouts.approvedByAdminId],
    references: [adminUsers.id],
  }),
}));

export const evidenceFilesRelations = relations(evidenceFiles, ({ one }) => ({
  case: one(cases, {
    fields: [evidenceFiles.caseId],
    references: [cases.id],
  }),
  uploadedByUser: one(users, {
    fields: [evidenceFiles.uploadedByUserId],
    references: [users.id],
  }),
  uploadedByLawyer: one(lawyers, {
    fields: [evidenceFiles.uploadedByLawyerId],
    references: [lawyers.id],
  }),
}));
