# Provider registration PDF failure feedback

Date: 2026-09-20

## Evidence and objective

At the time of the reported failed website registration, production `/api/join` logs recorded repeated `[join] blob upload failed` errors with code `invalid_pdf`. The request fails before the lawyer row is inserted. The page currently converts API errors to a generic submit failure and renders essentially the same message twice. The logs do not identify which of the submitted attachments failed validation, so they do not prove whether a particular user's PDF is corrupt, encrypted, misnamed, or rejected for another PDF-structure reason.

The objective is to tell the applicant which attachment must be replaced while retaining server-side content validation and without exposing private file contents.

## Contract and behavior

The upload/registration boundary returns a stable `invalid_document` response with an allowlisted `field` when PDF validation fails for `licenseFile`, `institutionLicenseFile`, `ibanCertificateFile`, or `personalIdFile`. Both the direct-upload hydration path and the final private-document storage path identify the field. The response uses a client-error status, not a generic server-error status. Other failures retain their existing safe generic behavior; no raw exception, filename, blob URL, document contents, or account details are returned or logged.

The website join form maps an allowlisted `field` to the corresponding document input, returns to that form step, and displays one localized Arabic/English instruction to replace the PDF with a valid, unencrypted PDF or an accepted image. It does not show the current duplicate generic messages. The form preserves other already-entered values. A network or unknown server failure remains a single generic message.

The PDF validation requirements remain unchanged: a file renamed `.pdf` is not accepted, and no malformed or encrypted document is stored. This change does not alter the database insert, agreement, payment, approval, or mobile registration semantics beyond the shared safe error contract.

## Verification

Write failing focused tests first for a malformed PDF in each relevant upload boundary, asserting the response names only the field and does not create a lawyer record. Add a UI test confirming the field-level instruction and absence of duplicate generic copy. Run focused tests, typecheck/lint for changed files, and a safe local browser flow with synthetic documents if disk permits. Do not submit a real production registration as a test. Deployment and one user/device retry with a genuine valid document are separate evidence levels.

## Release boundary

No live site deployment or production database mutation occurs during design or local implementation. A production release requires separate verification of build, deployment, and the live registration response.
