import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppLayout from '@/components/AppLayout';

interface ContaPagar {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  data_vencimento: string;
  status: string;
  criado_em: string;
  fornecedor_nome_livre: string | null;
}

const statusColors: Record<string, string> = {
  Lancada: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Aprovada: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Paga: 'bg-green-500/20 text-green-400 border-green-500/30',
  Cancelada: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const filters = ['Todas', 'Lancada', 'Aprovada', 'Paga', 'Cancelada'];

export default function DashboardPage() {
  const { usuario, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [stats, setStats] = useState({ aberto: 0, vencendo7d: 0, vencidas: 0, pagasMes: 0 });

  useEffect(() => {
    fetchContas();
  }, [usuario]);

  const fetchContas = async () => {
    if (!usuario) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('contas_pagar')
      .select('id, descricao, categoria, valor, data_vencimento, status, criado_em, fornecedor_nome_livre')
      .order('data_vencimento', { ascending: true });

    if (!error && data) {
      setContas(data as ContaPagar[]);
      calcStats(data as ContaPagar[]);
    }
    setLoading(false);
  };

  const calcStats = (data: ContaPagar[]) => {
    const now = new Date();
    const in7days = new Date();
    in7days.setDate(now.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const aberto = data
      .filter(c => c.status === 'Lancada' || c.status === 'Aprovada')
      .reduce((sum, c) => sum + Number(c.valor), 0);

    const vencendo7d = data
      .filter(c => {
        const venc = new Date(c.data_vencimento);
        return (c.status === 'Lancada' || c.status === 'Aprovada') && venc >= now && venc <= in7days;
      })
      .reduce((sum, c) => sum + Number(c.valor), 0);

    const vencidas = data
      .filter(c => {
        const venc = new Date(c.data_vencimento);
        return (c.status === 'Lancada' || c.status === 'Aprovada') && venc < now;
      })
      .reduce((sum, c) => sum + Number(c.valor), 0);

    const pagasMes = data
      .filter(c => {
        if (c.status !== 'Paga') return false;
        const criado = new Date(c.criado_em);
        return criado >= monthStart;
      })
      .reduce((sum, c) => sum + Number(c.valor), 0);

    setStats({ aberto, vencendo7d, vencidas, pagasMes });
  };

  const filtered = activeFilter === 'Todas'
    ? contas
    : contas.filter(c => c.status === activeFilter);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold">
            {isAdmin ? 'Todas as contas' : 'Minhas contas'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Visão geral de todos os lançamentos' : 'Lançamentos que você registrou'}
          </p>
        </div>

        {/* Stats - Admin only */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Em aberto', value: stats.aberto, color: 'text-yellow-400' },
              { label: 'Vencendo 7 dias', value: stats.vencendo7d, color: 'text-blue-400' },
              { label: 'Vencidas', value: stats.vencidas, color: 'text-red-400' },
              { label: 'Pagas no mês', value: stats.pagasMes, color: 'text-green-400' },
            ].map(stat => (
              <div key={stat.label} className="section-card !p-3">
                <p className="label-micro">{stat.label}</p>
                <p className={cn('text-lg font-bold tabular-nums', stat.color)}>
                  {formatCurrency(stat.value)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 border',
                activeFilter === f
                  ? 'gradient-primary text-primary-foreground border-transparent'
                  : 'bg-card text-muted-foreground border-border'
              )}
            >
              {f === 'Todas' ? 'Todas' : f + 's'}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="section-card animate-pulse !space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="section-card text-center py-12">
            <p className="text-muted-foreground">Nenhuma conta encontrada</p>
            <button
              onClick={() => navigate('/nova-conta')}
              className="text-primary text-sm font-medium mt-2"
            >
              Lançar nova conta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((conta, i) => (
              <button
                key={conta.id}
                onClick={() => navigate(`/conta/${conta.id}`)}
                className="section-card w-full text-left active:scale-[0.98] transition-transform"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{conta.descricao}</p>
                    <p className="text-micro mt-0.5">
                      Vencimento: {formatDate(conta.data_vencimento)} · {formatCurrency(Number(conta.valor))}
                    </p>
                    {conta.categoria && (
                      <p className="text-micro">{conta.categoria}</p>
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap',
                    statusColors[conta.status] || 'bg-muted text-muted-foreground'
                  )}>
                    {conta.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/nova-conta')}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full gradient-primary shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40"
        style={{ right: 'max(1rem, calc((100vw - 672px) / 2 + 1rem))' }}
      >
        <Plus size={24} className="text-primary-foreground" />
      </button>
    </AppLayout>
  );
}
