import type { GeneratedComponent } from '../types';

interface StoredComponent {
  id: string;
  prompt: string;
  code: string;
  createdAt: string;
  isStreaming?: boolean;
}

export function reviveComponents(stored: StoredComponent[]): GeneratedComponent[] {
  return stored.map((component) => ({
    ...component,
    createdAt: new Date(component.createdAt),
    isStreaming: false,
  }));
}
