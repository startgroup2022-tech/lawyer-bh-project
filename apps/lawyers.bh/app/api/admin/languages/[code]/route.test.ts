import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({admin:vi.fn(), update:vi.fn(), publish:vi.fn()}));
vi.mock('@/lib/auth/admin-access', () => ({requireSuperAdmin:mocks.admin}));
vi.mock('@/lib/countries/language-store', () => ({updateLanguage:mocks.update, publishLanguage:mocks.publish}));

import {PATCH} from './route';

const params = {params:Promise.resolve({code:'tr'})};
const request = (body:unknown, origin='https://lawyers.bh') => new Request('https://lawyers.bh/api/admin/languages/tr', {
  method:'PATCH', headers:{origin, 'content-type':'application/json'}, body:JSON.stringify(body),
});

beforeEach(() => vi.resetAllMocks());

describe('PATCH /api/admin/languages/:code', () => {
  it('requires super-admin access and same-origin', async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await PATCH(request({adminName:'Turkish'}), params)).status).toBe(403);
    mocks.admin.mockResolvedValue({id:'admin-1'});
    expect((await PATCH(request({adminName:'Turkish'}, 'https://evil.example'), params)).status).toBe(403);
  });

  it('strictly validates metadata and immutable codes', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    expect((await PATCH(request({code:'de'}), params)).status).toBe(400);
    expect((await PATCH(request({publish:false}), params)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('updates metadata or publishes with no-store responses', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.update.mockResolvedValue({code:'tr', adminName:'Turkish', nativeName:'Türkçe', direction:'ltr', status:'draft'});
    mocks.publish.mockResolvedValue({code:'tr', adminName:'Turkish', nativeName:'Türkçe', direction:'ltr', status:'published'});
    const updated = await PATCH(request({adminName:'Turkish'}), params);
    expect(updated.status).toBe(200);
    expect(updated.headers.get('cache-control')).toBe('no-store');
    expect(mocks.update).toHaveBeenCalledWith('tr', {adminName:'Turkish'}, 'admin-1');
    const published = await PATCH(request({publish:true}), params);
    expect(published.status).toBe(200);
    expect(mocks.publish).toHaveBeenCalledWith('tr', 'admin-1');
  });

  it('returns a safe unavailable error on persistence failure', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.update.mockRejectedValue(new Error('secret db error'));
    const response = await PATCH(request({nativeName:'Türkçe'}), params);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ok:false, error:'LANGUAGE_UPDATE_UNAVAILABLE'});
  });

  it('maps known language state errors to actionable safe responses', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.publish.mockRejectedValueOnce(new Error('LANGUAGE_NOT_READY')).mockRejectedValueOnce(new Error('LANGUAGE_NOT_FOUND'));
    expect((await PATCH(request({publish:true}), params)).status).toBe(400);
    const missing = await PATCH(request({publish:true}), params);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ok:false, error:'LANGUAGE_NOT_FOUND'});
  });
});
