import "server-only";

import { sqlClient } from "@/lib/db/client";

import type { AppointmentCommunicationParticipant } from "./access";

export type AppointmentMessage = {
  id: string;
  senderRole: "client" | "lawyer";
  body: string;
  createdAt: string;
  readAt: string | null;
};

type MessageRow = {
  id: string;
  sender_role: "client" | "lawyer";
  body: string;
  created_at: Date | string;
  read_at: Date | string | null;
};

function iso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("invalid_timestamp");
  return date.toISOString();
}

function publicMessage(row: MessageRow): AppointmentMessage {
  return {
    id: row.id,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: iso(row.created_at),
    readAt: row.read_at ? iso(row.read_at) : null,
  };
}

export async function listAppointmentMessages(input: {
  conversationId: string;
  limit?: number;
  cursorAt?: string | null;
  cursorId?: string | null;
}): Promise<{ messages: AppointmentMessage[]; nextCursor: { createdAt: string; id: string } | null }> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const cursorAt = input.cursorAt ?? null;
  const cursorId = input.cursorId ?? null;
  const useCursor =
    cursorAt !== null &&
    cursorId !== null &&
    /^[0-9a-f-]{36}$/i.test(cursorId) &&
    !Number.isNaN(Date.parse(cursorAt));

  let rows: MessageRow[];
  if (useCursor) {
    rows = await sqlClient<MessageRow[]>`
      SELECT id::text, sender_role, body, created_at, read_at
      FROM public.bahrain_appointment_messages
      WHERE conversation_id = ${input.conversationId}::uuid
        AND (created_at, id) < (${new Date(cursorAt as string)}::timestamptz, ${cursorId}::uuid)
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await sqlClient<MessageRow[]>`
      SELECT id::text, sender_role, body, created_at, read_at
      FROM public.bahrain_appointment_messages
      WHERE conversation_id = ${input.conversationId}::uuid
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
    `;
  }

  const last = rows.at(-1);
  return {
    messages: rows.map(publicMessage),
    nextCursor:
      rows.length === limit && last
        ? { createdAt: iso(last.created_at), id: last.id }
        : null,
  };
}

export async function appointmentUnreadCount(
  participant: AppointmentCommunicationParticipant,
): Promise<number> {
  const [row] = await sqlClient<{ unread_count: number }[]>`
    SELECT count(*)::int AS unread_count
    FROM public.bahrain_appointment_messages
    WHERE conversation_id = ${participant.conversationId}::uuid
      AND sender_role <> ${participant.actor.role}
      AND read_at IS NULL
  `;
  return row?.unread_count ?? 0;
}

/** Marks the peer's messages as read for the caller. */
export async function markAppointmentRead(
  participant: AppointmentCommunicationParticipant,
  through: Date,
): Promise<void> {
  const role = participant.actor.role;
  await sqlClient.begin(async (tx) => {
    await tx`
      UPDATE public.bahrain_appointment_messages
      SET read_at = clock_timestamp()
      WHERE conversation_id = ${participant.conversationId}::uuid
        AND sender_role <> ${role}
        AND read_at IS NULL
    `;
    await tx`
      UPDATE public.bahrain_appointment_conversations
      SET client_last_read_at = CASE WHEN ${role} = 'client'
            THEN GREATEST(COALESCE(client_last_read_at, to_timestamp(0)), ${through}::timestamptz)
            ELSE client_last_read_at END,
          lawyer_last_read_at = CASE WHEN ${role} = 'lawyer'
            THEN GREATEST(COALESCE(lawyer_last_read_at, to_timestamp(0)), ${through}::timestamptz)
            ELSE lawyer_last_read_at END,
          updated_at = now()
      WHERE id = ${participant.conversationId}::uuid
    `;
  });
}

export type AppointmentMessageInsert = {
  participant: AppointmentCommunicationParticipant;
  clientMessageId: string;
  body: string;
};

export async function insertAppointmentMessage(
  input: AppointmentMessageInsert,
): Promise<{ message: AppointmentMessage; inserted: boolean }> {
  const rows = await sqlClient<(MessageRow & { inserted: boolean })[]>`
    INSERT INTO public.bahrain_appointment_messages (
      conversation_id, sender_role, sender_id, client_message_id, body
    ) VALUES (
      ${input.participant.conversationId}::uuid,
      ${input.participant.actor.role},
      ${input.participant.actor.id},
      ${input.clientMessageId}::uuid,
      ${input.body}
    )
    ON CONFLICT (conversation_id, sender_role, sender_id, client_message_id)
    DO UPDATE SET client_message_id = bahrain_appointment_messages.client_message_id
    RETURNING (xmax = 0) AS inserted, id::text, sender_role, body, created_at, read_at
  `;
  const row = rows[0];
  if (!row) throw new Error("message_not_persisted");

  await sqlClient`
    UPDATE public.bahrain_appointment_conversations
    SET last_message_at = GREATEST(COALESCE(last_message_at, to_timestamp(0)), ${row.created_at}::timestamptz),
        updated_at = now()
    WHERE id = ${input.participant.conversationId}::uuid
  `;

  return { message: publicMessage(row), inserted: row.inserted };
}

export type AppointmentConversationSummary = {
  conversationId: string;
  bookingRequestId: string;
  peerDisplayName: string;
  appointmentDate: string;
  appointmentTime: string;
  adminStatus: string;
  paymentStatus: string;
  consultationMethod: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type SummaryRow = {
  conversation_id: string;
  booking_request_id: string;
  peer_display_name: string | null;
  appointment_date: string;
  appointment_time: string;
  admin_status: string;
  payment_status: string;
  consultation_method: string | null;
  last_message: string | null;
  last_message_at: Date | string | null;
  unread_count: number;
};

/** The caller's appointment conversations, newest activity first. */
export async function listAppointmentConversations(
  actor: { role: "client" | "lawyer"; id: string; countryCode?: string },
): Promise<AppointmentConversationSummary[]> {
  const filter =
    actor.role === "client"
      ? sqlClient`c.client_account_id = ${actor.id}::uuid`
      : sqlClient`c.lawyer_id = ${actor.id}::uuid AND c.country_code = ${actor.countryCode ?? "BH"}`;

  const rows = await sqlClient<SummaryRow[]>`
    SELECT
      c.id::text AS conversation_id,
      c.booking_request_id::text AS booking_request_id,
      CASE WHEN ${actor.role} = 'client'
        THEN COALESCE(NULLIF(l.full_name_ar, ''), NULLIF(l.full_name_en, ''), b.selected_lawyer_name)
        ELSE b.customer_name END AS peer_display_name,
      b.appointment_date::text AS appointment_date,
      b.appointment_time::text AS appointment_time,
      b.admin_status,
      b.payment_status,
      b.consultation_method,
      latest.body AS last_message,
      latest.created_at AS last_message_at,
      COALESCE(unread.unread_count, 0) AS unread_count
    FROM public.bahrain_appointment_conversations c
    JOIN public.bahrain_booking_requests b ON b.id = c.booking_request_id
    LEFT JOIN public.bahrain_lawyers l ON l.id = c.lawyer_id
    LEFT JOIN LATERAL (
      SELECT body, created_at FROM public.bahrain_appointment_messages m
      WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
    ) latest ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS unread_count FROM public.bahrain_appointment_messages m
      WHERE m.conversation_id = c.id AND m.sender_role <> ${actor.role} AND m.read_at IS NULL
    ) unread ON TRUE
    WHERE ${filter}
      AND b.admin_status IN ('approved', 'confirmed', 'in_progress', 'booked', 'pending_review', 'pending', 'completed')
    ORDER BY COALESCE(latest.created_at, b.updated_at) DESC, c.id DESC
    LIMIT 100
  `;

  return rows.map((row) => ({
    conversationId: row.conversation_id,
    bookingRequestId: row.booking_request_id,
    peerDisplayName: row.peer_display_name ?? "",
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time.slice(0, 5),
    adminStatus: row.admin_status,
    paymentStatus: row.payment_status,
    consultationMethod: row.consultation_method,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at ? iso(row.last_message_at) : null,
    unreadCount: Number(row.unread_count) || 0,
  }));
}
