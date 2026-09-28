import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({admin:vi.fn(), load:vi.fn(), save:vi.fn()}));
vi.mock('@/lib/auth/admin-access', () => ({requireSuperAdmin:mocks.admin}));
vi.mock('@/lib/countries/store', () => ({loadManagedCountries:mocks.load, saveCountrySettings:mocks.save}));
import { GET, PATCH } from './route';
beforeEach(() => { vi.resetAllMocks(); });
it('saves a normalized website without modifying activation switches', async () => {
  mocks.admin.mockResolvedValue({id:'admin'});
  const response = await PATCH(new Request('https://lawyers.bh/api/admin/country-settings', {method:'PATCH', headers:{origin:'https://lawyers.bh','content-type':'application/json'}, body:JSON.stringify({code:'BH',lawyersPlatformUrl:'lawyers.bh'})}));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.save).toHaveBeenCalledWith('BH', {lawyersPlatformUrl:'https://lawyers.bh/'});
  expect((await response.json()).settings.lawyersPlatformUrl).toBe('https://lawyers.bh/');
});
it('blocks country management without super admin', async () => {
  mocks.admin.mockResolvedValue(null);
  expect((await GET()).status).toBe(403);
  expect((await PATCH(new Request('https://lawyers.bh/api/admin/country-settings', {method:'PATCH'}))).status).toBe(403);
  expect(mocks.save).not.toHaveBeenCalled();
});
it('blocks cross-origin writes and unrecognized codes', async () => {
  mocks.admin.mockResolvedValue({id:'admin'});
  const request = (origin:string, code:string) => new Request('https://lawyers.bh/api/admin/country-settings', {method:'PATCH', headers:{origin,'content-type':'application/json'}, body:JSON.stringify({code, appEnabled:true})});
  expect((await PATCH(request('https://evil.example', 'BH'))).status).toBe(403);
  expect((await PATCH(request('https://lawyers.bh', 'ZZ'))).status).toBe(400);
  expect(mocks.save).not.toHaveBeenCalled();
});
it('rejects activation fields and legacy URL writes', async () => {
  mocks.admin.mockResolvedValue({id:'admin'});
  for (const patch of [{appEnabled:false}, {websiteEnabled:true}, {websiteUrl:'lawyers.bh'}]) {
    const response = await PATCH(new Request('https://lawyers.bh/api/admin/country-settings', {method:'PATCH', headers:{origin:'https://lawyers.bh','content-type':'application/json'}, body:JSON.stringify({code:'BH', ...patch})}));
    expect(response.status).toBe(400);
  }
  expect(mocks.save).not.toHaveBeenCalled();
});
it('keeps legacy aliases only in read responses', async () => {
  mocks.admin.mockResolvedValue({id:'admin'});
  mocks.load.mockResolvedValue([{code:'BH', legalSosEnabled:true, lawyersPlatformEnabled:false, lawyersPlatformUrl:'https://lawyers.bh/', appEnabled:true, websiteEnabled:false, websiteUrl:'https://lawyers.bh/'}]);
  const read = await GET();
  expect(read.headers.get('cache-control')).toBe('no-store');
  expect((await read.json()).countries[0]).toMatchObject({legalSosEnabled:true, appEnabled:true, lawyersPlatformUrl:'https://lawyers.bh/', websiteUrl:'https://lawyers.bh/'});
});
it('returns safe no-store validation and persistence errors', async () => {
  mocks.admin.mockResolvedValue({id:'admin'});
  const invalid = await PATCH(new Request('https://lawyers.bh/api/admin/country-settings', {method:'PATCH', headers:{origin:'https://lawyers.bh','content-type':'application/json'}, body:JSON.stringify({code:'BH', legalSosUrl:'https://legalsos.example'})}));
  expect(invalid.status).toBe(400);
  expect(invalid.headers.get('cache-control')).toBe('no-store');
  mocks.save.mockRejectedValue(new Error('secret db error'));
  const unavailable = await PATCH(new Request('https://lawyers.bh/api/admin/country-settings', {method:'PATCH', headers:{origin:'https://lawyers.bh','content-type':'application/json'}, body:JSON.stringify({code:'BH', lawyersPlatformUrl:'https://lawyers.bh'})}));
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toEqual({ok:false, error:'COUNTRY_SETTINGS_UNAVAILABLE'});
});
