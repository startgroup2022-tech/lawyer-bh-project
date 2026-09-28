type AnyJson = Record<string, unknown>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function backendOrigin(): string {
  const configured = process.env.LEGAL_SOS_BACKEND_URL?.trim() || "https://www.lawyers.bh";
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("LEGAL_SOS_BACKEND_URL must use HTTPS");
  }
  return url.origin;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown): number {
  if (typeof value !== "number") return 0;
  return Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestId = toText(url.searchParams.get("requestId"));
  const requestAccessToken = toText(url.searchParams.get("requestAccessToken"));

  if (!isUuid(requestId) || !requestAccessToken) {
    return Response.json(
      { ok: false, error: "Missing or invalid requestId / requestAccessToken" },
      { status: 400 },
    );
  }

  try {
    const paymentResponse = await fetch(
      `${backendOrigin()}/api/mobile/tap/payment-status?bookingId=${encodeURIComponent(requestId)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${requestAccessToken}`,
        },
      },
    );

    const paymentBody = (await paymentResponse.json().catch(() => ({}))) as AnyJson;
    if (!paymentResponse.ok) {
      const reason =
        typeof paymentBody.error === "string" && paymentBody.error.trim() ? paymentBody.error : "Payment status lookup failed";
      return Response.json({ ok: false, error: reason }, { status: 502 });
    }

    const result = {
      ok: true,
      requestId,
      bookingId: requestId,
      paymentStatus: toText(paymentBody.paymentStatus),
      tapStatus: toText(paymentBody.tapStatus),
      dispatchToken: toText(paymentBody.dispatchToken),
      chargeId: toText(paymentBody.chargeId),
      invoiceNumber: toText(paymentBody.invoiceNumber),
      amount: toNumber(paymentBody.amount),
      currency: toText(paymentBody.currency),
    };

    const dispatchToken = isUuid(result.dispatchToken)
      ? result.dispatchToken
      : "";

    if (!dispatchToken) {
      return Response.json({
        ...result,
        serviceStatus: "",
        dispatchState: "",
        requestReference: "",
        lawyerName: "",
      });
    }

    const requestResponse = await fetch(
      `${backendOrigin()}/api/mobile/sos/requests/${encodeURIComponent(requestId)}/status`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${dispatchToken}`,
        },
      },
    );

    const requestBody = asRecord(await requestResponse.json().catch(() => ({})));
    if (!requestResponse.ok) {
      return Response.json({
        ...result,
        serviceStatus: "",
        dispatchState: "",
        requestReference: "",
        lawyerName: "",
      });
    }

    const acceptedLawyer = asRecord(requestBody.acceptedLawyer);
    const candidate = asRecord(requestBody.candidate);

    return Response.json({
      ...result,
      serviceStatus: toText(requestBody.serviceStatus),
      dispatchState: toText(requestBody.state),
      requestReference: toText(requestBody.requestReference),
      lawyerName: toText(acceptedLawyer.name ?? candidate.name),
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Unable to track request" },
      { status: 502 },
    );
  }
}
