import { NextRequest, NextResponse } from "next/server";
import { sosRequestSchema } from "@/lib/sos-schema";

export const runtime = "nodejs";

function backendOrigin() {
  const url = new URL(process.env.LEGAL_SOS_BACKEND_URL?.trim() || "https://www.lawyers.bh");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("LEGAL_SOS_BACKEND_URL must use HTTPS");
  }
  return url.origin;
}

function localeFromRequest(request: Request) {
  const language = (request.headers.get("accept-language") || "").toLowerCase();
  return language.startsWith("ar") ? "ar" : language.startsWith("tr") ? "tr" : "en";
}

function phoneParts(dialCode: string, raw: string) {
  return { phoneCountryCode: dialCode, phone: raw.slice(dialCode.length + 1) };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = sosRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const input = parsed.data;
    const locale = localeFromRequest(request);
    const catalogueResponse = await fetch(
      backendOrigin() + "/api/sos/case-types?countryCode=" + encodeURIComponent(input.country) + "&locale=" + locale,
      { cache: "no-store", headers: { Accept: "application/json" } },
    );
    if (!catalogueResponse.ok) throw new Error("case_catalogue_unavailable");
    const catalogue = await catalogueResponse.json() as { cases?: Array<{ id?: string }> };
    if (!catalogue.cases?.some((entry) => entry.id === input.category)) {
      return NextResponse.json({ ok: false, error: "CASE_UNAVAILABLE" }, { status: 409 });
    }

    const token = request.headers.get("authorization");
    const phone = phoneParts(input.phoneDialCode, input.phone);
    const paymentResponse = await fetch(backendOrigin() + "/api/mobile/tap/payment-session", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify({
        countryCode: input.country,
        caseId: input.category,
        customer: { name: input.name, email: "", ...phone },
        locale,
        idempotencyKey: input.idempotencyKey,
      }),
    });
    const payment = await paymentResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (!paymentResponse.ok || payment.ok !== true) {
      return NextResponse.json(
        { ok: false, error: typeof payment.error === "string" ? payment.error : "PAYMENT_SESSION_FAILED" },
        { status: 502 },
      );
    }

    const requestId = typeof payment.bookingId === "string" ? payment.bookingId :
      typeof payment.requestId === "string" ? payment.requestId : "";
    const accessToken = typeof payment.requestAccessToken === "string" ? payment.requestAccessToken : "";
    if (!/^[0-9a-f-]{36}$/i.test(requestId) || !accessToken) {
      throw new Error("invalid_payment_session");
    }
    if (request.headers.get("x-sos-payment-mode") === "card") {
      const amount = Number(payment.amount);
      if (!Number.isFinite(amount) || amount <= 0 || payment.currency !== "BHD") {
        throw new Error("invalid_payment_amount");
      }
      const result = NextResponse.json({ ok: true, requestId, amount, currency: "BHD" }, {
        headers: { "Cache-Control": "no-store" },
      });
      result.cookies.set("sos_access_" + requestId.replace(/-/g, ""), accessToken, {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return result;
    }
    let transactionUrl = "";
    try {
      const checkoutResponse = await fetch(backendOrigin() + "/api/mobile/tap/web-checkout", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
        body: JSON.stringify({ bookingId: requestId, locale, description: input.description, phoneDialCode: input.phoneDialCode }),
      });
      const checkout = await checkoutResponse.json().catch(() => ({})) as Record<string, unknown>;
      if (checkoutResponse.ok && typeof checkout.transactionUrl === "string") {
        const url = new URL(checkout.transactionUrl);
        if (url.protocol === "https:" && (url.hostname === "tap.company" || url.hostname.endsWith(".tap.company"))) {
          transactionUrl = url.toString();
        }
      }
    } catch (error) {
      console.error("[legal-sos-website/sos] checkout failed", error);
    }
    const result = NextResponse.json(transactionUrl ? { ok: true, requestId, transactionUrl } :
      { ok: false, error: "CHECKOUT_UNAVAILABLE", requestId, checkoutToken: accessToken },
    { status: transactionUrl ? 200 : 502, headers: { "Cache-Control": "no-store" } });
    result.cookies.set("sos_access_" + requestId.replace(/-/g, ""), accessToken, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return result;
  } catch (error) {
    console.error("[legal-sos-website/sos] failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_UNAVAILABLE" }, { status: 502 });
  }
}
