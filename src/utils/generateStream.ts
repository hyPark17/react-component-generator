// /api/generate가 흘려보내는 SSE 프로토콜(chunk/done/error)을 해석하는 함수.
// chunk가 도착할 때마다 onChunk로 중간 코드를 전달하고, done의 최종 코드를 반환한다.

import { consumeSSEStream } from './sse';

export async function streamGeneratedCode(
  body: ReadableStream<Uint8Array>,
  onChunk: (code: string) => void,
): Promise<string> {
  let finalCode: string | null = null;
  let errorMessage: string | null = null;

  await consumeSSEStream(body, (event) => {
    if (!event.event) return;
    const payload = JSON.parse(event.data) as { code?: string; error?: string };

    if (event.event === 'chunk' && payload.code !== undefined) {
      onChunk(payload.code);
    } else if (event.event === 'done' && payload.code !== undefined) {
      finalCode = payload.code;
    } else if (event.event === 'error' && payload.error !== undefined) {
      errorMessage = payload.error;
    }
  });

  if (errorMessage !== null) throw new Error(errorMessage);
  if (finalCode === null) throw new Error('스트림이 완료되지 않았습니다.');
  return finalCode;
}
