# Saraya Square Complete Platform Design

**Date:** 2026-09-26  
**Status:** Approved in conversation, pending written-spec review  
**Target:** Saraya Square responsive web, iOS, and Android experience backed by the existing Lawyers.bh Saraya services and database

## 1. Objective

Deliver a production-quality bilingual property-management platform dedicated to Saraya Square without discarding useful existing work. The platform must support the public website, administration/landlord operations, employees, and tenants across responsive web and mobile interfaces.

The managed inventory is fixed initially to:

- 6 commercial/administrative shops.
- 14 commercial/administrative offices.
- 50 virtual/commercial addresses.
- 2 meeting rooms.

The system must manage the complete customer and tenancy relationship from enquiry through approval, contracting, operation, renewal or termination, handover, settlement, and closure.

## 2. Confirmed Decisions

### 2.1 Preserve and extend

- Retain the existing Saraya authentication, authorization, APIs, database data, and useful compiled assets where they remain valid.
- Keep Saraya data isolated in dedicated `saraya_*` tables inside the existing PostgreSQL database.
- Extend the current Next.js backend in `apps/lawyers.bh` rather than creating a second backend.
- Recreate a maintainable Flutter source application because the repository currently contains only the compiled Flutter web output, not the editable source.
- Support web, iOS, and Android from the same Flutter codebase with role-specific navigation and responsive layouts.
- Implement functionality incrementally; every phase must work with real persisted data before the next phase begins.

### 2.2 Approved visual direction

The approved direction is **C — Balanced Modern**:

- Premium but restrained Bahrain-appropriate identity.
- Deep green as the primary brand color with muted gold accents.
- Warm neutral surfaces, high-contrast text, and limited decorative effects.
- Executive summary at the top with operational detail available immediately below it.
- Arabic RTL and English LTR receive equal layout and content support.
- Desktop uses a grouped side navigation; mobile uses a compact bottom navigation plus contextual actions.
- No raw database identifiers, untranslated enum values, or technical status labels appear to end users.

## 3. System Architecture

### 3.1 Client layer

A standalone Flutter application provides three experiences from one maintained source:

1. Public marketing and availability experience.
2. Administration/landlord and employee operations.
3. Tenant self-service account.

The client is organized by feature with shared design-system, authentication, localization, networking, and document/media components. Each feature exposes clear screens, state, domain actions, and data contracts rather than sharing internal implementation details.

### 3.2 Service layer

The existing Next.js application remains the secure service boundary. Saraya API modules own:

- Request validation.
- Authentication and role/property authorization.
- Business transitions and approval rules.
- Idempotency for repeatable financial and booking actions.
- Database transactions.
- Audit event creation.
- Secure document and image access.
- Integration adapters for payment, e-signature, email, and future messaging providers.

The Flutter application never receives database credentials, payment secrets, signing secrets, or unrestricted storage URLs.

### 3.3 Data layer

The existing PostgreSQL database remains the source of truth. New functionality uses isolated, forward-only `saraya_*` migrations.

Data rules:

- All property-owned records are scoped to the selected property.
- Related records use property-aware references where cross-property association would be unsafe.
- Money uses fixed precision and stores currency explicitly as BHD for the initial property.
- Financial history is append-oriented; reversals and adjustments are recorded rather than silently overwriting settled history.
- Lifecycle transitions record actor, timestamp, prior state, new state, reason, and associated evidence.
- Documents and images store metadata and access rules in the database while binary storage remains behind secure server-issued access.

## 4. Roles and Access

### 4.1 Super administrator

- Full Saraya configuration and operational access.
- Manage properties, staff, roles, templates, integrations, and reports.
- Approve sensitive legal and financial actions.

### 4.2 Property management / landlord

- Manage inventory, customers, applications, leases, collections, utilities, maintenance, handovers, and reports for assigned properties.
- Approve applications, contracts, renewals, terminations, waivers, escalations, and settlements within granted authority.

### 4.3 Employee

- Access only assigned operational areas and properties.
- Permissions are capability-based, such as leasing, finance, maintenance, front desk, or reporting.
- Sensitive financial, legal, or configuration actions require explicit permission or approval.

### 4.4 Tenant / customer

- Access only their profile, active and historical relationships, documents, invoices, receipts, service requests, and eligible bookings.
- Submit applications, sign documents, pay amounts, request maintenance, book meeting rooms, and participate in handover workflows.

### 4.5 Public visitor

- Browse available shops, offices, addresses, and meeting rooms.
- Submit an enquiry or application and continue it after authentication.
- Cannot access operational or private customer data.

## 5. Navigation and Primary Screens

### 5.1 Administration navigation

The desktop side navigation is grouped by purpose:

**Overview**

- Today dashboard.
- Tasks and approvals.
- Alerts and recent activity.

**Property operations**

- Properties and physical units.
- Virtual/commercial addresses.
- Meeting rooms and booking calendar.
- Unified customers.

**Contracts and finance**

- Applications and contracts.
- Rent schedules and collections.
- Invoices, payments, and receipts.
- Arrears, notices, and approved escalation.

**Operations and governance**

- Electricity and water.
- Maintenance, expenses, petty cash, and supplier invoices.
- Inspections, check-in, and check-out.
- Documents and signatures.
- Reports and audit timeline.
- Staff, roles, templates, and settings.

Mobile administration prioritizes Overview, Tasks, Customers, Finance, and More. Contextual actions surface the same permitted functions without hiding essential workflows.

### 5.2 Tenant navigation

The tenant mobile experience prioritizes:

- Home summary.
- Payments and receipts.
- Contracts and documents.
- Services: maintenance, utilities, and meeting-room bookings.
- Account and communication preferences.

The tenant sees upcoming dues, active unit/address, contract status, open service requests, and relevant notifications on the home screen.

### 5.3 Public navigation

- Home.
- Offices.
- Shops.
- Commercial addresses.
- Meeting rooms.
- About Saraya Square.
- Contact and application entry.
- Login.

## 6. Functional Modules

### 6.1 Unified customer file

One customer profile represents an individual or organization and includes:

- Arabic and English names.
- Contact details and preferred language.
- Identity or registration documents.
- Authorized signatories and related contacts.
- Applications, current and previous contracts.
- Units, addresses, and room bookings.
- Invoices, payments, receipts, credits, and outstanding balances.
- Maintenance and service requests.
- Notices, communications, approvals, and complete activity timeline.

Duplicate detection uses normalized email, phone, and registration/identity numbers. Merging customer records is an administrator-only audited operation.

### 6.2 Physical properties and units

The initial catalog contains 6 shops and 14 offices. Each unit includes:

- Unique code, bilingual name, category, floor, area, and permitted use.
- Availability state, marketing state, operational state, and occupancy relationship.
- Rent, deposit, service charges, and billing frequency.
- Photos, plans, features, meters, keys, and parking allocation.
- Current and historical contracts, inspections, maintenance, and financial summary.

Availability is derived from approved reservations, active contracts, maintenance blocks, and handover state rather than a manually editable label alone.

### 6.3 Virtual/commercial addresses

The system manages 50 address capacity slots separately from physical units. Each subscription includes:

- Address package and included services.
- Customer and authorized business names.
- Start, expiry, renewal, suspension, and termination states.
- Contract, invoices, payments, and required documents.
- Mail/item receipt log where enabled.
- Capacity reporting and expiry alerts.

### 6.4 Meeting rooms

The system manages 2 rooms with:

- Room profile, capacity, amenities, photos, availability, and pricing rules.
- Calendar-based availability.
- Temporary hold, confirmation, cancellation, completion, and no-show states.
- Conflict prevention at the database/service layer.
- Public or tenant booking rules and optional payment requirement.
- Booking receipts and operational preparation notes.

The existing meeting-room backend slice is retained and integrated into the broader client and database migration sequence after verification.

### 6.5 Applications and leasing

Applications support physical units and virtual addresses. The process records:

- Selected product and preserved selection through authentication.
- Requested start date and duration.
- Applicant details and documents.
- Review notes and decision.
- Approval or rejection reason.
- Reservation expiry after approval.
- Conversion to offer, contract, and scheduled charges.

### 6.6 Electronic contracts and signatures

Contracts are generated from versioned bilingual templates and contain immutable snapshots of approved commercial terms. The signing workflow records:

- Template version and generated document checksum.
- Required signatories and signing order.
- Consent, timestamp, identity context, and evidence returned by the signing adapter.
- Final signed copy and status.

The first release uses a provider-independent signing boundary. A basic internal acknowledgement flow may be used only where legally approved; external qualified e-signature remains an adapter choice and must not be represented as legally equivalent without provider confirmation.

### 6.7 Lease lifecycle

The approved lifecycle is:

1. Enquiry/application.
2. Qualification and document review.
3. Management approval or documented rejection.
4. Offer and commercial terms.
5. Contract generation and signature.
6. Registration and initial payment requirements.
7. Check-in inspection, photos, meters, keys, and utility activation.
8. Active operation, billing, collection, maintenance, and communication.
9. Renewal, extension, early termination, or breach/termination decision.
10. Check-out inspection, utility closure, key return, and damage assessment.
11. Financial settlement, deposit handling, final documents, and closure.

Every transition has explicit allowed source states, required permissions, required evidence, and a transaction-safe result.

### 6.8 Billing, collection, payments, and receipts

- Generate scheduled charges from approved contract terms.
- Distinguish invoice, due item, payment, allocation, receipt, credit, waiver, reversal, and settlement.
- Allow partial payments and explicit allocation.
- Prevent duplicate provider callbacks and duplicate manual submissions.
- Generate bilingual numbered receipts only after confirmed payment allocation.
- Show customer statement, ageing, expected collection, collected amount, and outstanding amount.
- Require approval for waivers, write-offs, unusual reversals, and settlement changes.

### 6.9 Arrears, notices, and legal escalation

Configurable policy stages include:

1. Upcoming due reminder.
2. Due-date notification.
3. Late notification.
4. Formal warning.
5. Management-reviewed legal escalation package.

The system may calculate eligibility and prepare a draft, but it cannot send a formal legal escalation without a recorded administrator/management approval. Every notice stores template version, language, delivery channel, delivery result, and related balance snapshot.

### 6.10 Electricity and water

- Associate utility accounts and meters with units and contracts.
- Record opening reading, periodic readings, closing reading, deposits, charges, payments, and balances.
- Track open, transfer-requested, active, closure-requested, and closed states.
- Attach bills and evidence.
- Include final utility balance in handover settlement.

### 6.11 Maintenance and tickets

- Tenant or staff creates a categorized request with severity and media.
- Management triages, assigns an internal employee or supplier, and sets priority/SLA.
- Technician updates visit, work, parts, cost, and evidence.
- Management or tenant confirms resolution where applicable.
- Ticket closes with cost allocation to property, landlord, tenant, or recoverable charge.

Emergency labels must not bypass authorization or financial approval rules.

### 6.12 Expenses, petty cash, and supplier invoices

- Capture property/unit-related expense, category, supplier, invoice, tax, payment method, and supporting document.
- Petty-cash movements use a controlled ledger with custodian, opening balance, replenishment, expense, and reconciliation.
- Approval thresholds are configurable by role.
- Expenses can be linked to maintenance, a unit, a contract, or general property operations.

### 6.13 Inspections and handover

Check-in and check-out use configurable room/area checklists and support:

- Condition, notes, photos, and optional video references.
- Meter readings, keys, access cards, furniture/equipment, and signatures.
- Comparison between check-in and check-out.
- Damage items, estimated/approved charges, and settlement linkage.
- Final bilingual report provided to both parties.

Media captures original timestamp and server receipt time. Deletion after report finalization is restricted and audited.

### 6.14 Documents

- Categorize documents by customer, property, unit, contract, invoice, ticket, or inspection.
- Store bilingual display name, issue date, expiry date, sensitivity, and visibility.
- Alert before expiry for required documents.
- Use short-lived authorized download access.
- Retain document versions referenced by signed contracts, notices, or finalized reports.

### 6.15 Reports

Initial reports include:

- Physical occupancy and availability.
- Virtual-address capacity and expiry.
- Meeting-room utilization and revenue.
- Rent schedule, collection, arrears ageing, and customer statements.
- Revenue and expense summary by period and asset type.
- Maintenance volume, SLA, cost, and recurring issues.
- Upcoming contract and document expiry.
- Deposit and settlement status.
- Staff activity and approval history.

Reports use server-side filters and exports so totals match the source of truth.

### 6.16 Unified timeline and audit

Customer, asset, contract, invoice, booking, and ticket pages show relevant business events in chronological order. Sensitive audit records additionally store actor, role, request correlation, prior/new state, and source channel.

Audit events are not editable through normal application interfaces.

## 7. Data and Workflow Integrity

- State transitions run on the server and cannot be achieved by editing client-visible status values.
- Multi-record operations use database transactions.
- Booking, payment, invoice generation, and contract activation accept idempotency keys.
- Meeting-room and asset reservation conflicts are rejected server-side.
- Scheduled processes are safe to retry and record their execution result.
- Dashboard totals are calculated from persisted data, not hardcoded placeholders.
- Dates are stored consistently and rendered in Bahrain time for operational screens.
- Arabic and English labels are presentation values; stable internal codes remain language-neutral.

## 8. Error Handling and Resilience

### 8.1 Client behavior

- Field-level validation appears before submission where possible.
- Server validation is displayed next to the affected field or as a clear action-level message.
- Forms preserve entered data after recoverable errors.
- Long forms save safe drafts without creating business records prematurely.
- Loading, empty, permission-denied, offline, retry, and partial-failure states have dedicated designs.
- Technical identifiers, stack traces, and raw provider errors are never shown to users.

### 8.2 Connectivity

Read-only summaries may use a clearly timestamped local cache on mobile. Financial operations, signatures, approvals, booking confirmation, and lifecycle transitions require server confirmation. The UI must never represent an unconfirmed critical action as completed.

### 8.3 Server behavior

- APIs return stable error codes plus localized client-safe messages.
- Unexpected failures receive a correlation identifier for support.
- Integration failures remain distinguishable from business rejection.
- Retries do not duplicate charges, receipts, bookings, or transitions.
- Failed outbound notifications can be retried while preserving the original business event.

## 9. Security and Privacy

- Enforce authentication and authorization on every private API route.
- Scope every operation to permitted properties and capabilities.
- Protect customer identity, commercial documents, signatures, and financial data.
- Use server-controlled upload types, sizes, and malware-scanning hooks.
- Log security-sensitive access and changes.
- Avoid embedding secrets in Flutter or public web assets.
- Apply retention and deletion policies only after Bahrain legal and operational requirements are confirmed.
- Require explicit management approval for legal escalation, write-off, settlement changes, and destructive merges.

## 10. Testing and Acceptance

### 10.1 Automated testing

- Domain/service tests for lifecycle transitions, calculations, authorization, conflicts, and idempotency.
- API tests for validation, role/property boundaries, success responses, and stable error responses.
- Database migration verification and integrity checks.
- Flutter state and widget tests for Arabic/English, role navigation, forms, loading, empty, and error states.
- Responsive tests for narrow mobile, tablet, and desktop widths.
- Integration tests for the highest-value end-to-end flows.

### 10.2 Required end-to-end flows

1. Public visitor selects an available unit, authenticates, and submits an application.
2. Management reviews and approves the application.
3. Contract terms are generated, reviewed, and signed.
4. Initial charge is paid and a receipt is issued once.
5. Check-in captures photos, readings, keys, and signatures.
6. A scheduled rent charge becomes due, is paid, and updates the customer statement.
7. An overdue item follows reminders and cannot reach legal escalation without approval.
8. Tenant submits maintenance; staff assigns, resolves, costs, and closes it.
9. Tenant books an available meeting room; a conflicting booking is rejected.
10. Contract is renewed or terminated, check-out is completed, utilities settle, and the relationship closes.

### 10.3 Release acceptance

- No raw UUIDs, raw enums, untranslated system labels, placeholder totals, or fake dashboard data in production-facing screens.
- Core flows pass in Arabic RTL and English LTR.
- Core flows pass on supported web widths and selected iOS/Android targets.
- Migration and rollback/recovery procedures are documented and exercised in a non-production environment.
- Existing useful Saraya behavior remains available or has an explicitly approved replacement.
- Production release, deployment readiness, and live verification are reported separately from local test success.

## 11. Phased Delivery

The project is too broad for a single safe implementation slice. Delivery is divided into independently testable phases.

### Phase 1 — Maintainable client foundation and current-system repair

- Restore maintainable Flutter source structure.
- Implement approved design system, localization, responsive shell, authentication, role navigation, and API client.
- Replace raw IDs/enums and fake dashboard totals.
- Rebuild and verify current property, unit, staff, tenant, owner, invoice, and account experiences against existing APIs.

### Phase 2 — Complete inventory and customer foundation

- Add 14 offices to the physical inventory model alongside 6 shops.
- Implement 50 virtual/commercial addresses.
- Integrate 2 meeting rooms and booking calendar.
- Implement unified customer file and timeline foundation.

### Phase 3 — Applications, contracts, and lease lifecycle

- Complete applications and approvals.
- Add offers, contract templates, e-signature boundary, rent schedules, check-in, renewal, extension, termination, and check-out state machines.

### Phase 4 — Finance, collections, and escalation

- Implement invoices, payments, allocations, receipts, statements, deposits, arrears, notices, and approval-gated legal escalation.

### Phase 5 — Utilities and property operations

- Implement electricity/water accounts and readings.
- Implement maintenance, suppliers, expenses, petty cash, and recoverable charges.
- Complete inspection photos, damage assessment, settlement, and closure.

### Phase 6 — Reporting, hardening, and release readiness

- Complete operational and financial reports.
- Finalize audit views, exports, permissions review, accessibility, performance, security hardening, and cross-platform end-to-end testing.
- Prepare deployment and store-release evidence without representing unperformed external approvals as complete.

Each phase receives its own detailed implementation plan, database migration set, automated tests, and user acceptance checkpoint.

## 12. Out of Scope Until Separately Approved

- Expansion to properties other than Saraya Square.
- AI-generated legal decisions or automatic legal escalation.
- Unapproved claims of legally qualified electronic signature.
- Automatic WhatsApp/SMS sending before provider, consent, template, and cost approval.
- Full accounting/general-ledger replacement.
- Access-control hardware, smart locks, or physical meter integrations.
- Production data migration that changes existing records without a reviewed migration and backup plan.

## 13. First Implementation Plan Boundary

The first implementation plan covers **Phase 1 only**. It establishes the maintainable Flutter source, approved design system, bilingual responsive shell, authentication, role-aware navigation, current API integration, truthful dashboard metrics, and repaired existing modules. Later phases are planned only after Phase 1 acceptance so the project remains testable and controllable.
