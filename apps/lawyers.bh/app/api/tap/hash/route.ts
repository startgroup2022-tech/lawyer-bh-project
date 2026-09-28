import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

import { getTapMode, getTapSecretKey } from "@/lib/tap/config";
import { resolveTapHashPublicKey } from "@/lib/tap/hash-public-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TapHashBody = {
  amount?: unknown;
  currency?: unknown;
  transactionReference?: unknown;
  postUrl?: unknown;
  publicKey?: unknown;
};

function normalizeAmount(value: unknown): string {
  const parsed =
    typeof value === "string"
      ? Number(value.trim())
      : typeof value === "number"
        ? value
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  // Must match amount.toStringAsFixed(2) in Flutter.
  return parsed.toFixed(2);
}

function normalizeCurrency(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function normalizeReference(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

function normalizePostUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TapHashBody;

    const amount = normalizeAmount(body.amount);
    const currency = normalizeCurrency(body.currency);
    const transactionReference = normalizeReference(
      body.transactionReference,
    );
    const postUrl = normalizePostUrl(body.postUrl);

    if (!amount) {
      return NextResponse.json(
        {
          ok: false,
          error: "Amount is invalid",
        },
        { status: 400 },
      );
    }

    if (currency.length !== 3) {
      return NextResponse.json(
        {
          ok: false,
          error: "Currency is invalid",
        },
        { status: 400 },
      );
    }

    if (!transactionReference) {
      return NextResponse.json(
        {
          ok: false,
          error: "Transaction reference is required",
        },
        { status: 400 },
      );
    }

    const publicKey = resolveTapHashPublicKey(body.publicKey, getTapMode());
    const secretKey = getTapSecretKey();

    const stringToHash =
      `x_publickey${publicKey}` +
      `x_amount${amount}` +
      `x_currency${currency}` +
      `x_transaction${transactionReference}` +
      `x_post${postUrl}`;

    const hashString = createHmac("sha256", secretKey)
      .update(stringToHash, "utf8")
      .digest("hex");

    return NextResponse.json(
      {
        ok: true,
        hashString,
        hashInputs: {
          amount,
          currency,
          transactionReference,
          postUrl,
          publicKeyMode: publicKey.startsWith("pk_test_")
            ? "test"
            : publicKey.startsWith("pk_live_")
              ? "live"
              : "unknown",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate Tap hash";

    console.error("Tap hash generation failed:", message);

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
