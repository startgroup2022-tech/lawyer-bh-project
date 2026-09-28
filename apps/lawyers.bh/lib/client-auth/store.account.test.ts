import {expect,it} from 'vitest';
import {createClientAuthService} from './store';

it('exposes authenticated client account mutations',()=>{
  const service=createClientAuthService((()=>undefined) as never,'test-secret-'.repeat(4),async()=>{});
  expect(typeof service.updatePersonalInfo).toBe('function');
  expect(typeof service.requestEmailChange).toBe('function');
  expect(typeof service.verifyEmailChange).toBe('function');
  expect(typeof service.changePassword).toBe('function');
  expect(typeof service.deleteAccount).toBe('function');
});
