import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({admin:vi.fn(), save:vi.fn()}));
vi.mock('@/lib/auth/admin-access', () => ({requireSuperAdmin:mocks.admin}));
vi.mock('@/lib/countries/language-store', () => ({saveCountryLanguages:mocks.save}));

import {PUT} from './route';

const params = {params:Promise.resolve({code:'bh'})};
const valid = {enabledLanguages:['ar','en'], defaultLanguage:'ar', translations:{ar:'البحرين', en:'Bahrain'}};
const request = (body:unknown, origin='https://lawyers.bh') => new Request('https://lawyers.bh/api/admin/countries/bh/languages', {
  method:'PUT', headers:{origin, 'content-type':'application/json'}, body:JSON.stringify(body),
});

beforeEach(() => vi.resetAllMocks());

describe('PUT /api/admin/countries/:code/languages', () => {
  it('requires super-admin access and same-origin', async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await PUT(request(valid), params)).status).toBe(403);
    mocks.admin.mockResolvedValue({id:'admin-1'});
    expect((await PUT(request(valid, 'https://evil.example'), params)).status).toBe(403);
  });

  it('rejects invalid country codes and language selections', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    expect((await PUT(request({...valid, defaultLanguage:'tr'}), params)).status).toBe(400);
    expect((await PUT(request(valid), {params:Promise.resolve({code:'bhr'})})).status).toBe(400);
    expect((await PUT(request(valid), {params:Promise.resolve({code:'ZZ'})})).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('persists one validated selection and returns no-store', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.save.mockResolvedValue({countryCode:'BH', ...valid});
    const response = await PUT(request(valid), params);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mocks.save).toHaveBeenCalledWith('BH', valid);
  });

  it('returns a safe unavailable error on persistence failure', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.save.mockRejectedValue(new Error('secret db error'));
    const response = await PUT(request(valid), params);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ok:false, error:'COUNTRY_LANGUAGES_UNAVAILABLE'});
  });

  it('rejects draft languages and identifies a missing country safely', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.save.mockRejectedValueOnce(new Error('LANGUAGE_NOT_PUBLISHED')).mockRejectedValueOnce(new Error('COUNTRY_NOT_FOUND'));
    const draft = await PUT(request(valid), params);
    expect(draft.status).toBe(400);
    expect(await draft.json()).toEqual({ok:false, error:'LANGUAGE_NOT_PUBLISHED'});
    expect((await PUT(request(valid), params)).status).toBe(404);
  });
});
