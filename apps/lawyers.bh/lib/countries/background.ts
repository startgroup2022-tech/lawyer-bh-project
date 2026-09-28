export async function validateBackground(file:File) {
  if (!file.size || file.size > 4*1024*1024) throw new Error('Image must be between 1 byte and 4 MB');
  const bytes = new Uint8Array(await file.slice(0,12).arrayBuffer());
  if (file.type === 'image/png' && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i]===v)) return 'png';
  if (file.type === 'image/jpeg' && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'jpg';
  if (file.type === 'image/webp' && new TextDecoder().decode(bytes.slice(0,4))==='RIFF' && new TextDecoder().decode(bytes.slice(8,12))==='WEBP') return 'webp';
  throw new Error('Use a PNG, JPEG or WebP image');
}
