// 프로바이더 API 에러를 사용자에게 보여줄 한국어 메시지로 변환하는 순수 함수.

export function toUserErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Unknown error';

  if (message.includes('503')) {
    return 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
  }

  if (message.includes('429')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }

  return message;
}
