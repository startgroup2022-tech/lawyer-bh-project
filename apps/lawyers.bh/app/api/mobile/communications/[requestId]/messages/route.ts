import { resolveRequestCommunicationAccess } from "@/lib/communications/server-access";
import {
  evaluateCommunicationCapabilities,
  isActiveChatSuspension,
} from "@/lib/communications/safety/policy";
import { getCommunicationSafetyState } from "@/lib/communications/safety/store";
import { mobilePushSender } from "@/lib/sos/mobile-push";

type Context = {
  params: Promise<{
    requestId: string;
  }>;
};

type MessageRow = {
  attachment?: {id: string; name: string; size: number; mime: string} | null;
  id: string;
  request_id?: string;
  sender_role: "client" | "lawyer";
  sender_id?: string;
  client_message_id?: string;
  body: string;
  created_at: string | Date;
  read_at: string | Date | null;
  inserted?: boolean;
};

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toIso(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("invalid_message_timestamp");
  }

  return date.toISOString();
}

function publicMessage(row: MessageRow) {
  return {
    ...(row.attachment ? {attachment: row.attachment} : {}),
    id: row.id,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: toIso(row.created_at),
    readAt: row.read_at ? toIso(row.read_at) : null,
  };
}

export async function GET(
  request: Request,
  context: Context,
) {
  const { requestId } = await context.params;

  const participant =
    await resolveRequestCommunicationAccess(
      requestId,
      request,
    );

  if (!participant) {
    return Response.json(
      {
        error: "communication_forbidden",
      },
      {
        status: 403,
      },
    );
  }

  const safetyState = await getCommunicationSafetyState(participant);
  const safetyCapabilities = evaluateCommunicationCapabilities(safetyState);
  const capabilities = {
    ...participant.capabilities,
    send: participant.capabilities.send && safetyCapabilities.send,
    call: participant.capabilities.call && safetyCapabilities.call,
    attach: participant.capabilities.send && safetyCapabilities.attach,
  };

  const url = new URL(request.url);

  const { sqlClient } =
    await import("@/lib/db/client");

  const limit = Math.min(
    Math.max(
      Number.parseInt(
        url.searchParams.get("limit") ?? "50",
        10,
      ) || 50,
      1,
    ),
    100,
  );

  const cursorAt =
    url.searchParams.get("cursorAt");

  const cursorId =
    url.searchParams.get("cursorId");

  let rows: MessageRow[];

  if (
    cursorAt &&
    cursorId &&
    uuid.test(cursorId) &&
    !Number.isNaN(Date.parse(cursorAt))
  ) {
    rows = await sqlClient<MessageRow[]>`
      SELECT
        id::text,
        sender_role,
        body,
        created_at,
        read_at,
        (SELECT json_build_object('id', a.id, 'name', a.name, 'size', a.size, 'mime', a.mime) FROM bahrain_communication_attachments a WHERE a.message_id = bahrain_communication_messages.id) AS attachment
      FROM bahrain_communication_messages
      WHERE
        request_id = ${requestId}::uuid
        AND (created_at, id) <
          (
            ${new Date(cursorAt)},
            ${cursorId}::uuid
          )
      ORDER BY
        created_at DESC,
        id DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await sqlClient<MessageRow[]>`
      SELECT
        id::text,
        sender_role,
        body,
        created_at,
        read_at,
        (SELECT json_build_object('id', a.id, 'name', a.name, 'size', a.size, 'mime', a.mime) FROM bahrain_communication_attachments a WHERE a.message_id = bahrain_communication_messages.id) AS attachment
      FROM bahrain_communication_messages
      WHERE request_id = ${requestId}::uuid
      ORDER BY
        created_at DESC,
        id DESC
      LIMIT ${limit}
    `;
  }

  const lastRow = rows.at(-1);
  const [unread] = await sqlClient<{unread_count:number}[]>`
    SELECT count(*)::int AS unread_count FROM bahrain_communication_messages
    WHERE request_id=${requestId}::uuid AND sender_role<>${participant.actor.role}
      AND read_at IS NULL`;

  return Response.json({
    unreadCount: unread.unread_count,
    capabilities,
    safety: {
      ...safetyState,
      capabilities: {
        ...safetyCapabilities,
        send: capabilities.send,
        call: capabilities.call,
        attach: capabilities.attach,
      },
    },
    messages: rows.map(publicMessage),

    nextCursor:
      rows.length === limit && lastRow
        ? {
            createdAt: toIso(
              lastRow.created_at,
            ),
            id: lastRow.id,
          }
        : null,
  });
}

export async function POST(
  request: Request,
  context: Context,
) {
  const { requestId } = await context.params;

  const participant =
    await resolveRequestCommunicationAccess(
      requestId,
      request,
    );

  if (!participant) {
    return Response.json(
      {
        error: "communication_forbidden",
      },
      {
        status: 403,
      },
    );
  }

  if (!participant.capabilities.send) {
    return Response.json(
      {
        error: "communication_read_only",
      },
      {
        status: 409,
      },
    );
  }

  const safetyState = await getCommunicationSafetyState(participant);
  if (safetyState.blockedByMe || safetyState.blockedByPeer) {
    return Response.json(
      { error: "communication_blocked" },
      { status: 409 },
    );
  }
  if (isActiveChatSuspension(safetyState.chatSuspendedUntil)) {
    return Response.json(
      { error: "chat_suspended" },
      { status: 409 },
    );
  }

  let data: Record<string, unknown>;

  try {
    data =
      (await request.json()) as Record<
        string,
        unknown
      >;
  } catch {
    return Response.json(
      {
        error: "invalid_json",
      },
      {
        status: 400,
      },
    );
  }

  const clientMessageId = String(
    data.clientMessageId ?? "",
  ).trim();

  const body = String(
    data.body ?? "",
  ).trim();

  if (
    !uuid.test(clientMessageId) ||
    !body ||
    body.length > 4000
  ) {
    return Response.json(
      {
        error: "invalid_message",
      },
      {
        status: 400,
      },
    );
  }

  const { sqlClient } =
    await import("@/lib/db/client");

  const rows =
    await sqlClient<MessageRow[]>`
      INSERT INTO bahrain_communication_messages (
        request_id,
        sender_role,
        sender_id,
        client_message_id,
        body
      )
      VALUES (
        ${requestId}::uuid,
        ${participant.actor.role},
        ${participant.actor.id},
        ${clientMessageId}::uuid,
        ${body}
      )
      ON CONFLICT (
        request_id,
        sender_role,
        sender_id,
        client_message_id
      )
      DO UPDATE SET
        client_message_id =
          bahrain_communication_messages.client_message_id
      RETURNING
        (xmax = 0) AS inserted,
        id::text,
        request_id::text,
        sender_role,
        sender_id,
        client_message_id::text,
        body,
        created_at,
        read_at
    `;

  const message = rows[0];

  if (!message) {
    return Response.json(
      {
        error: "message_not_persisted",
      },
      {
        status: 500,
      },
    );
  }

  if (message.inserted !== false) {
    try {
      const sender = await mobilePushSender();
      if (participant.peer.role === "lawyer") {
        await sender.sendLawyerPush({
          lawyerId: participant.peer.id,
          eventType: "new_message",
          requestId,
          locale: "ar",
        });
      } else {
        await sender.sendClientPush({
          eventType: "new_message",
          requestId,
          locale: "ar",
        });
      }
    } catch (error) {
      console.warn("[mobile/communications/messages] push delivery failed", {
        requestId,
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return Response.json(
    {
      message: publicMessage(message),
    },
    {
      status: 201,
    },
  );
}
