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

  it('admin vê cards de estatísticas', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Em aberto')).toBeInTheDocument();
      expect(screen.getByText('Vencendo 7 dias')).toBeInTheDocument();
      expect(screen.getByText('Vencidas')).toBeInTheDocument();
      expect(screen.getByText('Pagas no mês')).toBeInTheDocument();
    });
  });

  it('usuário comum NÃO vê cards de estatísticas', async () => {
    mockUseAuth.mockReturnValue(regularUser);
    renderDashboard();
    await waitFor(() => expect(screen.queryByText('Em aberto')).not.toBeInTheDocument());
  });

  it('renderiza os botões de filtro', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Lancadas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Aprovadas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pagas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Canceladas' })).toBeInTheDocument();
    });
  });

  it('lista as contas buscadas do Supabase', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Impressão de santinhos')).toBeInTheDocument();
      expect(screen.getByText('Combustível equipe')).toBeInTheDocument();
      expect(screen.getByText('Pagamento DJ')).toBeInTheDocument();
    });
  });

  it('filtrar por "Lancada" exibe só as contas com esse status', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => screen.getByText('Impressão de santinhos'));

    fireEvent.click(screen.getByRole('button', { name: 'Lancadas' }));

    expect(screen.getByText('Impressão de santinhos')).toBeInTheDocument();
    expect(screen.queryByText('Combustível equipe')).not.toBeInTheDocument();
    expect(screen.queryByText('Pagamento DJ')).not.toBeInTheDocument();
  });

  it('clicar em uma conta navega para /conta/:id', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => screen.getByText('Impressão de santinhos'));

    fireEvent.click(screen.getByText('Impressão de santinhos').closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/conta/c1');
  });

  it('botão FAB (+ Nova Conta) navega para /nova-conta', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    renderDashboard();
    await waitFor(() => screen.getByText('Impressão de santinhos'));

    // FAB é o último botão fixo com aria sem texto visível — buscamos pelo svg/Plus
    const fabBtn = document.querySelector('button.fixed') as HTMLButtonElement;
    expect(fabBtn).toBeTruthy();
    fireEvent.click(fabBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/nova-conta');
  });

  it('exibe estado vazio quando não há contas', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText('Nenhuma conta encontrada')).toBeInTheDocument(),
    );
  });

  it('link "Lançar nova conta" no estado vazio navega para /nova-conta', async () => {
    mockUseAuth.mockReturnValue(adminUser);
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    renderDashboard();
    await waitFor(() => screen.getByText('Lançar nova conta'));
    fireEvent.click(screen.getByText('Lançar nova conta'));
    expect(mockNavigate).toHaveBeenCalledWith('/nova-conta');
  });
});
