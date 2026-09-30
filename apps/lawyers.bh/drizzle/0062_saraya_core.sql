CREATE TYPE public.saraya_role AS ENUM (
  'super_admin', 'property_manager', 'accountant', 'maintenance', 'owner', 'tenant'
);
CREATE TYPE public.saraya_unit_status AS ENUM (
  'vacant', 'occupied', 'reserved', 'maintenance', 'inactive'
);

CREATE TABLE public.saraya_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email text,
  normalized_phone varchar(32),
  password_hash text,
  display_name_ar text NOT NULL,
  display_name_en text NOT NULL,
  locale varchar(2) NOT NULL DEFAULT 'ar',
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT saraya_users_identity_check CHECK (normalized_email IS NOT NULL OR normalized_phone IS NOT NULL),
  CONSTRAINT saraya_users_locale_check CHECK (locale IN ('ar', 'en'))
);
CREATE UNIQUE INDEX saraya_users_normalized_email_uidx ON public.saraya_users(normalized_email) WHERE normalized_email IS NOT NULL;
CREATE UNIQUE INDEX saraya_users_normalized_phone_uidx ON public.saraya_users(normalized_phone) WHERE normalized_phone IS NOT NULL;

CREATE TABLE public.saraya_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  address_ar text,
  address_en text,
  timezone text NOT NULL DEFAULT 'Asia/Bahrain',
  currency_code varchar(3) NOT NULL DEFAULT 'BHD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT saraya_properties_currency_check CHECK (char_length(currency_code) = 3)
);
CREATE UNIQUE INDEX saraya_properties_code_uidx ON public.saraya_properties(code);

CREATE TABLE public.saraya_property_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.saraya_properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.saraya_users(id) ON DELETE CASCADE,
  role public.saraya_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT saraya_property_memberships_property_user_key UNIQUE (property_id, user_id)
);
CREATE INDEX saraya_property_memberships_user_idx ON public.saraya_property_memberships(user_id);

CREATE TABLE public.saraya_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.saraya_properties(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES public.saraya_users(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  registration_number text,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT saraya_owners_property_id_key UNIQUE (property_id, id)
);
CREATE INDEX saraya_owners_property_idx ON public.saraya_owners(property_id);
CREATE INDEX saraya_owners_user_idx ON public.saraya_owners(user_id);

CREATE TABLE public.saraya_tenant_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.saraya_properties(id) ON DELETE RESTRICT,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  registration_number text,
  tax_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT saraya_tenant_organizations_property_id_key UNIQUE (property_id, id)
);
CREATE INDEX saraya_tenant_organizations_property_idx ON public.saraya_tenant_organizations(property_id);

CREATE TABLE public.saraya_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.saraya_properties(id) ON DELETE RESTRICT,
  tenant_organization_id uuid,
  owner_id uuid,
  user_id uuid REFERENCES public.saraya_users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone varchar(32),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT saraya_contacts_one_party_check CHECK (((tenant_organization_id IS NOT NULL)::int + (owner_id IS NOT NULL)::int) = 1),
  CONSTRAINT saraya_contacts_property_tenant_fk FOREIGN KEY (property_id, tenant_organization_id) REFERENCES public.saraya_tenant_organizations(property_id, id) ON DELETE CASCADE,
  CONSTRAINT saraya_contacts_property_owner_fk FOREIGN KEY (property_id, owner_id) REFERENCES public.saraya_owners(property_id, id) ON DELETE CASCADE
);
CREATE INDEX saraya_contacts_property_idx ON public.saraya_contacts(property_id);
CREATE INDEX saraya_contacts_property_tenant_idx ON public.saraya_contacts(property_id, tenant_organization_id);
CREATE INDEX saraya_contacts_property_owner_idx ON public.saraya_contacts(property_id, owner_id);
CREATE INDEX saraya_contacts_user_idx ON public.saraya_contacts(user_id);

CREATE TABLE public.saraya_unit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.saraya_properties(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  default_rent numeric(14,3),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT saraya_unit_types_property_id_key UNIQUE (property_id, id),
  CONSTRAINT saraya_unit_types_property_name_key UNIQUE (property_id, name_en),
  CONSTRAINT saraya_unit_types_default_rent_check CHECK (default_rent IS NULL OR default_rent >= 0)
);

CREATE TABLE public.saraya_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.saraya_properties(id) ON DELETE RESTRICT,
  unit_type_id uuid,
  owner_id uuid,
  unit_number varchar(64) NOT NULL,
  floor text,
  status public.saraya_unit_status NOT NULL DEFAULT 'vacant',
  area_square_meters numeric(12,3),
  market_rent numeric(14,3),
  available_from date,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT saraya_units_property_number_key UNIQUE (property_id, unit_number),
  CONSTRAINT saraya_units_area_check CHECK (area_square_meters IS NULL OR area_square_meters > 0),
  CONSTRAINT saraya_units_market_rent_check CHECK (market_rent IS NULL OR market_rent >= 0),
  CONSTRAINT saraya_units_property_unit_type_fk FOREIGN KEY (property_id, unit_type_id) REFERENCES public.saraya_unit_types(property_id, id) ON DELETE RESTRICT,
  CONSTRAINT saraya_units_property_owner_fk FOREIGN KEY (property_id, owner_id) REFERENCES public.saraya_owners(property_id, id) ON DELETE RESTRICT
);
CREATE INDEX saraya_units_property_status_idx ON public.saraya_units(property_id, status);
CREATE INDEX saraya_units_property_unit_type_idx ON public.saraya_units(property_id, unit_type_id);
CREATE INDEX saraya_units_property_owner_idx ON public.saraya_units(property_id, owner_id);

CREATE TABLE public.saraya_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.saraya_properties(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES public.saraya_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip_address text,
  created_at timestamptz(3) NOT NULL DEFAULT now()
);
CREATE INDEX saraya_audit_logs_property_created_idx ON public.saraya_audit_logs(property_id, created_at DESC);
CREATE INDEX saraya_audit_logs_actor_idx ON public.saraya_audit_logs(actor_user_id);
