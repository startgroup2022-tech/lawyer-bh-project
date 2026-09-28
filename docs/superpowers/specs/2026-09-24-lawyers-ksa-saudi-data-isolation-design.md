# Lawyers KSA Saudi Data Isolation Design

**Date:** 2026-09-24
**Status:** Approved design, pending implementation plan
**Scope:** `apps/lawyers.ksa`

## Objective

Make `lawyers.ksa` a Saudi-only product. Every public, provider, SOS, payment, administration, and reporting flow must read and write Saudi records only. Prices and monetary records must use Saudi riyals (`SAR`). Bahrain data and tables remain untouched.

## Core invariant

The server, not the browser, owns the country decision. Requests handled by `lawyers.ksa` always execute with country code `SA`, Saudi table names, Saudi locale defaults, and currency `SAR`. A caller cannot change the country by sending `BH`, another country code, or a forged table identifier.

The implementation will introduce one authoritative KSA context module that supplies:

- country code `SA`;
- currency code `SAR` and Arabic label `ر.س` / `ريال`;
- the provisioned Saudi country record;
- the Saudi dynamic table set;
- product-activation checks for the Lawyers platform.

Routes and server services must consume this context instead of choosing a country independently.

## Data ownership and routing

All Lawyers KSA domains are isolated to the Saudi country table set, including:

- lawyer accounts, registration applications, approvals, profile data, documents, licences, availability, and password recovery;
- client accounts and sessions where the current schema supports country-scoped client storage;
- lawyer directory, search, specialties, consultation methods, service catalogue, pricing, and reviews;
- ordinary booking requests, legal cases, lawyer assignments, status history, conversations, and attachments;
- SOS requests, dispatch candidates, shifts, readiness, live location, route tracking, service progress, and notifications;
- payment sessions, callbacks, payment status, commissions, lawyer allocations, refunds, and financial reports;
- Tap marketplace/retailer onboarding and destination identifiers for Saudi lawyers;
- KSA administration lists, filters, assignments, dashboards, exports, and audit records.

Table names are obtained only from the validated Saudi table set (for example `saudi_lawyers`, `saudi_booking_requests`, and their related tables). Public request data is never interpolated into a table name.

The central administration inside Lawyers.bh remains multi-country and can continue to view and manage Saudi records through its existing country-aware controls.

## Registration and authentication

Lawyer registration initiated from `lawyers.ksa` always creates a Saudi lawyer application and stores Saudi agreement/licence metadata. Login, account recovery, profile editing, approval status, and session creation query the same Saudi lawyer table.

Sessions include the authoritative `SA` country context. Existing handlers that accept `countryCode` will either ignore it in favor of the server context or reject a non-`SA` value with a stable validation error. No fallback to `BH` is allowed.

User, lawyer, and administrator authentication remain separate experiences. Administrator access retains the current permission model, but Lawyers KSA administration pages display only Saudi data.

## Services, requests, and SOS

Service catalogue and consultation-method reads come from Saudi tables. Creating any normal service request writes the request, legal case, assignment, status, and related records into the Saudi table set.

SOS lawyer availability, shift state, matching, emergency creation, assignment, location streaming, navigation state, completion, and messaging all resolve through the Saudi context. A Saudi request cannot be matched with a Bahrain lawyer and a Saudi lawyer cannot receive a Bahrain request through the KSA application.

## Currency and payments

Every price shown or submitted by `lawyers.ksa` is denominated in `SAR`. The server stores and validates the currency as `SAR`; it does not trust a browser-provided currency value. This applies to catalogue prices, booking totals, SOS fees, payment sessions, receipts, commissions, lawyer allocations, refunds, dashboards, and exports.

Payment creation must pair a Saudi source record with `SAR`. Payment confirmation and webhooks resolve the original Saudi request from trusted metadata and verify the expected currency and amount before updating status. A callback cannot redirect settlement to Bahrain tables by changing request parameters.

Historical records remain readable according to their stored currency; the migration must not rewrite or relabel existing financial history without a separate reconciliation decision.

## Country activation and provisioning

Startup and request handling require Saudi Arabia to be active, provisioned, and enabled for the Lawyers platform. Missing tables or disabled activation return an explicit service-configuration error instead of silently falling back to Bahrain.

Database migrations remain idempotent and additive. They create or complete missing Saudi tables, indexes, constraints, and currency defaults without deleting Bahrain data or duplicating existing Saudi records.

The current KSA code still contains legacy Bahrain-specific columns and tables, including amount fields named with a `bhd` suffix and Bahrain-only Tap retailer onboarding. Implementation must add country-neutral money fields with an explicit currency where required and provision a Saudi Tap onboarding table linked to Saudi lawyers. Compatibility reads may temporarily support legacy fields, but no new Saudi financial record may be represented as BHD or written to a Bahrain onboarding table.

## UI and content

Lawyers KSA screens use Saudi context consistently:

- country is fixed to Saudi Arabia and is not presented as a switchable public option;
- prices display in Saudi riyals using Arabic and English formatting appropriate to the current locale;
- validation, empty states, receipts, emails, notifications, and exports identify `SAR` correctly;
- Bahrain-specific text, phone assumptions, addresses, links, and defaults are removed from KSA flows.

This design does not require a complete visual redesign. UI edits are limited to data correctness, Saudi terminology, currency presentation, and removal of Bahrain leakage.

## Error handling and observability

Country-context failures use stable error codes and avoid exposing database table names or credentials. Server logs include the route, request identifier, authoritative country `SA`, and operation type, but exclude passwords, payment secrets, full identity documents, and precise live-location history.

Critical mismatch events—such as a non-Saudi record reaching a KSA payment or assignment flow—are rejected and logged for investigation.

## Verification strategy

Implementation will be test-driven and verified in layers:

1. Unit tests for the authoritative KSA context, Saudi table resolution, and `SAR` currency enforcement.
2. Route contract tests that submit forged `BH` or other country/currency values and prove no Bahrain query or write occurs.
3. Registration and authentication tests proving a KSA lawyer is created and found only in the Saudi lawyer table.
4. Booking, SOS, assignment, live-location, notification, and payment tests proving every related record stays in the Saudi table set.
5. Financial tests for `SAR` totals, callbacks, allocations, refunds, reports, and historical-currency handling.
6. Tap marketplace onboarding tests proving a Saudi lawyer is linked only to the Saudi retailer/destination record.
7. Database migration verification against a dedicated non-production database.
8. Type checking, focused test suites, and a production build of `apps/lawyers.ksa`.
9. After explicit release approval: DEV push, production merge, KSA Vercel deployment, migration evidence, and live smoke tests that do not create real charges.

Production payment verification will use the provider's approved sandbox/test path. A successful deployment or payment-session token is not treated as proof of a real charge.

## Rollout and recovery

The release is additive and isolated to the KSA application and shared country-aware modules it legitimately consumes. Bahrain behavior receives regression tests before release.

If production verification fails, traffic can return to the previous KSA deployment while additive migrations remain in place. Because Bahrain records are neither moved nor rewritten, rollback does not require restoring Bahrain data.

## Acceptance criteria

- Every `lawyers.ksa` server flow derives country `SA` internally.
- All new KSA lawyer registrations appear in the Saudi lawyer table.
- All KSA requests, SOS cases, assignments, messages, locations, notifications, payments, commissions, and reports use Saudi tables.
- All KSA prices and new financial records use `SAR` and display as Saudi riyals.
- Forged country or currency input cannot cause a Bahrain read, write, match, or settlement.
- Missing Saudi provisioning fails explicitly and never falls back to Bahrain.
- Bahrain production flows and records remain unchanged.
- Focused tests, type checking, build, migration verification, and post-deployment smoke checks pass before completion is claimed.
