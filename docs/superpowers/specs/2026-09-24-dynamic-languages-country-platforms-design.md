# Dynamic languages and country platform activation

Date: 2026-09-24

## Goal

Allow a super administrator to add a language once, make it available to selected countries, and publish it only after its required translations are complete. Replace the ambiguous country switches for “website” and “app” with the two actual products: **Lawyers Platform** and **LegalSOS**. Platform activation controls database-backed services only; it does not publish a website, create a domain, or release an application.

## Product definitions

### Lawyers Platform

- Enables provider registration, the lawyer directory, ordinary legal services, and their administrative workflows for a country.
- Each country may have its own Lawyers Platform HTTPS URL.
- Saving or changing the URL does not activate database services.
- Activating database services does not make the URL public or deploy a website.

### LegalSOS

- Enables SOS requests, dispatch, lawyer assignment, live journey tracking, emergency workflows, and their administrative workflows for a country.
- LegalSOS has no country-specific URL field.
- All countries use `https://legalsos.org` and the LegalSOS mobile application.
- Activating LegalSOS database services does not publish the website or release the application.

## Country database model

Country infrastructure is provisioned once. The first platform enabled for a country provisions the country-prefixed tables. Enabling the second platform reuses those tables and must not create duplicates.

Each country has independent service flags:

- `lawyers_platform_enabled`
- `legal_sos_enabled`
- `tables_provisioned`

`tables_provisioned` records physical readiness only. Product code must additionally require the relevant platform flag before accepting registrations, requests, or administrative mutations. Disabling a platform blocks new workflows but does not delete tables or historical records.

The current Lawyers Platform URL becomes an explicitly named country setting. LegalSOS uses the fixed canonical origin and therefore has no editable country URL.

## Language catalogue

Languages are first-class administrative records rather than fixed columns or hard-coded switches.

Each language stores:

- stable BCP 47-compatible code, such as `ar`, `en`, or `tr`;
- administrative display name;
- native display name;
- text direction, `rtl` or `ltr`;
- lifecycle status, `draft` or `published`;
- timestamps and the administrator responsible for the last change.

The initial catalogue contains Arabic, English, and Turkish. A super administrator can add another language later without adding a database column or running a language-specific migration.

Language codes are immutable after creation because routes, translations, notifications, and stored preferences depend on them. A language with references can be archived in a later enhancement; deletion is outside this scope.

## Country language settings

Each country can enable any published catalogue language and select exactly one enabled language as its default. A language cannot be removed from a country while it is the default. At least one published language must remain enabled for every active platform.

Adding a language to the global catalogue does not automatically enable it for any country. Publishing a language also does not expose it automatically; an administrator must enable it on each intended country.

The country name is stored as a translation record keyed by country and language. Existing Arabic and English country names are migrated into the translation model, and Turkish values can then be managed from the same interface.

## Translation readiness and publication

New languages begin as drafts. The administration UI shows translation completion per content area. Publishing is blocked until all required core translations exist.

The first implementation covers the language catalogue and country names/settings. Existing application dictionaries and content areas remain source-controlled until they are individually migrated to managed translations. The UI must clearly distinguish:

- **Catalogue published**: the language is approved for administrative selection.
- **Country enabled**: the language is available for that country’s data and supported migrated surfaces.
- **Full interface available**: every user-facing LegalSOS route has a complete runtime dictionary.

Until full-interface readiness is true, route generation must not expose a new locale publicly. This prevents partially translated pages. Arabic, English, and Turkish retain their current public behavior.

## Administration experience

### Languages page

A super-admin-only page lists Arabic, English, Turkish, and future languages. It supports:

- creating a draft language;
- setting administrative/native names and direction;
- reviewing readiness;
- publishing when requirements pass;
- preventing duplicate or invalid codes.

### Countries page

Each country card displays:

- country names in its enabled languages;
- enabled languages and the default language;
- Lawyers Platform database switch;
- Lawyers Platform URL;
- LegalSOS database switch;
- a non-editable LegalSOS destination showing `legalsos.org` and the mobile application;
- physical table readiness and per-platform readiness as separate statuses.

Switch labels must be “Lawyers Platform” and “LegalSOS”, not “website” and “app”. Confirmation text explains that activation affects database services only.

## API and validation

Administrative endpoints require super-admin authorization, same-origin mutation requests, strict schema validation, and no-store responses for mutable state.

Mutations are separated by purpose:

- language catalogue create/update/publish;
- country language enablement/default selection;
- country translation updates;
- Lawyers Platform URL update;
- platform database activation.

Platform activation is idempotent. Repeating a successful activation returns the current state without reprovisioning or data loss. Provisioning failure leaves the requested platform disabled and returns a safe error while retaining diagnostic details in server logs.

## Compatibility and migration

- Existing country data and historical requests remain unchanged.
- Existing Arabic and English names are backfilled into translation records.
- Existing `app_enabled` maps to `legal_sos_enabled`.
- Existing `website_enabled` maps to `lawyers_platform_enabled`.
- Existing country website URLs become Lawyers Platform URLs.
- Existing `default_locale` values are preserved when the corresponding language is valid and published.
- API responses temporarily retain the old fields only where required by deployed clients, with new fields treated as canonical.

No destructive migration is allowed. Rollback restores application reads to the compatibility fields while preserving the new catalogue and translations.

## Error handling

- Invalid, duplicate, or mutable language codes are rejected with actionable admin messages.
- RTL/LTR must be explicitly selected.
- A draft language cannot be enabled for a country.
- A country cannot select a default language that is not enabled.
- Platform activation shows pending, successful, or failed state and cannot be double-submitted.
- A Lawyers Platform URL must be HTTPS or blank.
- LegalSOS never accepts a country-specific URL.

## Verification

Automated coverage must prove:

- Arabic, English, and Turkish are seeded once;
- additional languages can be created without schema changes;
- draft languages cannot be enabled;
- default-language invariants hold;
- existing country names and settings migrate without loss;
- Lawyers Platform and LegalSOS flags gate the correct workflows independently;
- first activation provisions tables once and second activation reuses them;
- repeated activation is idempotent;
- country-specific Lawyers Platform URLs are validated;
- LegalSOS remains fixed to `legalsos.org` and the mobile application;
- unauthorized and cross-origin mutations are rejected;
- existing public Arabic, English, and Turkish routes continue working.

Verification must separate unit tests, migration verification, database integration checks, production build, deployment state, and live authenticated administration checks.

## Out of scope

- Automatic machine translation.
- Automatically publishing a newly added language.
- Creating or deploying country domains.
- Publishing mobile applications.
- Deleting historical country data when a platform is disabled.
- Converting every existing content management area to dynamic translations in this first implementation.
