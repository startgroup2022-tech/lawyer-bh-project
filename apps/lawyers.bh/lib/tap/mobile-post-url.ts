export function resolveMobileTapPostUrl(input: {
  configuredPostUrl: string;
  siteUrl: string;
}): string {
  const configuredPostUrl = input.configuredPostUrl.trim();

  if (configuredPostUrl) {
    return configuredPostUrl;
  }

  const siteUrl = input.siteUrl.trim().replace(/\/+$/, "");

  return siteUrl ? `${siteUrl}/api/tap/webhook` : "";
}
