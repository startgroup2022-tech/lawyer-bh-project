# YourGPT -> lawyers.bh existing payment page

This patch keeps the current Tap payment flow unchanged.

Flow:

1. YourGPT calls `GET /api/yourgpt/legal-cases` to read the active legal cases.
2. The assistant selects the closest case and asks the user to confirm it.
3. YourGPT collects the customer's name, Bahrain phone, email, case description, appointment date, and appointment period.
4. YourGPT calls `POST /api/yourgpt/payment-session`.
5. The API stores the same `BookAppointmentPaymentDraft` used by the existing booking page and returns a temporary `paymentUrl`.
6. The customer opens the URL.
7. `/payment/yourgpt` loads the draft into `sessionStorage` and redirects to the existing `/{locale}/payment` page.
8. The existing payment page and `/api/tap/charge` complete the payment exactly as before.

## 1. Run the SQL migration

From the project root:

```bash
psql "$DATABASE_URL" -f apps/lawyers.bh/drizzle/0020_yourgpt_payment_sessions.sql
```

For the local database used in this project:

```bash
psql "postgres://lawyers:lawyers_dev_password@localhost:5433/lawyers_bh" \
  -f apps/lawyers.bh/drizzle/0020_yourgpt_payment_sessions.sql
```

## 2. Environment variables

Add to `apps/lawyers.bh/.env.local` and to Vercel:

```env
YOURGPT_BOOKING_SECRET=replace_with_a_long_random_secret
NEXT_PUBLIC_SITE_URL=https://www.lawyers.bh
```

Generate a secret:

```bash
openssl rand -hex 32
```

Do not expose this value in browser code.

## 3. YourGPT function: list_legal_cases

Method:

```text
GET
```

URL:

```text
https://www.lawyers.bh/api/yourgpt/legal-cases?lang={{TOOL_PARAMS.lang}}&countryCode=BH
```

Headers:

```text
Authorization: Bearer YOURGPT_BOOKING_SECRET
Content-Type: application/json
```

Parameters schema:

```json
{
  "type": "object",
  "properties": {
    "lang": {
      "type": "string",
      "enum": ["ar", "en"],
      "description": "The language currently used by the customer."
    }
  },
  "required": ["lang"]
}
```

Use this function before finalizing the legal case. The response returns the real database `id`, `key`, name, description, keywords, and category.

## 4. YourGPT function: create_payment_session

Method:

```text
POST
```

URL:

```text
https://www.lawyers.bh/api/yourgpt/payment-session
```

Headers:

```text
Authorization: Bearer YOURGPT_BOOKING_SECRET
Content-Type: application/json
```

Raw body:

```json
{
  "countryCode": "BH",
  "lang": "{{TOOL_PARAMS.lang}}",
  "legalCaseId": "{{TOOL_PARAMS.legal_case_id}}",
  "caseDescription": "{{TOOL_PARAMS.case_description}}",
  "fullName": "{{TOOL_PARAMS.full_name}}",
  "phone": "{{TOOL_PARAMS.phone}}",
  "email": "{{TOOL_PARAMS.email}}",
  "appointmentDate": "{{TOOL_PARAMS.appointment_date}}",
  "appointmentTime": "{{TOOL_PARAMS.appointment_time}}"
}
```

Parameters schema:

```json
{
  "type": "object",
  "properties": {
    "lang": {
      "type": "string",
      "enum": ["ar", "en"]
    },
    "legal_case_id": {
      "type": "string",
      "description": "The confirmed case id returned by list_legal_cases."
    },
    "case_description": {
      "type": "string",
      "description": "A clear description of the user's legal issue, minimum 10 characters."
    },
    "full_name": {
      "type": "string"
    },
    "phone": {
      "type": "string",
      "description": "An 8-digit Bahrain phone number."
    },
    "email": {
      "type": "string"
    },
    "appointment_date": {
      "type": "string",
      "description": "A future appointment date formatted as YYYY-MM-DD."
    },
    "appointment_time": {
      "type": "string",
      "enum": ["09:00-13:00", "13:00-17:00", "09:00-17:00"]
    }
  },
  "required": [
    "lang",
    "legal_case_id",
    "case_description",
    "full_name",
    "phone",
    "email",
    "appointment_date",
    "appointment_time"
  ]
}
```

The function response contains:

```json
{
  "ok": true,
  "paymentUrl": "https://www.lawyers.bh/payment/yourgpt?token=...",
  "expiresAt": "...",
  "amount": 10,
  "currency": "BHD",
  "legalCase": {
    "id": "...",
    "key": "...",
    "name": "...",
    "category": "..."
  }
}
```

Show `paymentUrl` to the customer only after explicit confirmation.

## 5. Agent instructions

```text
You are the booking assistant for lawyers.bh.

Speak in the customer's language. Ask the customer to briefly describe the legal issue. Call list_legal_cases and select the closest active legal case from the returned database list. Explain the selected case and ask the customer to confirm it. Do not invent a case id or case key.

After confirmation, collect one item at a time:
- Full name
- Bahrain phone number
- Email address
- Clear case description
- Appointment date in YYYY-MM-DD
- Appointment period: 09:00-13:00, 13:00-17:00, or 09:00-17:00

Before creating the payment session, show a summary containing the confirmed case, full name, phone, email, appointment date, appointment period, and price of 10 BHD. Ask for explicit confirmation.

Only after confirmation, call create_payment_session once. If it succeeds, show the returned paymentUrl and tell the customer that payment will be completed securely inside lawyers.bh. If it fails, show a helpful error and do not invent a URL.
```

## 6. Test the APIs

List cases:

```bash
curl -sS \
  -H "Authorization: Bearer $YOURGPT_BOOKING_SECRET" \
  "http://localhost:3000/api/yourgpt/legal-cases?lang=ar&countryCode=BH"
```

Create a session using a real `legalCaseId` returned by the first request:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $YOURGPT_BOOKING_SECRET" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/yourgpt/payment-session" \
  -d '{
    "countryCode": "BH",
    "lang": "ar",
    "legalCaseId": "REPLACE_WITH_REAL_UUID",
    "caseDescription": "لدي مشكلة قانونية وأرغب في الحصول على استشارة.",
    "fullName": "محمد أحمد",
    "phone": "33334444",
    "email": "customer@example.com",
    "appointmentDate": "2026-07-14",
    "appointmentTime": "09:00-13:00"
  }'
```

Open the returned `paymentUrl`. It should briefly show “preparing payment” and then open the existing payment page with card, BenefitPay, and Apple Pay options.
