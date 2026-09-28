import { NextResponse } from "next/server";

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      to?: string;
      subject?: string;
      html?: string;
      text?: string;
    };

    const to = cleanText(body.to);
    const subject = cleanText(body.subject) ||
      "دعوة لاستكمال الملف الشخصي على منصة محامون البحرين";
    const html = cleanText(body.html);
    const text = cleanText(body.text);

    if (!isValidEmailAddress(to)) {
      return NextResponse.json(
        { ok: false, error: "Invalid recipient email" },
        { status: 400 },
      );
    }

    if (!html) {
      return NextResponse.json(
        { ok: false, error: "Missing HTML email body" },
        { status: 400 },
      );
    }

    const token =
      process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_API_TOKEN;
    const from =
      process.env.POSTMARK_FROM_EMAIL ||
      process.env.POSTMARK_FROM ||
      "info@lawyers.bh";

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "POSTMARK_SERVER_TOKEN is missing. Add it to .env.local to send HTML emails.",
        },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: from,
        To: to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text || "يرجى استكمال الملف الشخصي على منصة محامون البحرين.",
        MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: `Postmark email failed: ${response.status} ${errorBody}`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Could not send email",
      },
      { status: 500 },
    );
  }
}
