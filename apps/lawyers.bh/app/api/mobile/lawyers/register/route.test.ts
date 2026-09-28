import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
  const country = {
    code: 'TR',
    tablePrefix: 'turkey',
    nameAr: 'تركيا',
    nameEn: 'Turkey',
    currencyCode: 'TRY',
    defaultLocale: 'tr',
  };
  return {
    closed: false,
    incomplete: false,
    queryIndex: 0,
    country,
    ensureCountry: vi.fn(async () => country),
  };
});
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => {
  const sqlClient = Object.assign(
    vi.fn(async (first: unknown) => {
      if (typeof first === 'string') return first;
      if (!state.incomplete) return state.closed ? [{ id: 'closed' }] : [];
      state.queryIndex += 1;
      if (state.queryIndex === 1) return [];
      if (state.queryIndex === 2) return [{ id: '22222222-2222-4222-8222-222222222222' }];
      return [];
    }),
    { json: vi.fn((value: unknown) => value) },
  );
  return { sqlClient };
});
vi.mock('@/lib/db/country-tables', () => ({
  buildCountryTableSet: vi.fn(() => ({ lawyers: 'turkey_lawyers' })),
  ensureCountryProvisionedForRegistration: state.ensureCountry,
  getActiveCountry: vi.fn(),
}));
vi.mock('@/lib/postmark', () => ({ isEmail: vi.fn(() => true) }));
vi.mock('@vercel/blob', () => ({ put: vi.fn(async () => ({ url: 'https://blob.test/profile.png', pathname: 'profile.png' })) }));
vi.mock('../../../join/route', () => ({ submitJoinApplication: async () => Response.json({ id: '11111111-1111-4111-8111-111111111111', countryCode: 'BH' }, { status: 201 }) }));
import { POST } from './route';

beforeEach(() => {
  state.closed = false;
  state.incomplete = false;
  state.queryIndex = 0;
  state.ensureCountry.mockClear();
});
function registration() {
  const body = new FormData();
  for (const field of ['licenseFile', 'ibanCertificateFile', 'personalIdFile']) {
    body.set(field, new File(['test'], 'test.png', { type: 'image/png' }));
  }
  body.set('signatureDataUrl', 'data:image/png;base64,dGVzdA==');
  return new Request('https://example.test/api/mobile/lawyers/register', { method: 'POST', body });
}
it('issues an app token for an open full-registration result', async () => {
  const response = await POST(registration());
  expect(response.status).toBe(201);
  expect((await response.json()).token).toEqual(expect.any(String));
});
it('does not issue an app token when the resulting app identity is closed', async () => {
  state.closed = true;
  const response = await POST(registration());
  expect(response.status).toBe(403);
  expect((await response.json()).token).toBeUndefined();
});

it('provisions the selected country and accepts an initial profile without specialties', async () => {
  state.incomplete = true;
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  const body = new FormData();
  const fields: Record<string, string> = {
    countryCode: 'TR',
    fullNameAr: 'محامي تجريبي',
    fullNameEn: 'Test Lawyer',
    phone: '+905551234567',
    email: 'lawyer@example.test',
    password: 'Test1234',
    confirmPassword: 'Test1234',
    licenseNumber: 'TR-123',
    registrationLevel: 'lawyer',
    licenseExpiryDate: '2030-01-01',
    ibanNumber: 'TR000000000000000000000000',
    language: 'Turkish',
    workingHours: '09:00-17:00',
    experienceYears: '5',
  };
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  body.set('profileImage', new File(['image'], 'profile.png', { type: 'image/png' }));

  const response = await POST(new Request('https://example.test/register', {
    method: 'POST',
    body,
  }));

  expect(response.status).toBe(201);
  expect(state.ensureCountry).toHaveBeenCalledWith('TR');
});
