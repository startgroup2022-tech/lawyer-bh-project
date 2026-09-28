import { ServerClient } from "postmark";
import type {
  PublicOnboardingDelivery,
  PublicOnboardingDeliveryMessage,
} from "./contracts";

interface PostmarkClient {
  sendEmail(input: {
    From: string;
    To: string;
    Subject: string;
    TextBody: string;
    HtmlBody: string;
    MessageStream?: string;
  }): Promise<unknown>;
}

type DeliveryEnvironment = Partial<Record<
  | "POSTMARK_SERVER_TOKEN"
  | "POSTMARK_API_TOKEN"
  | "POSTMARK_FROM_EMAIL"
  | "SARAYA_INVITATION_FROM"
  | "POSTMARK_MESSAGE_STREAM"
  | "SARAYA_SMS_WEBHOOK_URL"
  | "SARAYA_SMS_WEBHOOK_SECRET",
  string
>>;

function content(message: PublicOnboardingDeliveryMessage) {
  if (message.locale === "ar") {
    return {
      subject: "رمز التحقق من سرايا سكوير",
      text: `رمز التحقق الخاص بك هو ${message.code}. ينتهي خلال 10 دقائق.`,
      html: `<div dir="rtl"><h2>سرايا سكوير</h2><p>رمز التحقق الخاص بك هو <strong>${message.code}</strong>.</p><p>ينتهي خلال 10 دقائق.</p></div>`,
    };
  }
  return {
    subject: "Saraya Square verification code",
    text: `Your verification code is ${message.code}. It expires in 10 minutes.`,
    html: `<div dir="ltr"><h2>Saraya Square</h2><p>Your verification code is <strong>${message.code}</strong>.</p><p>It expires in 10 minutes.</p></div>`,
  };
}

export function createPublicOnboardingDelivery(options: {
  env?: DeliveryEnvironment;
  createPostmarkClient?: (token: string) => PostmarkClient;
  fetch?: typeof fetch;
} = {}): PublicOnboardingDelivery {
  const env = options.env ?? process.env;
  const createPostmarkClient = options.createPostmarkClient
    ?? ((token: string) => new ServerClient(token, { timeout: 10 }));
  const send = options.fetch ?? fetch;
  return {
    async sendEmail(message) {
      const token = env.POSTMARK_SERVER_TOKEN ?? env.POSTMARK_API_TOKEN;
      const from = env.POSTMARK_FROM_EMAIL ?? env.SARAYA_INVITATION_FROM;
      if (!token || !from) throw new Error("delivery_not_configured");
      const body = content(message);
      await createPostmarkClient(token).sendEmail({
        From: from,
        To: message.to,
        Subject: body.subject,
        TextBody: body.text,
        HtmlBody: body.html,
        MessageStream: env.POSTMARK_MESSAGE_STREAM ?? "outbound",
      });
    },
    async sendSms(message) {
      const endpoint = env.SARAYA_SMS_WEBHOOK_URL;
      const secret = env.SARAYA_SMS_WEBHOOK_SECRET;
      if (!endpoint || !secret) throw new Error("delivery_not_configured");
      const body = content(message);
      const response = await send(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ to: message.to, message: body.text }),
      });
      if (!response.ok) throw new Error("delivery_failed");
    },
  };
}
