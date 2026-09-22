import { describe, it, expect, vi } from 'vitest';
import { streamGeneratedCode } from './generateStream';

function makeByteStream(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
}

describe('streamGeneratedCode', () => {
  it('chunk 이벤트가 도착할 때마다 onChunk를 호출한다', async () => {
    const onChunk = vi.fn();
    const stream = makeByteStream([
      'event: chunk\ndata: {"code":"a"}\n\n',
      'event: done\ndata: {"code":"a;render(<A />);"}\n\n',
    ]);

    await streamGeneratedCode(stream, onChunk);

    expect(onChunk).toHaveBeenCalledWith('a');
  });

  it('done 이벤트의 최종 코드를 반환한다', async () => {
    const stream = makeByteStream([
      'event: chunk\ndata: {"code":"a"}\n\n',
      'event: done\ndata: {"code":"a;render(<A />);"}\n\n',
    ]);

    const result = await streamGeneratedCode(stream, vi.fn());

    expect(result).toBe('a;render(<A />);');
  });

  it('error 이벤트가 도착하면 해당 메시지로 예외를 던진다', async () => {
    const stream = makeByteStream(['event: error\ndata: {"error":"API key is required"}\n\n']);

    await expect(streamGeneratedCode(stream, vi.fn())).rejects.toThrow('API key is required');
  });
});
