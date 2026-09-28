type Session = {
  workflow: string;
  browser_hash: string;
  principal: string;
  expires_at: Date | string;
};
export function validateSession(
  session: Session | null | undefined,
  workflow: string,
  browser: string,
  principal: string,
  now = new Date(),
) {
  if (
    !session ||
    session.workflow !== workflow ||
    session.browser_hash !== browser ||
    session.principal !== principal ||
    !(new Date(session.expires_at).getTime() > now.getTime())
  )
    throw new Error("upload_expired");
}
export async function readBounded(
  stream: ReadableStream<Uint8Array>,
  limit: number,
) {
  const reader = stream.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("invalid_upload_size");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}
