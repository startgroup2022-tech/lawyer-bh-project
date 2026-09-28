import { NextResponse } from "next/server";
import { sendAdminMobileNotification } from "@/lib/admin/mobile-notifications/sender";
import { mobileNotificationStore } from "@/lib/admin/mobile-notifications/store";
import { notificationAudiences, type NotificationAudience } from "@/lib/admin/mobile-notifications/types";
import { parseMobileNotificationInput } from "@/lib/admin/mobile-notifications/validation";
import { requireAdminPermission } from "@/lib/auth/admin-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdminPermission("manage_notifications"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const requested = new URL(request.url).searchParams.get("audience");
  if (!notificationAudiences.includes(requested as NotificationAudience)) {
    return NextResponse.json({ error: "invalid_audience" }, { status: 400 });
  }
  const audience = requested as NotificationAudience;
  const [count, history] = await Promise.all([
    mobileNotificationStore.countAudience(audience),
    mobileNotificationStore.recentSends(20),
  ]);
  return NextResponse.json({ audience, count, history: history.map((item) => ({
    id: item.id, audience: item.audience, state: item.state, titleAr: item.titleAr, titleEn: item.titleEn,
    targeted: item.targeted, successful: item.successful, failed: item.failed, pruned: item.pruned, createdAt: item.createdAt,
  })) });
}

export async function POST(request: Request) {
  const admin = await requireAdminPermission("manage_notifications");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = parseMobileNotificationInput(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const result = await sendAdminMobileNotification({ ...parsed.value, adminId: admin.id });
    return NextResponse.json({
      id: result.id, state: result.state, audience: result.audience, targeted: result.targeted,
      successful: result.successful, failed: result.failed, pruned: result.pruned,
    });
  } catch {
    return NextResponse.json({ error: "notification_send_failed" }, { status: 500 });
  }
}
