export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const ATTACHMENT_CHUNK_BYTES = 512 * 1024;
export function validateAttachment(name: string, data: Buffer): string {
  if (!data.length || data.length > MAX_ATTACHMENT_BYTES) throw new Error('attachment_size');
  const ext = name.toLowerCase().split('.').pop();
  const hex = data.subarray(0, 8).toString('hex');
  if (ext === 'pdf' && data.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (['jpg', 'jpeg'].includes(ext ?? '') && hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (ext === 'png' && hex === '89504e470d0a1a0a') return 'image/png';
  if (ext === 'doc' && hex === 'd0cf11e0a1b11ae1') return 'application/msword';
  if (ext === 'docx' && hex.startsWith('504b0304') && data.includes(Buffer.from('[Content_Types].xml')) && data.includes(Buffer.from('word/document.xml'))) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  throw new Error('attachment_type');
}
