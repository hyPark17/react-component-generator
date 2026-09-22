import { describe, it, expect } from 'vitest';
import { toUserErrorMessage } from './errorMessage';

describe('toUserErrorMessage', () => {
  it('503을 포함하면 과부하 안내 메시지를 반환한다', () => {
    expect(toUserErrorMessage(new Error('Claude API error: 503'))).toBe(
      'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.'
    );
  });

  it('429를 포함하면 요청 과다 안내 메시지를 반환한다', () => {
    expect(toUserErrorMessage(new Error('Gemini API error: 429'))).toBe(
      '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
    );
  });

  it('그 외 에러는 원본 메시지를 그대로 반환한다', () => {
    expect(toUserErrorMessage(new Error('알 수 없는 오류'))).toBe('알 수 없는 오류');
  });

  it('Error 인스턴스가 아니면 Unknown error를 반환한다', () => {
    expect(toUserErrorMessage('문자열 에러')).toBe('Unknown error');
  });
});
