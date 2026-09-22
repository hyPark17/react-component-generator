import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from './PromptInput';

describe('PromptInput', () => {
  it('프롬프트가 비어 있으면 생성 버튼이 비활성이다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
  });

  it('입력하면 버튼이 활성화되고 클릭 시 입력값으로 onGenerate가 호출된다', async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();
    render(<PromptInput onGenerate={onGenerate} isLoading={false} />);

    await user.type(screen.getByRole('textbox'), '프로필 카드');
    const submit = screen.getByRole('button', { name: '컴포넌트 생성' });
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onGenerate).toHaveBeenCalledWith('프로필 카드');
  });

  it('로딩 중에는 생성 버튼이 비활성이고 "생성 중..." 을 보여준다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button', { name: '생성 중...' })).toBeDisabled();
  });

  it('500자를 초과하면 생성 버튼이 비활성화되고 에러 메시지가 보인다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'a'.repeat(501) } });

    expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
    expect(screen.getByText(/500자를 초과했습니다/)).toBeInTheDocument();
  });

  it('500자를 초과한 상태로 제출해도 onGenerate가 호출되지 않는다', () => {
    const onGenerate = vi.fn();
    render(<PromptInput onGenerate={onGenerate} isLoading={false} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'a'.repeat(501) } });
    fireEvent.submit(textarea.closest('form')!);

    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('히스토리가 없으면 최근 프롬프트 섹션이 보이지 않는다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} history={[]} />);
    expect(screen.queryByText('# 최근 프롬프트')).not.toBeInTheDocument();
  });

  it('히스토리 항목을 클릭하면 텍스트 영역에 채워진다', async () => {
    const user = userEvent.setup();
    render(
      <PromptInput onGenerate={vi.fn()} isLoading={false} history={['최근 프롬프트 예시']} />
    );

    expect(screen.getByText('# 최근 프롬프트')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '최근 프롬프트 예시' }));

    expect(screen.getByRole('textbox')).toHaveValue('최근 프롬프트 예시');
  });
});
