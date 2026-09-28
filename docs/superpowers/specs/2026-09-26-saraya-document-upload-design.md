# Saraya Document Upload Design

## Goal

Add a working **Add document** action to the Saraya Square document library. The user supplies only a document name and one file.

## User Experience

- Show an add button in the document-page header and in the empty state.
- Open a compact dialog containing a required document-name field and a required file picker.
- Accept PDF, JPEG, and PNG files up to 4 MiB so the complete multipart request remains below the hosting platform's 4.5 MB function limit.
- Show the chosen file name before submission and disable duplicate submissions while uploading.
- On success, close the dialog, refresh the document list, and show a localized success message.
- On validation or upload failure, keep the dialog open and show a localized error.

## Data and Security

- Send the file as multipart form data to `POST /api/saraya/v1/documents?propertyId=...`.
- Require an authenticated Saraya membership with `super_admin` or `property_manager` role.
- Validate title, MIME type, and byte size on the server.
- Store the file in private Vercel Blob storage using `PRIVATE_BLOB_READ_WRITE_TOKEN`.
- Create one `saraya_documents` row with category `other`, status `active`, and the authenticated user as uploader.
- Write a `document.created` audit entry in the same database transaction.
- If database creation fails after storage succeeds, remove the uploaded blob.

## Scope Boundaries

- No category, unit, tenant, lease, status, or expiry fields in the add dialog.
- No public file URL is returned or stored.
- Download and deletion are outside this change.
- Existing edit behavior remains unchanged.

## Verification

- Backend tests cover authorization, validation, storage cleanup, persistence, and audit data.
- Flutter tests cover the add button, file selection model, repository upload request, success refresh, and failure state.
- Run TypeScript checks, focused backend tests, Flutter analysis/tests, release web build, and local browser verification.
