import { NextResponse } from "next/server";
import { DiscountError } from "@/lib/discounts/service";
import { loadDiscountQuote } from "@/lib/discounts/repository";
import { resolveOriginalPrice } from "@/lib/discounts/resolve-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, errorCode: "invalid_request" }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const price = await resolveOriginalPrice(data);
    const quote = await loadDiscountQuote({ code: data.discountCode, email: data.email, originalFils: price.originalFils });
    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    const errorCode = error instanceof DiscountError ? error.code : "invalid_request";
    return NextResponse.json({ ok: false, errorCode }, { status: 400 });
  }
}
