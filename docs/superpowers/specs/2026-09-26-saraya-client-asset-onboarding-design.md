# Saraya Client Asset Onboarding Design

## Goal

Improve client onboarding so management can select the relevant property, assign one or more available physical units and virtual addresses to a tenant, automatically create draft leases for physical units, and associate one owner with multiple properties.

## Scope

- Tenant creation from the clients screen.
- Owner creation from the clients screen.
- Property, unit, and virtual-address lookup data for the forms.
- Atomic server-side onboarding operations.
- Arabic RTL and English LTR responsive forms.
- Automated backend, repository, and widget coverage.

## Tenant Flow

1. Management opens **Add tenant**.
2. The form loads properties available to the authenticated manager.
3. Management selects one property.
4. The form loads only vacant physical units and available virtual addresses belonging to that property.
5. Management selects one or more physical units, one or more virtual addresses, or both.
6. At least one physical unit or virtual address is required.
7. Physical-unit contract terms are editable and prefilled from the unit and property defaults:
   - Start date.
   - End date.
   - Rent amount.
   - Deposit amount.
   - Payment frequency.
   - Due day.
   - Grace days.
8. Virtual-address terms are editable:
   - Business name in Arabic and English.
   - Monthly fee.
   - Start date.
   - End date.
9. Saving creates the tenant and all selected assignments atomically.

## Tenant Persistence

The server performs one database transaction:

- Revalidates that the selected property is within the authenticated manager's scope.
- Revalidates that every selected unit belongs to the property and is currently vacant.
- Revalidates that every selected virtual address belongs to the property and is currently available.
- Creates one tenant organization.
- Creates one `draft` lease and initial lease version for each selected physical unit.
- Assigns each selected virtual address to the new tenant and transitions it to `reserved` with the submitted service terms.
- Writes audit events using the authenticated management user as the actor.

Any validation or persistence failure rolls back the full onboarding operation.

## Owner Flow

1. Management opens **Add owner**.
2. The form loads all properties the authenticated manager may administer.
3. Management selects one or more properties.
4. Saving creates a property-scoped owner record for every selected property in one transaction.
5. Duplicate owner-property associations are rejected without creating partial records.
6. Existing owner editing remains limited to profile fields. Changing property associations after creation is deferred to a separate ownership-management flow.

The existing property-aware owner model remains unchanged. Multi-property ownership is represented by coordinated property-scoped owner records rather than introducing a broad schema rewrite.

## API Design

Add management onboarding endpoints instead of chaining existing CRUD calls from Flutter:

- `GET /api/saraya/v1/client-onboarding/options`
  - Returns authorized properties.
  - With `propertyId`, returns available units and virtual addresses for that property.
- `POST /api/saraya/v1/client-onboarding/tenants`
  - Creates the tenant, draft leases, and virtual-address assignments atomically.
- `POST /api/saraya/v1/client-onboarding/owners`
  - Creates the owner associations for all selected properties atomically.

The existing tenant, owner, unit, lease, and virtual-address endpoints remain available for their current focused operations.

## UI Design

- Replace the generic tenant and owner creation sheets with resource-specific onboarding sheets.
- Property selection appears before asset selection.
- Changing the property clears stale unit and virtual-address selections before loading new options.
- Units and virtual addresses use clear multi-select cards or controls with availability, identifier, and pricing details.
- Empty and loading states explain when no assets are available.
- Each selected physical unit receives its own editable contract terms, prefilled from that unit.
- The virtual-address terms section appears only when at least one virtual address is selected.
- The save button remains disabled while loading or when no asset is selected.
- Existing edit forms remain focused on client profile fields unless association editing is explicitly supported by the endpoint.

## Validation and Errors

- Never trust option IDs supplied by Flutter; all property relationships and statuses are rechecked server-side.
- Reject cross-property units or virtual addresses.
- Reject occupied, reserved, maintenance, suspended, or inactive assets.
- Reject duplicate selected IDs.
- Reject invalid dates, non-positive rent, negative deposit or fees, and invalid due-day values.
- Return localized field errors that the form renders next to the affected control.
- Use stable conflict responses if an asset becomes unavailable before submission.

## Testing

- Backend service tests for authorized option loading, cross-property rejection, unavailable-asset rejection, rollback behavior, draft lease creation, virtual-address reservation, and multi-property owner creation.
- HTTP tests for parsing and localized validation responses.
- Flutter repository tests for option queries and onboarding payloads.
- Widget tests for property-first loading, clearing stale selections, mixed asset selection, validation, owner multi-property selection, and successful refresh.
- Full TypeScript validation, Flutter analysis, test suites, local web build, and browser verification without creating real onboarding records.

## Out of Scope

- Activating or electronically signing draft leases.
- Generating rent schedules or invoices before lease approval.
- Charging for virtual-address subscriptions.
- Public deployment or production data creation.
