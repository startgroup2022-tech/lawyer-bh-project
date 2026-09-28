import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({admin:vi.fn(), setEnabled:vi.fn()}));
vi.mock('@/lib/auth/admin-access', () => ({requireSuperAdmin:mocks.admin}));
vi.mock('@/lib/countries/platform-activation', () => ({setCountryPlatformEnabled:mocks.setEnabled}));

import {PUT} from './route';

const params = {params:Promise.resolve({code:'bh'})};
const request = (body:unknown, origin='https://lawyers.bh') => new Request('https://lawyers.bh/api/admin/countries/bh/platforms', {
  method:'PUT', headers:{origin, 'content-type':'application/json'}, body:JSON.stringify(body),
});

beforeEach(() => vi.resetAllMocks());

describe('PUT /api/admin/countries/:code/platforms', () => {
  it('requires super-admin access and same-origin', async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await PUT(request({product:'legal_sos', enabled:true}), params)).status).toBe(403);
    mocks.admin.mockResolvedValue({id:'admin-1'});
    expect((await PUT(request({product:'legal_sos', enabled:true}, 'https://evil.example'), params)).status).toBe(403);
  });

  it('accepts canonical products only and rejects unknown keys', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    expect((await PUT(request({product:'app', enabled:true}), params)).status).toBe(400);
    expect((await PUT(request({product:'lawyers', enabled:true, url:'https://example.com'}), params)).status).toBe(400);
    expect((await PUT(request({product:'lawyers', enabled:true}), {params:Promise.resolve({code:'ZZ'})})).status).toBe(400);
    expect(mocks.setEnabled).not.toHaveBeenCalled();
  });

  it('sets one platform state and returns no-store', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.setEnabled.mockResolvedValue({countryCode:'BH', product:'legal_sos', enabled:true, tablesProvisioned:true});
    const response = await PUT(request({product:'legal_sos', enabled:true}), params);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mocks.setEnabled).toHaveBeenCalledWith('BH', 'legal_sos', true);
  });

  it('returns a safe unavailable error on persistence failure', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.setEnabled.mockRejectedValue(new Error('secret db error'));
    const response = await PUT(request({product:'lawyers', enabled:false}), params);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ok:false, error:'COUNTRY_PLATFORM_UNAVAILABLE'});
  });

  it('identifies a missing country without leaking persistence details', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.setEnabled.mockRejectedValue(new Error('COUNTRY_PLATFORM_NOT_FOUND'));
    const response = await PUT(request({product:'lawyers', enabled:false}), params);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ok:false, error:'COUNTRY_NOT_FOUND'});
  });
});
