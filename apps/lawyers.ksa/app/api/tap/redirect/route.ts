import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tapId = url.searchParams.get("tap_id") ?? "";

  return new NextResponse(
    `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tap Payment</title>
  <style>
    body{font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f7f9;color:#172033}
    main{background:white;padding:28px;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.08);text-align:center;max-width:420px}
    code{display:block;margin-top:12px;direction:ltr;word-break:break-all}
  </style>
</head>
<body>
  <main>
    <h1>تم الرجوع من بوابة الدفع</h1>
    <p>يمكنك العودة إلى التطبيق لإكمال التحقق من العملية.</p>
    ${tapId ? `<code>${tapId}</code>` : ""}
  </main>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
