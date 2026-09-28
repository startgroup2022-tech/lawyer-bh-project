import { describe, expect, it } from 'vitest';
import {
  SOURCE_CONTROLLED_PUBLIC_LOCALES,
  languageReadiness,
  parseCountryLanguageUpdate,
  parseLanguageCreate,
  parseLanguageUpdate,
} from './languages';

describe('language domain validation', () => {
  it('distinguishes catalogue metadata from source-controlled public interface readiness', () => {
    expect(SOURCE_CONTROLLED_PUBLIC_LOCALES).toEqual(['ar', 'en', 'tr']);
    expect(languageReadiness({code:'fr', adminName:'French', nativeName:'Français', direction:'ltr'}))
      .toEqual({catalogueReady:true, fullInterfaceReady:false});
    for (const code of ['ar', 'en', 'tr']) {
      expect(languageReadiness({code, adminName:code, nativeName:code, direction:code === 'ar' ? 'rtl' : 'ltr'}))
        .toEqual({catalogueReady:true, fullInterfaceReady:true});
    }
  });

  it('does not mark incomplete metadata as catalogue or interface ready', () => {
    expect(languageReadiness({code:'ar', adminName:'Arabic', nativeName:'', direction:'rtl'}))
      .toEqual({catalogueReady:false, fullInterfaceReady:false});
  });

  it('normalizes a valid language and always creates it as a draft', () => {
    expect(parseLanguageCreate({
      code: 'TR',
      adminName: ' Turkish ',
      nativeName: ' Türkçe ',
      direction: 'ltr',
    })).toEqual({
      code: 'tr',
      adminName: 'Turkish',
      nativeName: 'Türkçe',
      direction: 'ltr',
      status: 'draft',
    });
  });

  it('rejects invalid codes, unknown fields, and caller-controlled publication', () => {
    expect(() => parseLanguageCreate({code:'bad_code', adminName:'x', nativeName:'x', direction:'ltr'})).toThrow();
    expect(() => parseLanguageCreate({code:'tr', adminName:'x', nativeName:'x', direction:'ltr', extra:true})).toThrow();
    expect(() => parseLanguageCreate({code:'tr', adminName:'x', nativeName:'x', direction:'ltr', status:'published'})).toThrow();
  });

  it('updates only mutable language metadata', () => {
    expect(parseLanguageUpdate({adminName:' Turkish ', nativeName:' Türkçe ', direction:'ltr'}))
      .toEqual({adminName:'Turkish', nativeName:'Türkçe', direction:'ltr'});
    expect(() => parseLanguageUpdate({code:'tr'})).toThrow();
    expect(() => parseLanguageUpdate({status:'published'})).toThrow();
    expect(() => parseLanguageUpdate({status:'draft'})).toThrow();
    expect(() => parseLanguageUpdate({})).toThrow();
  });

  it('normalizes a country language selection and requires its default to be enabled', () => {
    expect(parseCountryLanguageUpdate({
      enabledLanguages: ['AR', 'en'],
      defaultLanguage: 'AR',
      translations: {AR:' البحرين ', en:' Bahrain '},
    })).toEqual({
      enabledLanguages: ['ar', 'en'],
      defaultLanguage: 'ar',
      translations: {ar:'البحرين', en:'Bahrain'},
    });
    expect(() => parseCountryLanguageUpdate({enabledLanguages:['ar'], defaultLanguage:'en', translations:{ar:'البحرين'}})).toThrow();
  });

  it('rejects duplicate, missing, and unexpected country language values', () => {
    expect(() => parseCountryLanguageUpdate({enabledLanguages:['ar', 'AR'], defaultLanguage:'ar', translations:{ar:'البحرين'}})).toThrow();
    expect(() => parseCountryLanguageUpdate({enabledLanguages:[], defaultLanguage:'ar', translations:{}})).toThrow();
    expect(() => parseCountryLanguageUpdate({enabledLanguages:['ar'], defaultLanguage:'ar', translations:{ar:' '}})).toThrow();
    expect(() => parseCountryLanguageUpdate({enabledLanguages:['ar'], defaultLanguage:'ar', translations:{ar:'البحرين'}, extra:true})).toThrow();
  });
});
