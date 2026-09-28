// SendGrid transactional email wrapper.
//
// One module owns the from-address + brand styling so every email goes
// out consistently. Templates are inlined as small HTML strings for
// now — we can move them to SendGrid Dynamic Templates later for
// designer-editable workflows.
//
// Trial limits to know: 100 emails/day, expires 2026-07-26. Upgrade
// path: SendGrid Essentials ($19.95/mo) for 50k/mo + paid SLA.

import sgMail, { type MailDataRequired } from "@sendgrid/mail";

// Lazy env read so dotenv-loaded scripts work regardless of import order.
function env() {
  return {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL ?? "noreply@legalsos.lawyer",
    fromName: process.env.SENDGRID_FROM_NAME ?? "Legal SOS",
  };
}

let initialized = false;
function ensureInit() {
  if (initialized) return;
  const { apiKey } = env();
  if (!apiKey) {
    throw new Error(
      "SENDGRID_API_KEY not set — cannot send email. Configure in Vercel env or .env.local.",
    );
  }
  sgMail.setApiKey(apiKey);
  initialized = true;
}

export function isSendgridConfigured(): boolean {
  return Boolean(env().apiKey);
}

// ── Core send ───────────────────────────────────────────────────────

export interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Override the default reply-to. */
  replyTo?: string;
  /** Per-message tracking categories visible in SendGrid analytics. */
  categories?: string[];
}

export async function sendEmail(args: SendArgs): Promise<{ messageId?: string }> {
  ensureInit();
  const { fromEmail, fromName } = env();

  const msg: MailDataRequired = {
    to: args.to,
    from: { email: fromEmail, name: fromName },
    replyTo: args.replyTo ?? fromEmail,
    subject: args.subject,
    text: args.text ?? stripHtml(args.html),
    html: wrapBrandShell(args.html),
    categories: args.categories ?? ["legal-sos"],
    // Open + click tracking off by default for transactional — receipts
    // get archived and we don't want pixel beacons firing months later.
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false },
    },
  };

  const [response] = await sgMail.send(msg);
  return { messageId: response.headers["x-message-id"] as string | undefined };
}

// ── Templated helpers (one per real-world use case) ─────────────────
//
// Each helper centralizes copy + variables so changing wording is a
// one-line change. Keep formal English here; bilingual i18n happens
// when Arabic templates land.

export interface CaseReceiptArgs {
  to: string;
  clientName: string;
  caseRef: string;
  caseTitle: string;
  amountBhd: string;
  paidAt: Date;
  receiptUrl?: string;
}

export async function sendCaseReceipt(args: CaseReceiptArgs) {
  const dateStr = args.paidAt.toLocaleString("en-GB", { timeZone: "Asia/Bahrain" });
  const html = `
    <h2 style="margin:0 0 10px;font-size:20px">Receipt · ${escapeHtml(args.caseRef)}</h2>
    <p>Hi ${escapeHtml(args.clientName)},</p>
    <p>Your Legal SOS payment has been confirmed.</p>
    <table style="border-collapse:collapse;width:100%;margin:18px 0;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b7b97">Case</td><td>${escapeHtml(args.caseTitle)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7b97">Reference</td><td>${escapeHtml(args.caseRef)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7b97">Amount</td><td><strong>BHD ${escapeHtml(args.amountBhd)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7b97">Paid</td><td>${dateStr}</td></tr>
    </table>
    ${args.receiptUrl ? `<p><a href="${args.receiptUrl}" style="color:#9c7a3d">Download VAT receipt (PDF)</a></p>` : ""}
    <p style="color:#6b7b97;font-size:12px">For questions, reply to this email or call +973 3231 7070.</p>
  `;
  return sendEmail({
    to: args.to,
    subject: `Legal SOS receipt · ${args.caseRef}`,
    html,
    categories: ["receipt", "case-payment"],
  });
}

export interface LawyerPayoutArgs {
  to: string;
  lawyerName: string;
  periodLabel: string; // e.g. "May 2026"
  grossBhd: string;
  platformFeeBhd: string;
  netBhd: string;
  caseCount: number;
}

export async function sendLawyerPayout(args: LawyerPayoutArgs) {
  const html = `
    <h2 style="margin:0 0 10px;font-size:20px">Payout statement · ${escapeHtml(args.periodLabel)}</h2>
    <p>Dear ${escapeHtml(args.lawyerName)},</p>
    <p>Your Legal SOS payout for ${escapeHtml(args.periodLabel)} has been issued.</p>
    <table style="border-collapse:collapse;width:100%;margin:18px 0;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b7b97">Cases completed</td><td>${args.caseCount}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7b97">Gross earnings</td><td>BHD ${escapeHtml(args.grossBhd)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7b97">Platform fee (20%)</td><td>−BHD ${escapeHtml(args.platformFeeBhd)}</td></tr>
      <tr><td style="padding:10px 0;color:#9c7a3d;border-top:1px solid #e8c281"><strong>Net transferred</strong></td><td style="padding:10px 0;color:#9c7a3d;border-top:1px solid #e8c281"><strong>BHD ${escapeHtml(args.netBhd)}</strong></td></tr>
    </table>
    <p style="color:#6b7b97;font-size:12px">Bank transfer reference will arrive separately within 1–3 business days.</p>
  `;
  return sendEmail({
    to: args.to,
    subject: `Legal SOS payout · ${args.periodLabel} · BHD ${args.netBhd}`,
    html,
    categories: ["payout", "lawyer"],
  });
}

// ── Small helpers ───────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** Wrap raw body HTML in the shared brand shell. */
function wrapBrandShell(bodyHtml: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Legal SOS</title></head>
<body style="margin:0;padding:0;background:#f7f6f3;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1f2e">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f6f3;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border:1px solid #e8e6e1;border-radius:14px;overflow:hidden">
        <tr><td style="padding:18px 24px;border-bottom:1px solid #efece5;background:#0b1426">
          <table role="presentation" width="100%"><tr>
            <td align="left" style="color:#e8c281;font-weight:700;font-size:14px;letter-spacing:0.04em">LEGAL SOS</td>
            <td align="right" style="color:#8fa0bd;font-size:11px;letter-spacing:0.08em">legalsos.lawyer</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:24px;font-size:14px;line-height:1.55;color:#1a1f2e">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 24px;background:#fafaf6;border-top:1px solid #efece5;color:#6b7b97;font-size:11px;text-align:center">
          Legal SOS · Manama, Kingdom of Bahrain · 24/7 hotline +973 3231 7070<br>
          You're receiving this because you used Legal SOS. To stop receiving operational emails, reply with REMOVE.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
