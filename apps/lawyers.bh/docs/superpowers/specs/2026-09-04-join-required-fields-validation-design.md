# Join Form Required Fields and Step Validation Design

## Goal

Make the public lawyer registration wizard on `/{locale}/join` explicit and
predictable: every required field has a red asterisk, each step validates
before advancing, and the lawyer-number field accepts either a license number
or a personal number under one bilingual label.

The change applies to the Arabic and English website registration flow. It
does not change login, mobile registration, approval rules, database columns,
or the submitted field name used by the backend.

## Lawyer Number Field

Keep the existing form and API field name `licenseNumber` for compatibility.
Present it to applicants as one required input:

- Arabic label: `رقم الرخصة / الرقم الشخصي`;
- English label: `License Number / Personal Number`;
- Arabic missing-value error: `يرجى إدخال رقم الرخصة أو الرقم الشخصي`;
- English missing-value error: `Please enter the license number or personal number`.

The applicant enters either identifier in this single field. No second field
or database migration is required. Existing duplicate checks and persistence
continue to use the supplied value.

## Required Field Presentation

Create one reusable required marker rendered as a red `*` with an accessible
label. Add it immediately beside every required label, including conditional
requirements. Optional fields keep their existing `(اختياري)` / `(Optional)`
wording and receive no marker.

Required inputs by step are:

1. Professional information: at least one subscription type, experience
   years, main specialty, exactly two sub-specialties, and registration level
   when `Lawyer` is selected.
2. Personal details: profile image, Arabic full name, English full name,
   email, phone, password, password confirmation, and language.
3. License and bank: license number or personal number, license expiry date,
   IBAN, IBAN certificate, working hours, practice-license file, and personal
   ID file. Commercial registration and institution-license file remain
   optional.
4. Agreement: acceptance of the terms and electronic signature.

Where a requirement is represented by a group rather than a conventional
input, place the marker in the group heading or label. The red marker must be
visible in both RTL and LTR layouts without changing the current page design.

## Step Validation

Use the existing custom validation path rather than native browser validation
messages. Pressing `Next` validates only the visible step. If any requirement
is missing or invalid:

- remain on the same step;
- show a localized message directly below each invalid field or group;
- apply the error border/state to the affected input, select, upload panel,
  checkbox group, or signature panel;
- clear a field's error when the applicant corrects that field;
- scroll and focus the first invalid control when focus is supported.

Only a valid current step may advance. The final submit validates every step
again. If it finds an error on an earlier step, it switches to that step and,
after rendering it, scrolls/focuses the first invalid control.

File inputs must validate presence before advancing. Existing server-side file
type and size validation remains authoritative; the client will mirror the
applicable limits so an invalid selected profile image or required document is
reported before the user proceeds. The profile image is required and keeps
its current 3 MB/type rules. Required document uploads keep their current 5 MB
and accepted-format rules.

## Error Messages and Accessibility

All validation messages shown by the wizard must be intentionally localized
in Arabic and English; raw browser or backend error strings must not replace
field-level messages for known validation failures. Invalid controls use
`aria-invalid`, connect to their message using `aria-describedby`, and expose
the required state semantically where applicable.

The form-level submission error remains for network or unexpected server
failures. Known backend validation errors should map to the relevant field and
step when the backend provides enough information; otherwise the localized
form-level error is shown without losing the entered values.

## Structure

Extract the registration validation rules and bilingual messages from the
large page component into a focused module. The same rules serve both
per-step validation and final submission, preventing the two current
validation blocks from drifting apart. Small presentation helpers will provide
the required marker and consistent invalid styling without redesigning the
form.

The server route retains its independent validation as the security boundary.
Client validation improves the flow but never replaces server validation.

## Tests

Automated coverage will verify:

- the combined Arabic and English lawyer-number labels and missing-value
  messages;
- each step rejects all of its missing required fields and accepts valid data;
- registration level is required only when the Lawyer role is selected;
- optional institution fields do not block progress;
- profile image and required document presence, type, and size failures are
  attributed to the correct fields;
- first-error step selection is stable for final submission;
- all required labels/groups render a red marker while optional fields do not;
- invalid controls expose their error state and message association;
- the backend continues to require the submitted `licenseNumber`, profile
  image, license file, personal ID, IBAN certificate, agreement, and signature.

Run focused join-form tests, the full test suite, TypeScript validation, and a
production build. Browser verification must cover Arabic and English,
attempting to advance each empty step and confirming the first invalid field
is brought into view before claiming the UI change is complete.

## Out of Scope

- Adding separate license-number and personal-number database fields.
- Changing approval, Tap onboarding, payout, or public-directory behavior.
- Making currently optional institution fields required.
- Redesigning the registration wizard or changing its four-step structure.
