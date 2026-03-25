import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, AlertTriangle } from 'lucide-react';
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

const statusConfig: Record<string, { label: string; style: string }> = {
  Lancada:  { label: 'Aguardando',  style: 'bg-yellow-500/15 text-yellow-600 border-yellow-400/30' },
  Aprovada: { label: 'A pagar',     style: 'bg-blue-500/15 text-blue-600 border-blue-400/30' },
  Paga:     { label: 'Pago',        style: 'bg-green-500/15 text-green-600 border-green-400/30' },
  Cancelada:{ label: 'Cancelado',   style: 'bg-red-500/15 text-red-500 border-red-400/30' },
};

const FILTROS = [
  { label: 'Tudo',       statuses: [] },
  { label: 'A pagar',    statuses: ['Lancada', 'Aprovada'] },
  { label: 'Pago',       statuses: ['Paga'] },
  { label: 'Cancelado',  statuses: ['Cancelada'] },
];

const isVencida = (conta: ContaPagar) => {
  if (conta.status === 'Paga' || conta.status === 'Cancelada') return false;
  return new Date(conta.data_vencimento + 'T00:00:00') < new Date();
};

export default function DashboardPage() {
  const { usuario, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroIdx, setFiltroIdx] = useState(0);
  const [stats, setStats] = useState({ aberto: 0, vencendo7d: 0, vencidas: 0, pagasMes: 0 });

  useEffect(() => { fetchContas(); }, [usuario]);

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
    const in7days = new Date(); in7days.setDate(now.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const aberto = data
      .filter(c => c.status === 'Lancada' || c.status === 'Aprovada')
      .reduce((s, c) => s + Number(c.valor), 0);

    const vencendo7d = data
      .filter(c => {
        const v = new Date(c.data_vencimento);
        return (c.status === 'Lancada' || c.status === 'Aprovada') && v >= now && v <= in7days;
      })
      .reduce((s, c) => s + Number(c.valor), 0);

    const vencidas = data
      .filter(c => {
        const v = new Date(c.data_vencimento);
        return (c.status === 'Lancada' || c.status === 'Aprovada') && v < now;
      })
      .reduce((s, c) => s + Number(c.valor), 0);

    const pagasMes = data
      .filter(c => c.status === 'Paga' && new Date(c.criado_em) >= monthStart)
      .reduce((s, c) => s + Number(c.valor), 0);

    setStats({ aberto, vencendo7d, vencidas, pagasMes });
  };

  const filtro = FILTROS[filtroIdx];
  const filtered = filtro.statuses.length === 0
    ? contas
    : contas.filter(c => filtro.statuses.includes(c.status));

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const fmtData = (d: string) => {
    try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }); }
    catch { return d; }
  };

  const totalAPagar = contas
    .filter(c => c.status === 'Lancada' || c.status === 'Aprovada')
    .reduce((s, c) => s + Number(c.valor), 0);
  const qtdAPagar = contas.filter(c => c.status === 'Lancada' || c.status === 'Aprovada').length;
  const qtdVencidas = contas.filter(isVencida).length;

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Título */}
        <div>
          <h2 className="page-title">
            {isAdmin ? 'Todas as contas' : 'Minhas contas'}
          </h2>
          <p className="page-subtitle">
            {isAdmin ? 'Visão geral de todos os lançamentos' : 'Seus gastos registrados'}
          </p>
        </div>

        {/* Resumo */}
        {isAdmin ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total a pagar', value: stats.aberto, color: 'text-yellow-500' },
              { label: 'Vence em 7 dias', value: stats.vencendo7d, color: 'text-blue-500' },
              { label: 'Atrasados', value: stats.vencidas, color: 'text-red-500' },
              { label: 'Pago este mês', value: stats.pagasMes, color: 'text-green-500' },
            ].map(s => (
              <div key={s.label} className="section-card !p-4">
                <p className="label-micro">{s.label}</p>
                <p className={cn('text-lg font-bold tabular-nums', s.color)}>{fmt(s.value)}</p>
              </div>
            ))}
          </div>
        ) : qtdAPagar > 0 ? (
          <div className={cn(
            'section-card !p-4 flex items-center justify-between',
            qtdVencidas > 0 ? 'border-red-400/40 bg-red-500/5' : 'border-yellow-400/30 bg-yellow-500/5',
          )}>
            <div>
              <p className="text-sm font-semibold">
                {qtdVencidas > 0
                  ? `⚠️ ${qtdVencidas} conta${qtdVencidas > 1 ? 's' : ''} atrasada${qtdVencidas > 1 ? 's' : ''}!`
                  : `${qtdAPagar} conta${qtdAPagar > 1 ? 's' : ''} a pagar`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Total: {fmt(totalAPagar)}</p>
            </div>
            {qtdVencidas > 0 && <AlertTriangle size={22} className="text-red-500 shrink-0" />}
          </div>
        ) : null}

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {FILTROS.map((f, idx) => (
            <button
              key={f.label}
              onClick={() => setFiltroIdx(idx)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 border',
                filtroIdx === idx
                  ? 'gradient-primary text-primary-foreground border-transparent shadow-md'
                  : 'bg-card text-muted-foreground border-border',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
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
          <div className="section-card text-center py-12 space-y-2">
            <p className="text-muted-foreground text-sm">Nenhum registro encontrado</p>
            <button
              onClick={() => navigate('/nova-conta')}
              className="text-primary text-sm font-semibold"
            >
              + Registrar novo gasto
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((conta, i) => {
              const vencida = isVencida(conta);
              const cfg = statusConfig[conta.status] ?? { label: conta.status, style: 'bg-muted text-muted-foreground' };
              return (
                <button
                  key={conta.id}
                  onClick={() => navigate(`/conta/${conta.id}`)}
                  className={cn(
                    'section-card w-full text-left active:scale-[0.98] transition-transform',
                    vencida && 'border-red-400/40',
                  )}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {vencida && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                        <p className="font-semibold text-sm truncate">{conta.descricao}</p>
                      </div>
                      <p className="text-micro mt-0.5">
                        {conta.status === 'Paga' ? 'Pago' : 'Vence'}: {fmtData(conta.data_vencimento)}
                        {' · '}
                        <span className="font-medium text-foreground">{fmt(Number(conta.valor))}</span>
                      </p>
                      {conta.categoria && (
                        <p className="text-micro">{conta.categoria}</p>
                      )}
                    </div>
                    <span className={cn(
                      'text-[10px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0',
                      cfg.style,
                    )}>
                      {cfg.label}
                    </span>
                  </div>
                </button>
              );
            })}
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
