import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, CreditCard, Clock, FileText, MessageSquare, Paperclip, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';

const statusConfig: Record<string, { label: string; style: string }> = {
  Lancada:  { label: 'Aguardando revisão', style: 'bg-yellow-500/15 text-yellow-600 border-yellow-400/30' },
  Aprovada: { label: 'A pagar',            style: 'bg-blue-500/15 text-blue-600 border-blue-400/30' },
  Paga:     { label: 'Pago',               style: 'bg-green-500/15 text-green-600 border-green-400/30' },
  Cancelada:{ label: 'Cancelado',          style: 'bg-red-500/15 text-red-500 border-red-400/30' },
};

const formasPagamento = ['Dinheiro', 'Transferência', 'PIX', 'Cartão', 'Boleto', 'Cheque'];

const acaoLabel: Record<string, string> = {
  CRIADA: 'Lançamento registrado',
  STATUS_ALTERADO: 'Status atualizado',
};

interface LogEntry {
  id: string;
  acao: string;
  status_anterior: string | null;
  status_novo: string | null;
  observacao: string | null;
  criado_em: string;
  usuario_id: string;
}

export default function ContaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario, isAdmin } = useAuth();
  const [conta, setConta] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { if (id) fetchConta(); }, [id]);

  const fetchConta = async () => {
    setLoading(true);
    const [contaRes, logsRes] = await Promise.all([
      supabase.from('contas_pagar').select('*').eq('id', id!).single(),
      supabase.from('contas_pagar_logs').select('*').eq('conta_id', id!).order('criado_em', { ascending: false }),
    ]);
    if (contaRes.data) setConta(contaRes.data);
    if (logsRes.data) setLogs(logsRes.data as LogEntry[]);
    setLoading(false);
  };

  const changeStatus = async (newStatus: string) => {
    if (!conta || !usuario) return;
    setActionLoading(true);

    const updates: any = { status: newStatus, atualizado_em: new Date().toISOString() };
    if (newStatus === 'Aprovada') updates.aprovado_por = usuario.id;
    if (newStatus === 'Paga') {
      updates.pago_por = usuario.id;
      updates.data_pagamento = new Date().toISOString().split('T')[0];
      if (formaPagamento) updates.forma_pagamento = formaPagamento;
    }

    const { error } = await supabase.from('contas_pagar').update(updates).eq('id', conta.id);
    if (error) {
      toast.error('Erro ao atualizar. Tente novamente.');
      setActionLoading(false);
      return;
    }

    await supabase.from('contas_pagar_logs').insert({
      conta_id: conta.id,
      usuario_id: usuario.id,
      acao: 'STATUS_ALTERADO',
      status_anterior: conta.status,
      status_novo: newStatus,
    });

    toast.success(`Atualizado para: ${statusConfig[newStatus]?.label ?? newStatus}`);
    fetchConta();
    setActionLoading(false);
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const fmtData = (d: string | null) => {
    if (!d) return '—';
    try {
      const dt = d.includes('T') ? new Date(d) : new Date(d + 'T00:00:00');
      return format(dt, 'dd/MM/yyyy', { locale: ptBR });
    } catch { return d; }
  };

  const fmtDateTime = (d: string) => {
    try { return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
    catch { return d; }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="section-card animate-pulse !space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!conta) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Conta não encontrada</div>
      </AppLayout>
    );
  }

  const cfg = statusConfig[conta.status] ?? { label: conta.status, style: 'bg-muted text-muted-foreground' };

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">

        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground mt-1 active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight">{conta.descricao}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', cfg.style)}>
                {cfg.label}
              </span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {fmt(Number(conta.valor))}
              </span>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><FileText size={14} /> Detalhes</p>
          <div className="space-y-2 text-sm">
            <Row label="O que é" value={conta.descricao} />
            {conta.categoria && <Row label="Categoria" value={conta.categoria} />}
            <Row label="Valor" value={fmt(Number(conta.valor))} />
            <Row label={conta.status === 'Paga' ? 'Data do pagamento' : 'Vencimento'} value={fmtData(conta.data_pagamento ?? conta.data_vencimento)} />
            {conta.forma_pagamento && <Row label="Forma de pagamento" value={conta.forma_pagamento} />}
          </div>
        </div>

        {/* Motivo */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><MessageSquare size={14} /> Por que foi necessário</p>
          <p className="text-sm leading-relaxed">{conta.motivo}</p>
        </div>

        {/* Status / fluxo */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><Clock size={14} /> Situação</p>
          <div className="space-y-2 text-sm">
            <Row label="Situação atual" value={cfg.label} />
            <Row label="Registrado em" value={fmtDateTime(conta.criado_em)} />
            {conta.data_pagamento && <Row label="Pago em" value={fmtData(conta.data_pagamento)} />}
          </div>
        </div>

        {/* Comprovante / obs */}
        {(conta.comprovante_url || conta.observacoes) && (
          <div className="section-card">
            <p className="section-title flex items-center gap-2"><Paperclip size={14} /> Comprovante e Observações</p>
            {conta.comprovante_url && (
              <a href={conta.comprovante_url} target="_blank" rel="noopener"
                className="text-sm text-primary underline break-all block">
                Ver comprovante →
              </a>
            )}
            {conta.observacoes && (
              <p className="text-sm text-muted-foreground mt-1">{conta.observacoes}</p>
            )}
          </div>
        )}

        {/* Histórico */}
        {logs.length > 0 && (
          <div className="section-card">
            <p className="section-title flex items-center gap-2"><History size={14} /> Histórico</p>
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="text-xs border-l-2 border-border pl-3 py-1">
                  <p className="text-muted-foreground">{fmtDateTime(log.criado_em)}</p>
                  <p className="font-medium">
                    {acaoLabel[log.acao] ?? log.acao}
                    {log.status_anterior && log.status_novo && (
                      <span className="text-muted-foreground font-normal">
                        {' · '}
                        {statusConfig[log.status_anterior]?.label ?? log.status_anterior}
                        {' → '}
                        {statusConfig[log.status_novo]?.label ?? log.status_novo}
                      </span>
                    )}
                  </p>
                  {log.observacao && <p className="text-muted-foreground">{log.observacao}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações — somente admin */}
        {isAdmin && (conta.status === 'Lancada' || conta.status === 'Aprovada') && (
          <div className="section-card">
            <p className="section-title">Ações</p>
            <div className="space-y-3">
              {conta.status === 'Lancada' && (
                <>
                  <Button
                    onClick={() => changeStatus('Aprovada')}
                    disabled={actionLoading}
                    className="w-full h-11 gradient-primary text-primary-foreground font-semibold rounded-xl"
                  >
                    <Check size={16} className="mr-2" /> Aprovar conta
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => changeStatus('Cancelada')}
                    disabled={actionLoading}
                    className="w-full h-11 text-destructive border-destructive/30 rounded-xl"
                  >
                    <X size={16} className="mr-2" /> Recusar / Cancelar
                  </Button>
                </>
              )}

              {conta.status === 'Aprovada' && (
                <>
                  <div className="space-y-1.5">
                    <label className="label-micro">Como foi / será pago?</label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                      <SelectTrigger className="h-11 bg-background">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamento.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => changeStatus('Paga')}
                    disabled={actionLoading}
                    className="w-full h-11 gradient-primary text-primary-foreground font-semibold rounded-xl"
                  >
                    <CreditCard size={16} className="mr-2" /> Confirmar pagamento
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => changeStatus('Cancelada')}
                    disabled={actionLoading}
                    className="w-full h-11 text-destructive border-destructive/30 rounded-xl"
                  >
                    <X size={16} className="mr-2" /> Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="pb-4" />
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
