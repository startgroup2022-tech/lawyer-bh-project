import type { Sql } from 'postgres';
export type CommunicationPushPlatform = "ios" | "android";
export type CommunicationPushTokenType = "voip" | "fcm";
type Lookup = { requestId: string; actorRole: 'client'|'lawyer'; actorId: string; tokenType: CommunicationPushTokenType };
export async function findCallPushTokens(sql: Sql, input: Lookup) {
  const rows = await sql<{token:string}[]>`
    SELECT p.token FROM bahrain_communication_call_push_registrations p
    JOIN bahrain_emergency_requests registered ON registered.id = p.request_id
    JOIN bahrain_emergency_requests requested ON requested.id = ${input.requestId}::uuid
    WHERE p.actor_role = ${input.actorRole} AND p.token_type = ${input.tokenType}
      AND (
        (${input.actorRole} = 'lawyer' AND p.actor_id = ${input.actorId})
        OR (${input.actorRole} = 'client' AND (
          (p.request_id = requested.id AND p.actor_id = ${input.actorId})
          OR (requested.client_account_id IS NOT NULL AND registered.client_account_id = requested.client_account_id)
        ))
      )
    ORDER BY p.last_seen_at DESC
  `;
  return rows.map(row=>row.token);
}

export interface CommunicationCallPushRegistration {
  requestId: string;
  actorRole: "client" | "lawyer";
  actorId: string;
  platform: CommunicationPushPlatform;
  tokenType: CommunicationPushTokenType;
  token: string;
  locale: "ar" | "en" | "tr";
}

function normalizeToken(token: string, tokenType: CommunicationPushTokenType) {
  const value = token.trim();
  if (tokenType === "voip") {
    if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("invalid_voip_token");
  } else if (value.length === 0 || value.length > 4096) {
    throw new Error("invalid_fcm_token");
  }
  return value;
}

export const communicationCallPushStore = {
  async register(input: CommunicationCallPushRegistration) {
    const token = normalizeToken(input.token, input.tokenType);
    const { sqlClient } = await import("@/lib/db/client");
    await sqlClient.begin(async transaction => {
      // Serialize token transfer and rotation across both unique indexes.
      // Separate statements ensure the delete is visible to the insert.
      await transaction`SELECT pg_advisory_xact_lock(hashtext('communication-call-push-registration'))`;
      await transaction`
        DELETE FROM public.bahrain_communication_call_push_registrations
         WHERE token = ${token}
           AND (request_id, actor_role, actor_id, platform, token_type)
             IS DISTINCT FROM (
               ${input.requestId}::uuid, ${input.actorRole}, ${input.actorId},
               ${input.platform}, ${input.tokenType}
             )
      `;
      await transaction`
      INSERT INTO public.bahrain_communication_call_push_registrations (
        request_id, actor_role, actor_id, platform, token_type, token, locale,
        last_seen_at
      ) VALUES (
        ${input.requestId}::uuid, ${input.actorRole}, ${input.actorId},
        ${input.platform}, ${input.tokenType}, ${token}, ${input.locale}, now()
      )
      ON CONFLICT (request_id, actor_role, actor_id, platform, token_type)
      DO UPDATE SET token = EXCLUDED.token, locale = EXCLUDED.locale,
                    last_seen_at = now()
      `;
    });
  },

  async tokensForActor(input: {
    requestId: string;
    actorRole: "client" | "lawyer";
    actorId: string;
    tokenType: CommunicationPushTokenType;
  }) {
    const { sqlClient } = await import("@/lib/db/client");
    return findCallPushTokens(sqlClient, input);
  },
};
