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
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'conta-id-001' }),
  };
});

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));
// ---------------------------------------------------------------------------

import ContaDetalhePage from '@/pages/ContaDetalhePage';
import { toast } from 'sonner';

const adminAuth = {
  user: { id: 'u1' } as any,
  usuario: { id: 'usr-admin', auth_user_id: 'u1', nome: 'Admin', tipo: 'admin' },
  loading: false,
  isAdmin: true,
  signInByNome: vi.fn(),
  signOut: vi.fn(),
};

const regularAuth = { ...adminAuth, isAdmin: false };

const mockLogs = [
  {
    id: 'log-1', acao: 'CRIADA', status_anterior: null, status_novo: 'Lancada',
    observacao: null, criado_em: '2026-03-01T10:00:00Z', usuario_id: 'usr-1',
  },
];

const buildConta = (status: string) => ({
  id: 'conta-id-001', descricao: 'Impressão de panfletos', categoria: 'Material gráfico',
  valor: 1200, data_vencimento: '2026-04-15', data_emissao: null, status,
  motivo: 'Necessário para campanha no bairro X', observacoes: null, comprovante_url: null,
  criado_em: '2026-03-10T08:00:00Z', criado_por: 'usr-1', aprovado_por: null,
  pago_por: null, data_pagamento: null, forma_pagamento: null, atualizado_em: null,
});

const setupFrom = (status: string) => {
  const conta = buildConta(status);
  const contaChain: any = {
    select: vi.fn(() => contaChain),
    eq: vi.fn(() => contaChain),
    order: vi.fn(() => Promise.resolve({ data: mockLogs, error: null })),
    single: vi.fn(() => Promise.resolve({ data: conta, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  };
  const logChain: any = {
    select: vi.fn(() => logChain),
    eq: vi.fn(() => logChain),
    order: vi.fn(() => Promise.resolve({ data: mockLogs, error: null })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  mockFrom.mockImplementation((table: string) => {
    if (table === 'contas_pagar') return contaChain;
    return logChain;
  });
  return { contaChain, logChain };
};

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/conta/conta-id-001']}>
        <ContaDetalhePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('ContaDetalhePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza a descrição da conta', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Impressão de panfletos').length).toBeGreaterThan(0),
    );
  });

  it('renderiza o valor formatado', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText(/R\$\s*1\.200/)[0]).toBeInTheDocument(),
    );
  });

  it('badge mostra label humano "Aguardando revisão" para status Lancada', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Aguardando revisão').length).toBeGreaterThan(0),
    );
  });

  it('badge mostra "A pagar" para status Aprovada', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Aprovada');
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('A pagar').length).toBeGreaterThan(0),
    );
  });

  it('badge mostra "Pago" para status Paga', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Paga');
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Pago').length).toBeGreaterThan(0),
    );
  });

  it('renderiza o motivo da despesa', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Necessário para campanha no bairro X')).toBeInTheDocument(),
    );
  });

  it('admin com status Lancada vê botão "Aprovar conta"', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /aprovar conta/i })).toBeInTheDocument(),
    );
  });

  it('admin com status Lancada vê botão "Recusar / Cancelar"', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /recusar.*cancelar/i })).toBeInTheDocument(),
    );
  });

  it('admin com status Aprovada vê botão "Confirmar pagamento"', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Aprovada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /confirmar pagamento/i })).toBeInTheDocument(),
    );
  });

  it('admin com status Aprovada vê selector "Como foi / será pago?"', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Aprovada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/como foi.*será pago/i)).toBeInTheDocument(),
    );
  });

  it('admin com status Paga NÃO vê botões de ação', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Paga');
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Pago').length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar pagamento/i })).not.toBeInTheDocument();
  });

  it('usuário comum NÃO vê seção de ações', async () => {
    mockUseAuth.mockReturnValue(regularAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Aguardando revisão').length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument();
  });

  it('clicar em "Aprovar conta" chama update no supabase', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    const { contaChain } = setupFrom('Lancada');
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /aprovar conta/i }));
    fireEvent.click(screen.getByRole('button', { name: /aprovar conta/i }));
    await waitFor(() => expect(contaChain.update).toHaveBeenCalled());
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('A pagar')),
    );
  });

  it('renderiza o histórico de logs com label humanizado', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Lançamento registrado')).toBeInTheDocument(),
    );
  });

  it('botão voltar navega de volta', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Aguardando revisão').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
