import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => ({
  db: { transaction: mocks.transaction, execute: mocks.execute },
}));

import {
  createLanguage,
  publishLanguage,
  saveCountryLanguages,
  updateLanguage,
} from './language-store';

describe('language persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async work => work({ execute: mocks.execute }));
  });

  it('creates normalized draft languages and never accepts a code update', async () => {
    mocks.execute.mockResolvedValueOnce([{ code: 'fr', adminName: 'French', nativeName: 'Français', direction: 'ltr', status: 'draft' }]);
    await expect(createLanguage({ code: 'FR', adminName: 'French', nativeName: 'Français', direction: 'ltr' }, '00000000-0000-0000-0000-000000000001'))
      .resolves.toMatchObject({ code: 'fr', status: 'draft' });
    await expect(updateLanguage('fr', { code: 'de' } as never, '00000000-0000-0000-0000-000000000001')).rejects.toThrow('Invalid language update field');
  });

  it('blocks publication when required labels are not ready', async () => {
    mocks.transaction.mockImplementationOnce(async work => work({
      execute: vi.fn().mockResolvedValueOnce([{ code: 'tr', adminName: '', nativeName: 'Türkçe', direction: 'ltr', status: 'draft' }]),
    }));
    await expect(publishLanguage('tr', '00000000-0000-0000-0000-000000000001')).rejects.toThrow('LANGUAGE_NOT_READY');
  });

  it('saves memberships, one default, and translations in one transaction', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ code: 'BH' }])
      .mockResolvedValueOnce([{ code: 'ar', status: 'published' }, { code: 'tr', status: 'published' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(saveCountryLanguages('BH', {
      enabledLanguages: ['ar', 'tr'],
      defaultLanguage: 'ar',
      translations: { ar: 'البحرين', tr: 'Bahreyn' },
    })).resolves.toEqual({
      countryCode: 'BH', enabledLanguages: ['ar', 'tr'], defaultLanguage: 'ar', translations: { ar: 'البحرين', tr: 'Bahreyn' },
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.execute).toHaveBeenCalledTimes(7);
  });

  it('rejects enabling draft languages before changing memberships', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ code: 'BH' }])
      .mockResolvedValueOnce([{ code: 'ar', status: 'published' }, { code: 'tr', status: 'draft' }]);
    await expect(saveCountryLanguages('BH', {
      enabledLanguages: ['ar', 'tr'], defaultLanguage: 'ar', translations: { ar: 'البحرين', tr: 'Bahreyn' },
    })).rejects.toThrow('LANGUAGE_NOT_PUBLISHED');
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
});
