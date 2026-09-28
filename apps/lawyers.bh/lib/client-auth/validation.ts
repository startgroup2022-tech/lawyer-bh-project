import {createHash, createHmac, timingSafeEqual} from 'node:crypto';

export class ClientAuthError extends Error {
  constructor(public code:string, public status=400) {super(code);}
}
export type AccountRequest = {mode:'register'|'reset'; password:string; email:string; fullName:string|null; phone:string|null; locale:'ar'|'en'|'tr'};
function normalizedEmail(value:unknown) {
  const email=typeof value==='string'?value.trim().toLowerCase():'';
  if (email.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new ClientAuthError('invalid_email');
  return email;
}
function normalizedFullName(value:unknown) {
  const fullName=typeof value==='string'?value.trim().replace(/\s+/g,' '):'';
  if (fullName.length<2 || fullName.length>120 || /[\u0000-\u001f\u007f]/.test(fullName)) throw new ClientAuthError('invalid_name');
  return fullName;
}
function normalizedPhone(value:unknown) {
  const phone=typeof value==='string'?value.replace(/[\s()-]/g,''):'';
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new ClientAuthError('invalid_phone');
  return phone;
}
function currentPassword(value:unknown) {
  if (typeof value!=='string' || !value.length || value.length>128) throw new ClientAuthError('invalid_credentials',401);
  return value;
}
export function parseAccountRequest(value:unknown):AccountRequest {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new ClientAuthError('invalid_input');
  const data=value as Record<string,unknown>;
  if (data.mode!=='register' && data.mode!=='reset') throw new ClientAuthError('invalid_input');
  const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
  if (email.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new ClientAuthError('invalid_email');
  const fullName=typeof data.fullName==='string'?data.fullName.trim().replace(/\s+/g,' '):'';
  const phone=typeof data.phone==='string'?data.phone.replace(/[\s()-]/g,''):'';
  if (data.mode==='register' && (fullName.length<2 || fullName.length>120 || /[\u0000-\u001f\u007f]/.test(fullName))) throw new ClientAuthError('invalid_name');
  if (data.mode==='register' && !/^\+[1-9]\d{7,14}$/.test(phone)) throw new ClientAuthError('invalid_phone');
  if(typeof data.password!=='string' || data.password.length<8 || data.password.length>128) throw new ClientAuthError('invalid_password');
  return {mode:data.mode,password:data.password,email,fullName:data.mode==='register'?fullName:null,phone:data.mode==='register'?phone:null,locale:data.locale==='en'||data.locale==='tr'?data.locale:'ar'};
}
export function parsePersonalInfo(value:unknown) {
  const data=value as Record<string,unknown>|null;
  return {fullName:normalizedFullName(data?.fullName),phone:normalizedPhone(data?.phone)};
}
export function parseEmailChangeRequest(value:unknown):{email:string;currentPassword:string;locale:'ar'|'en'|'tr'} {
  const data=value as Record<string,unknown>|null;
  return {email:normalizedEmail(data?.email),currentPassword:currentPassword(data?.currentPassword),locale:data?.locale==='en'||data?.locale==='tr'?data.locale:'ar'};
}
export function parseEmailChangeVerification(value:unknown) {
  return parseVerification(value);
}
export function parsePasswordChange(value:unknown) {
  const data=value as Record<string,unknown>|null;
  const current=currentPassword(data?.currentPassword);
  const next=data?.newPassword;
  if (typeof next!=='string' || next.length<8 || next.length>128) throw new ClientAuthError('invalid_password');
  if (next===current) throw new ClientAuthError('password_unchanged');
  return {currentPassword:current,newPassword:next};
}
export function parsePasswordLogin(value:unknown) {
  const data=value as Record<string,unknown>|null;
  const email=typeof data?.email==='string'?data.email.trim().toLowerCase():'';
  if(!email || email.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || typeof data?.password!=='string' || !data.password.length || data.password.length>128) throw new ClientAuthError('invalid_credentials',401);
  return {email,password:data.password};
}
export function parseVerification(value:unknown) {
  const data=value as Record<string,unknown>|null;
  if (!data || typeof data.challengeId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.challengeId) || typeof data.code!=='string' || !/^\d{6}$/.test(data.code)) throw new ClientAuthError('invalid_code');
  return {challengeId:data.challengeId,code:data.code};
}
export function secretDigest(value:string, secret:string) {
  if (secret.length<32) throw new ClientAuthError('auth_unavailable',503);
  return createHmac('sha256',secret).update(value).digest('hex');
}
export function digestCode(id:string, code:string, secret:string) {return secretDigest(`otp:${id}:${code}`,secret);}
export function matchesCode(id:string, code:string, digest:string, secret:string) {
  const computed=Buffer.from(digestCode(id,code,secret),'hex');
  const stored=Buffer.from(digest,'hex');
  return stored.length===computed.length && timingSafeEqual(stored,computed);
}
export function tokenDigest(token:string) {return createHash('sha256').update(token).digest('hex');}
