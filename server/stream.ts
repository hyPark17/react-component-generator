// LLM 프로바이더의 스트리밍 응답(SSE)에서 텍스트 델타를 추출하고,
// 우리 서버가 클라이언트로 보낼 SSE 프레임을 만드는 순수 함수들.
// 부수효과(fetch, ReadableStream 등)가 없어 단위 테스트가 가능하다.

import type { SSEEvent } from '../src/utils/sse';

/** Anthropic의 content_block_delta(text_delta) 이벤트에서 텍스트를 추출한다. 아니면 null. */
export function extractAnthropicDelta(event: Pick<SSEEvent, 'data'>): string | null {
  try {
    const parsed = JSON.parse(event.data);
    if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
      return parsed.delta.text ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Google Gemini 스트리밍 청크(candidates[0].content.parts)에서 텍스트를 추출한다. */
export function extractGoogleDelta(event: Pick<SSEEvent, 'data'>): string | null {
  try {
    const parsed = JSON.parse(event.data);
    const parts = parsed.candidates?.[0]?.content?.parts as Array<{ text?: string }> | undefined;
    const text = parts?.map((part) => part.text ?? '').join('') ?? '';
    return text || null;
  } catch {
    return null;
  }
}

/** 클라이언트로 보낼 SSE 프레임 문자열을 만든다. */
export function formatSSE(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}
