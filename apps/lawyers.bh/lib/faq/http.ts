import { NextResponse } from "next/server";
import { FaqDomainError } from "./types";

export function faqErrorResponse(error: unknown) {
  if (error instanceof FaqDomainError) return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  if (error instanceof Error && /duplicate key|unique constraint/i.test(error.message)) return NextResponse.json({ ok: false, error: "duplicate_key" }, { status: 409 });
  return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
}
