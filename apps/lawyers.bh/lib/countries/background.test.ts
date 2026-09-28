import { expect, it } from 'vitest';
import { validateBackground } from './background';
it('rejects oversized, disguised and unsupported images', async () => {
  await expect(validateBackground(new File(['<svg/>'], 'x.png', {type:'image/png'}))).rejects.toThrow();
  await expect(validateBackground(new File([new Uint8Array(4*1024*1024+1)], 'x.png', {type:'image/png'}))).rejects.toThrow();
  await expect(validateBackground(new File(['<svg/>'], 'x.svg', {type:'image/svg+xml'}))).rejects.toThrow();
});
it('recognizes a PNG header without trusting the filename', async () => {
  expect(await validateBackground(new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'a.jpg', {type:'image/png'}))).toBe('png');
});
