export const PAYMENT_DRAFT_KEY = "lawyers.bh.payment.draft.v1";
export const LEGACY_BOOK_APPOINTMENT_PAYMENT_DRAFT_KEY =
  "lawyers.bh.bookAppointment.paymentDraft.v1";

export type PaymentFlow = "book_appointment" | "sos";

export type PaymentSourceType = "card_sdk_v2" | "benefitpay" | "apple_pay_web";

export type PaymentPayload = Record<string, unknown>;

type BasePaymentDraft = {
  flow: PaymentFlow;
  createdAt: string;
  lang: string;
  service: string;
  amountBD: number;
  currentPriceLabel: string;
  name: string;
  phone: string;
  email?: string;
  payload: PaymentPayload;
};

export type BookAppointmentPaymentDraft = BasePaymentDraft & {
  flow: "book_appointment";
  specialtyLabel?: string;
  consultationType: string;
  consultationMethod: string;
  consultationPrice: string;
  durationMinutes: number;
  date: string | null;
  time: string | null;
  selectedTimeLabel?: string;
  assignmentMode?: string | null;
  selectedOfficeName?: string;
  selectedLawyerName?: string;
  message?: string;
};

export type SosPaymentDraft = BasePaymentDraft & {
  flow: "sos";
  caseType: string;
  idType: string;
  idNumber: string;
  description?: string;
  manualAddress?: string;
  signatureDataUrl?: string;
};

export type SharedPaymentDraft = BookAppointmentPaymentDraft | SosPaymentDraft;

function safeParseDraft(raw: string | null) {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Partial<SharedPaymentDraft>;
  } catch {
    return null;
  }
}

function normalizeLegacyBookAppointmentDraft(
  draft: Partial<BookAppointmentPaymentDraft>,
): BookAppointmentPaymentDraft | null {
  if (!draft || !draft.service || !draft.name || !draft.phone || !draft.amountBD) {
    return null;
  }

  return {
    flow: "book_appointment",
    createdAt: String(draft.createdAt ?? new Date().toISOString()),
    lang: String(draft.lang ?? "ar"),
    service: String(draft.service ?? ""),
    specialtyLabel: draft.specialtyLabel,
    consultationType: String(draft.consultationType ?? ""),
    consultationMethod: String(draft.consultationMethod ?? ""),
    consultationPrice: String(draft.consultationPrice ?? ""),
    durationMinutes: Number(draft.durationMinutes ?? 30),
    amountBD: Number(draft.amountBD),
    currentPriceLabel: String(draft.currentPriceLabel ?? `${Number(draft.amountBD).toFixed(2)} SAR`),
    date: draft.date ?? null,
    time: draft.time ?? null,
    selectedTimeLabel: draft.selectedTimeLabel,
    assignmentMode: draft.assignmentMode,
    selectedOfficeName: draft.selectedOfficeName,
    selectedLawyerName: draft.selectedLawyerName,
    name: String(draft.name ?? ""),
    phone: String(draft.phone ?? ""),
    email: String(draft.email ?? ""),
    message: draft.message,
    payload: (draft.payload ?? {}) as PaymentPayload,
  };
}

export function savePaymentDraft(draft: SharedPaymentDraft) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(PAYMENT_DRAFT_KEY, JSON.stringify(draft));

  if (draft.flow === "book_appointment") {
    window.sessionStorage.setItem(
      LEGACY_BOOK_APPOINTMENT_PAYMENT_DRAFT_KEY,
      JSON.stringify(draft),
    );
  }
}

export function loadPaymentDraft() {
  if (typeof window === "undefined") return null;

  const current = safeParseDraft(window.sessionStorage.getItem(PAYMENT_DRAFT_KEY));

  if (current?.flow === "book_appointment" || current?.flow === "sos") {
    return current as SharedPaymentDraft;
  }

  const legacy = safeParseDraft(
    window.sessionStorage.getItem(LEGACY_BOOK_APPOINTMENT_PAYMENT_DRAFT_KEY),
  );

  const normalizedLegacy = normalizeLegacyBookAppointmentDraft(
    legacy as Partial<BookAppointmentPaymentDraft>,
  );

  if (normalizedLegacy) {
    savePaymentDraft(normalizedLegacy);
    return normalizedLegacy;
  }

  window.sessionStorage.removeItem(PAYMENT_DRAFT_KEY);
  return null;
}

export function clearPaymentDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PAYMENT_DRAFT_KEY);
  window.sessionStorage.removeItem(LEGACY_BOOK_APPOINTMENT_PAYMENT_DRAFT_KEY);
}

export function saveBookAppointmentPaymentDraft(
  draft: Omit<BookAppointmentPaymentDraft, "flow"> | BookAppointmentPaymentDraft,
) {
  savePaymentDraft({
    ...draft,
    flow: "book_appointment",
  });
}

export function loadBookAppointmentPaymentDraft() {
  const draft = loadPaymentDraft();
  return draft?.flow === "book_appointment" ? draft : null;
}

export function clearBookAppointmentPaymentDraft() {
  clearPaymentDraft();
}

export function saveSosPaymentDraft(draft: Omit<SosPaymentDraft, "flow"> | SosPaymentDraft) {
  savePaymentDraft({
    ...draft,
    flow: "sos",
  });
}
