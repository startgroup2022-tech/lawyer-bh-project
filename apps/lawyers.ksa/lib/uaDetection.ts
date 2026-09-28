export function isIOSInAppWebView(ua: string): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (!isIOS) return false;
  const hasWebKit = /AppleWebKit/.test(ua);
  const hasSafariToken = /Safari\//.test(ua);
  const hasEmbeddedBrowser = /(CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser)/.test(ua);
  return hasWebKit && !hasSafariToken && !hasEmbeddedBrowser;
}
