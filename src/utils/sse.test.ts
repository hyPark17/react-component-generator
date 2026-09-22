import { describe, it, expect } from 'vitest';
import { splitSSEEvents, consumeSSEStream, type SSEEvent } from './sse';

function makeByteStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe('splitSSEEvents', () => {
  it('data 라인 하나로 구성된 완결된 이벤트 하나를 파싱한다', () => {
    const { events } = splitSSEEvents('data: hello\n\n');
    expect(events).toEqual([{ event: undefined, data: 'hello' }]);
  });

  it('event 필드가 있으면 함께 파싱한다', () => {
    const { events } = splitSSEEvents('event: chunk\ndata: hello\n\n');
    expect(events).toEqual([{ event: 'chunk', data: 'hello' }]);
  });

  it('연속된 data 라인은 각각 별도의 이벤트로 처리한다', () => {
    const { events } = splitSSEEvents('data: line1\ndata: line2\n\n');
    expect(events).toEqual([
      { event: undefined, data: 'line1' },
      { event: undefined, data: 'line2' },
    ]);
  });

  it('빈 줄 구분자 없이 연속된 data 라인이 와도(Gemini 실제 응답 형태) 각각 별도 이벤트로 처리한다', () => {
    const { events } = splitSSEEvents('data: {"a":1}\ndata: {"a":2}\ndata: {"a":3}\n');
    expect(events).toEqual([
      { event: undefined, data: '{"a":1}' },
      { event: undefined, data: '{"a":2}' },
      { event: undefined, data: '{"a":3}' },
    ]);
  });

  it('완결되지 않은 마지막 조각은 remainder로 남기고 이벤트로 포함하지 않는다', () => {
    const { events, remainder } = splitSSEEvents('data: full\n\ndata: partial');
    expect(events).toEqual([{ event: undefined, data: 'full' }]);
    expect(remainder).toBe('data: partial');
  });

  it('빈 버퍼는 이벤트 없이 remainder도 빈 문자열로 반환한다', () => {
    const { events, remainder } = splitSSEEvents('');
    expect(events).toEqual([]);
    expect(remainder).toBe('');
  });
});

describe('consumeSSEStream', () => {
  it('완결된 이벤트 하나가 도착하면 onEvent를 한 번 호출한다', async () => {
    const events: SSEEvent[] = [];
    await consumeSSEStream(makeByteStream(['data: hello\n\n']), (e) => events.push(e));
    expect(events).toEqual([{ event: undefined, data: 'hello' }]);
  });

  it('청크 경계에서 잘린 데이터도 다음 청크와 이어붙여 완결된 이벤트로 처리한다', async () => {
    const events: SSEEvent[] = [];
    await consumeSSEStream(makeByteStream(['data: he', 'llo\n\n']), (e) => events.push(e));
    expect(events).toEqual([{ event: undefined, data: 'hello' }]);
  });

  it('스트림이 마지막 빈 줄 없이 끝나도 남은 데이터를 최종 이벤트로 처리한다', async () => {
    const events: SSEEvent[] = [];
    await consumeSSEStream(makeByteStream(['data: tail']), (e) => events.push(e));
    expect(events).toEqual([{ event: undefined, data: 'tail' }]);
  });
});
