import {
  lawyerProfileCompletionEmailHtml,
  lawyerProfileCompletionEmailSubject,
  lawyerProfileCompletionEmailText,
} from "@/app/[locale]/admin/lawyers/new/emailTemplates";

type InvitationEmailInput = {
  to: string;
  lawyerName: string;
  completionLink: string;
};

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SendEmail = (payload: EmailPayload) => Promise<unknown>;

export async function sendLawyerInvitationEmail(
  input: InvitationEmailInput,
  sendEmail: SendEmail,
) {
  const templateInput = {
    lawyerName: input.lawyerName,
    profileCompletionUrl: input.completionLink,
  };

  return sendEmail({
    to: input.to,
    subject: lawyerProfileCompletionEmailSubject(),
    html: lawyerProfileCompletionEmailHtml(templateInput),
    text: lawyerProfileCompletionEmailText(templateInput),
  });
}
