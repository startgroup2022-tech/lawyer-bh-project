import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull(),
};

export const sarayaRole = pgEnum("saraya_role", [
  "super_admin",
  "property_manager",
  "accountant",
  "maintenance",
  "owner",
  "tenant",
]);

export const sarayaUnitStatus = pgEnum("saraya_unit_status", [
  "vacant",
  "occupied",
  "reserved",
  "maintenance",
  "inactive",
]);

export const sarayaUsers = pgTable(
  "saraya_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    normalizedEmail: text("normalized_email"),
    normalizedPhone: varchar("normalized_phone", { length: 32 }),
    passwordHash: text("password_hash"),
    displayNameAr: text("display_name_ar").notNull(),
    displayNameEn: text("display_name_en").notNull(),
    locale: varchar("locale", { length: 2 }).default("ar").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, precision: 3 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("saraya_users_normalized_email_uidx")
      .on(table.normalizedEmail)
      .where(sql`${table.normalizedEmail} IS NOT NULL`),
    uniqueIndex("saraya_users_normalized_phone_uidx")
      .on(table.normalizedPhone)
      .where(sql`${table.normalizedPhone} IS NOT NULL`),
    check(
      "saraya_users_identity_check",
      sql`${table.normalizedEmail} IS NOT NULL OR ${table.normalizedPhone} IS NOT NULL`,
    ),
    check("saraya_users_locale_check", sql`${table.locale} IN ('ar', 'en')`),
  ],
);

export const sarayaProperties = pgTable(
  "saraya_properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    addressAr: text("address_ar"),
    addressEn: text("address_en"),
    timezone: text("timezone").default("Asia/Bahrain").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).default("BHD").notNull(),
    rentalApprovalMode: varchar("rental_approval_mode", { length: 24 })
      .default("owner_review")
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("saraya_properties_code_uidx").on(table.code),
    check("saraya_properties_currency_check", sql`char_length(${table.currencyCode}) = 3`),
    check(
      "saraya_properties_rental_approval_mode_check",
      sql`${table.rentalApprovalMode} IN ('instant', 'owner_review')`,
    ),
  ],
);

export const sarayaPropertyMemberships = pgTable(
  "saraya_property_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => sarayaProperties.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => sarayaUsers.id, { onDelete: "cascade" }),
    role: sarayaRole("role").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    unique("saraya_property_memberships_property_user_key").on(
      table.propertyId,
      table.userId,
    ),
    index("saraya_property_memberships_user_idx").on(table.userId),
  ],
);

export const sarayaOwners = pgTable(
  "saraya_owners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    userId: uuid("user_id").references(() => sarayaUsers.id, { onDelete: "set null" }),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    registrationNumber: text("registration_number"),
    ...timestamps,
  },
  (table) => [
    unique("saraya_owners_property_id_key").on(table.propertyId, table.id),
    index("saraya_owners_property_idx").on(table.propertyId),
    index("saraya_owners_user_idx").on(table.userId),
  ],
);

export const sarayaTenantOrganizations = pgTable(
  "saraya_tenant_organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    registrationNumber: text("registration_number"),
    taxNumber: text("tax_number"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    unique("saraya_tenant_organizations_property_id_key").on(table.propertyId, table.id),
    index("saraya_tenant_organizations_property_idx").on(table.propertyId),
    uniqueIndex("saraya_tenant_orgs_property_registration_uidx")
      .on(table.propertyId, sql`lower(regexp_replace(btrim(${table.registrationNumber}), '\\s+', '', 'g'))`)
      .where(sql`NULLIF(btrim(${table.registrationNumber}), '') IS NOT NULL`),
  ],
);

export const sarayaVirtualAddresses = pgTable(
  "saraya_virtual_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => sarayaProperties.id, { onDelete: "restrict" }),
    slotNumber: integer("slot_number").notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    status: varchar("status", { length: 16 }).default("available").notNull(),
    tenantOrganizationId: uuid("tenant_organization_id"),
    businessNameAr: text("business_name_ar"),
    businessNameEn: text("business_name_en"),
    monthlyFee: numeric("monthly_fee", { precision: 14, scale: 3 }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    ...timestamps,
  },
  (table) => [
    unique("saraya_virtual_addresses_property_slot_key").on(
      table.propertyId,
      table.slotNumber,
    ),
    unique("saraya_virtual_addresses_property_code_key").on(
      table.propertyId,
      table.code,
    ),
    index("saraya_virtual_addresses_property_status_idx").on(
      table.propertyId,
      table.status,
    ),
    foreignKey({
      name: "saraya_virtual_addresses_property_tenant_fk",
      columns: [table.propertyId, table.tenantOrganizationId],
      foreignColumns: [
        sarayaTenantOrganizations.propertyId,
        sarayaTenantOrganizations.id,
      ],
    }).onDelete("restrict"),
    check(
      "saraya_virtual_addresses_slot_check",
      sql`${table.slotNumber} BETWEEN 1 AND 50`,
    ),
    check(
      "saraya_virtual_addresses_status_check",
      sql`${table.status} IN ('available', 'reserved', 'active', 'suspended', 'inactive')`,
    ),
    check(
      "saraya_virtual_addresses_fee_check",
      sql`${table.monthlyFee} IS NULL OR ${table.monthlyFee} >= 0`,
    ),
    check(
      "saraya_virtual_addresses_dates_check",
      sql`${table.endDate} IS NULL OR ${table.startDate} IS NULL OR ${table.endDate} >= ${table.startDate}`,
    ),
  ],
);

export const sarayaContacts = pgTable(
  "saraya_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => sarayaProperties.id, { onDelete: "restrict" }),
    tenantOrganizationId: uuid("tenant_organization_id"),
    ownerId: uuid("owner_id"),
    userId: uuid("user_id").references(() => sarayaUsers.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: varchar("phone", { length: 32 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index("saraya_contacts_property_idx").on(table.propertyId),
    index("saraya_contacts_property_tenant_idx").on(
      table.propertyId,
      table.tenantOrganizationId,
    ),
    index("saraya_contacts_property_owner_idx").on(table.propertyId, table.ownerId),
    index("saraya_contacts_user_idx").on(table.userId),
    uniqueIndex("saraya_contacts_property_verified_tenant_user_uidx")
      .on(table.propertyId, table.userId)
      .where(sql`${table.tenantOrganizationId} IS NOT NULL AND ${table.userId} IS NOT NULL`),
    foreignKey({
      name: "saraya_contacts_property_tenant_fk",
      columns: [table.propertyId, table.tenantOrganizationId],
      foreignColumns: [
        sarayaTenantOrganizations.propertyId,
        sarayaTenantOrganizations.id,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "saraya_contacts_property_owner_fk",
      columns: [table.propertyId, table.ownerId],
      foreignColumns: [sarayaOwners.propertyId, sarayaOwners.id],
    }).onDelete("cascade"),
    check(
      "saraya_contacts_one_party_check",
      sql`((${table.tenantOrganizationId} IS NOT NULL)::int + (${table.ownerId} IS NOT NULL)::int) = 1`,
    ),
  ],
);

export const sarayaUnitTypes = pgTable(
  "saraya_unit_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => sarayaProperties.id, { onDelete: "cascade" }),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    catalogKind: varchar("catalog_kind", { length: 16 })
      .default("office")
      .notNull(),
    defaultRent: numeric("default_rent", { precision: 14, scale: 3 }),
    ...timestamps,
  },
  (table) => [
    unique("saraya_unit_types_property_id_key").on(table.propertyId, table.id),
    unique("saraya_unit_types_property_name_key").on(table.propertyId, table.nameEn),
    check(
      "saraya_unit_types_default_rent_check",
      sql`${table.defaultRent} IS NULL OR ${table.defaultRent} >= 0`,
    ),
    check(
      "saraya_unit_types_catalog_kind_check",
      sql`${table.catalogKind} IN ('office', 'shop')`,
    ),
  ],
);

export const sarayaUnits = pgTable(
  "saraya_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => sarayaProperties.id, { onDelete: "restrict" }),
    unitTypeId: uuid("unit_type_id"),
    ownerId: uuid("owner_id"),
    unitNumber: varchar("unit_number", { length: 64 }).notNull(),
    parentUnitId: uuid("parent_unit_id"),
    isRentable: boolean("is_rentable").default(true).notNull(),
    partOrder: integer("part_order"),
    displayNameAr: text("display_name_ar"),
    displayNameEn: text("display_name_en"),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    imageKey: text("image_key"),
    isPublicListing: boolean("is_public_listing").default(false).notNull(),
    rentalApprovalOverride: varchar("rental_approval_override", { length: 24 }),
    floor: text("floor"),
    status: sarayaUnitStatus("status").default("vacant").notNull(),
    areaSquareMeters: numeric("area_square_meters", { precision: 12, scale: 3 }),
    marketRent: numeric("market_rent", { precision: 14, scale: 3 }),
    availableFrom: date("available_from"),
    ...timestamps,
  },
  (table) => [
    unique("saraya_units_property_id_key").on(table.propertyId, table.id),
    unique("saraya_units_property_number_key").on(table.propertyId, table.unitNumber),
    index("saraya_units_property_status_idx").on(table.propertyId, table.status),
    index("saraya_units_property_unit_type_idx").on(table.propertyId, table.unitTypeId),
    index("saraya_units_property_owner_idx").on(table.propertyId, table.ownerId),
    index("saraya_units_property_parent_order_idx").on(
      table.propertyId,
      table.parentUnitId,
      table.partOrder,
    ),
    uniqueIndex("saraya_units_property_parent_order_uidx")
      .on(table.propertyId, table.parentUnitId, table.partOrder)
      .where(sql`${table.parentUnitId} IS NOT NULL`),
    uniqueIndex("saraya_units_property_parent_name_uidx")
      .on(table.propertyId, table.parentUnitId, sql`lower(${table.displayNameAr})`)
      .where(sql`${table.parentUnitId} IS NOT NULL`),
    foreignKey({
      name: "saraya_units_property_parent_fk",
      columns: [table.propertyId, table.parentUnitId],
      foreignColumns: [table.propertyId, table.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_units_property_unit_type_fk",
      columns: [table.propertyId, table.unitTypeId],
      foreignColumns: [sarayaUnitTypes.propertyId, sarayaUnitTypes.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_units_property_owner_fk",
      columns: [table.propertyId, table.ownerId],
      foreignColumns: [sarayaOwners.propertyId, sarayaOwners.id],
    }).onDelete("restrict"),
    check(
      "saraya_units_area_check",
      sql`${table.areaSquareMeters} IS NULL OR ${table.areaSquareMeters} > 0`,
    ),
    check(
      "saraya_units_market_rent_check",
      sql`${table.marketRent} IS NULL OR ${table.marketRent} >= 0`,
    ),
    check(
      "saraya_units_part_order_check",
      sql`(${table.parentUnitId} IS NULL AND ${table.partOrder} IS NULL) OR (${table.parentUnitId} IS NOT NULL AND ${table.partOrder} BETWEEN 1 AND 10)`,
    ),
    check(
      "saraya_units_part_names_check",
      sql`${table.parentUnitId} IS NULL OR (NULLIF(BTRIM(${table.displayNameAr}), '') IS NOT NULL AND NULLIF(BTRIM(${table.displayNameEn}), '') IS NOT NULL)`,
    ),
    check(
      "saraya_units_parent_rentable_check",
      sql`${table.parentUnitId} IS NULL OR ${table.isRentable}`,
    ),
    check(
      "saraya_units_reserved_zero_id_check",
      sql`${table.id} <> '00000000-0000-0000-0000-000000000000'::uuid`,
    ),
    check(
      "saraya_units_rental_approval_override_check",
      sql`${table.rentalApprovalOverride} IS NULL OR ${table.rentalApprovalOverride} IN ('instant', 'owner_review')`,
    ),
  ],
);

export const sarayaViewingSlots = pgTable(
  "saraya_viewing_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    unitId: uuid("unit_id"),
    unitScopeId: uuid("unit_scope_id")
      .generatedAlwaysAs(
        sql`COALESCE("unit_id", '00000000-0000-0000-0000-000000000000'::uuid)`,
      ),
    startAt: timestamp("start_at", { withTimezone: true, precision: 3 }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, precision: 3 }).notNull(),
    capacity: integer("capacity").default(1).notNull(),
    bookedCount: integer("booked_count").default(0).notNull(),
    status: varchar("status", { length: 24 }).default("active").notNull(),
    instructionsAr: text("instructions_ar"),
    instructionsEn: text("instructions_en"),
    createdByUserId: uuid("created_by_user_id").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("saraya_viewing_slots_property_id_key").on(table.propertyId, table.id),
    unique("saraya_viewing_slots_property_id_scope_key").on(
      table.propertyId,
      table.id,
      table.unitScopeId,
    ),
    index("saraya_viewing_slots_active_start_idx").on(
      table.propertyId,
      table.unitId,
      table.status,
      table.startAt,
    ),
    foreignKey({
      name: "saraya_viewing_slots_property_fk",
      columns: [table.propertyId],
      foreignColumns: [sarayaProperties.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_viewing_slots_property_unit_fk",
      columns: [table.propertyId, table.unitId],
      foreignColumns: [sarayaUnits.propertyId, sarayaUnits.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_viewing_slots_created_by_fk",
      columns: [table.createdByUserId],
      foreignColumns: [sarayaUsers.id],
    }).onDelete("restrict"),
    check("saraya_viewing_slots_time_check", sql`${table.endAt} > ${table.startAt}`),
    check(
      "saraya_viewing_slots_capacity_check",
      sql`${table.capacity} > 0 AND ${table.bookedCount} >= 0 AND ${table.bookedCount} <= ${table.capacity}`,
    ),
    check(
      "saraya_viewing_slots_status_check",
      sql`${table.status} IN ('active', 'disabled', 'cancelled')`,
    ),
  ],
);

export const sarayaViewingAppointments = pgTable(
  "saraya_viewing_appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    unitId: uuid("unit_id").notNull(),
    slotId: uuid("slot_id").notNull(),
    slotUnitScopeId: uuid("slot_unit_scope_id").notNull(),
    userId: uuid("user_id"),
    reference: varchar("reference", { length: 32 }).notNull(),
    visitorName: text("visitor_name").notNull(),
    visitorPhone: text("visitor_phone").notNull(),
    visitorEmail: citext("visitor_email").notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),
    status: varchar("status", { length: 24 }).default("confirmed").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    internalNotes: text("internal_notes"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, precision: 3 }),
    ...timestamps,
  },
  (table) => [
    unique("saraya_viewing_appointments_property_id_key").on(table.propertyId, table.id),
    unique("saraya_viewing_appointments_property_reference_key").on(
      table.propertyId,
      table.reference,
    ),
    uniqueIndex("saraya_viewing_appointments_idempotency_uidx").on(table.idempotencyKey),
    index("saraya_viewing_appointments_property_status_created_idx").on(
      table.propertyId,
      table.status,
      table.createdAt.desc(),
    ),
    foreignKey({
      name: "saraya_viewing_appointments_property_fk",
      columns: [table.propertyId],
      foreignColumns: [sarayaProperties.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_viewing_appointments_property_slot_unit_fk",
      columns: [table.propertyId, table.slotId, table.slotUnitScopeId],
      foreignColumns: [
        sarayaViewingSlots.propertyId,
        sarayaViewingSlots.id,
        sarayaViewingSlots.unitScopeId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_viewing_appointments_property_unit_fk",
      columns: [table.propertyId, table.unitId],
      foreignColumns: [sarayaUnits.propertyId, sarayaUnits.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_viewing_appointments_user_fk",
      columns: [table.userId],
      foreignColumns: [sarayaUsers.id],
    }).onDelete("set null"),
    check(
      "saraya_viewing_appointments_status_check",
      sql`${table.status} IN ('confirmed', 'completed', 'no_show', 'cancelled')`,
    ),
    check(
      "saraya_viewing_appointments_locale_check",
      sql`${table.locale} IN ('ar', 'en')`,
    ),
    check(
      "saraya_viewing_appointments_slot_unit_scope_check",
      sql`${table.slotUnitScopeId} = ${table.unitId} OR ${table.slotUnitScopeId} = '00000000-0000-0000-0000-000000000000'::uuid`,
    ),
  ],
);

export const sarayaViewingCommands = pgTable(
  "saraya_viewing_commands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    actorUserId: uuid("actor_user_id").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 32 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    normalizedInputHash: char("normalized_input_hash", { length: 64 }).notNull(),
    normalizedInput: jsonb("normalized_input").notNull(),
    result: jsonb("result").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("saraya_viewing_commands_actor_key_uidx").on(
      table.actorUserId,
      table.idempotencyKey,
    ),
    index("saraya_viewing_commands_property_entity_idx").on(
      table.propertyId,
      table.entityType,
      table.entityId,
    ),
    foreignKey({
      name: "saraya_viewing_commands_property_fk",
      columns: [table.propertyId],
      foreignColumns: [sarayaProperties.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_viewing_commands_actor_fk",
      columns: [table.actorUserId],
      foreignColumns: [sarayaUsers.id],
    }).onDelete("restrict"),
    check(
      "saraya_viewing_commands_idempotency_key_check",
      sql`NULLIF(BTRIM(${table.idempotencyKey}), '') IS NOT NULL`,
    ),
    check(
      "saraya_viewing_commands_action_check",
      sql`${table.action} IN ('viewing_slot.create', 'viewing_slot.update', 'viewing_appointment.status')`,
    ),
    check(
      "saraya_viewing_commands_entity_type_check",
      sql`${table.entityType} IN ('viewing_slot', 'viewing_appointment')`,
    ),
    check(
      "saraya_viewing_commands_input_hash_check",
      sql`${table.normalizedInputHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "saraya_viewing_commands_result_check",
      sql`jsonb_typeof(${table.result}) = 'object' AND ${table.result} ? 'entityId' AND ${table.result} ? 'status' AND ${table.result} - ARRAY['entityId', 'status'] = '{}'::jsonb`,
    ),
  ],
);

export const sarayaAuditLogs = pgTable(
  "saraya_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => sarayaProperties.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => sarayaUsers.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("saraya_audit_logs_property_created_idx").on(
      table.propertyId,
      table.createdAt.desc(),
    ),
    index("saraya_audit_logs_actor_idx").on(table.actorUserId),
  ],
);

export const sarayaInvitations = pgTable(
  "saraya_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull().references(() => sarayaProperties.id, { onDelete: "cascade" }),
    role: sarayaRole("role").notNull(),
    normalizedEmail: text("normalized_email"),
    normalizedPhone: varchar("normalized_phone", { length: 32 }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, precision: 3 }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true, precision: 3 }),
    invitedByUserId: uuid("invited_by_user_id").references(() => sarayaUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("saraya_invitations_token_hash_uidx").on(table.tokenHash),
    index("saraya_invitations_property_idx").on(table.propertyId),
    check("saraya_invitations_identity_check", sql`${table.normalizedEmail} IS NOT NULL OR ${table.normalizedPhone} IS NOT NULL`),
    check("saraya_invitations_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);

export const sarayaRefreshSessions = pgTable(
  "saraya_refresh_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id").notNull(),
    generation: integer("generation").default(0).notNull(),
    userId: uuid("user_id").notNull().references(() => sarayaUsers.id, { onDelete: "cascade" }),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    previousRefreshTokenHash: text("previous_refresh_token_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true, precision: 3 }).notNull(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true, precision: 3 }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, precision: 3 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("saraya_refresh_sessions_token_hash_uidx").on(table.refreshTokenHash), uniqueIndex("saraya_refresh_sessions_previous_hash_uidx").on(table.previousRefreshTokenHash).where(sql`${table.previousRefreshTokenHash} IS NOT NULL`), index("saraya_refresh_sessions_user_idx").on(table.userId), index("saraya_refresh_sessions_family_idx").on(table.familyId), check("saraya_refresh_sessions_generation_check", sql`${table.generation} >= 0`)],
);

export const sarayaAuthChallenges = pgTable(
  "saraya_auth_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => sarayaUsers.id, { onDelete: "cascade" }),
    normalizedEmail: text("normalized_email"),
    normalizedPhone: varchar("normalized_phone", { length: 32 }),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, precision: 3 }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true, precision: 3 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("saraya_auth_challenges_token_hash_uidx").on(table.tokenHash), index("saraya_auth_challenges_user_idx").on(table.userId), check("saraya_auth_challenges_purpose_check", sql`${table.purpose} IN ('activate', 'forgot_password', 'phone_otp', 'public_rental_otp')`), check("saraya_auth_challenges_identity_check", sql`${table.userId} IS NOT NULL OR ${table.normalizedEmail} IS NOT NULL OR ${table.normalizedPhone} IS NOT NULL`)],
);

export const sarayaAuthRateLimits = pgTable("saraya_auth_rate_limits", {
  bucket: text("bucket").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true, precision: 3 }).notNull(),
  count: integer("count").default(1).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (table) => [index("saraya_auth_rate_limits_updated_idx").on(table.updatedAt), check("saraya_auth_rate_limits_count_check", sql`${table.count} > 0`)]);

export const sarayaAuthDeliveryAttempts = pgTable("saraya_auth_delivery_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  challengeId: uuid("challenge_id").notNull().references(() => sarayaAuthChallenges.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 16 }).notNull(),
  status: varchar("status", { length: 16 }).default("queued").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastErrorCode: text("last_error_code"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, precision: 3 }),
  ...timestamps,
}, (table) => [index("saraya_auth_delivery_pending_idx").on(table.status, table.nextAttemptAt), check("saraya_auth_delivery_channel_check", sql`${table.channel} IN ('email', 'sms')`), check("saraya_auth_delivery_status_check", sql`${table.status} IN ('queued', 'sent', 'failed')`)]);

export const sarayaAuthAuditLogs = pgTable(
  "saraya_auth_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    challengeId: uuid("challenge_id"),
    userId: uuid("user_id"),
    event: varchar("event", { length: 64 }).notNull(),
    outcome: varchar("outcome", { length: 24 }).notNull(),
    reason: varchar("reason", { length: 32 }),
    ipAddress: text("ip_address"),
    userAgent: varchar("user_agent", { length: 256 }),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("saraya_auth_audit_logs_challenge_created_idx").on(
      table.challengeId,
      table.createdAt.desc(),
    ),
    index("saraya_auth_audit_logs_user_created_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
    index("saraya_auth_audit_logs_event_created_idx").on(
      table.event,
      table.createdAt.desc(),
    ),
    foreignKey({
      name: "saraya_auth_audit_logs_challenge_fk",
      columns: [table.challengeId],
      foreignColumns: [sarayaAuthChallenges.id],
    }).onDelete("set null"),
    foreignKey({
      name: "saraya_auth_audit_logs_user_fk",
      columns: [table.userId],
      foreignColumns: [sarayaUsers.id],
    }).onDelete("set null"),
    check(
      "saraya_auth_audit_logs_event_check",
      sql`${table.event} IN ('challenge.requested', 'challenge.delivery.sent', 'challenge.delivery.failed', 'verify.succeeded', 'verify.failed')`,
    ),
    check(
      "saraya_auth_audit_logs_outcome_check",
      sql`${table.outcome} IN ('accepted', 'succeeded', 'failed')`,
    ),
    check(
      "saraya_auth_audit_logs_reason_check",
      sql`${table.reason} IS NULL OR ${table.reason} IN ('invalid', 'expired', 'consumed', 'disabled', 'rate_limited', 'delivery_failed', 'validation_failed', 'internal_error')`,
    ),
    check(
      "saraya_auth_audit_logs_metadata_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
  ],
);

export const sarayaLeaseStatus = pgEnum("saraya_lease_status", ["draft", "pending_approval", "active", "renewal_requested", "rejected", "terminated", "closed"]);
export const sarayaRentFrequency = pgEnum("saraya_rent_frequency", ["monthly", "quarterly", "annual"]);
export const sarayaRentalRequestStatus = pgEnum("saraya_rental_request_status", [
  "pending_owner_review",
  "approved_awaiting_payment",
  "rejected",
  "paid_awaiting_signature",
  "completed",
  "cancelled",
]);
export const sarayaInvoiceStatus = pgEnum("saraya_invoice_status", [
  "draft",
  "due",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
]);
export const sarayaPaymentDemandStatus = pgEnum("saraya_payment_demand_status", [
  "pending",
  "charge_created",
  "verification_pending",
  "paid",
  "captured",
  "failed",
  "cancelled",
  "refunded",
]);
export const sarayaLedgerEntryType = pgEnum("saraya_ledger_entry_type", [
  "charge",
  "payment",
  "refund",
  "adjustment",
]);

export const sarayaLeases = pgTable("saraya_leases", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").notNull().references(() => sarayaProperties.id, { onDelete: "restrict" }),
  unitId: uuid("unit_id").notNull(),
  tenantOrganizationId: uuid("tenant_organization_id").notNull(),
  status: sarayaLeaseStatus("status").default("draft").notNull(),
  currentVersion: integer("current_version").default(1).notNull(),
  ...timestamps,
}, (table) => [
  unique("saraya_leases_property_id_key").on(table.propertyId, table.id),
  index("saraya_leases_property_status_idx").on(table.propertyId, table.status),
  index("saraya_leases_property_unit_idx").on(table.propertyId, table.unitId),
  index("saraya_leases_property_tenant_idx").on(table.propertyId, table.tenantOrganizationId),
  foreignKey({ name: "saraya_leases_property_unit_fk", columns: [table.propertyId, table.unitId], foreignColumns: [sarayaUnits.propertyId, sarayaUnits.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_leases_property_tenant_fk", columns: [table.propertyId, table.tenantOrganizationId], foreignColumns: [sarayaTenantOrganizations.propertyId, sarayaTenantOrganizations.id] }).onDelete("restrict"),
  check("saraya_leases_current_version_check", sql`${table.currentVersion} > 0`),
]);

export const sarayaLeaseVersions = pgTable("saraya_lease_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").notNull(),
  leaseId: uuid("lease_id").notNull(),
  version: integer("version").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  rentAmount: numeric("rent_amount", { precision: 14, scale: 3 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 14, scale: 3 }).default("0").notNull(),
  frequency: sarayaRentFrequency("frequency").notNull(),
  dueDay: integer("due_day").notNull(),
  graceDays: integer("grace_days").default(0).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 3 }).default("0").notNull(),
  feeAmount: numeric("fee_amount", { precision: 14, scale: 3 }).default("0").notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => sarayaUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (table) => [
  unique("saraya_lease_versions_lease_version_key").on(table.leaseId, table.version),
  unique("saraya_lease_versions_property_id_key").on(table.propertyId, table.id),
  unique("saraya_lease_versions_property_lease_id_key").on(table.propertyId, table.leaseId, table.id),
  unique("saraya_lease_versions_property_lease_version_key").on(table.propertyId, table.leaseId, table.version),
  foreignKey({ name: "saraya_lease_versions_property_lease_fk", columns: [table.propertyId, table.leaseId], foreignColumns: [sarayaLeases.propertyId, sarayaLeases.id] }).onDelete("restrict"),
  check("saraya_lease_versions_date_check", sql`${table.endDate} >= ${table.startDate}`),
  check("saraya_lease_versions_rent_check", sql`${table.rentAmount} > 0`),
  check("saraya_lease_versions_deposit_check", sql`${table.depositAmount} >= 0`),
  check("saraya_lease_versions_due_day_check", sql`${table.dueDay} BETWEEN 1 AND 31`),
  check("saraya_lease_versions_grace_check", sql`${table.graceDays} BETWEEN 0 AND 365`),
  check("saraya_lease_versions_adjustments_check", sql`${table.discountAmount} >= 0 AND ${table.feeAmount} >= 0`),
]);

export const sarayaRentScheduleItems = pgTable("saraya_rent_schedule_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").notNull(),
  leaseId: uuid("lease_id").notNull(),
  leaseVersionId: uuid("lease_version_id").notNull(),
  sequence: integer("sequence").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  dueDate: date("due_date").notNull(),
  graceUntil: date("grace_until").notNull(),
  baseAmount: numeric("base_amount", { precision: 14, scale: 3 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 3 }).default("0").notNull(),
  feeAmount: numeric("fee_amount", { precision: 14, scale: 3 }).default("0").notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 3 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (table) => [
  unique("saraya_rent_schedule_lease_version_sequence_key").on(table.leaseVersionId, table.sequence),
  index("saraya_rent_schedule_property_due_idx").on(table.propertyId, table.dueDate),
  foreignKey({ name: "saraya_rent_schedule_property_lease_fk", columns: [table.propertyId, table.leaseId], foreignColumns: [sarayaLeases.propertyId, sarayaLeases.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_rent_schedule_property_version_fk", columns: [table.propertyId, table.leaseId, table.leaseVersionId], foreignColumns: [sarayaLeaseVersions.propertyId, sarayaLeaseVersions.leaseId, sarayaLeaseVersions.id] }).onDelete("restrict"),
  check("saraya_rent_schedule_period_check", sql`${table.periodEnd} >= ${table.periodStart}`),
  check("saraya_rent_schedule_grace_check", sql`${table.graceUntil} >= ${table.dueDate}`),
  check("saraya_rent_schedule_amounts_check", sql`${table.baseAmount} >= 0 AND ${table.discountAmount} >= 0 AND ${table.feeAmount} >= 0 AND ${table.totalAmount} >= 0`),
]);

export const sarayaLeaseEvents = pgTable("saraya_lease_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").notNull(),
  leaseId: uuid("lease_id").notNull(),
  fromStatus: sarayaLeaseStatus("from_status").notNull(),
  toStatus: sarayaLeaseStatus("to_status").notNull(),
  command: varchar("command", { length: 32 }).notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (table) => [
  index("saraya_lease_events_property_lease_created_idx").on(table.propertyId, table.leaseId, table.createdAt),
  foreignKey({ name: "saraya_lease_events_property_lease_fk", columns: [table.propertyId, table.leaseId], foreignColumns: [sarayaLeases.propertyId, sarayaLeases.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_lease_events_actor_user_fk", columns: [table.actorUserId], foreignColumns: [sarayaUsers.id] }).onDelete("restrict"),
  check("saraya_lease_events_command_check", sql`${table.command} IN ('submit','approve','reject','request_renewal','approve_renewal','reject_renewal','terminate','close')`),
]);

// Drizzle 0.45 does not expose DEFERRABLE on foreignKey(). This cyclic FK is
// intentionally managed by the forward-only SQL migration so a lease and its
// first immutable version can be inserted in one transaction.
export const sarayaLeaseCustomSqlConstraints = [{
  name: "saraya_leases_current_version_fk",
  columns: ["property_id", "id", "current_version"],
  references: { table: "saraya_lease_versions", columns: ["property_id", "lease_id", "version"] },
  deferrable: true,
  initiallyDeferred: true,
  managedByMigration: "0064_saraya_leases.sql",
}] as const;

export const sarayaMaintenanceTickets = pgTable(
  "saraya_maintenance_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => sarayaProperties.id, { onDelete: "restrict" }),
    unitId: uuid("unit_id"),
    tenantOrganizationId: uuid("tenant_organization_id"),
    reportedByUserId: uuid("reported_by_user_id")
      .notNull()
      .references(() => sarayaUsers.id, { onDelete: "restrict" }),
    assignedToUserId: uuid("assigned_to_user_id").references(
      () => sarayaUsers.id,
      { onDelete: "restrict" },
    ),
    ticketNumber: varchar("ticket_number", { length: 32 }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: varchar("priority", { length: 16 }).default("medium").notNull(),
    status: varchar("status", { length: 24 }).default("open").notNull(),
    expenseAmount: numeric("expense_amount", { precision: 14, scale: 3 })
      .default("0")
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, precision: 3 }),
    ...timestamps,
  },
  (table) => [
    unique("saraya_maintenance_tickets_property_id_key").on(
      table.propertyId,
      table.id,
    ),
    unique("saraya_maintenance_tickets_property_number_key").on(
      table.propertyId,
      table.ticketNumber,
    ),
    index("saraya_maintenance_tickets_property_status_idx").on(
      table.propertyId,
      table.status,
      table.priority,
      table.createdAt,
    ),
    index("saraya_maintenance_tickets_assigned_status_idx")
      .on(table.assignedToUserId, table.status)
      .where(sql`${table.assignedToUserId} IS NOT NULL`),
    foreignKey({
      name: "saraya_maintenance_tickets_property_unit_fk",
      columns: [table.propertyId, table.unitId],
      foreignColumns: [sarayaUnits.propertyId, sarayaUnits.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_maintenance_tickets_property_tenant_fk",
      columns: [table.propertyId, table.tenantOrganizationId],
      foreignColumns: [
        sarayaTenantOrganizations.propertyId,
        sarayaTenantOrganizations.id,
      ],
    }).onDelete("restrict"),
    check(
      "saraya_maintenance_tickets_priority_check",
      sql`${table.priority} IN ('low', 'medium', 'high', 'urgent')`,
    ),
    check(
      "saraya_maintenance_tickets_status_check",
      sql`${table.status} IN ('open', 'assigned', 'in_progress', 'awaiting_parts', 'resolved', 'closed', 'cancelled')`,
    ),
    check(
      "saraya_maintenance_tickets_expense_check",
      sql`${table.expenseAmount} >= 0`,
    ),
  ],
);

export const sarayaDocuments = pgTable(
  "saraya_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull().references(() => sarayaProperties.id, { onDelete: "restrict" }),
    unitId: uuid("unit_id"),
    tenantOrganizationId: uuid("tenant_organization_id"),
    leaseId: uuid("lease_id"),
    uploadedByUserId: uuid("uploaded_by_user_id").notNull().references(() => sarayaUsers.id, { onDelete: "restrict" }),
    category: varchar("category", { length: 32 }).notNull(),
    title: text("title").notNull(),
    originalName: text("original_name").notNull(),
    contentType: varchar("content_type", { length: 96 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    status: varchar("status", { length: 16 }).default("active").notNull(),
    expiresOn: date("expires_on"),
    applicantIdempotencyKey: varchar("applicant_idempotency_key", { length: 128 }),
    applicantFingerprint: char("applicant_fingerprint", { length: 64 }),
    ...timestamps,
  },
  (table) => [
    unique("saraya_documents_property_id_key").on(table.propertyId, table.id),
    uniqueIndex("saraya_documents_property_storage_key_uidx").on(table.propertyId, table.storageKey),
    index("saraya_documents_property_created_idx").on(table.propertyId, table.createdAt),
    index("saraya_documents_property_tenant_idx").on(table.propertyId, table.tenantOrganizationId).where(sql`${table.tenantOrganizationId} IS NOT NULL`),
    index("saraya_documents_property_lease_idx").on(table.propertyId, table.leaseId).where(sql`${table.leaseId} IS NOT NULL`),
    uniqueIndex("saraya_documents_applicant_idempotency_uidx")
      .on(table.uploadedByUserId, table.unitId, table.applicantIdempotencyKey)
      .where(sql`${table.applicantIdempotencyKey} IS NOT NULL`),
    foreignKey({ name: "saraya_documents_property_unit_fk", columns: [table.propertyId, table.unitId], foreignColumns: [sarayaUnits.propertyId, sarayaUnits.id] }).onDelete("restrict"),
    foreignKey({ name: "saraya_documents_property_tenant_fk", columns: [table.propertyId, table.tenantOrganizationId], foreignColumns: [sarayaTenantOrganizations.propertyId, sarayaTenantOrganizations.id] }).onDelete("restrict"),
    foreignKey({ name: "saraya_documents_property_lease_fk", columns: [table.propertyId, table.leaseId], foreignColumns: [sarayaLeases.propertyId, sarayaLeases.id] }).onDelete("restrict"),
    check("saraya_documents_category_check", sql`${table.category} IN ('lease','identity','commercial_registration','handover','invoice','receipt','maintenance','utility','other')`),
    check("saraya_documents_status_check", sql`${table.status} IN ('active','archived')`),
    check("saraya_documents_size_check", sql`${table.sizeBytes} > 0 AND ${table.sizeBytes} <= 20971520`),
    check("saraya_documents_applicant_fingerprint_check", sql`${table.applicantFingerprint} IS NULL OR ${table.applicantFingerprint} ~ '^[0-9a-f]{64}$'`),
  ],
);

export const sarayaRentalRequests = pgTable(
  "saraya_rental_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => sarayaProperties.id, { onDelete: "restrict" }),
    unitId: uuid("unit_id").notNull(),
    tenantUserId: uuid("tenant_user_id")
      .notNull()
      .references(() => sarayaUsers.id, { onDelete: "restrict" }),
    tenantOrganizationId: uuid("tenant_organization_id"),
    status: sarayaRentalRequestStatus("status").default("pending_owner_review").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    durationMonths: integer("duration_months").notNull(),
    rentAmount: numeric("rent_amount", { precision: 14, scale: 3 }).notNull(),
    depositAmount: numeric("deposit_amount", { precision: 14, scale: 3 })
      .default("0")
      .notNull(),
    feeAmount: numeric("fee_amount", { precision: 14, scale: 3 }).default("0").notNull(),
    currency: char("currency", { length: 3 }).default("BHD").notNull(),
    idDocumentId: uuid("id_document_id").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    decisionReason: text("decision_reason"),
    decidedByUserId: uuid("decided_by_user_id").references(() => sarayaUsers.id, {
      onDelete: "restrict",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true, precision: 3 }),
    resolvedApprovalMode: varchar("resolved_approval_mode", { length: 24 })
      .default("owner_review")
      .notNull(),
    applicantType: varchar("applicant_type", { length: 16 })
      .default("individual")
      .notNull(),
    applicantNameAr: text("applicant_name_ar"),
    applicantNameEn: text("applicant_name_en"),
    registrationNumber: text("registration_number"),
    leaseId: uuid("lease_id"),
    checkoutExpiresAt: timestamp("checkout_expires_at", {
      withTimezone: true,
      precision: 3,
    }),
    ...timestamps,
  },
  (table) => [
    unique("saraya_rental_requests_property_id_key").on(table.propertyId, table.id),
    unique("saraya_rental_requests_tenant_idempotency_key").on(
      table.tenantUserId,
      table.idempotencyKey,
    ),
    index("saraya_rental_requests_property_status_idx").on(
      table.propertyId,
      table.status,
      table.createdAt,
    ),
    index("saraya_rental_requests_tenant_idx").on(table.tenantUserId, table.createdAt),
    uniqueIndex("saraya_rental_requests_active_unit_uidx")
      .on(table.propertyId, table.unitId)
      .where(
        sql`${table.status} IN ('pending_owner_review', 'approved_awaiting_payment', 'paid_awaiting_signature')`,
      ),
    uniqueIndex("saraya_rental_requests_property_lease_uidx")
      .on(table.propertyId, table.leaseId)
      .where(sql`${table.leaseId} IS NOT NULL`),
    foreignKey({
      name: "saraya_rental_requests_property_unit_fk",
      columns: [table.propertyId, table.unitId],
      foreignColumns: [sarayaUnits.propertyId, sarayaUnits.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_rental_requests_property_tenant_fk",
      columns: [table.propertyId, table.tenantOrganizationId],
      foreignColumns: [
        sarayaTenantOrganizations.propertyId,
        sarayaTenantOrganizations.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_rental_requests_property_lease_fk",
      columns: [table.propertyId, table.leaseId],
      foreignColumns: [sarayaLeases.propertyId, sarayaLeases.id],
    }).onDelete("restrict"),
    check("saraya_rental_requests_dates_check", sql`${table.endDate} >= ${table.startDate}`),
    check("saraya_rental_requests_duration_check", sql`${table.durationMonths} > 0`),
    check(
      "saraya_rental_requests_amounts_check",
      sql`${table.rentAmount} > 0 AND ${table.depositAmount} >= 0 AND ${table.feeAmount} >= 0`,
    ),
    check("saraya_rental_requests_currency_check", sql`${table.currency} = 'BHD'`),
    check(
      "saraya_rental_requests_resolved_approval_mode_check",
      sql`${table.resolvedApprovalMode} IN ('instant', 'owner_review')`,
    ),
    check(
      "saraya_rental_requests_applicant_type_check",
      sql`${table.applicantType} IN ('individual', 'company')`,
    ),
    check(
      "saraya_rental_requests_company_registration_check",
      sql`${table.applicantType} = 'individual' OR NULLIF(BTRIM(${table.registrationNumber}), '') IS NOT NULL`,
    ),
  ],
);

export const sarayaInvoices = pgTable(
  "saraya_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    rentalRequestId: uuid("rental_request_id").notNull(),
    tenantUserId: uuid("tenant_user_id")
      .notNull()
      .references(() => sarayaUsers.id, { onDelete: "restrict" }),
    status: sarayaInvoiceStatus("status").default("due").notNull(),
    number: varchar("number", { length: 64 }).notNull(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    subtotalAmount: numeric("subtotal_amount", { precision: 14, scale: 3 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 3 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 14, scale: 3 }).default("0").notNull(),
    currency: char("currency", { length: 3 }).default("BHD").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("saraya_invoices_property_id_key").on(table.propertyId, table.id),
    unique("saraya_invoices_property_request_key").on(
      table.propertyId,
      table.rentalRequestId,
    ),
    unique("saraya_invoices_property_number_key").on(table.propertyId, table.number),
    index("saraya_invoices_property_status_due_idx").on(
      table.propertyId,
      table.status,
      table.dueDate,
    ),
    index("saraya_invoices_tenant_due_idx").on(table.tenantUserId, table.dueDate),
    foreignKey({
      name: "saraya_invoices_property_request_fk",
      columns: [table.propertyId, table.rentalRequestId],
      foreignColumns: [sarayaRentalRequests.propertyId, sarayaRentalRequests.id],
    }).onDelete("restrict"),
    check("saraya_invoices_dates_check", sql`${table.dueDate} >= ${table.issueDate}`),
    check(
      "saraya_invoices_amounts_check",
      sql`${table.subtotalAmount} >= 0 AND ${table.totalAmount} >= 0 AND ${table.paidAmount} >= 0 AND ${table.paidAmount} <= ${table.totalAmount}`,
    ),
    check("saraya_invoices_currency_check", sql`${table.currency} = 'BHD'`),
  ],
);

export const sarayaInvoiceItems = pgTable(
  "saraya_invoice_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    invoiceId: uuid("invoice_id").notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    descriptionAr: text("description_ar").notNull(),
    descriptionEn: text("description_en").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).default("1").notNull(),
    unitAmount: numeric("unit_amount", { precision: 14, scale: 3 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "saraya_invoice_items_property_invoice_fk",
      columns: [table.propertyId, table.invoiceId],
      foreignColumns: [sarayaInvoices.propertyId, sarayaInvoices.id],
    }).onDelete("restrict"),
    check("saraya_invoice_items_amount_check", sql`${table.amount} >= 0`),
    check("saraya_invoice_items_quantity_check", sql`${table.quantity} > 0`),
  ],
);

export const sarayaPaymentDemands = pgTable(
  "saraya_payment_demands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    invoiceId: uuid("invoice_id").notNull(),
    rentalRequestId: uuid("rental_request_id").notNull(),
    status: sarayaPaymentDemandStatus("status").default("pending").notNull(),
    amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
    currency: char("currency", { length: 3 }).default("BHD").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    tapChargeId: varchar("tap_charge_id", { length: 128 }),
    paymentUrl: text("payment_url"),
    expiresAt: timestamp("expires_at", { withTimezone: true, precision: 3 }),
    paymentMethod: varchar("payment_method", { length: 24 }),
    provider: varchar("provider", { length: 32 }),
    providerReference: varchar("provider_reference", { length: 160 }),
    receiptDocumentId: uuid("receipt_document_id"),
    verifiedByUserId: uuid("verified_by_user_id"),
    verifiedAt: timestamp("verified_at", { withTimezone: true, precision: 3 }),
    failureCode: text("failure_code"),
    ...timestamps,
  },
  (table) => [
    unique("saraya_payment_demands_property_invoice_key").on(
      table.propertyId,
      table.invoiceId,
    ),
    unique("saraya_payment_demands_idempotency_key").on(table.idempotencyKey),
    uniqueIndex("saraya_payment_demands_provider_reference_uidx")
      .on(table.provider, table.providerReference)
      .where(sql`${table.providerReference} IS NOT NULL`),
    foreignKey({
      name: "saraya_payment_demands_property_invoice_fk",
      columns: [table.propertyId, table.invoiceId],
      foreignColumns: [sarayaInvoices.propertyId, sarayaInvoices.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_payment_demands_property_request_fk",
      columns: [table.propertyId, table.rentalRequestId],
      foreignColumns: [sarayaRentalRequests.propertyId, sarayaRentalRequests.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_payment_demands_property_receipt_fk",
      columns: [table.propertyId, table.receiptDocumentId],
      foreignColumns: [sarayaDocuments.propertyId, sarayaDocuments.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_payment_demands_verified_by_fk",
      columns: [table.verifiedByUserId],
      foreignColumns: [sarayaUsers.id],
    }).onDelete("restrict"),
    check("saraya_payment_demands_amount_check", sql`${table.amount} >= 0`),
    check("saraya_payment_demands_currency_check", sql`${table.currency} = 'BHD'`),
    check(
      "saraya_payment_demands_payment_method_check",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('online', 'bank_transfer', 'cash', 'card_terminal')`,
    ),
    check(
      "saraya_payment_demands_offline_reference_check",
      sql`${table.provider} IS DISTINCT FROM 'offline' OR ${table.providerReference} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
    ),
  ],
);

export const sarayaPaymentCommands = pgTable("saraya_payment_commands", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantUserId: uuid("tenant_user_id").notNull(),
  rentalRequestId: uuid("rental_request_id").notNull(),
  paymentDemandId: uuid("payment_demand_id").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  fingerprint: char("fingerprint", { length: 64 }).notNull(),
  status: varchar("status", { length: 16 }).default("creating").notNull(),
  providerReference: varchar("provider_reference", { length: 160 }),
  paymentUrl: text("payment_url"),
  failureCode: varchar("failure_code", { length: 96 }),
  ...timestamps,
}, (table) => [
  unique("saraya_payment_commands_tenant_key").on(table.tenantUserId, table.idempotencyKey),
  uniqueIndex("saraya_payment_commands_one_active_demand_uidx").on(table.paymentDemandId).where(sql`${table.status} IN ('creating','ready')`),
  foreignKey({
    name: "saraya_payment_commands_tenant_user_id_fkey",
    columns: [table.tenantUserId],
    foreignColumns: [sarayaUsers.id],
  }).onDelete("restrict"),
  foreignKey({
    name: "saraya_payment_commands_payment_demand_id_fkey",
    columns: [table.paymentDemandId],
    foreignColumns: [sarayaPaymentDemands.id],
  }).onDelete("restrict"),
  check("saraya_payment_commands_status_check", sql`${table.status} IN ('creating','ready','failed')`),
  check("saraya_payment_commands_fingerprint_check", sql`${table.fingerprint} ~ '^[0-9a-f]{64}$'`),
]);

export const sarayaPaymentProviderEvents = pgTable("saraya_payment_provider_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: varchar("provider", { length: 32 }).notNull(),
  providerReference: varchar("provider_reference", { length: 160 }).notNull(),
  paymentDemandId: uuid("payment_demand_id").notNull(),
  outcome: varchar("outcome", { length: 24 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (table) => [
  unique("saraya_payment_provider_events_reference_key").on(table.provider, table.providerReference),
  foreignKey({
    name: "saraya_payment_provider_events_payment_demand_id_fkey",
    columns: [table.paymentDemandId],
    foreignColumns: [sarayaPaymentDemands.id],
  }).onDelete("restrict"),
  check("saraya_payment_provider_events_outcome_check", sql`${table.outcome} IN ('paid','rejected','failed')`),
]);

export const sarayaPaymentProofs = pgTable("saraya_payment_proofs", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").notNull(),
  paymentDemandId: uuid("payment_demand_id").notNull(),
  rentalRequestId: uuid("rental_request_id").notNull(),
  documentId: uuid("document_id").notNull(),
  submittedByUserId: uuid("submitted_by_user_id").notNull(),
  reference: varchar("reference", { length: 160 }).notNull(),
  status: varchar("status", { length: 24 }).default("verification_pending").notNull(),
  failureCode: varchar("failure_code", { length: 96 }),
  decidedByUserId: uuid("decided_by_user_id"),
  decidedAt: timestamp("decided_at", { withTimezone: true, precision: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (table) => [
  foreignKey({ name: "saraya_payment_proofs_payment_demand_id_fkey", columns: [table.paymentDemandId], foreignColumns: [sarayaPaymentDemands.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_payment_proofs_submitted_by_user_id_fkey", columns: [table.submittedByUserId], foreignColumns: [sarayaUsers.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_payment_proofs_decided_by_user_id_fkey", columns: [table.decidedByUserId], foreignColumns: [sarayaUsers.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_payment_proofs_property_document_fk", columns: [table.propertyId, table.documentId], foreignColumns: [sarayaDocuments.propertyId, sarayaDocuments.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_payment_proofs_property_request_fk", columns: [table.propertyId, table.rentalRequestId], foreignColumns: [sarayaRentalRequests.propertyId, sarayaRentalRequests.id] }).onDelete("restrict"),
  unique("saraya_payment_proofs_document_key").on(table.documentId),
  uniqueIndex("saraya_payment_proofs_one_pending_uidx").on(table.paymentDemandId).where(sql`${table.status} = 'verification_pending'`),
  index("saraya_payment_proofs_demand_created_idx").on(table.paymentDemandId, table.createdAt.desc()),
  check("saraya_payment_proofs_status_check", sql`${table.status} IN ('verification_pending','approved','rejected')`),
]);

export const sarayaPaymentOperations = pgTable("saraya_payment_operations", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").notNull(),
  paymentDemandId: uuid("payment_demand_id").notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  fingerprint: char("fingerprint", { length: 64 }).notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (table) => [
  unique("saraya_payment_operations_actor_action_key").on(table.actorUserId, table.action, table.idempotencyKey),
  index("saraya_payment_operations_demand_created_idx").on(table.paymentDemandId, table.createdAt.desc()),
  foreignKey({
    name: "saraya_payment_operations_actor_user_id_fkey",
    columns: [table.actorUserId],
    foreignColumns: [sarayaUsers.id],
  }).onDelete("restrict"),
  foreignKey({
    name: "saraya_payment_operations_payment_demand_id_fkey",
    columns: [table.paymentDemandId],
    foreignColumns: [sarayaPaymentDemands.id],
  }).onDelete("restrict"),
  check("saraya_payment_operations_action_check", sql`${table.action} IN ('offline_proof.submit','offline_payment.decide')`),
  check("saraya_payment_operations_fingerprint_check", sql`${table.fingerprint} ~ '^[0-9a-f]{64}$'`),
  check("saraya_payment_operations_result_check", sql`jsonb_typeof(${table.result}) = 'object'`),
]);

export const sarayaLedgerEntries = pgTable(
  "saraya_ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    invoiceId: uuid("invoice_id").notNull(),
    entryType: sarayaLedgerEntryType("entry_type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
    currency: char("currency", { length: 3 }).default("BHD").notNull(),
    externalReference: varchar("external_reference", { length: 160 }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => sarayaUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("saraya_ledger_entries_property_invoice_idx").on(
      table.propertyId,
      table.invoiceId,
      table.createdAt,
    ),
    foreignKey({
      name: "saraya_ledger_entries_property_invoice_fk",
      columns: [table.propertyId, table.invoiceId],
      foreignColumns: [sarayaInvoices.propertyId, sarayaInvoices.id],
    }).onDelete("restrict"),
    check("saraya_ledger_entries_amount_check", sql`${table.amount} >= 0`),
    check("saraya_ledger_entries_currency_check", sql`${table.currency} = 'BHD'`),
  ],
);

export const sarayaLeaseSignatureRequests = pgTable(
  "saraya_lease_signature_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    leaseId: uuid("lease_id").notNull(),
    signerRole: varchar("signer_role", { length: 16 }).notNull(),
    signerUserId: uuid("signer_user_id").notNull(),
    status: varchar("status", { length: 24 }).default("pending").notNull(),
    tokenHash: text("token_hash").notNull(),
    acceptedName: text("accepted_name"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    acceptedChecksum: text("accepted_checksum"),
    evidenceDigest: text("evidence_digest"),
    actorRole: varchar("actor_role", { length: 24 }),
    signedAt: timestamp("signed_at", { withTimezone: true, precision: 3 }),
    ...timestamps,
  },
  (table) => [
    unique("saraya_lease_signature_requests_property_id_key").on(
      table.propertyId,
      table.id,
    ),
    unique("saraya_lease_signature_requests_property_lease_role_key").on(
      table.propertyId,
      table.leaseId,
      table.signerRole,
    ),
    unique("saraya_lease_signature_requests_token_hash_key").on(table.tokenHash),
    index("saraya_lease_signature_requests_property_lease_status_idx").on(
      table.propertyId,
      table.leaseId,
      table.status,
    ),
    index("saraya_lease_signature_requests_signer_status_idx").on(
      table.signerUserId,
      table.status,
      table.createdAt.desc(),
    ),
    foreignKey({
      name: "saraya_lease_signature_requests_property_lease_fk",
      columns: [table.propertyId, table.leaseId],
      foreignColumns: [sarayaLeases.propertyId, sarayaLeases.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_lease_signature_requests_signer_user_fk",
      columns: [table.signerUserId],
      foreignColumns: [sarayaUsers.id],
    }).onDelete("restrict"),
    check(
      "saraya_lease_signature_requests_signer_role_check",
      sql`${table.signerRole} IN ('tenant', 'owner')`,
    ),
    check(
      "saraya_lease_signature_requests_status_check",
      sql`${table.status} IN ('pending', 'signed', 'declined', 'expired', 'cancelled')`,
    ),
    check(
      "saraya_lease_signature_requests_signed_proof_check",
      sql`${table.status} <> 'signed' OR (${table.signedAt} IS NOT NULL AND NULLIF(BTRIM(${table.acceptedName}), '') IS NOT NULL)`,
    ),
    check(
      "saraya_lease_signature_requests_evidence_check",
      sql`${table.status} <> 'signed' OR (${table.acceptedChecksum} ~ '^[0-9a-f]{64}$' AND ${table.evidenceDigest} ~ '^[0-9a-f]{64}$' AND ${table.actorRole} IN ('tenant','owner','authorized_admin'))`,
    ),
  ],
);

export const sarayaLeasePackages = pgTable("saraya_lease_packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").notNull(),
  leaseId: uuid("lease_id").notNull(),
  leaseVersionId: uuid("lease_version_id").notNull(),
  rentalRequestId: uuid("rental_request_id").notNull(),
  leaseChecksum: text("lease_checksum").notNull(),
  draftDocumentId: uuid("draft_document_id").notNull(),
  finalDocumentId: uuid("final_document_id"),
  finalDocumentChecksum: text("final_document_checksum"),
  finalizationState: varchar("finalization_state", { length: 16 }).default("pending").notNull(),
  finalizationStartedAt: timestamp("finalization_started_at", { withTimezone: true, precision: 3 }),
  finalGeneratedAt: timestamp("final_generated_at", { withTimezone: true, precision: 3 }),
  pendingSignature: jsonb("pending_signature"),
  preparedDocumentId: uuid("prepared_document_id"),
  preparedStorageKey: text("prepared_storage_key"),
  preparedDocumentChecksum: text("prepared_document_checksum"),
  preparedSizeBytes: integer("prepared_size_bytes"),
  snapshot: jsonb("snapshot").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true, precision: 3 }).notNull(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true, precision: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (table) => [
  unique("saraya_lease_packages_property_lease_key").on(table.propertyId, table.leaseId),
  unique("saraya_lease_packages_request_key").on(table.rentalRequestId),
  unique("saraya_lease_packages_version_key").on(table.leaseVersionId),
  index("saraya_lease_packages_property_lease_idx").on(table.propertyId, table.leaseId),
  foreignKey({ name: "saraya_lease_packages_property_lease_fk", columns: [table.propertyId, table.leaseId], foreignColumns: [sarayaLeases.propertyId, sarayaLeases.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_lease_packages_property_version_fk", columns: [table.propertyId, table.leaseId, table.leaseVersionId], foreignColumns: [sarayaLeaseVersions.propertyId, sarayaLeaseVersions.leaseId, sarayaLeaseVersions.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_lease_packages_property_request_fk", columns: [table.propertyId, table.rentalRequestId], foreignColumns: [sarayaRentalRequests.propertyId, sarayaRentalRequests.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_lease_packages_draft_document_fk", columns: [table.draftDocumentId], foreignColumns: [sarayaDocuments.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_lease_packages_final_document_fk", columns: [table.finalDocumentId], foreignColumns: [sarayaDocuments.id] }).onDelete("restrict"),
  check("saraya_lease_packages_checksum_check", sql`${table.leaseChecksum} ~ '^[0-9a-f]{64}$'`),
  check("saraya_lease_packages_final_checksum_check", sql`${table.finalDocumentChecksum} IS NULL OR ${table.finalDocumentChecksum} ~ '^[0-9a-f]{64}$'`),
  check("saraya_lease_packages_snapshot_check", sql`jsonb_typeof(${table.snapshot}) = 'object'`),
  check("saraya_lease_packages_finalization_check", sql`
    (${table.finalizationState}='pending' AND ${table.finalDocumentId} IS NULL AND ${table.finalDocumentChecksum} IS NULL AND ${table.finalizedAt} IS NULL AND ${table.finalizationStartedAt} IS NULL AND ${table.finalGeneratedAt} IS NULL AND ${table.pendingSignature} IS NULL AND ${table.preparedDocumentId} IS NULL AND ${table.preparedStorageKey} IS NULL AND ${table.preparedDocumentChecksum} IS NULL AND ${table.preparedSizeBytes} IS NULL)
    OR (${table.finalizationState}='preparing' AND ${table.finalDocumentId} IS NULL AND ${table.finalDocumentChecksum} IS NULL AND ${table.finalizedAt} IS NULL AND ${table.finalizationStartedAt} IS NOT NULL AND ${table.finalGeneratedAt} IS NOT NULL AND jsonb_typeof(${table.pendingSignature})='object' AND ((${table.preparedDocumentId} IS NULL AND ${table.preparedStorageKey} IS NULL AND ${table.preparedDocumentChecksum} IS NULL AND ${table.preparedSizeBytes} IS NULL) OR (${table.preparedDocumentId} IS NOT NULL AND NULLIF(${table.preparedStorageKey},'') IS NOT NULL AND ${table.preparedDocumentChecksum} ~ '^[0-9a-f]{64}$' AND ${table.preparedSizeBytes} > 0)))
    OR (${table.finalizationState}='finalized' AND ${table.finalDocumentId} IS NOT NULL AND ${table.finalDocumentChecksum} IS NOT NULL AND ${table.finalizedAt} IS NOT NULL AND ${table.finalGeneratedAt} IS NOT NULL AND ${table.pendingSignature} IS NULL AND ${table.preparedDocumentId} IS NULL AND ${table.preparedStorageKey} IS NULL AND ${table.preparedDocumentChecksum} IS NULL AND ${table.preparedSizeBytes} IS NULL)
  `),
]);

export const sarayaLeaseSignatureEvents = pgTable("saraya_lease_signature_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").notNull(),
  leaseId: uuid("lease_id").notNull(),
  signerRole: varchar("signer_role", { length: 16 }).notNull(),
  previousSignerUserId: uuid("previous_signer_user_id"),
  previousActorRole: varchar("previous_actor_role", { length: 24 }),
  evidenceDigest: text("evidence_digest"),
  reason: varchar("reason", { length: 48 }).notNull(),
  details: jsonb("details").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
}, (table) => [
  index("saraya_lease_signature_events_lease_idx").on(table.propertyId, table.leaseId, table.createdAt),
  foreignKey({ name: "saraya_lease_signature_events_property_lease_fk", columns: [table.propertyId, table.leaseId], foreignColumns: [sarayaLeases.propertyId, sarayaLeases.id] }).onDelete("restrict"),
  foreignKey({ name: "saraya_lease_signature_events_previous_user_fk", columns: [table.previousSignerUserId], foreignColumns: [sarayaUsers.id] }).onDelete("restrict"),
  check("saraya_lease_signature_events_role_check", sql`${table.signerRole} IN ('tenant','owner')`),
]);

export const sarayaMeetingRoomStatus = pgEnum("saraya_meeting_room_status", [
  "active",
  "maintenance",
  "inactive",
]);

export const sarayaMeetingRoomBookingStatus = pgEnum(
  "saraya_meeting_room_booking_status",
  ["pending", "confirmed", "rejected", "cancelled", "completed"],
);

export const sarayaMeetingRooms = pgTable(
  "saraya_meeting_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => sarayaProperties.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 32 }).notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    capacity: integer("capacity").notNull(),
    hourlyRate: numeric("hourly_rate", { precision: 14, scale: 3 }).notNull(),
    openingTime: time("opening_time").default("08:00:00").notNull(),
    closingTime: time("closing_time").default("22:00:00").notNull(),
    minimumMinutes: integer("minimum_minutes").default(60).notNull(),
    bookingIncrementMinutes: integer("booking_increment_minutes").default(30).notNull(),
    status: sarayaMeetingRoomStatus("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("saraya_meeting_rooms_property_id_key").on(table.propertyId, table.id),
    unique("saraya_meeting_rooms_property_code_key").on(table.propertyId, table.code),
    index("saraya_meeting_rooms_property_status_idx").on(
      table.propertyId,
      table.status,
      table.code,
    ),
    check("saraya_meeting_rooms_capacity_check", sql`${table.capacity} > 0`),
    check("saraya_meeting_rooms_hourly_rate_check", sql`${table.hourlyRate} >= 0`),
    check("saraya_meeting_rooms_hours_check", sql`${table.closingTime} > ${table.openingTime}`),
    check(
      "saraya_meeting_rooms_minimum_check",
      sql`${table.minimumMinutes} BETWEEN 30 AND 1440`,
    ),
    check(
      "saraya_meeting_rooms_increment_check",
      sql`${table.bookingIncrementMinutes} IN (15, 30, 60)`,
    ),
  ],
);

export const sarayaMeetingRoomBookings = pgTable(
  "saraya_meeting_room_bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull(),
    roomId: uuid("room_id").notNull(),
    bookedByUserId: uuid("booked_by_user_id")
      .notNull()
      .references(() => sarayaUsers.id, { onDelete: "restrict" }),
    tenantOrganizationId: uuid("tenant_organization_id"),
    status: sarayaMeetingRoomBookingStatus("status").default("pending").notNull(),
    startAt: timestamp("start_at", { withTimezone: true, precision: 3 }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, precision: 3 }).notNull(),
    attendeeCount: integer("attendee_count").notNull(),
    purpose: text("purpose").notNull(),
    amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
    currency: char("currency", { length: 3 }).default("BHD").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    decisionReason: text("decision_reason"),
    decidedByUserId: uuid("decided_by_user_id").references(() => sarayaUsers.id, {
      onDelete: "restrict",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true, precision: 3 }),
    ...timestamps,
  },
  (table) => [
    unique("saraya_meeting_room_bookings_property_id_key").on(
      table.propertyId,
      table.id,
    ),
    unique("saraya_meeting_room_bookings_user_idempotency_key").on(
      table.bookedByUserId,
      table.idempotencyKey,
    ),
    index("saraya_meeting_room_bookings_room_time_idx").on(
      table.roomId,
      table.startAt,
      table.endAt,
    ),
    index("saraya_meeting_room_bookings_property_start_idx").on(
      table.propertyId,
      table.startAt,
      table.status,
    ),
    index("saraya_meeting_room_bookings_user_start_idx").on(
      table.bookedByUserId,
      table.startAt,
    ),
    foreignKey({
      name: "saraya_meeting_room_bookings_property_room_fk",
      columns: [table.propertyId, table.roomId],
      foreignColumns: [sarayaMeetingRooms.propertyId, sarayaMeetingRooms.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "saraya_meeting_room_bookings_property_tenant_fk",
      columns: [table.propertyId, table.tenantOrganizationId],
      foreignColumns: [
        sarayaTenantOrganizations.propertyId,
        sarayaTenantOrganizations.id,
      ],
    }).onDelete("restrict"),
    check("saraya_meeting_room_bookings_time_check", sql`${table.endAt} > ${table.startAt}`),
    check("saraya_meeting_room_bookings_attendee_check", sql`${table.attendeeCount} > 0`),
    check("saraya_meeting_room_bookings_amount_check", sql`${table.amount} >= 0`),
    check("saraya_meeting_room_bookings_currency_check", sql`${table.currency} = 'BHD'`),
  ],
);

export type SarayaUser = typeof sarayaUsers.$inferSelect;
export type NewSarayaUser = typeof sarayaUsers.$inferInsert;
export type SarayaProperty = typeof sarayaProperties.$inferSelect;
export type NewSarayaProperty = typeof sarayaProperties.$inferInsert;
export type SarayaPropertyMembership = typeof sarayaPropertyMemberships.$inferSelect;
export type NewSarayaPropertyMembership = typeof sarayaPropertyMemberships.$inferInsert;
export type SarayaOwner = typeof sarayaOwners.$inferSelect;
export type NewSarayaOwner = typeof sarayaOwners.$inferInsert;
export type SarayaTenantOrganization = typeof sarayaTenantOrganizations.$inferSelect;
export type NewSarayaTenantOrganization = typeof sarayaTenantOrganizations.$inferInsert;
export type SarayaContact = typeof sarayaContacts.$inferSelect;
export type NewSarayaContact = typeof sarayaContacts.$inferInsert;
export type SarayaUnitType = typeof sarayaUnitTypes.$inferSelect;
export type NewSarayaUnitType = typeof sarayaUnitTypes.$inferInsert;
export type SarayaUnit = typeof sarayaUnits.$inferSelect;
export type NewSarayaUnit = typeof sarayaUnits.$inferInsert;
export type SarayaViewingSlot = typeof sarayaViewingSlots.$inferSelect;
export type NewSarayaViewingSlot = typeof sarayaViewingSlots.$inferInsert;
export type SarayaViewingAppointment = typeof sarayaViewingAppointments.$inferSelect;
export type NewSarayaViewingAppointment = typeof sarayaViewingAppointments.$inferInsert;
export type SarayaViewingCommand = typeof sarayaViewingCommands.$inferSelect;
export type NewSarayaViewingCommand = typeof sarayaViewingCommands.$inferInsert;
export type SarayaAuditLog = typeof sarayaAuditLogs.$inferSelect;
export type NewSarayaAuditLog = typeof sarayaAuditLogs.$inferInsert;
export type SarayaRole = (typeof sarayaRole.enumValues)[number];
export type SarayaInvitation = typeof sarayaInvitations.$inferSelect;
export type SarayaRefreshSession = typeof sarayaRefreshSessions.$inferSelect;
export type SarayaAuthChallenge = typeof sarayaAuthChallenges.$inferSelect;
export type SarayaAuthRateLimit = typeof sarayaAuthRateLimits.$inferSelect;
export type SarayaAuthDeliveryAttempt = typeof sarayaAuthDeliveryAttempts.$inferSelect;
export type SarayaAuthAuditLog = typeof sarayaAuthAuditLogs.$inferSelect;
export type SarayaLease = typeof sarayaLeases.$inferSelect;
export type NewSarayaLease = typeof sarayaLeases.$inferInsert;
export type SarayaLeaseVersion = typeof sarayaLeaseVersions.$inferSelect;
export type NewSarayaLeaseVersion = typeof sarayaLeaseVersions.$inferInsert;
export type SarayaRentScheduleItem = typeof sarayaRentScheduleItems.$inferSelect;
export type NewSarayaRentScheduleItem = typeof sarayaRentScheduleItems.$inferInsert;
export type SarayaLeaseEvent = typeof sarayaLeaseEvents.$inferSelect;
export type NewSarayaLeaseEvent = typeof sarayaLeaseEvents.$inferInsert;
export type SarayaRentalRequest = typeof sarayaRentalRequests.$inferSelect;
export type NewSarayaRentalRequest = typeof sarayaRentalRequests.$inferInsert;
export type SarayaInvoice = typeof sarayaInvoices.$inferSelect;
export type NewSarayaInvoice = typeof sarayaInvoices.$inferInsert;
export type SarayaInvoiceItem = typeof sarayaInvoiceItems.$inferSelect;
export type NewSarayaInvoiceItem = typeof sarayaInvoiceItems.$inferInsert;
export type SarayaPaymentDemand = typeof sarayaPaymentDemands.$inferSelect;
export type NewSarayaPaymentDemand = typeof sarayaPaymentDemands.$inferInsert;
export type SarayaPaymentCommand = typeof sarayaPaymentCommands.$inferSelect;
export type SarayaPaymentProviderEvent = typeof sarayaPaymentProviderEvents.$inferSelect;
export type SarayaPaymentProof = typeof sarayaPaymentProofs.$inferSelect;
export type SarayaPaymentOperation = typeof sarayaPaymentOperations.$inferSelect;
export type SarayaLedgerEntry = typeof sarayaLedgerEntries.$inferSelect;
export type NewSarayaLedgerEntry = typeof sarayaLedgerEntries.$inferInsert;
export type SarayaLeaseSignatureRequest = typeof sarayaLeaseSignatureRequests.$inferSelect;
export type NewSarayaLeaseSignatureRequest = typeof sarayaLeaseSignatureRequests.$inferInsert;
export type SarayaMaintenanceTicket = typeof sarayaMaintenanceTickets.$inferSelect;
export type NewSarayaMaintenanceTicket = typeof sarayaMaintenanceTickets.$inferInsert;
export type SarayaMeetingRoom = typeof sarayaMeetingRooms.$inferSelect;
export type NewSarayaMeetingRoom = typeof sarayaMeetingRooms.$inferInsert;
export type SarayaMeetingRoomBooking = typeof sarayaMeetingRoomBookings.$inferSelect;
export type NewSarayaMeetingRoomBooking = typeof sarayaMeetingRoomBookings.$inferInsert;
