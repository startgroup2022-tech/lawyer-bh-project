import {expect, it} from 'vitest';
import {
  digestCode,
  matchesCode,
  parseAccountRequest,
  parseEmailChangeRequest,
  parseEmailChangeVerification,
  parsePasswordChange,
  parsePersonalInfo,
  parseVerification,
} from './validation';

it('requires all signup fields and normalizes email and phone', () => {
  expect(parseAccountRequest({mode:'register',password:'Abc123456',fullName:'  حبيب محمد  ',email:' Habib@Example.COM ',phone:'+973 3600 0000',locale:'ar'})).toEqual({mode:'register',password:'Abc123456',fullName:'حبيب محمد',email:'habib@example.com',phone:'+97336000000',locale:'ar'});
  for (const patch of [{fullName:''},{email:'bad'},{phone:'36000000'}]) {
    expect(()=>parseAccountRequest({mode:'register',fullName:'Test User',email:'test@example.com',phone:'+97336000000',...patch})).toThrow();
  }
});
it('recovery accepts email and new password without profile fields',()=>{
  expect(parseAccountRequest({mode:'reset',password:'Abc123456',email:'test@example.com'})).toEqual({mode:'reset',password:'Abc123456',email:'test@example.com',fullName:null,phone:null,locale:'ar'});
});
it('validates challenge and six-digit code',()=>{
  expect(()=>parseVerification({challengeId:'bad',code:'123456'})).toThrow();
  expect(()=>parseVerification({challengeId:'9a652acb-c0a6-4c71-a4fa-2764c08a749c',code:'12345'})).toThrow();
});
it('normalizes editable personal information',()=>{
  expect(parsePersonalInfo({fullName:'  Test   Client ',phone:'+973 3600-0000'})).toEqual({fullName:'Test Client',phone:'+97336000000'});
  expect(()=>parsePersonalInfo({fullName:'A',phone:'+97336000000'})).toThrowError('invalid_name');
  expect(()=>parsePersonalInfo({fullName:'Test Client',phone:'36000000'})).toThrowError('invalid_phone');
});
it('validates an email change request and locale',()=>{
  expect(parseEmailChangeRequest({email:' NEW@Example.COM ',currentPassword:'old pass 123',locale:'tr'})).toEqual({email:'new@example.com',currentPassword:'old pass 123',locale:'tr'});
  expect(parseEmailChangeRequest({email:'new@example.com',currentPassword:'old pass 123',locale:'unknown'}).locale).toBe('ar');
  expect(()=>parseEmailChangeRequest({email:'bad',currentPassword:'old pass 123'})).toThrowError('invalid_email');
  expect(()=>parseEmailChangeRequest({email:'new@example.com',currentPassword:''})).toThrowError('invalid_credentials');
});
it('validates an email change challenge and six-digit code',()=>{
  expect(parseEmailChangeVerification({challengeId:'9a652acb-c0a6-4c71-a4fa-2764c08a749c',code:'123456'})).toEqual({challengeId:'9a652acb-c0a6-4c71-a4fa-2764c08a749c',code:'123456'});
  expect(()=>parseEmailChangeVerification({challengeId:'bad',code:'123456'})).toThrowError('invalid_code');
});
it('requires a different valid new password',()=>{
  expect(parsePasswordChange({currentPassword:'old pass 123',newPassword:'new pass 456'})).toEqual({currentPassword:'old pass 123',newPassword:'new pass 456'});
  expect(()=>parsePasswordChange({currentPassword:'same pass',newPassword:'same pass'})).toThrowError('password_unchanged');
  expect(()=>parsePasswordChange({currentPassword:'old pass 123',newPassword:'short'})).toThrowError('invalid_password');
});
it('binds an OTP to its challenge and secret',()=>{
  const secret='a'.repeat(32), id='challenge-1';
  const digest=digestCode(id,'123456',secret);
  expect(matchesCode(id,'123456',digest,secret)).toBe(true);
  expect(matchesCode('challenge-2','123456',digest,secret)).toBe(false);
  expect(matchesCode(id,'654321',digest,secret)).toBe(false);
  expect(()=>digestCode(id,'123456','')).toThrow();
});
