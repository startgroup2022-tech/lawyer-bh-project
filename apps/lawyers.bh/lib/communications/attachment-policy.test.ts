import {describe,it,expect} from 'vitest';
import {MAX_ATTACHMENT_BYTES, validateAttachment} from './attachment-policy';
describe('attachment policy', () => {
  it('uses a 2 MiB maximum', () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(2 * 1024 * 1024);
  });
  it('accepts PDF by extension and signature', () => {
    expect(validateAttachment('case.pdf', Buffer.from('%PDF-1.7\ncase'))).toBe('application/pdf');
  });
  it('rejects oversized, empty and disguised executable files', () => {
    expect(() => validateAttachment('case.pdf', Buffer.alloc(2*1024*1024+1))).toThrow();
    expect(() => validateAttachment('case.pdf', Buffer.alloc(0))).toThrow();
    expect(() => validateAttachment('case.pdf', Buffer.from('MZ executable'))).toThrow();
    expect(() => validateAttachment('case.html', Buffer.from('%PDF-1.7'))).toThrow();
  });
});
