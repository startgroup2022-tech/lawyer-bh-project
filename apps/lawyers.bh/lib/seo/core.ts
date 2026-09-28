export const SEO_ORIGIN = "https://www.lawyers.bh" as const;

export function absoluteSeoUrl(path: string): string {
  return new URL(path.replace(/^([^/])/, "/$1"), `${SEO_ORIGIN}/`).toString();
}

export function localizedAlternates(path: string) {
  const normalized = path === "/" ? "" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return {
    ar: absoluteSeoUrl(`/ar${normalized}`),
    en: absoluteSeoUrl(`/en${normalized}`),
    "x-default": absoluteSeoUrl(`/en${normalized}`),
  };
}

export function eligiblePublicImageUrl(value: string | null | undefined): string | null {
  const image = String(value ?? "").trim();
  if (!image || image.startsWith("data:") || image.startsWith("blob:")) return null;
  if (image.startsWith("/")) return absoluteSeoUrl(image);
  try {
    const url = new URL(image);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
