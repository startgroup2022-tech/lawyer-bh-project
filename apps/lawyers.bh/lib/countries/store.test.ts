import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ execute: vi.fn(), insert: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => ({
  db: { execute: mocks.execute, insert: mocks.insert },
  schema: { countryChannelSettings: { code: 'code' } },
}));

import { loadManagedCountries, saveCountrySettings } from './store';

describe('managed country loading', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mirrors legacy writes to canonical fields including false without touching unrelated fields', async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    mocks.insert.mockReturnValue({ values });

    await saveCountrySettings('BH', { appEnabled: false, websiteEnabled: true, websiteUrl: 'https://lawyers.bh' });

    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      code: 'BH', appEnabled: false, legalSosEnabled: false,
      websiteEnabled: true, lawyersPlatformEnabled: true,
      websiteUrl: 'https://lawyers.bh', lawyersPlatformUrl: 'https://lawyers.bh',
    }));
    const update = onConflictDoUpdate.mock.calls[0]?.[0]?.set;
    expect(update).toMatchObject({ appEnabled: false, legalSosEnabled: false, websiteEnabled: true, lawyersPlatformEnabled: true });
    expect(update).not.toHaveProperty('backgroundUrl');
  });

  it('assembles translations and language memberships with compatibility aliases', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ code: 'BH', appEnabled: false, websiteEnabled: false, legalSosEnabled: true, lawyersPlatformEnabled: true, lawyersPlatformUrl: 'https://lawyers.bh', backgroundUrl: null }])
      .mockResolvedValueOnce([{ code: 'BH', isActive: true, tablesProvisioned: true, phoneCode: '+973', currencyCode: 'BHD', defaultLocale: 'tr' }])
      .mockResolvedValueOnce([{ countryCode: 'BH', languageCode: 'ar', name: 'البحرين' }, { countryCode: 'BH', languageCode: 'tr', name: 'Bahreyn' }])
      .mockResolvedValueOnce([{ countryCode: 'BH', languageCode: 'ar', isDefault: true }, { countryCode: 'BH', languageCode: 'tr', isDefault: false }]);

    const country = (await loadManagedCountries()).find(item => item.code === 'BH');
    expect(country).toMatchObject({
      translations: { ar: 'البحرين', tr: 'Bahreyn' }, languages: ['ar', 'tr'], defaultLocale: 'tr',
      legalSosEnabled: true, lawyersPlatformEnabled: true,
      appEnabled: true, websiteEnabled: true, websiteUrl: 'https://lawyers.bh',
    });
    expect(mocks.execute).toHaveBeenCalledTimes(4);
  });

  it('keeps normalized names and languages for countries without channel settings', async () => {
    mocks.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ code: 'SA', isActive: false, tablesProvisioned: false, phoneCode: '+966', currencyCode: 'SAR', defaultLocale: 'ar' }])
      .mockResolvedValueOnce([{ countryCode: 'SA', languageCode: 'ar', name: 'السعودية' }])
      .mockResolvedValueOnce([{ countryCode: 'SA', languageCode: 'ar', isDefault: true }]);
    const country = (await loadManagedCountries()).find(item => item.code === 'SA');
    expect(country).toMatchObject({ translations: { ar: 'السعودية' }, languages: ['ar'] });
  });

  it('persists appearance fields without touching the activation flags', async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    mocks.insert.mockReturnValue({ values });

    await saveCountrySettings('BH', { backgroundUrl: 'https://cdn.example/bg.webp', backgroundOpacity: 70, backgroundOverlayOpacity: 20, backgroundColor: '#F5F4F1' });

    expect(values).toHaveBeenCalledWith({
      code: 'BH', backgroundUrl: 'https://cdn.example/bg.webp', backgroundOpacity: 70, backgroundOverlayOpacity: 20, backgroundColor: '#F5F4F1',
    });
    const update = onConflictDoUpdate.mock.calls[0]?.[0]?.set;
    expect(update).toMatchObject({ backgroundUrl: 'https://cdn.example/bg.webp', backgroundOpacity: 70, backgroundOverlayOpacity: 20, backgroundColor: '#F5F4F1' });
    expect(update).not.toHaveProperty('appEnabled');
  });

  it('clears the background with an explicit null so the app falls back to the default', async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    mocks.insert.mockReturnValue({ values });

    await saveCountrySettings('BH', { backgroundUrl: null });

    expect(values).toHaveBeenCalledWith({ code: 'BH', backgroundUrl: null });
    expect(onConflictDoUpdate.mock.calls[0]?.[0]?.set).toMatchObject({ backgroundUrl: null });
  });

  it('reads appearance columns back into the managed country', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ code: 'BH', backgroundUrl: 'https://cdn.example/bg.webp', backgroundOpacity: 45, backgroundOverlayOpacity: 15, backgroundColor: '#082B67' }])
      .mockResolvedValueOnce([{ code: 'BH', isActive: true, tablesProvisioned: true, phoneCode: '+973', currencyCode: 'BHD', defaultLocale: 'ar' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const country = (await loadManagedCountries()).find(item => item.code === 'BH');
    expect(country).toMatchObject({
      backgroundUrl: 'https://cdn.example/bg.webp', backgroundOpacity: 45, backgroundOverlayOpacity: 15, backgroundColor: '#082B67',
    });
  });
});
