import {expect,it} from 'vitest';
import {parsePreferenceUpdate,deviceDigest} from './validation';
it('requires real booleans and never accepts a caller-selected device key',()=>{
  const preferences={enabled:false,requests:true,communications:false,advertising:true};
  expect(parsePreferenceUpdate({preferences})).toEqual({preferences,token:null});
  for(const input of [null,[],{}, {preferences:{...preferences,enabled:'false'}},{preferences:{enabled:true}},{token:''},{token:'x'.repeat(4097)}]) expect(()=>parsePreferenceUpdate(input)).toThrow();
  expect(()=>deviceDigest('short')).toThrow('unauthorized');
  expect(deviceDigest('a'.repeat(64))).not.toBe('a'.repeat(64));
});
