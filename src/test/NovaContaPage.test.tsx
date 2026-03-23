import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---- mocks ----------------------------------------------------------------
vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() }, Toaster: () => null }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1' } as any,
    usuario: { id: 'usr-1', auth_user_id: 'u1', nome: 'João', tipo: 'lancador' },
    loading: false,
    isAdmin: false,
    signInByNome: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const mockInsertConta = vi.fn();
const mockInsertLog = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));
// ---------------------------------------------------------------------------

import NovaContaPage from '@/pages/NovaContaPage';
import { toast } from 'sonner';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NovaContaPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// Helper que configura o supabase para sucesso
const setupSupabaseSuccess = () => {
  const contaChain: any = {
    insert: vi.fn(() => contaChain),
    select: vi.fn(() => contaChain),
    single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
  };
  const logChain: any = {
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  mockInsertConta.mockImplementation(() => contaChain);
  mockInsertLog.mockImplementation(() => logChain);
  mockFrom.mockImplementation((table: string) => {
    if (table === 'contas_pagar') return contaChain;
    return logChain;
  });
  return { contaChain, logChain };
};

describe('NovaContaPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza o título "Nova Conta"', () => {
    renderPage();
    expect(screen.getByText('Nova Conta')).toBeInTheDocument();
  });

  it('renderiza campo Descrição', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/impressão de 10\.000 santinhos/i)).toBeInTheDocument();
  });

  it('renderiza campo Valor', () => {
    renderPage();
    expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument();
  });

  it('renderiza campo Motivo/Justificativa', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/explique por que essa despesa/i)).toBeInTheDocument();
  });

  it('renderiza botão Salvar Conta', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /salvar conta/i })).toBeInTheDocument();
  });

  it('renderiza botão Cancelar', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('exibe erro quando submeter sem preencher campos obrigatórios', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /salvar conta/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Preencha os campos obrigatórios: Descrição, Valor, Vencimento e Motivo',
      ),
    );
  });

  it('exibe erro de valor inválido', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/impressão de 10\.000 santinhos/i), {
      target: { value: 'Compra de material' },
    });
    fireEvent.change(screen.getByPlaceholderText('0,00'), {
      target: { value: 'abc' }, // valor inválido
    });
    // Preenche vencimento
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-04-30' } });
    fireEvent.change(screen.getByPlaceholderText(/explique por que essa despesa/i), {
      target: { value: 'Necessário para campanha' },
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar conta/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Valor inválido'));
  });

  it('chama supabase.insert e navega para / em submit válido', async () => {
    const { contaChain } = setupSupabaseSuccess();
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/impressão de 10\.000 santinhos/i), {
      target: { value: 'Compra de banner' },
    });
    fireEvent.change(screen.getByPlaceholderText('0,00'), {
      target: { value: '500,00' },
    });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-04-30' } });
    fireEvent.change(screen.getByPlaceholderText(/explique por que essa despesa/i), {
      target: { value: 'Banner para evento no bairro' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar conta/i }));

    await waitFor(() => expect(contaChain.insert).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    expect(toast.success).toHaveBeenCalledWith('Conta lançada com sucesso');
  });

  it('botão Cancelar navega de volta', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('botão de voltar (seta) navega de volta', () => {
    renderPage();
    // O botão com ArrowLeft não tem texto visível — buscamos pelo primeiro botão do header
    const backBtn = screen.getAllByRole('button')[0];
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
