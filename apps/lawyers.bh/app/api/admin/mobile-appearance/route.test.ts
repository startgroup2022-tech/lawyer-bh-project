import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({admin:vi.fn(), load:vi.fn(), save:vi.fn()}));
vi.mock('@/lib/auth/admin-access', () => ({requireSuperAdmin:mocks.admin}));
vi.mock('@/lib/countries/store', () => ({loadManagedCountries:mocks.load, saveCountrySettings:mocks.save}));
import { GET, PATCH } from './route';
beforeEach(() => { vi.resetAllMocks(); });

const patch = (body:unknown, origin = 'https://lawyers.bh') => PATCH(new Request('https://lawyers.bh/api/admin/mobile-appearance', {
  method:'PATCH', headers:{origin,'content-type':'application/json'}, body:JSON.stringify(body),
}));

it('saves opacity and colour, normalizing the colour to upper-case hex', async () => {
  mocks.admin.mockResolvedValue({id:'admin'});
  const response = await patch({code:'BH', backgroundOpacity:60, backgroundOverlayOpacity:15, backgroundColor:'#f5f4f1'});
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.save).toHaveBeenCalledWith('BH', {backgroundOpacity:60, backgroundOverlayOpacity:15, backgroundColor:'#F5F4F1'});
});

it('clears the background when the URL is set to null', async () => {
  mocks.admin.mockResolvedValue({id:'admin'});
  expect((await patch({code:'BH', backgroundUrl:null})).status).toBe(200);
  expect(mocks.save).toHaveBeenCalledWith('BH', {backgroundUrl:null});
});

it('blocks non-admin and cross-origin writes', async () => {
  mocks.admin.mockResolvedValue(null);
  expect((await patch({code:'BH', backgroundOpacity:50})).status).toBe(403);
  mocks.admin.mockResolvedValue({id:'admin'});
  expect((await patch({code:'BH', backgroundOpacity:50}, 'https://evil.example')).status).toBe(403);
  expect(mocks.save).not.toHaveBeenCalled();
});

it('rejects unknown countries and out-of-range values without saving', async () => {
  mocks.admin.mockResolvedValue({id:'admin'});
  expect((await patch({code:'ZZ', backgroundOpacity:50})).status).toBe(400);
  expect((await patch({code:'BH', backgroundOpacity:150})).status).toBe(400);
  expect((await patch({code:'BH', backgroundColor:'red'})).status).toBe(400);
  expect(mocks.save).not.toHaveBeenCalled();
});

it('lists countries with their appearance fields, hiding unprovisioned ones without a background', async () => {
  mocks.admin.mockResolvedValue({id:'admin'});
  mocks.load.mockResolvedValue([
    {code:'BH', nameAr:'البحرين', nameEn:'Bahrain', backgroundUrl:'https://cdn.example/bg.webp', backgroundOpacity:70, backgroundOverlayOpacity:10, backgroundColor:'#082B67', tablesProvisioned:true},
    {code:'SA', nameAr:'السعودية', nameEn:'Saudi Arabia', backgroundUrl:null, backgroundOpacity:100, backgroundOverlayOpacity:0, backgroundColor:null, tablesProvisioned:false},
  ]);
  const payload = await (await GET()).json();
  expect(payload.countries).toHaveLength(1);
  expect(payload.countries[0]).toMatchObject({code:'BH', backgroundOpacity:70, backgroundColor:'#082B67'});
});
