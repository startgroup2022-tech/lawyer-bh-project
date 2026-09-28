export function isIOSInAppWebView(ua: string): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (!isIOS) return false;
  const hasWebKit = /AppleWebKit/.test(ua);
  const hasSafariToken = /Safari\//.test(ua);
  const hasEmbeddedBrowser = /(CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser)/.test(ua);
  return hasWebKit && !hasSafariToken && !hasEmbeddedBrowser;
}

export function isAndroidInAppWebView(ua: string): boolean {
  const isAndroid = /Android/.test(ua);
  if (!isAndroid) return false;
  return /; wv\)/.test(ua) || /Version\/\d+\.\d+/.test(ua) && !/Chrome\//.test(ua);
}

export function isInAppWebView(ua: string): boolean {
  return isIOSInAppWebView(ua) || isAndroidInAppWebView(ua);
}
