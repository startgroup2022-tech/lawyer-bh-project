# Complete Profile Registration Parity Design

## Goal

Make the invited-provider complete-profile page visually and functionally match the website registration flow while always showing every applicable field and pre-filling every value already stored in the database.

## Scope

This change applies to the website route `/{locale}/complete-profile?token=...` and its provider completion APIs. The existing `/{locale}/join` registration page remains unchanged to avoid regressions in the working public registration flow.

## User Experience

The completion page uses the same four-step structure, labels, field ordering, styling, and navigation behavior as registration:

1. Provider and professional details.
2. Personal details and account password.
3. License, banking details, work schedule, and documents.
4. Agreement and signature.

Every applicable field is always visible. Existing values are loaded into editable controls; missing values remain empty. No completed field or section is converted to a hidden input.

Provider type controls conditional fields in the same way as registration. Lawyer-only registration-level fields remain visible for lawyers, while institution fields appear for institution provider types.

## Existing Data

The token-check API returns all completion-form fields available in `bahrain_lawyers`, including:

- subscription type;
- Arabic and English names, email, and phone;
- registration level, experience, language, and working hours;
- main and sub-specialties;
- license number and expiry;
- IBAN and CR number;
- profile image, practice license, IBAN certificate, institution license, personal ID, and signature metadata or preview URLs;
- agreement state.

Controlled React state is initialized once from this response. Editing one field does not erase other loaded values.

## Files

Browsers cannot pre-fill native file inputs. Existing files therefore appear through their stored file name and an authenticated preview/download URL. Choosing a new file replaces that file only. Leaving the file input untouched preserves the existing database and Blob-storage references.

The page shows every file card even when a file already exists. File cards distinguish between an existing file and a newly selected replacement.

## Password

Password and confirmation are always shown and always blank. Existing password hashes are never returned to the browser. Completion requires a new strong password and confirmation using the current password rules.

## Submission API

The completion endpoint accepts and validates the same editable profile fields shown by the form. It updates:

- provider/subscription type;
- names, email, phone, password hash, language, and working hours;
- registration level and experience;
- specialties;
- license number and expiry;
- IBAN and CR number;
- any newly selected document or image while preserving untouched existing files;
- signature and agreement state.

Email and license number remain unique within their existing database constraints. The API checks duplicates excluding the invited provider's own record and returns a clear conflict response.

The server never overwrites an existing file reference with an empty file input. Text controls are submitted because all controls are visible and editable; required-field validation prevents accidental emptying of required existing values.

## Storage Compatibility

Existing records may store older inline Base64 file data or newer public Blob URLs. Check and completion APIs support both formats. New replacements follow the current project Blob-upload pattern and persist file name, MIME type, public URL, and Blob path where the schema supports them.

## Security

- The invite token remains required, unexpired, and single-use.
- A completed profile cannot reuse the completion endpoint.
- Password hashes, Blob credentials, and raw internal paths are never returned.
- File preview routes remain token-protected where a direct public URL is not available.
- File type and size validation remains server authoritative.

## Error Handling

Each step validates its visible required controls before advancing. Server errors remain visible without discarding user edits or existing previews. Duplicate email or license conflicts identify the relevant field. Submission is disabled while the request is running and occurs only from the final step.

## Verification

- Contract tests prove the check API returns every existing editable field and file state.
- Submission tests prove text changes persist, untouched files remain, replacement files update only their targets, and duplicate email/license records are rejected.
- Presentation tests prove no completed field is hidden and the completion page exposes the four registration-equivalent steps.
- TypeScript, ESLint, focused tests, and a production-style Next.js build are run.
- Browser verification uses an invitation containing a mix of existing and missing values and confirms all fields remain visible and editable.

## Out of Scope

- Refactoring the public registration page into shared components.
- Changing the admin invitation workflow or email copy.
- Deleting existing provider data or files.
- Allowing completion tokens to be reused after successful submission.
