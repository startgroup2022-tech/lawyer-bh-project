# Saraya Document Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven development and execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure document upload flow that asks for only a display name and one PDF/JPEG/PNG file.

**Architecture:** Flutter selects bytes and sends multipart form data through the authenticated API client. The Next.js Saraya endpoint validates access and content, stores the file privately, persists metadata, and records an audit event.

**Tech Stack:** Flutter/Dart, Dio, file_picker, Next.js Route Handlers, TypeScript, Drizzle, PostgreSQL, Vercel Blob, Vitest.

## Global Constraints

- Preserve the existing bilingual RTL/LTR interface.
- Accept only PDF, JPEG, and PNG files up to 4 MiB.
- The add dialog exposes only document name and file.
- Store files privately and enforce server-side authorization.
- Preserve all unrelated dirty work and do not commit or deploy publicly.

---

### Task 1: Backend upload service

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/documents/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/documents/repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/documents/http.ts`
- Modify: `apps/lawyers.bh/app/api/saraya/v1/documents/route.ts`
- Create: `apps/lawyers.bh/lib/saraya/documents/storage.ts`
- Test: `apps/lawyers.bh/lib/saraya/documents/service.test.ts`
- Test: `apps/lawyers.bh/lib/saraya/documents/http.test.ts`

**Interfaces:**
- Consumes: `validateDocumentUpload`, `documentKey`, Saraya principal membership, and `PRIVATE_BLOB_READ_WRITE_TOKEN`.
- Produces: `service.create(principal, propertyId, input)` and `POST /api/saraya/v1/documents` returning a document record.

- [x] Write failing service and HTTP tests for permissions, validation, persistence, audit inputs, and blob cleanup.
- [x] Run focused Vitest files and confirm failures are caused by the missing create flow.
- [x] Implement private storage adapter, transactional repository creation, service validation, and multipart HTTP parsing.
- [x] Run focused tests and TypeScript validation.

### Task 2: Flutter multipart repository

**Files:**
- Modify: `apps/saraya_square_app/pubspec.yaml`
- Modify: `apps/saraya_square_app/lib/core/network/api_client.dart`
- Modify: `apps/saraya_square_app/lib/features/documents/data/document_repository.dart`
- Modify: `apps/saraya_square_app/lib/features/documents/domain/saraya_document.dart`
- Test: `apps/saraya_square_app/test/core/network/api_client_test.dart`
- Test: `apps/saraya_square_app/test/features/documents/documents_screen_test.dart`

**Interfaces:**
- Consumes: selected file bytes, original file name, MIME type, document title, and property id.
- Produces: `DocumentRepository.create(String propertyId, DocumentUploadInput input)`.

- [x] Write failing tests for authenticated multipart requests and repository response parsing.
- [x] Run focused Flutter tests and confirm expected failures.
- [x] Add `file_picker`, multipart API-client support, and repository upload implementation.
- [x] Run focused tests and analysis.

### Task 3: Add-document interface

**Files:**
- Modify: `apps/saraya_square_app/lib/features/documents/presentation/documents_screen.dart`
- Modify: `apps/saraya_square_app/lib/l10n/app_ar.arb`
- Modify: `apps/saraya_square_app/lib/l10n/app_en.arb`
- Test: `apps/saraya_square_app/test/features/documents/documents_screen_test.dart`

**Interfaces:**
- Consumes: `DocumentRepository.create` and file-picker selection.
- Produces: header and empty-state add buttons, upload dialog, refresh, and localized success/failure feedback.

- [x] Write failing widget tests for the add action and successful refresh.
- [x] Run the widget tests and confirm the add controls are missing.
- [x] Implement the two-field dialog and connect it to the repository.
- [x] Run focused tests, full Flutter analysis/tests, and backend checks.
- [x] Build and publish the local web bundle, then verify the document page in the browser.
