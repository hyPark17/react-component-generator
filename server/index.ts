import { stripCodeFences, ensureRenderCall } from './generator';
import { withModelFallback } from './fallback';
import { extractAnthropicDelta, extractGoogleDelta, formatSSE } from './stream';
import { toUserErrorMessage } from './errorMessage';
import { consumeSSEStream } from '../src/utils/sse';

// 우선순위 순서. 앞 모델이 실패하면 다음 모델로 폴백한다.
const GOOGLE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

const SYSTEM_PROMPT = `You are a React component generator. Generate a single React component based on the user's description.

Rules:
- Use inline styles only (no CSS imports, no CSS modules)
- Do NOT use import statements — React is already available in scope as a global
- Define the component as a function, then call render(<ComponentName />) at the end
- Make the component visually appealing with proper styling
- Use React hooks if needed (e.g., React.useState, React.useEffect)
- The component must be completely self-contained
- Respond with ONLY the code block — no explanations, no markdown fences
- Use descriptive variable names and clean formatting
- For colors, prefer modern palettes (gradients, shadows, etc.)
- Ensure the component is interactive where appropriate (hover states, click handlers, etc.)
- Do NOT use TypeScript syntax — no type annotations, no interfaces, no generics, no "as" casts. Write plain JavaScript only.

Example output format:
const GradientButton = () => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #667eea, #764ba2)'
          : 'linear-gradient(135deg, #764ba2, #667eea)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Click me
    </button>
  );
};

render(<GradientButton />);`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type Provider = 'anthropic' | 'google';

const ENV_KEYS: Record<Provider, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
};

function resolveApiKey(provider: Provider, clientKey?: string): string | null {
  return clientKey || ENV_KEYS[provider] || null;
}

async function streamAnthropic(
  prompt: string,
  apiKey: string,
  onDelta: (text: string) => void,
): Promise<void> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  await consumeSSEStream(response.body, (event) => {
    const delta = extractAnthropicDelta(event);
    if (delta) onDelta(delta);
  });
}

async function streamGoogleModel(
  prompt: string,
  apiKey: string,
  model: string,
  onDelta: (text: string) => void,
): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  let finishReason: string | undefined;
  await consumeSSEStream(response.body, (event) => {
    try {
      const parsed = JSON.parse(event.data) as { candidates?: Array<{ finishReason?: string }> };
      finishReason = parsed.candidates?.[0]?.finishReason ?? finishReason;
    } catch {
      // ping 등 JSON이 아닌 프레임은 무시한다.
    }

    const delta = extractGoogleDelta(event);
    if (delta) onDelta(delta);
  });

  if (finishReason === 'MAX_TOKENS') {
    throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
  }
}

async function streamGoogle(
  prompt: string,
  apiKey: string,
  onDelta: (text: string) => void,
): Promise<void> {
  // 스트리밍 중간에 실패하면 이미 일부 텍스트가 클라이언트로 전송된 상태라,
  // 다음 모델로 폴백해도 처음부터 다시 보여줄 수 없다(중복/뒤섞임 발생).
  // 따라서 한 글자라도 전송된 이후의 실패는 폴백하지 않고 원래 에러를 그대로 던진다.
  let hasEmitted = false;
  let failureAfterEmit: unknown;

  await withModelFallback(GOOGLE_MODELS, async (model) => {
    if (hasEmitted) throw failureAfterEmit;

    try {
      await streamGoogleModel(prompt, apiKey, model, (text) => {
        hasEmitted = true;
        onDelta(text);
      });
    } catch (err) {
      if (hasEmitted) failureAfterEmit = err;
      throw err;
    }
  });
}

const server = Bun.serve({
  port: 3002,
  async fetch(req) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/api/config') {
      return Response.json(
        {
          envKeys: {
            anthropic: !!ENV_KEYS.anthropic,
            google: !!ENV_KEYS.google,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      let body: { prompt: string; apiKey?: string; provider?: Provider };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return Response.json(
          { error: 'Invalid JSON body' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const { prompt, apiKey, provider = 'anthropic' } = body;

      const resolvedKey = resolveApiKey(provider, apiKey);

      if (!resolvedKey) {
        return Response.json(
          { error: `API key is required. Set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'} in .env or enter it manually.` },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (!prompt) {
        return Response.json(
          { error: 'Prompt is required' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // 응답 헤더를 보낸 뒤에는 상태 코드를 바꿀 수 없으므로, 생성 중 에러도
      // 본문 안에서 SSE의 error 이벤트로 흘려보낸다(항상 200 + text/event-stream).
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          let raw = '';

          const emit = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(formatSSE(event, JSON.stringify(data))));
          };

          const onDelta = (text: string) => {
            raw += text;
            emit('chunk', { code: stripCodeFences(raw) });
          };

          try {
            if (provider === 'google') {
              await streamGoogle(prompt, resolvedKey, onDelta);
            } else {
              await streamAnthropic(prompt, resolvedKey, onDelta);
            }

            emit('done', { code: ensureRenderCall(stripCodeFences(raw)) });
          } catch (err) {
            emit('error', { error: toUserErrorMessage(err) });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: CORS_HEADERS }
    );
  },
});

console.log(`API server running at http://localhost:${server.port}`);
