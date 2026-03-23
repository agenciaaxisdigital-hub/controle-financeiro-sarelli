import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---- mocks ----------------------------------------------------------------
vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));
// ---------------------------------------------------------------------------

import DashboardPage from '@/pages/DashboardPage';

const makeChain = (result: any) => {
  const chain: any = {
    select: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(result)),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
};

const adminUser = {
  user: { id: 'u1' } as any,
  usuario: { id: 'usr-1', auth_user_id: 'u1', nome: 'Admin', tipo: 'admin' },
  loading: false,
  isAdmin: true,
  signInByNome: vi.fn(),
  signOut: vi.fn(),
};

const regularUser = {
  ...adminUser,
  usuario: { id: 'usr-2', auth_user_id: 'u2', nome: 'João', tipo: 'lancador' },
  isAdmin: false,
};

const mockContas = [
  {
    id: 'c1', descricao: 'Impressão de santinhos', categoria: 'Material gráfico',
    valor: 1500, data_vencimento: '2026-04-01', status: 'Lancada',
    criado_em: '2026-03-01T10:00:00Z', fornecedor_nome_livre: null,
  },
  {
    id: 'c2', descricao: 'Combustível equipe', categoria: 'Combustível',
    valor: 300, data_vencimento: '2026-03-25', status: 'Aprovada',
    criado_em: '2026-03-20T08:00:00Z', fornecedor_nome_livre: null,
  },
  {
    id: 'c3', descricao: 'Pagamento DJ', categoria: 'Eventos',
    valor: 800, data_vencimento: '2026-03-10', status: 'Paga',
    criado_em: '2026-03-05T09:00:00Z', fornecedor_nome_livre: null,
  },
];

const renderDashboard = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeChain({ data: mockContas, error: null }));
  });

  it('admin vê título "Todas as contas"', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Todas as contas')).toBeInTheDocument());
  });

  it('usuário comum vê título "Minhas contas"', async () => {
    mockUseAuth.mockReturnValue(regularUser);
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Minhas contas')).toBeInTheDocument());
  });

  it('admin vê cards de estatísticas com labels corretos', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Total a pagar')).toBeInTheDocument();
      expect(screen.getByText('Vence em 7 dias')).toBeInTheDocument();
      expect(screen.getByText('Atrasados')).toBeInTheDocument();
      expect(screen.getByText('Pago este mês')).toBeInTheDocument();
    });
  });

  it('usuário comum NÃO vê cards de estatísticas admin', async () => {
    mockUseAuth.mockReturnValue(regularUser);
    renderDashboard();
    await waitFor(() => expect(screen.queryByText('Total a pagar')).not.toBeInTheDocument());
  });

  it('usuário comum com contas a pagar vê resumo de pendências', async () => {
    mockUseAuth.mockReturnValue(regularUser);
    renderDashboard();
    await waitFor(() =>
      expect(screen.getAllByText(/conta.*a pagar|contas a pagar|aguardando/i).length).toBeGreaterThan(0),
    );
  });

  it('renderiza os 4 botões de filtro com linguagem simples', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tudo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'A pagar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pago' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelado' })).toBeInTheDocument();
    });
  });

  it('lista as contas com descrições', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Impressão de santinhos')).toBeInTheDocument();
      expect(screen.getByText('Combustível equipe')).toBeInTheDocument();
      expect(screen.getByText('Pagamento DJ')).toBeInTheDocument();
    });
  });

  it('status é exibido em linguagem humana (Aguardando, A pagar, Pago)', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByText('Aguardando').length).toBeGreaterThan(0); // Lancada
      expect(screen.getAllByText('A pagar').length).toBeGreaterThan(0);    // Aprovada
      expect(screen.getAllByText('Pago').length).toBeGreaterThan(0);       // Paga
    });
  });

  it('filtro "A pagar" exibe só Lancada + Aprovada', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => screen.getByText('Impressão de santinhos'));

    fireEvent.click(screen.getByRole('button', { name: 'A pagar' }));

    expect(screen.getByText('Impressão de santinhos')).toBeInTheDocument();  // Lancada
    expect(screen.getByText('Combustível equipe')).toBeInTheDocument();       // Aprovada
    expect(screen.queryByText('Pagamento DJ')).not.toBeInTheDocument();       // Paga — deve sumir
  });

  it('clicar em uma conta navega para /conta/:id', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => screen.getByText('Impressão de santinhos'));
    fireEvent.click(screen.getByText('Impressão de santinhos').closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/conta/c1');
  });

  it('botão FAB navega para /nova-conta', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => screen.getByText('Impressão de santinhos'));
    const fabBtn = document.querySelector('button.fixed') as HTMLButtonElement;
    fireEvent.click(fabBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/nova-conta');
  });

  it('estado vazio exibe mensagem e link de novo registro', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument(),
    );
    expect(screen.getByText('+ Registrar novo gasto')).toBeInTheDocument();
  });

  it('link "+ Registrar novo gasto" no estado vazio navega para /nova-conta', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    renderDashboard();
    await waitFor(() => screen.getByText('+ Registrar novo gasto'));
    fireEvent.click(screen.getByText('+ Registrar novo gasto'));
    expect(mockNavigate).toHaveBeenCalledWith('/nova-conta');
  });
});
