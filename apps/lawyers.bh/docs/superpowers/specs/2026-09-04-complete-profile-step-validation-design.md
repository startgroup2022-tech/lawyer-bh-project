# Complete Profile Step Validation Design

## Goal

Make the website complete-profile wizard enforce the same required-field experience as the provider registration page. A provider cannot advance until the current step is valid, required controls are marked with a red asterisk, and every invalid control receives a bilingual inline error.

## Scope

- Update only the website route `/{locale}/complete-profile` and focused shared validation/presentation helpers.
- Keep the existing four steps, fields, API request, stored-file preservation, signature behavior, and visual structure.
- Treat valid values and files returned by the prefill API as completed; users do not need to upload stored files again.
- Keep CR number and institution license optional under the current role rules. All controls required by the existing registration contract remain required.

## Validation behavior

- Use an explicit validation input built from current form values plus controlled role, specialty, agreement, signature, and stored-or-new file state.
- Validate only the visible step when **Next** is pressed.
- On errors, remain on the current step, render a localized message below every invalid control, apply an invalid border and ARIA attributes, focus and scroll to the first invalid control, and show a concise form-level summary.
- Clear a field's error when the user changes that field, while retaining unrelated errors.
- On final submission, validate all four steps again. If an earlier step is invalid, navigate to it and focus its first error instead of sending the request.
- Server errors remain form-level errors and do not masquerade as field validation.

## Required indicators

- Reuse the registration page's red `RequiredMark` component.
- Add it to all required text inputs, selects, role/specialty selectors, required file cards, agreement, and signature labels.
- Do not add it to CR number or institution-license upload because they are optional.

## Architecture

- Add a focused complete-profile validation module that adapts stored file metadata and current form state to the registration validation rules without requiring synthetic browser `File` objects.
- Add reusable helpers for error ordering and step lookup so navigation is deterministic and independently testable.
- Extend `Field`, password fields, file cards, and agreement/signature presentation with error and accessibility props instead of duplicating markup.
- Keep backend validation unchanged; client validation is an earlier usability gate, not the source of truth.

## Tests and verification

- Unit tests cover required fields, invalid formats, stored-file acceptance, optional fields, bilingual messages, and first-error step ordering.
- Component tests cover required marks, inline errors, ARIA linkage, and Next staying on the current step.
- Run focused tests, TypeScript checking, lint for touched files, and the safe Next-only production build.
- After verification, commit the implementation, push the approved production branch, wait for the production deployment, and verify the deployed page without submitting a real provider application.

## Non-goals

- No field additions, backend schema changes, migration, payment changes, or redesign.
- No requirement to re-upload already stored documents.
- No public test submission that creates or activates a real provider account.
