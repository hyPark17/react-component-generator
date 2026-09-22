import { describe, it, expect } from 'vitest';
import { addPromptToHistory } from './promptHistory';

describe('addPromptToHistory', () => {
  it('빈 히스토리에 프롬프트를 추가하면 맨 앞에 들어간다', () => {
    expect(addPromptToHistory([], '첫 프롬프트')).toEqual(['첫 프롬프트']);
  });

  it('새 프롬프트를 기존 히스토리 맨 앞에 추가한다', () => {
    expect(addPromptToHistory(['이전 프롬프트'], '새 프롬프트')).toEqual([
      '새 프롬프트',
      '이전 프롬프트',
    ]);
  });

  it('이미 있는 프롬프트를 다시 추가하면 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addPromptToHistory(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it('limit을 초과하면 가장 오래된 항목부터 잘라낸다', () => {
    const history = ['a', 'b', 'c'];
    expect(addPromptToHistory(history, 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});
