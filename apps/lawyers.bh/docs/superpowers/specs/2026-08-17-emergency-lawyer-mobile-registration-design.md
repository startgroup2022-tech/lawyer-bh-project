# Emergency lawyer mobile registration

## Goal

Allow a lawyer registering for emergency mobile dispatch to submit the current mobile form without web-directory professional fields.

## Approved behavior

- Mobile emergency-lawyer registration does not require registration level, working hours, a main specialty, or sub-specialties.
- Those fields are stored as `null` or empty arrays/objects; the server never invents professional values.
- License, personal ID, IBAN certificate, profile image, signature, identity, contact, license, and banking fields remain required and validated.
- A successful full mobile submission creates a complete application in `pending` review state and returns the mobile token contract already used by the app.
- Web `/api/join` submissions continue to require registration level, working hours, one main specialty, and exactly two sub-specialties.

## Architecture

Extract the existing join implementation into an internal function that accepts a server-only `emergencyMobileLawyer` option. The public web `POST` wrapper always calls it with strict web behavior. The mobile route calls the internal function with the emergency option only after confirming the full-document mobile payload. The option changes validation and persisted professional fields but not authentication, document validation, duplicate checks, uploads, or response handling.

## Security boundary

The emergency option is a TypeScript function argument, not a request field or header, so a direct public request cannot enable it. Only the mobile server route can select it.

## Verification

- A regression test proves a full mobile emergency submission reaches the shared handler with emergency mode enabled.
- A strict-web regression test proves public join requests cannot enable emergency mode.
- Focused tests, TypeScript, and lint run before any deployment decision.
- Production deployment is separate and requires explicit execution and verification.

