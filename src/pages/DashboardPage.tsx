import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, AlertTriangle, ChevronLeft, ChevronRight, Clock, CheckCircle2, RefreshCw, ChevronRight as Arrow } from 'lucide-react';
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
  const qtdVencidas = pendentes.filter(isVencida).length;

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">

        {/* Boas-vindas */}
        <div>
          <h2 className="text-lg font-bold">
            Olá, {usuario?.nome?.split(' ')[0] || 'Usuário'} 👋
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Acompanhe suas contas e pagamentos
          </p>
        </div>

        {/* Alerta de contas vencidas */}
        {qtdVencidas > 0 && aba === 'pendente' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
            <AlertTriangle size={20} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {qtdVencidas} conta{qtdVencidas > 1 ? 's' : ''} vencida{qtdVencidas > 1 ? 's' : ''}!
              </p>
              <p className="text-[11px] text-red-500">Precisa{qtdVencidas > 1 ? 'm' : ''} de atenção urgente</p>
            </div>
          </div>
        )}

        {/* Seletor de mês */}
        <div className="section-card !p-3 flex items-center justify-between !space-y-0">
          <button
            onClick={() => setMesAtual(subMonths(mesAtual, 1))}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted active:scale-90 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold capitalize">{mesLabel}</span>
          <button
            onClick={() => setMesAtual(addMonths(mesAtual, 1))}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted active:scale-90 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Resumo — 2 cards clicáveis */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAba('pendente')}
            className={cn(
              'section-card !p-4 !space-y-1 text-left transition-all',
              aba === 'pendente' && 'ring-2 ring-primary/30'
            )}
          >
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-yellow-500" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">A pagar</span>
            </div>
            <p className="text-xl font-bold text-yellow-600 tabular-nums">{fmt(totalPendente)}</p>
            <p className="text-[11px] text-muted-foreground">{pendentes.length} conta{pendentes.length !== 1 ? 's' : ''}</p>
          </button>
          <button
            onClick={() => setAba('pago')}
            className={cn(
              'section-card !p-4 !space-y-1 text-left transition-all',
              aba === 'pago' && 'ring-2 ring-primary/30'
            )}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Pago</span>
            </div>
            <p className="text-xl font-bold text-green-600 tabular-nums">{fmt(totalPago)}</p>
            <p className="text-[11px] text-muted-foreground">{pagos.length} conta{pagos.length !== 1 ? 's' : ''}</p>
          </button>
        </div>

        {/* Título da lista */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {aba === 'pendente' ? '📋 Contas a pagar' : '✅ Pagamentos realizados'}
        </p>

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
          <div className="section-card text-center py-10 space-y-3">
            <p className="text-4xl">{aba === 'pendente' ? '🎉' : '📋'}</p>
            <p className="text-sm font-semibold">
              {aba === 'pendente' ? 'Tudo em dia!' : 'Nenhum pagamento neste mês'}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {aba === 'pendente'
                ? 'Não há contas pendentes neste mês'
                : 'Quando uma conta for paga, ela aparecerá aqui'}
            </p>
            {aba === 'pendente' && (
              <button
                onClick={() => navigate('/nova-conta')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-2"
              >
                <Plus size={16} /> Registrar novo gasto
              </button>
            )}
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
                    vencida && 'border-red-300 bg-red-50/50',
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
                        {vencida ? 'Vencida!' : aba === 'pago' ? 'Pago' : `Vence ${fmtData(conta.data_vencimento)}`}
                        {conta.categoria && ` · ${conta.categoria}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className={cn(
                        'text-sm font-bold tabular-nums',
                        aba === 'pago' ? 'text-green-600' : vencida ? 'text-red-500' : 'text-foreground'
                      )}>
                        {fmt(Number(conta.valor))}
                      </p>
                      <Arrow size={16} className="text-muted-foreground/40" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Botão flutuante com label */}
      <button
        onClick={() => navigate('/nova-conta')}
        className="fixed bottom-20 z-40 gradient-primary shadow-lg flex items-center gap-2 px-5 h-12 rounded-full active:scale-95 transition-transform text-primary-foreground font-semibold text-sm"
        style={{ right: 'max(1rem, calc((100vw - 672px) / 2 + 1rem))' }}
      >
        <Plus size={20} />
        Nova conta
      </button>
    </AppLayout>
  );
}
