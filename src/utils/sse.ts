// Server-Sent Events(SSE) 원시 텍스트를 이벤트 단위로 분리하는 순수 함수.
// 네트워크에서 조각(chunk) 단위로 도착하는 스트림을 다루므로, 완결되지 않은
// 마지막 조각은 버리지 않고 remainder로 돌려줘 다음 chunk와 이어붙일 수 있게 한다.

export interface SSEEvent {
  event?: string;
  data: string;
}

/**
 * 줄 단위로 파싱한다(빈 줄로 이벤트를 구분하는 엄격한 SSE 명세와 달리).
 * Gemini의 실제 스트리밍 응답은 각 data 라인 사이에 빈 줄이 전혀 없이
 * 연속으로 오므로, data 라인 하나가 도착하는 즉시 이벤트 하나로 방출해야
 * 빈 줄만 기다리다 응답이 끝날 때까지 아무것도 못 뽑아내는 문제가 없다.
 */
export function splitSSEEvents(buffer: string): { events: SSEEvent[]; remainder: string } {
  const lines = buffer.split('\n');
  const remainder = lines.pop() ?? '';
  const events: SSEEvent[] = [];
  let pendingEvent: string | undefined;

  for (const line of lines) {
    if (line.startsWith('event:')) {
      pendingEvent = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      events.push({ event: pendingEvent, data: line.slice('data:'.length).trim() });
      pendingEvent = undefined;
    }
  }

  return { events, remainder };
}

/**
 * 바이트 스트림을 읽어 완결된 SSE 이벤트마다 onEvent를 호출한다.
 * 서버(Bun)와 브라우저(fetch) 양쪽의 ReadableStream<Uint8Array>에 그대로 쓸 수 있다.
 * 스트림이 마지막 빈 줄 없이 끝나는 프로바이더도 있어, 종료 시 남은 버퍼도
 * 이벤트로 한 번 더 시도한다.
 */
export async function consumeSSEStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, remainder } = splitSSEEvents(buffer);
    for (const event of events) onEvent(event);
    buffer = remainder;
  }

  const { events } = splitSSEEvents(`${buffer}\n\n`);
  for (const event of events) onEvent(event);
}
