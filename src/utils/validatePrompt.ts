export const MAX_PROMPT_LENGTH = 500;

export interface PromptValidationResult {
  isValid: boolean;
  length: number;
  maxLength: number;
}

export function validatePromptLength(prompt: string): PromptValidationResult {
  const length = prompt.length;

  return {
    isValid: length <= MAX_PROMPT_LENGTH,
    length,
    maxLength: MAX_PROMPT_LENGTH,
  };
}
