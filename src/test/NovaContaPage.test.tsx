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

const setupSupabaseSuccess = () => {
  const contaChain: any = {
    insert: vi.fn(() => contaChain),
    select: vi.fn(() => contaChain),
    single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
  };
  const logChain: any = {
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  mockFrom.mockImplementation((table: string) => {
    if (table === 'contas_pagar') return contaChain;
    return logChain;
  });
  return { contaChain };
};

describe('NovaContaPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza o título "Registrar gasto"', () => {
    renderPage();
    expect(screen.getByText('Registrar gasto')).toBeInTheDocument();
  });

  it('renderiza toggle "Preciso pagar" e "Já paguei"', () => {
    renderPage();
    expect(screen.getByText('Preciso pagar')).toBeInTheDocument();
    expect(screen.getByText('Já paguei')).toBeInTheDocument();
  });

  it('renderiza campo de descrição', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/aluguel do escritório/i)).toBeInTheDocument();
  });

  it('renderiza campo Valor', () => {
    renderPage();
    expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument();
  });

  it('renderiza campo de motivo/justificativa', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/impressão para evento no bairro/i)).toBeInTheDocument();
  });

  it('renderiza botão "Lançar conta"', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /lançar conta/i })).toBeInTheDocument();
  });

  it('renderiza botão Cancelar', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('exibe erro quando descrição está vazia', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /lançar conta/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Descreva o que foi comprado/pago'),
    );
  });

  it('exibe erro quando data de vencimento está vazia', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/aluguel do escritório/i), {
      target: { value: 'Energia elétrica' },
    });
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '200,00' } });
    // Não preenche data
    fireEvent.change(screen.getByPlaceholderText(/impressão para evento/i), {
      target: { value: 'Necessário para campanha' },
    });
    fireEvent.click(screen.getByRole('button', { name: /lançar conta/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Informe a data de vencimento'),
    );
  });

  it('exibe erro de valor inválido', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/aluguel do escritório/i), {
      target: { value: 'Compra X' },
    });
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: 'abc' } });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-04-30' } });
    fireEvent.change(screen.getByPlaceholderText(/impressão para evento/i), {
      target: { value: 'Motivo válido' },
    });
    fireEvent.click(screen.getByRole('button', { name: /lançar conta/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Valor inválido'));
  });

  it('submit válido chama supabase.insert e navega para /', async () => {
    const { contaChain } = setupSupabaseSuccess();
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/aluguel do escritório/i), {
      target: { value: 'Combustível equipe' },
    });
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '350,00' } });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByPlaceholderText(/impressão para evento/i), {
      target: { value: 'Deslocamento da equipe para evento' },
    });
    fireEvent.click(screen.getByRole('button', { name: /lançar conta/i }));

    await waitFor(() => expect(contaChain.insert).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    expect(toast.success).toHaveBeenCalledWith('Conta lançada com sucesso!');
  });

  it('ao clicar em "Já paguei" o botão muda para "Registrar pagamento"', () => {
    renderPage();
    fireEvent.click(screen.getByText('Já paguei'));
    expect(screen.getByRole('button', { name: /registrar pagamento/i })).toBeInTheDocument();
  });

  it('ao clicar em "Já paguei" mostra campo "Quando foi pago?"', () => {
    renderPage();
    fireEvent.click(screen.getByText('Já paguei'));
    expect(screen.getByText(/quando foi pago/i)).toBeInTheDocument();
  });

  it('botão Cancelar navega de volta', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('botão de voltar (seta) navega de volta', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
