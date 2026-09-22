import { describe, it, expect, vi } from 'vitest';
import { readStorage, writeStorage } from './storage';

describe('readStorage', () => {
  it('키가 없으면 fallback 값을 반환한다', () => {
    expect(readStorage('missing-key', 'fallback')).toBe('fallback');
  });

  it('저장된 값이 있으면 파싱해서 반환한다', () => {
    localStorage.setItem('my-key', JSON.stringify({ a: 1 }));
    expect(readStorage('my-key', {})).toEqual({ a: 1 });
  });

  it('저장된 값이 손상된 JSON이면 fallback 값을 반환한다', () => {
    localStorage.setItem('broken-key', '{not valid json');
    expect(readStorage('broken-key', 'fallback')).toBe('fallback');
  });
});

describe('writeStorage', () => {
  it('값을 JSON 문자열로 저장한다', () => {
    writeStorage('my-key', { a: 1 });
    expect(localStorage.getItem('my-key')).toBe(JSON.stringify({ a: 1 }));
  });

  it('localStorage 접근이 실패해도 예외를 던지지 않는다', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => writeStorage('my-key', 'value')).not.toThrow();

    setItemSpy.mockRestore();
  });
});
