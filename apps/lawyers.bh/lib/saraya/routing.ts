const SARAYA_ENTRY_PATHS = new Set([
  "/saraya",
  "/saraya/",
  "/ar/saraya",
  "/ar/saraya/",
  "/en/saraya",
  "/en/saraya/",
]);

export function sarayaRewritePath(host: string, pathname: string): string | null {
  const hostname = host.toLowerCase().split(":", 1)[0];
  if (hostname === "sq.lawyers.bh" && !pathname.startsWith("/saraya/")) {
    if (pathname === "/" || !pathname.split("/").at(-1)?.includes(".")) {
      return "/saraya/index.html";
    }
    return `/saraya${pathname}`;
  }
  return null;
}

export function sarayaRedirectUrl(
  host: string,
  pathname: string,
): string | null {
  const hostname = host.toLowerCase().split(":", 1)[0];
  if (
    (hostname === "lawyers.bh" || hostname === "www.lawyers.bh") &&
    SARAYA_ENTRY_PATHS.has(pathname)
  ) {
    return "https://sq.lawyers.bh";
  }
  return null;
}
