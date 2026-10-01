import "server-only";

import { sqlClient } from "@/lib/db/client";

export type AppointmentNotificationKind =
  | "booking_created"
  | "booking_confirmed"
  | "payment_confirmed"
  | "lawyer_accepted"
  | "new_message"
  | "appointment_reminder"
  | "appointment_starting"
  | "appointment_completed"
  | "appointment_cancelled";

export type AppointmentNotificationInput = {
  bookingRequestId: string;
  conversationId?: string | null;
  recipientRole: "client" | "lawyer";
  recipientId: string;
  kind: AppointmentNotificationKind;
  entityId?: string | null;
  deepLink?: string | null;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  /** Idempotency key; the same key never produces a second row. */
  sourceKey: string;
};

export type AppointmentNotificationItem = {
  id: string;
  bookingRequestId: string;
  conversationId: string | null;
  kind: string;
  entityId: string | null;
  deepLink: string | null;
  titleAr: string | null;
  titleEn: string | null;
  bodyAr: string | null;
  bodyEn: string | null;
  createdAt: string;
  readAt: string | null;
};

export type AppointmentNotificationPage = {
  items: AppointmentNotificationItem[];
  unreadCount: number;
  snapshotAt: string;
  nextCursor: { at: string; id: string } | null;
};

type NotificationRow = {
  id: string;
  booking_request_id: string;
  conversation_id: string | null;
  kind: string;
  entity_id: string | null;
  deep_link: string | null;
  title_ar: string | null;
  title_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  created_at: Date | string;
  read_at: Date | string | null;
};

function iso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("invalid_timestamp");
  return date.toISOString();
}

function publicItem(row: NotificationRow): AppointmentNotificationItem {
  return {
    id: row.id,
    bookingRequestId: row.booking_request_id,
    conversationId: row.conversation_id,
    kind: row.kind,
    entityId: row.entity_id,
    deepLink: row.deep_link,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    bodyAr: row.body_ar,
    bodyEn: row.body_en,
    createdAt: iso(row.created_at),
    readAt: row.read_at ? iso(row.read_at) : null,
  };
}

/** Inserts a notification idempotently; returns false when it already existed. */
export async function insertAppointmentNotification(
  input: AppointmentNotificationInput,
): Promise<boolean> {
  const rows = await sqlClient<{ id: string }[]>`
    INSERT INTO public.bahrain_appointment_notifications (
      booking_request_id, conversation_id, recipient_role, recipient_id, kind,
      entity_id, deep_link, title_ar, title_en, body_ar, body_en, source_key
    ) VALUES (
      ${input.bookingRequestId}::uuid, ${input.conversationId ?? null}::uuid,
      ${input.recipientRole}, ${input.recipientId}::uuid, ${input.kind},
      ${input.entityId ?? null}, ${input.deepLink ?? null},
      ${input.titleAr}, ${input.titleEn}, ${input.bodyAr}, ${input.bodyEn}, ${input.sourceKey}
    )
    ON CONFLICT (source_key) DO NOTHING
    RETURNING id::text
  `;
  return rows.length > 0;
}

export async function listAppointmentNotifications(input: {
  recipientRole: "client" | "lawyer";
  recipientId: string;
  filter: "all" | "unread";
  limit?: number;
  cursorAt?: string | null;
  cursorId?: string | null;
}): Promise<AppointmentNotificationPage> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const cursorAt = input.cursorAt ?? null;
  const cursorId = input.cursorId ?? null;
  const useCursor =
    cursorAt !== null &&
    cursorId !== null &&
    /^[0-9a-f-]{36}$/i.test(cursorId) &&
    !Number.isNaN(Date.parse(cursorAt));

  const [clock] = await sqlClient<{ snapshot: Date }[]>`
    SELECT date_trunc('milliseconds', clock_timestamp()) AS snapshot
  `;
  const snapshotAt = iso(clock.snapshot);

  let rows: NotificationRow[];
  if (useCursor) {
    rows = await sqlClient<NotificationRow[]>`
      SELECT id::text, booking_request_id::text, conversation_id::text, kind, entity_id, deep_link,
             title_ar, title_en, body_ar, body_en, created_at, read_at
      FROM public.bahrain_appointment_notifications
      WHERE recipient_role = ${input.recipientRole}
        AND recipient_id = ${input.recipientId}::uuid
        AND (${input.filter} = 'all' OR read_at IS NULL)
        AND (created_at, id) < (${new Date(cursorAt as string)}::timestamptz, ${cursorId}::uuid)
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await sqlClient<NotificationRow[]>`
      SELECT id::text, booking_request_id::text, conversation_id::text, kind, entity_id, deep_link,
             title_ar, title_en, body_ar, body_en, created_at, read_at
      FROM public.bahrain_appointment_notifications
      WHERE recipient_role = ${input.recipientRole}
        AND recipient_id = ${input.recipientId}::uuid
        AND (${input.filter} = 'all' OR read_at IS NULL)
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
    `;
  }

  const [unread] = await sqlClient<{ n: number }[]>`
    SELECT count(*)::int AS n FROM public.bahrain_appointment_notifications
    WHERE recipient_role = ${input.recipientRole}
      AND recipient_id = ${input.recipientId}::uuid AND read_at IS NULL
  `;

  const last = rows.at(-1);
  return {
    items: rows.map(publicItem),
    unreadCount: unread?.n ?? 0,
    snapshotAt,
    nextCursor:
      rows.length === limit && last
        ? { at: iso(last.created_at), id: last.id }
        : null,
  };
}

export async function markAppointmentNotificationsRead(input: {
  recipientRole: "client" | "lawyer";
  recipientId: string;
  readId?: string | null;
  readThrough?: string | null;
}): Promise<number> {
  const rows = await sqlClient<{ id: string }[]>`
    UPDATE public.bahrain_appointment_notifications
    SET read_at = clock_timestamp()
    WHERE recipient_role = ${input.recipientRole}
      AND recipient_id = ${input.recipientId}::uuid
      AND read_at IS NULL
      AND (
        id = ${input.readId ?? null}::uuid
        OR (${input.readThrough ?? null}::timestamptz IS NOT NULL
            AND created_at <= ${input.readThrough ?? null}::timestamptz)
      )
    RETURNING id::text
  `;
  return rows.length;
}
