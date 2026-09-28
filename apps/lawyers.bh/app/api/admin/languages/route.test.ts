import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({admin:vi.fn(), list:vi.fn(), create:vi.fn()}));
vi.mock('@/lib/auth/admin-access', () => ({requireSuperAdmin:mocks.admin}));
vi.mock('@/lib/countries/language-store', () => ({listLanguages:mocks.list, createLanguage:mocks.create}));

import {GET, POST} from './route';

const createRequest = (body:unknown, origin='https://lawyers.bh') => new Request('https://lawyers.bh/api/admin/languages', {
  method:'POST', headers:{origin, 'content-type':'application/json'}, body:JSON.stringify(body),
});

beforeEach(() => vi.resetAllMocks());

describe('/api/admin/languages', () => {
  it('requires super-admin access for reads and writes', async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
    expect((await POST(createRequest({code:'fr', adminName:'French', nativeName:'Français', direction:'ltr'}))).status).toBe(403);
  });

  it('lists languages without caching mutable state', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.list.mockResolvedValue([{code:'ar'}]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ok:true, languages:[{code:'ar'}]});
  });

  it('rejects cross-origin and invalid create requests', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    expect((await POST(createRequest({code:'fr'}, 'https://evil.example'))).status).toBe(403);
    expect((await POST(createRequest({code:'bad_code', adminName:'French', nativeName:'Français', direction:'ltr'}))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('creates a draft language and hides persistence errors', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    const input = {code:'FR', adminName:'French', nativeName:'Français', direction:'ltr'};
    mocks.create.mockResolvedValueOnce({...input, code:'fr', status:'draft'}).mockRejectedValueOnce(new Error('secret db error'));
    const created = await POST(createRequest(input));
    expect(created.status).toBe(201);
    expect(created.headers.get('cache-control')).toBe('no-store');
    expect(mocks.create).toHaveBeenCalledWith({...input, code:'fr'}, 'admin-1');
    expect((await POST(createRequest(input))).status).toBe(503);
  });

  it('reports a duplicate language without exposing database details', async () => {
    mocks.admin.mockResolvedValue({id:'admin-1'});
    mocks.create.mockRejectedValue(Object.assign(new Error('duplicate key secret'), {code:'23505'}));
    const response = await POST(createRequest({code:'fr', adminName:'French', nativeName:'Français', direction:'ltr'}));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ok:false, error:'LANGUAGE_ALREADY_EXISTS'});
  });
});
