import { describe, it, expect } from 'vitest';
import { reviveComponents } from './componentStorage';

describe('reviveComponents', () => {
  it('빈 배열을 받으면 빈 배열을 반환한다', () => {
    expect(reviveComponents([])).toEqual([]);
  });

  it('createdAt 문자열을 Date 인스턴스로 복원한다', () => {
    const iso = '2026-01-15T10:30:00.000Z';
    const [result] = reviveComponents([
      { id: '1', prompt: 'p', code: 'c', createdAt: iso },
    ]);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.toISOString()).toBe(iso);
  });

  it('id, prompt, code 필드는 그대로 유지한다', () => {
    const [result] = reviveComponents([
      { id: '1', prompt: '프롬프트', code: 'const x = 1;', createdAt: '2026-01-15T10:30:00.000Z' },
    ]);

    expect(result.id).toBe('1');
    expect(result.prompt).toBe('프롬프트');
    expect(result.code).toBe('const x = 1;');
  });
});
