export function addPromptToHistory(history: string[], prompt: string, limit = 20): string[] {
  const withoutDuplicate = history.filter((entry) => entry !== prompt);
  return [prompt, ...withoutDuplicate].slice(0, limit);
}
