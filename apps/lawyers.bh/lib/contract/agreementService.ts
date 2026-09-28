import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import type { AgreementData, AgreementFee, FeeBasis } from "./agreementTemplate";
import type { LawyerAgreementRow } from "@/lib/db/schema";
import { isRegisteredLawyer } from "@/lib/registeredLawyers";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

/** AGR-YYMMDD-XXXX — human-readable, collision-resistant enough for the
 *  daily volume; the DB unique index is the real guard. */
export function generateReference(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `AGR-${yy}${mm}${dd}-${suffix}`;
}

/** Opaque URL-safe bearer token for remote signing links. */
export function generateSignToken(): string {
  return randomBytes(24).toString("base64url");
}

export function sha256Hex(input: string): string {
  return `sha256:${createHash("sha256").update(input, "utf8").digest("hex")}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RawAgreementInput {
  lawyer?: Record<string, unknown>;
  client?: Record<string, unknown>;
  subject?: unknown;
  fee?: Record<string, unknown>;
  locale?: unknown;
}

export interface ValidatedAgreement {
  data: AgreementData;
  locale: "en" | "ar";
  fee: AgreementFee;
}

function s(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Validate + normalise the raw form body into AgreementData. Throws an
 *  Error with a stable `.message` code on the first problem. */
export function validateAgreementInput(
  body: RawAgreementInput,
  reference: string,
): ValidatedAgreement {
  const locale = body.locale === "ar" ? "ar" : "en";

  const lawyerName = s(body.lawyer?.name, 200);
  const lawyerEmail = s(body.lawyer?.email, 200).toLowerCase();
  const clientName = s(body.client?.name, 200);
  const clientEmail = s(body.client?.email, 200).toLowerCase();
  const subject = s(body.subject, 4000);

  if (!lawyerName) throw new Error("lawyer_name_required");
  // First Party must be a lawyer registered on the platform.
  if (!isRegisteredLawyer(lawyerName)) throw new Error("lawyer_not_registered");
  if (!EMAIL_RE.test(lawyerEmail)) throw new Error("lawyer_email_invalid");
  if (!clientName) throw new Error("client_name_required");
  if (!EMAIL_RE.test(clientEmail)) throw new Error("client_email_invalid");
  if (!subject) throw new Error("subject_required");

  // Fee
  const feeType = body.fee?.type === "contingency" ? "contingency" : "fixed";
  let fee: AgreementFee;
  if (feeType === "fixed") {
    const amount = s(body.fee?.amountBhd, 30);
    if (!amount || !/^\d+(\.\d{1,3})?$/.test(amount))
      throw new Error("fee_fixed_amount_invalid");
    fee = {
      type: "fixed",
      amountBhd: amount,
      installment: s(body.fee?.installment, 300) || null,
    };
  } else {
    const pct = s(body.fee?.percent, 10);
    const num = Number(pct);
    if (!pct || Number.isNaN(num) || num <= 0 || num > 25)
      throw new Error("fee_percent_invalid"); // capped at 25% per Article 3
    const basis = body.fee?.basis;
    if (basis !== "judgment" && basis !== "settlement" && basis !== "enforcement")
      throw new Error("fee_basis_invalid");
    fee = { type: "contingency", percent: pct, basis: basis as FeeBasis };
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bahrain",
  });
  const weekday = {
    en: now.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Asia/Bahrain" }),
    ar: now.toLocaleDateString("ar-BH", { weekday: "long", timeZone: "Asia/Bahrain" }),
  };

  const data: AgreementData = {
    reference,
    dateLabel,
    weekday,
    lawyer: {
      name: lawyerName,
      idOrLicense: s(body.lawyer?.idOrLicense, 120) || null,
      address: s(body.lawyer?.address, 400) || null,
      phone: s(body.lawyer?.phone, 60) || null,
      email: lawyerEmail,
    },
    client: {
      name: clientName,
      idOrLicense: s(body.client?.idOrLicense, 120) || null,
      nationality: s(body.client?.nationality, 120) || null,
      address: s(body.client?.address, 400) || null,
      phone: s(body.client?.phone, 60) || null,
      email: clientEmail,
    },
    subject,
    fee,
  };

  return { data, locale, fee };
}

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

/** Reconstruct AgreementData from a stored row so the PDF / preview can be
 *  re-rendered at signing time. The contract date is the row's creation
 *  date (when the agreement was concluded). */
export function rowToAgreementData(row: LawyerAgreementRow): AgreementData {
  const created = row.createdAt ?? new Date();
  const dateLabel = created.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bahrain",
  });
  const weekday = {
    en: created.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Asia/Bahrain" }),
    ar: created.toLocaleDateString("ar-BH", { weekday: "long", timeZone: "Asia/Bahrain" }),
  };

  const fee: AgreementFee =
    row.feeType === "contingency"
      ? {
          type: "contingency",
          percent: row.feeContingencyPercent ?? "0",
          basis: (row.feeContingencyBasis ?? "judgment") as FeeBasis,
        }
      : {
          type: "fixed",
          amountBhd: row.feeFixedAmountBhd ?? "0",
          installment: row.feeFixedInstallment,
        };

  return {
    reference: row.reference,
    dateLabel,
    weekday,
    lawyer: {
      name: row.lawyerName,
      idOrLicense: row.lawyerLicenseNo,
      address: row.lawyerAddress,
      phone: row.lawyerPhone,
      email: row.lawyerEmail,
    },
    client: {
      name: row.clientName,
      idOrLicense: row.clientIdNo,
      nationality: row.clientNationality,
      address: row.clientAddress,
      phone: row.clientPhone,
      email: row.clientEmail,
    },
    subject: row.subject,
    fee,
  };
}

/** Short human-readable fee summary for emails / lists. */
export function feeSummary(row: LawyerAgreementRow, lang: "en" | "ar"): string {
  if (row.feeType === "contingency") {
    const basis = row.feeContingencyBasis ?? "judgment";
    const basisLabel =
      lang === "ar"
        ? { judgment: "المبلغ المحكوم به", settlement: "مبلغ الصلح", enforcement: "المتحصل من التنفيذ" }[basis]
        : { judgment: "judgment", settlement: "settlement", enforcement: "enforcement" }[basis];
    return lang === "ar"
      ? `نسبية ${row.feeContingencyPercent}% على ${basisLabel}`
      : `Contingency ${row.feeContingencyPercent}% of ${basisLabel}`;
  }
  return lang === "ar"
    ? `مبلغ ثابت ${row.feeFixedAmountBhd} د.ب`
    : `Fixed ${row.feeFixedAmountBhd} BHD`;
}
