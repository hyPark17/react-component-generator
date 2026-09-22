import { useState, useCallback, useEffect } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { readStorage, writeStorage, STORAGE_KEYS } from '../utils/storage';
import { reviveComponents } from '../utils/componentStorage';
import { addPromptToHistory } from '../utils/promptHistory';
import { streamGeneratedCode } from '../utils/generateStream';

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  promptHistory: string[];
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(() =>
    reviveComponents(readStorage(STORAGE_KEYS.components, []))
  );
  const [promptHistory, setPromptHistory] = useState<string[]>(() =>
    readStorage(STORAGE_KEYS.promptHistory, [])
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 스트리밍 중인 부분 코드는 저장하지 않는다 — 매 delta마다 전체 배열을
    // localStorage에 다시 쓰면 생성 중 UI가 끊길 수 있고, 중간에 새로고침되면
    // 미완성 코드가 영구히 남는다. 완료(또는 실패로 제거)된 뒤 한 번만 기록한다.
    if (components.some((c) => c.isStreaming)) return;
    writeStorage(STORAGE_KEYS.components, components);
  }, [components]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.promptHistory, promptHistory);
  }, [promptHistory]);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setPromptHistory((prev) => addPromptToHistory(prev, prompt));
    setIsLoading(true);
    setError(null);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const placeholder: GeneratedComponent = {
      id,
      prompt,
      code: '',
      createdAt: new Date(),
      isStreaming: true,
    };
    setComponents((prev) => [placeholder, ...prev]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate component');
      }

      const finalCode = await streamGeneratedCode(res.body, (code) => {
        setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, code } : c)));
      });

      setComponents((prev) =>
        prev.map((c) => (c.id === id ? { ...c, code: finalCode, isStreaming: false } : c))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setComponents((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, []);

  return { components, promptHistory, isLoading, error, generate, removeComponent, clearAll };
}
