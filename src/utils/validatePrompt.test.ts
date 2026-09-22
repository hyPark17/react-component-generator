import { describe, it, expect } from 'vitest';
import { validatePromptLength, MAX_PROMPT_LENGTH } from './validatePrompt';

describe('validatePromptLength', () => {
  it('길이가 500자 이하이면 유효하다', () => {
    const prompt = 'a'.repeat(500);
    expect(validatePromptLength(prompt).isValid).toBe(true);
  });

  it('길이가 500자를 초과하면 유효하지 않다', () => {
    const prompt = 'a'.repeat(501);
    expect(validatePromptLength(prompt).isValid).toBe(false);
  });

  it('결과에 현재 길이와 최대 길이를 포함한다', () => {
    const prompt = 'a'.repeat(501);
    const result = validatePromptLength(prompt);
    expect(result.length).toBe(501);
    expect(result.maxLength).toBe(MAX_PROMPT_LENGTH);
  });
});
