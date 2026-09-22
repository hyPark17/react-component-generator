import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';

interface ComponentCardProps {
  component: GeneratedComponent;
  logNumber: number;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({ component, logNumber, onRemove, onRegenerate, isLoading }: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>(component.isStreaming ? 'code' : 'preview');
  const [previewKey, setPreviewKey] = useState(0);
  const [wasStreaming, setWasStreaming] = useState(component.isStreaming);
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const logId = `OUTPUT_${String(logNumber).padStart(3, '0')}.LOG`;

  // 스트리밍이 끝나는 순간(prop 변경)에 맞춰 탭을 미리보기로 전환한다.
  // effect 대신 렌더 중 상태를 조정해 한 번의 렌더로 반영한다.
  if (component.isStreaming !== wasStreaming) {
    setWasStreaming(component.isStreaming);
    if (!component.isStreaming) setActiveTab('preview');
  }

  return (
    <div className="component-card">
      <div className="card-header">
        <div className="card-title-group">
          <span>
            {logId} [{createdAt}]
            {component.isStreaming && <span className="loading-pulse" aria-hidden="true" />}
          </span>
          <p className="card-prompt">{component.prompt}</p>
        </div>
        <div className="card-actions">
          <button
            className="btn-refresh"
            onClick={() => setPreviewKey((k) => k + 1)}
            title="미리보기 새로고침"
            aria-label="미리보기 새로고침"
          >
            ↻
          </button>
          <button
            className="btn-regenerate"
            onClick={() => onRegenerate(component.prompt)}
            disabled={isLoading}
          >
            {isLoading ? '생성 중...' : '재생성'}
          </button>
          <button
            className="btn-remove"
            onClick={() => onRemove(component.id)}
          >
            삭제
          </button>
        </div>
      </div>
      <div className="card-tabs">
        <button
          className={`tab ${activeTab === 'preview' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('preview')}
          disabled={component.isStreaming}
        >
          미리보기
        </button>
        <button
          className={`tab ${activeTab === 'code' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          코드
        </button>
      </div>
      <div className="card-content">
        {activeTab === 'preview' ? (
          <LivePreview key={previewKey} code={component.code} />
        ) : (
          <CodeView code={component.code} />
        )}
      </div>
    </div>
  );
}
