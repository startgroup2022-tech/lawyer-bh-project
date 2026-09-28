import { describe, expect, it } from 'vitest';
import { countryCatalog, mergeCountrySettings, visibleCountries, parseCountryPatch, parseCountryProduct } from './catalog';

describe('country availability', () => {
  it('normalizes a country website URL without changing switches', () => {
    expect(parseCountryPatch({lawyersPlatformUrl:'  lawyers.bh  '})).toEqual({lawyersPlatformUrl:'https://lawyers.bh/'});
    expect(parseCountryPatch({lawyersPlatformUrl:'https://example.com/ar'})).toEqual({lawyersPlatformUrl:'https://example.com/ar'});
    expect(parseCountryPatch({lawyersPlatformUrl:''})).toEqual({lawyersPlatformUrl:null});
    expect(parseCountryPatch({lawyersPlatformUrl:null})).toEqual({lawyersPlatformUrl:null});
  });
  it('rejects unsafe or malformed website links', () => {
    for (const websiteUrl of ['javascript:alert(1)', 'http://example.com', '//example.com', 'https://user:pass@example.com', 'not a link', 42, 'https://example.com/'+'a'.repeat(2048)]) {
      expect(() => parseCountryPatch({lawyersPlatformUrl:websiteUrl})).toThrow();
    }
  });
  it('lists all ISO countries without enabling unconfigured countries', () => {
    const all = mergeCountrySettings([], []);
    expect(all).toHaveLength(249);
    expect(new Set(countryCatalog.map(c => c.code)).size).toBe(249);
    expect(all.find(c => c.code === 'BH')?.nameAr).toBe('البحرين');
    expect(visibleCountries(all, 'app')).toEqual([]);
  });
  it('keeps app and website switches independent', () => {
    const all = mergeCountrySettings([
      {code:'BH', appEnabled:true, websiteEnabled:false, backgroundUrl:null},
      {code:'SA', appEnabled:false, websiteEnabled:true, backgroundUrl:null},
    ], []);
    expect(visibleCountries(all, 'app').map(c => c.code)).toEqual(['BH']);
    expect(visibleCountries(all, 'website').map(c => c.code)).toEqual(['SA']);
    expect(all.find(c => c.code === 'BH')?.tablesProvisioned).toBe(false);
  });
  it('exposes canonical platform fields while retaining legacy aliases', () => {
    const all = mergeCountrySettings([{
      code:'BH', appEnabled:true, websiteEnabled:false, backgroundUrl:null,
      legalSosEnabled:true, lawyersPlatformEnabled:false, lawyersPlatformUrl:'https://lawyers.bh/',
      translations:{ar:'البحرين', en:'Bahrain'}, languages:['ar', 'en'],
    }], []);
    const bahrain = all.find(c => c.code === 'BH');
    expect(bahrain).toMatchObject({
      legalSosEnabled:true,
      lawyersPlatformEnabled:false,
      lawyersPlatformUrl:'https://lawyers.bh/',
      appEnabled:true,
      websiteEnabled:false,
      websiteUrl:'https://lawyers.bh/',
      translations:{ar:'البحرين', en:'Bahrain'},
      languages:['ar', 'en'],
    });
    expect(visibleCountries(all, 'legal_sos').map(c => c.code)).toEqual(['BH']);
    expect(visibleCountries(all, 'lawyers')).toEqual([]);
  });
  it('maps legacy channel names only through the compatibility parser', () => {
    expect(parseCountryProduct('lawyers')).toBe('lawyers');
    expect(parseCountryProduct('legal_sos')).toBe('legal_sos');
    expect(parseCountryProduct('website')).toBe('lawyers');
    expect(parseCountryProduct('app')).toBe('legal_sos');
    expect(() => parseCountryProduct('mobile')).toThrow();
  });
  it('does not fall back to legacy activation when explicitly disabled', () => {
    const all = mergeCountrySettings([{code:'BH', appEnabled:false, websiteEnabled:false, backgroundUrl:null}],
      [{code:'BH', isActive:true, tablesProvisioned:true, phoneCode:'+973', currencyCode:'BHD', defaultLocale:'ar'}]);
    expect(visibleCountries(all, 'app')).toEqual([]);
  });
  it('accepts canonical display settings and rejects all activation and URL aliases', () => {
    expect(parseCountryPatch({backgroundUrl:'https://cdn.example/background.webp'})).toEqual({backgroundUrl:'https://cdn.example/background.webp'});
    for (const input of [{}, {appEnabled:false}, {websiteEnabled:true}, {websiteUrl:'https://lawyers.bh'}, {legalSosEnabled:true}, {lawyersPlatformEnabled:true}, {isActive:true}, {backgroundUrl:'http://evil.test'}]) {
      expect(() => parseCountryPatch(input)).toThrow();
    }
  });
});
