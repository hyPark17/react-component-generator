import { describe, it, expect } from 'vitest';
import { extractAnthropicDelta, extractGoogleDelta, formatSSE } from './stream';

describe('extractAnthropicDelta', () => {
  it('content_block_delta의 text_delta에서 텍스트를 추출한다', () => {
    const data = JSON.stringify({
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Hello' },
    });
    expect(extractAnthropicDelta({ data })).toBe('Hello');
  });

  it('text_delta가 아닌 이벤트(예: message_start)는 null을 반환한다', () => {
    const data = JSON.stringify({ type: 'message_start' });
    expect(extractAnthropicDelta({ data })).toBeNull();
  });

  it('JSON으로 파싱할 수 없는 데이터(예: ping)는 null을 반환한다', () => {
    expect(extractAnthropicDelta({ data: '[DONE]' })).toBeNull();
  });
});

describe('extractGoogleDelta', () => {
  it('candidates[0].content.parts에서 텍스트를 이어붙여 추출한다', () => {
    const data = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Hello' }, { text: ' World' }] } }],
    });
    expect(extractGoogleDelta({ data })).toBe('Hello World');
  });

  it('candidates가 없으면 null을 반환한다', () => {
    expect(extractGoogleDelta({ data: JSON.stringify({}) })).toBeNull();
  });
});

describe('formatSSE', () => {
  it('event와 data를 SSE 프레임 형식으로 만든다', () => {
    expect(formatSSE('chunk', '{"code":"a"}')).toBe('event: chunk\ndata: {"code":"a"}\n\n');
  });
});
