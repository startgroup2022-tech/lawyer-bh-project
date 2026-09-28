import "server-only";
import fs from "node:fs";
import path from "node:path";
import { ServerClient } from "postmark";

let client: ServerClient | null = null;
let logoBase64Cache: string | null = null;

function getClient(): ServerClient {
  if (client) return client;
  const token =
    process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_API_TOKEN;
  if (!token) {
    throw new Error(
      "POSTMARK_SERVER_TOKEN (or POSTMARK_API_TOKEN) is not set"
    );
  }
  client = new ServerClient(token);
  return client;
}

function getLogoBase64(): string {
  if (logoBase64Cache) return logoBase64Cache;
  const p = path.join(process.cwd(), "public", "images", "logo-full.png");
  logoBase64Cache = fs.readFileSync(p).toString("base64");
  return logoBase64Cache;
}

export interface EmailAttachment {
  name: string;
  content: string; // base64-encoded
  contentType: string;
}

export interface SendEmailInput {
  to?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail(input: SendEmailInput) {
  const { subject, html, text, replyTo } = input;
  const from = process.env.POSTMARK_FROM_EMAIL;
  const toAddress = input.to ?? process.env.POSTMARK_TO_EMAIL;
  const stream = process.env.POSTMARK_MESSAGE_STREAM ?? "outbound";

  if (!from || !toAddress) {
    throw new Error("POSTMARK_FROM_EMAIL or POSTMARK_TO_EMAIL is not set");
  }

  const extras = (input.attachments ?? []).map((a) => ({
    Name: a.name,
    Content: a.content,
    ContentType: a.contentType,
    ContentID: null,
  }));

  try {
    const result = await getClient().sendEmail({
      From: from,
      To: toAddress,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      ReplyTo: replyTo,
      MessageStream: stream,
      Attachments: [
        {
          Name: "logo.png",
          Content: getLogoBase64(),
          ContentType: "image/png",
          ContentID: "cid:logo.png",
        },
        ...extras,
      ],
    });

    console.log("[postmark] email sent", {
      to: toAddress,
      subject,
      messageId: result.MessageID,
      submittedAt: result.SubmittedAt,
      errorCode: result.ErrorCode,
      message: result.Message,
    });

    return result;
  } catch (err) {
    console.error("[postmark] email failed", {
      to: toAddress,
      subject,
      error: err,
    });

    throw err;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function str(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}
