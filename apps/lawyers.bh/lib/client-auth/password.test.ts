import {expect,it} from 'vitest';
import {parseAccountRequest,parsePasswordLogin} from './validation';
import {hashPassword,verifyPassword} from './password';

it('requires a password for signup and refuses legacy OTP login requests',()=>{
  const input={mode:'register',email:'a@example.com',fullName:'Test User',phone:'+97336000000'};
  expect(()=>parseAccountRequest(input)).toThrow();
  expect(()=>parseAccountRequest({...input,password:'short'})).toThrow();
  expect(parseAccountRequest({...input,password:'Abc123456'})).toMatchObject({password:'Abc123456'});
  expect(()=>parseAccountRequest({mode:'login',email:'a@example.com'})).toThrow();
});
it('accepts any character types from 8–128 characters for signup and reset',()=>{
  for(const mode of ['register','reset']) {
    const input={mode,email:'a@example.com',fullName:'Test User',phone:'+97336000000'};
    for(const password of ['', 'Abc123!', 'a'.repeat(129)]) {
      expect(()=>parseAccountRequest({...input,password})).toThrow();
    }
    for(const password of ['Abc1234!','abcdefgh','12345678','!@#$%^&*','Abc 1234','كلمةمرور','a'.repeat(128)]) {
      expect(parseAccountRequest({...input,password}).password).toBe(password);
    }
  }
});
it('does not apply new-password restrictions to existing password login',()=>{
  expect(parsePasswordLogin({email:'a@example.com',password:'old passphrase!'}).password).toBe('old passphrase!');
});
it('salts hashes, checks the full password and rejects malformed hashes',async()=>{
  const first=await hashPassword('a long passphrase');
  expect(first).not.toContain('a long passphrase');
  expect(await hashPassword('a long passphrase')).not.toBe(first);
  expect(await verifyPassword('a long passphrase',first)).toBe(true);
  expect(await verifyPassword('a long passphrase ',first)).toBe(false);
  expect(await verifyPassword('wrong password',null)).toBe(false);
  expect(await verifyPassword('a long passphrase','bad')).toBe(false);
});
