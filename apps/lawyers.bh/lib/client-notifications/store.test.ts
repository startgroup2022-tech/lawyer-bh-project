import {describe,expect,it} from 'vitest';
import {notificationTimestamp} from './store';

describe('notificationTimestamp',()=>{
  it('normalizes both postgres Date and string timestamp results',()=>{
    const value='2026-09-09T10:15:30.123Z';
    expect(notificationTimestamp(new Date(value))).toBe(value);
    expect(notificationTimestamp(value)).toBe(value);
  });
});
