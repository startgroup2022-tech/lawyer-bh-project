import 'server-only';
import {ServerClient} from 'postmark';
import {sqlClient} from '@/lib/db/client';
import {createClientAuthService,type CodeMail} from './store';
import {ClientAuthError} from './validation';

async function deliverCode({email,code,locale,purpose}:CodeMail) {
  const token=process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_API_TOKEN;
  const from=process.env.POSTMARK_FROM_EMAIL;
  if (!token || !from) throw new ClientAuthError('auth_unavailable',503);
  const ar=locale==='ar',tr=locale==='tr';
  const action=purpose==='email_change'
    ? (ar?'تأكيد تغيير البريد الإلكتروني':tr?'E-posta değişikliğini doğrulayın':'Confirm email change')
    : purpose==='reset'
      ? (ar?'تغيير كلمة المرور':tr?'Şifre sıfırlama':'Password reset')
      : (ar?'تفعيل الحساب':tr?'Hesap doğrulama':'Account verification');
  const subject=`${action} | LegalSOS`;
  const text=ar?`رمز التحقق: ${code}\nصالح لمدة 10 دقائق. لا تشاركه مع أي شخص. إذا لم تطلبه فتجاهل الرسالة.`:tr?`Doğrulama kodunuz: ${code}\n10 dakika geçerlidir. Kimseyle paylaşmayın. Bu isteği siz yapmadıysanız mesajı yok sayın.`:`Your verification code: ${code}\nValid for 10 minutes. Never share it. If you did not request this, ignore the message.`;
  // Auth mail deliberately bypasses the general mail helper's payload/error logging.
  const result=await new ServerClient(token,{timeout:10}).sendEmail({From:from,To:email,Subject:subject,TextBody:`${action}\n${text}`,HtmlBody:`<div dir="${ar?'rtl':'ltr'}"><h2>${action}</h2><p>${text.replaceAll('\n','<br>')}</p></div>`,MessageStream:process.env.POSTMARK_MESSAGE_STREAM??'outbound'});
  if(result.ErrorCode!==0) throw new Error('Delivery failed');
}
export function clientAuthService() {
  return createClientAuthService(sqlClient,process.env.CLIENT_AUTH_SECRET??'',deliverCode);
}
