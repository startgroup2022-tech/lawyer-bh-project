export type CommunicationActorRole = "client" | "lawyer";

export type CommunicationMessage = {
  id: string;
  requestId: string;
  senderRole: CommunicationActorRole;
  senderId: string;
  clientMessageId: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
};

type InsertMessage = Omit<CommunicationMessage, "id" | "createdAt" | "readAt">;
type MessageCursor = { createdAt: Date; id: string };

type MessageRepository = {
  insert(input: InsertMessage): Promise<CommunicationMessage>;
  list(input: { requestId: string; limit: number; cursor?: MessageCursor }): Promise<CommunicationMessage[]>;
};

export class MessageValidationError extends Error {}

export function createMessageStore(repository: MessageRepository) {
  return {
    async insertMessage(input: InsertMessage) {
      const body = input.body.trim();
      if (!body || body.length > 4000) throw new MessageValidationError("invalid_message_body");
      return repository.insert({ ...input, body });
    },
    async listMessages(input: { requestId: string; limit?: number; cursor?: { createdAt: string; id: string } }) {
      const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
      const cursor = input.cursor ? { createdAt: new Date(input.cursor.createdAt), id: input.cursor.id } : undefined;
      if (cursor && Number.isNaN(cursor.createdAt.getTime())) throw new MessageValidationError("invalid_message_cursor");
      return repository.list({ requestId: input.requestId, limit, ...(cursor ? { cursor } : {}) });
    },
  };
}
