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
    id: 'log-1',
    acao: 'CRIADA',
    status_anterior: null,
    status_novo: 'Lancada',
    observacao: null,
    criado_em: '2026-03-01T10:00:00Z',
    usuario_id: 'usr-1',
  },
];

const buildConta = (status: string) => ({
  id: 'conta-id-001',
  descricao: 'Impressão de panfletos',
  categoria: 'Material gráfico',
  valor: 1200,
  data_vencimento: '2026-04-15',
  data_emissao: null,
  status,
  motivo: 'Necessário para campanha no bairro X',
  observacoes: null,
  comprovante_url: null,
  criado_em: '2026-03-10T08:00:00Z',
  criado_por: 'usr-1',
  aprovado_por: null,
  pago_por: null,
  data_pagamento: null,
  forma_pagamento: null,
  atualizado_em: null,
});

const setupFrom = (status: string, extraLogsResult?: any) => {
  const conta = buildConta(status);
  const contaChain: any = {
    select: vi.fn(() => contaChain),
    eq: vi.fn(() => contaChain),
    order: vi.fn(() => Promise.resolve({ data: extraLogsResult ?? mockLogs, error: null })),
    single: vi.fn(() => Promise.resolve({ data: conta, error: null })),
    update: vi.fn(() => contaChain),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  const logChain: any = {
    select: vi.fn(() => logChain),
    eq: vi.fn(() => logChain),
    order: vi.fn(() => Promise.resolve({ data: extraLogsResult ?? mockLogs, error: null })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  mockFrom.mockImplementation((table: string) => {
    if (table === 'contas_pagar') return contaChain;
    return logChain;
  });

  return { contaChain, logChain, conta };
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

  it('renderiza o valor formatado da conta', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText(/R\$\s*1\.200/)[0]).toBeInTheDocument(),
    );
  });

  it('renderiza o badge de status "Lancada"', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Lancada').length).toBeGreaterThan(0),
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

  it('admin com status Lancada vê botão Aprovar', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /aprovar/i })).toBeInTheDocument(),
    );
  });

  it('admin com status Lancada vê botão Cancelar', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument(),
    );
  });

  it('admin com status Aprovada vê botão Marcar como Paga', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Aprovada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /marcar como paga/i })).toBeInTheDocument(),
    );
  });

  it('admin com status Aprovada vê selector de forma de pagamento', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Aprovada');
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Forma de pagamento')).toBeInTheDocument(),
    );
  });

  it('admin com status Paga NÃO vê botões de ação', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Paga');
    renderPage();
    await waitFor(() => screen.getAllByText('Paga'));
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /marcar como paga/i })).not.toBeInTheDocument();
  });

  it('usuário comum NÃO vê seção de ações', async () => {
    mockUseAuth.mockReturnValue(regularAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() => screen.getAllByText('Lancada'));
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument();
  });

  it('clicar em Aprovar chama update no supabase', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    const { contaChain } = setupFrom('Lancada');
    // Recarrega depois do update
    contaChain.update.mockReturnValue({
      ...contaChain,
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /aprovar/i }));

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));

    await waitFor(() => expect(contaChain.update).toHaveBeenCalled());
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Status atualizado para Aprovada'),
    );
  });

  it('renderiza o histórico de logs', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() => expect(screen.getByText('CRIADA')).toBeInTheDocument());
  });

  it('botão voltar (seta) navega de volta', async () => {
    mockUseAuth.mockReturnValue(adminAuth);
    setupFrom('Lancada');
    renderPage();
    await waitFor(() => screen.getAllByText('Lancada'));

    const backBtn = screen.getAllByRole('button')[0];
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
