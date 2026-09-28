import { ar } from "./translations/ar";
import { en } from "./translations/en";
import { tr } from "./translations/tr";

export const locales = ["ar", "en", "tr"] as const;
export type Locale = (typeof locales)[number];

type DeepWiden<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly DeepWiden<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepWiden<T[K]> }
      : T;

export type Dictionary = DeepWiden<typeof ar>;

const dictionaries: Record<Locale, Dictionary> = { ar, en, tr };

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
