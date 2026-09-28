import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import {
  sarayaRedirectUrl,
  sarayaRewritePath,
} from "./lib/saraya/routing";

const intlMiddleware = createMiddleware(routing);

// =======================
// Dispatch Auth
// =======================

const DISPATCH_PATH = /^\/(en|ar)\/sos\/dispatch(?:\/.*)?$/;
const DISPATCH_LOGIN_PATH = /^\/(en|ar)\/sos\/dispatch\/login\/?$/;
const DISPATCH_COOKIE_NAME = "lbh-dispatch-session";

// =======================
// Admin Auth
// =======================

const ADMIN_PATH = /^\/(en|ar)\/admin(?:\/.*)?$/;
const ADMIN_COOKIE_NAME = "admin_session";

function isCookieSessionValid(req: NextRequest): boolean {
  const v = req.cookies.get(DISPATCH_COOKIE_NAME)?.value;
  if (!v) return false;
  return true;
}

function isAdminSessionValid(req: NextRequest): boolean {
  const v = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!v) return false;

  // ملاحظة:
  // هنا نتحقق فقط أن الكوكي موجودة.
  // التحقق الحقيقي من صلاحية الأدمن لازم يكون داخل صفحات/API الأدمن.
  return true;
}

function checkBasicAuth(req: NextRequest): boolean {
  const userList = process.env.DISPATCH_USERS?.trim();
  const auth = req.headers.get("authorization");

  if (!auth?.toLowerCase().startsWith("basic ")) return false;

  let decoded: string;

  try {
    decoded = atob(auth.slice(6).trim());
  } catch {
    return false;
  }

  const idx = decoded.indexOf(":");
  if (idx < 0) return false;

  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);

  if (userList) {
    return userList
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .some((entry) => {
        const sep = entry.indexOf(":");
        if (sep < 0) return false;

        return entry.slice(0, sep) === user && entry.slice(sep + 1) === pass;
      });
  }

  const expectedUser = process.env.DISPATCH_USERNAME;
  const expectedPass = process.env.DISPATCH_PASSWORD;

  if (!expectedUser || !expectedPass) return false;

  return user === expectedUser && pass === expectedPass;
}

function getLocale(req: NextRequest): "ar" | "en" {
  const localeMatch = req.nextUrl.pathname.match(/^\/(en|ar)(?:\/|$)/);
  return localeMatch?.[1] === "ar" ? "ar" : "en";
}

function redirectToDispatchLogin(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  const next = url.pathname + url.search;
  const locale = getLocale(req);

  url.pathname = `/${locale}/sos/dispatch/login`;
  url.search = `?next=${encodeURIComponent(next)}`;

  return NextResponse.redirect(url);
}

function redirectToAdminLogin(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  const next = url.pathname + url.search;
  const locale = getLocale(req);

  url.pathname = `/${locale}/login/admin`;
  url.search = `?next=${encodeURIComponent(next)}`;

  return NextResponse.redirect(url);
}

export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const sarayaRedirect = sarayaRedirectUrl(
    req.headers.get("host") ?? "",
    path,
  );
  if (sarayaRedirect) {
    return NextResponse.redirect(sarayaRedirect, 308);
  }

  const sarayaPath = sarayaRewritePath(req.headers.get("host") ?? "", path);
  if (sarayaPath) {
    const url = req.nextUrl.clone();
    url.pathname = sarayaPath;
    return NextResponse.rewrite(url);
  }

  if (path.startsWith("/saraya/")) {
    return NextResponse.next();
  }

  // حماية صفحات الأدمن
  if (ADMIN_PATH.test(path)) {
    if (!isAdminSessionValid(req)) {
      return redirectToAdminLogin(req);
    }
  }

  // حماية صفحات dispatch
  if (DISPATCH_PATH.test(path) && !DISPATCH_LOGIN_PATH.test(path)) {
    if (!isCookieSessionValid(req) && !checkBasicAuth(req)) {
      return redirectToDispatchLogin(req);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  // Public files must bypass locale routing. Otherwise `/images/logo.png`
  // becomes `/en/images/logo.png` and every static image returns 404.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
