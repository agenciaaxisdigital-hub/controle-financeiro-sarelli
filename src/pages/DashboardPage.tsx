import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, AlertTriangle, ChevronLeft, ChevronRight, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppLayout from '@/components/AppLayout';

interface ContaPagar {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  data_vencimento: string;
  status: string;
  recorrente: boolean | null;
}

export default function DashboardPage() {
  const { usuario, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [aba, setAba] = useState<'pendente' | 'pago'>('pendente');

  useEffect(() => { fetchContas(); }, [usuario, mesAtual]);

  const fetchContas = async () => {
    if (!usuario) return;
    setLoading(true);
    const inicio = format(startOfMonth(mesAtual), 'yyyy-MM-dd');
    const fim = format(endOfMonth(mesAtual), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('contas_pagar')
      .select('id, descricao, categoria, valor, data_vencimento, status, recorrente')
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
      .order('data_vencimento', { ascending: true });

    if (data) setContas(data as ContaPagar[]);
    setLoading(false);
  };

  const pendentes = contas.filter(c => c.status === 'Lancada' || c.status === 'Aprovada');
  const pagos = contas.filter(c => c.status === 'Paga');
  const lista = aba === 'pendente' ? pendentes : pagos;

  const totalPendente = pendentes.reduce((s, c) => s + Number(c.valor), 0);
  const totalPago = pagos.reduce((s, c) => s + Number(c.valor), 0);

  const isVencida = (c: ContaPagar) => {
    if (c.status === 'Paga' || c.status === 'Cancelada') return false;
    return new Date(c.data_vencimento + 'T00:00:00') < new Date();
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const fmtData = (d: string) => {
    try { return format(new Date(d + 'T00:00:00'), 'dd/MM', { locale: ptBR }); }
    catch { return d; }
  };

  const mesLabel = format(mesAtual, "MMMM yyyy", { locale: ptBR });

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">

        {/* Seletor de mês — grande e claro */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMesAtual(subMonths(mesAtual, 1))}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted active:scale-90 transition-all"
          >
            <ChevronLeft size={22} />
          </button>
          <h2 className="text-lg font-bold capitalize">{mesLabel}</h2>
          <button
            onClick={() => setMesAtual(addMonths(mesAtual, 1))}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted active:scale-90 transition-all"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Resumo visual — 2 cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="section-card !p-4 !space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-yellow-500" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Pendente</span>
            </div>
            <p className="text-xl font-bold text-yellow-600 tabular-nums">{fmt(totalPendente)}</p>
            <p className="text-[11px] text-muted-foreground">{pendentes.length} conta{pendentes.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="section-card !p-4 !space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Pago</span>
            </div>
            <p className="text-xl font-bold text-green-600 tabular-nums">{fmt(totalPago)}</p>
            <p className="text-[11px] text-muted-foreground">{pagos.length} conta{pagos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Abas Pendente / Pago */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-card rounded-2xl border border-border">
          <button
            onClick={() => setAba('pendente')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              aba === 'pendente'
                ? 'gradient-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground'
            )}
          >
            <Clock size={15} />
            Pendentes ({pendentes.length})
          </button>
          <button
            onClick={() => setAba('pago')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              aba === 'pago'
                ? 'gradient-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground'
            )}
          >
            <CheckCircle2 size={15} />
            Pagos ({pagos.length})
          </button>
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
        ) : lista.length === 0 ? (
          <div className="section-card text-center py-10 space-y-2">
            <p className="text-3xl">{aba === 'pendente' ? '🎉' : '📋'}</p>
            <p className="text-sm font-medium">
              {aba === 'pendente' ? 'Nenhuma conta pendente!' : 'Nenhum pagamento neste mês'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {aba === 'pendente' ? 'Tudo em dia por aqui' : 'Os pagamentos aparecerão aqui'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {lista.map((conta, i) => {
              const vencida = isVencida(conta);
              return (
                <button
                  key={conta.id}
                  onClick={() => navigate(`/conta/${conta.id}`)}
                  className={cn(
                    'section-card w-full text-left active:scale-[0.98] transition-transform !p-4 !space-y-0',
                    vencida && 'border-red-400/40',
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {vencida && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                        {conta.recorrente && <RefreshCw size={11} className="text-blue-500 shrink-0" />}
                        <p className="font-semibold text-sm truncate">{conta.descricao}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {vencida ? '⚠️ Vencida' : aba === 'pago' ? 'Pago' : `Vence ${fmtData(conta.data_vencimento)}`}
                        {conta.categoria && ` · ${conta.categoria}`}
                      </p>
                    </div>
                    <p className={cn(
                      'text-sm font-bold tabular-nums shrink-0',
                      aba === 'pago' ? 'text-green-600' : vencida ? 'text-red-500' : 'text-foreground'
                    )}>
                      {fmt(Number(conta.valor))}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Botão flutuante */}
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
