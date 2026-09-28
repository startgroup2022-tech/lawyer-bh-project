import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeCountrySettings } from '@/lib/countries/catalog';
const load = vi.hoisted(() => vi.fn());
vi.mock('@/lib/countries/store', () => ({loadManagedCountries:load}));
import { GET } from './route';
describe('public countries API', () => {
  beforeEach(() => load.mockReset());

  it('filters by canonical product and exposes language, readiness, and legacy fields', async () => {
    load.mockResolvedValue(mergeCountrySettings([
      {
        code:'BH', appEnabled:true, websiteEnabled:false, backgroundUrl:null,
        legalSosEnabled:true, lawyersPlatformEnabled:false,
        translations:{ar:'البحرين',en:'Bahrain',tr:'Bahreyn',fr:'Bahreïn'}, languages:['ar','en','tr'],
      },
    ], [{code:'BH',isActive:true,tablesProvisioned:true,phoneCode:'+973',currencyCode:'BHD',defaultLocale:'ar'}]));

    const response = await GET(new Request('https://lawyers.bh/api/countries?product=legal_sos'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(payload.countries).toHaveLength(1);
    expect(payload.countries[0]).toMatchObject({
      code:'BH',
      translations:{ar:'البحرين',en:'Bahrain',tr:'Bahreyn'},
      enabledLanguages:['ar','en','tr'],
      defaultLanguage:'ar',
      legalSosEnabled:true,
      lawyersPlatformEnabled:false,
      tablesProvisioned:true,
      servicesActive:true,
      nameAr:'البحرين',
      nameEn:'Bahrain',
      appEnabled:true,
      websiteEnabled:false,
    });
    expect(payload.countries[0].translations).not.toHaveProperty('fr');
  });

  it.each([
    ['product=lawyers', []],
    ['channel=website', []],
    ['channel=app', ['BH']],
  ])('supports canonical and temporary compatibility query %s', async (query, expected) => {
    load.mockResolvedValue(mergeCountrySettings([{code:'BH',appEnabled:true,websiteEnabled:false,backgroundUrl:null}], []));
    const response = await GET(new Request(`https://lawyers.bh/api/countries?${query}`));
    expect((await response.json()).countries.map((country:{code:string}) => country.code)).toEqual(expected);
  });

  it('accepts matching product and channel aliases', async () => {
    load.mockResolvedValue(mergeCountrySettings([{code:'BH',appEnabled:true,websiteEnabled:false,backgroundUrl:null}], []));
    const response = await GET(new Request('https://lawyers.bh/api/countries?product=legal_sos&channel=app'));
    expect(response.status).toBe(200);
  });

  it.each([
    'product=lawyers&channel=app',
    'product=legal_sos&channel=website',
    'product=app',
    'product=invalid',
    'channel=invalid',
    'product=lawyers&product=lawyers',
    'product=lawyers&product=invalid',
    'channel=app&channel=app',
    'channel=app&channel=website',
  ])('rejects invalid or conflicting selectors: %s', async (query) => {
    load.mockResolvedValue([]);
    const response = await GET(new Request(`https://lawyers.bh/api/countries?${query}`));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(load).not.toHaveBeenCalled();
  });

  it('fails closed when settings are unavailable', async () => {
    load.mockImplementationOnce(async () => { throw new Error('offline'); });
    const response = await GET(new Request('https://lawyers.bh/api/countries?product=legal_sos'));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await response.json()).countries).toEqual([]);
  });
});

it('returns the trusted catalogue for lawyer registration regardless of service activation', async () => {
  load.mockResolvedValue(mergeCountrySettings([], []));

  const response = await GET(new Request('https://lawyers.bh/api/countries?channel=registration'));
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.countries).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: 'BH', servicesActive: false }),
    expect.objectContaining({ code: 'TR', servicesActive: false }),
    expect.objectContaining({ code: 'US', servicesActive: false }),
  ]));
});
