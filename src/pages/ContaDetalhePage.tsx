import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, CreditCard, Clock, User as UserIcon, FileText, MessageSquare, Paperclip, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';

const statusColors: Record<string, string> = {
  Lancada: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Aprovada: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Paga: 'bg-green-500/20 text-green-400 border-green-500/30',
  Cancelada: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const formasPagamento = ['Dinheiro', 'Transferência', 'PIX', 'Cartão', 'Boleto', 'Cheque'];

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

  useEffect(() => {
    if (id) fetchConta();
  }, [id]);

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

    const updates: any = {
      status: newStatus,
      atualizado_em: new Date().toISOString(),
    };

    if (newStatus === 'Aprovada') updates.aprovado_por = usuario.id;
    if (newStatus === 'Paga') {
      updates.pago_por = usuario.id;
      updates.data_pagamento = new Date().toISOString().split('T')[0];
      if (formaPagamento) updates.forma_pagamento = formaPagamento;
    }

    const { error } = await supabase.from('contas_pagar').update(updates).eq('id', conta.id);
    if (error) {
      toast.error('Erro ao atualizar status');
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

    toast.success(`Status atualizado para ${newStatus}`);
    fetchConta();
    setActionLoading(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
      return format(d, "dd/MM/yyyy", { locale: ptBR });
    } catch { return dateStr; }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch { return dateStr; }
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

  const canEdit = isAdmin || (conta.criado_por === usuario?.id && conta.status === 'Lancada');

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
              <span className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                statusColors[conta.status]
              )}>
                {conta.status}
              </span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {formatCurrency(Number(conta.valor))}
              </span>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><FileText size={14} /> Resumo</p>
          <div className="space-y-2 text-sm">
            <Row label="Descrição" value={conta.descricao} />
            <Row label="Categoria" value={conta.categoria || '—'} />
            {conta.subcategoria && <Row label="Subcategoria" value={conta.subcategoria} />}
            <Row label="Valor" value={formatCurrency(Number(conta.valor))} />
            <Row label="Vencimento" value={formatDate(conta.data_vencimento)} />
            {conta.data_emissao && <Row label="Emissão" value={formatDate(conta.data_emissao)} />}
          </div>
        </div>


        {/* Motivo */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><MessageSquare size={14} /> Motivo da Despesa</p>
          <p className="text-sm leading-relaxed">{conta.motivo}</p>
        </div>

        {/* Status e fluxo */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><Clock size={14} /> Status e Fluxo</p>
          <div className="space-y-2 text-sm">
            <Row label="Status atual" value={conta.status} />
            <Row label="Criado em" value={formatDateTime(conta.criado_em)} />
            {conta.data_pagamento && <Row label="Pago em" value={formatDate(conta.data_pagamento)} />}
            {conta.forma_pagamento && <Row label="Forma pagamento" value={conta.forma_pagamento} />}
          </div>
        </div>

        {/* Anexos */}
        {(conta.comprovante_url || conta.observacoes) && (
          <div className="section-card">
            <p className="section-title flex items-center gap-2"><Paperclip size={14} /> Anexos e Observações</p>
            {conta.comprovante_url && (
              <a href={conta.comprovante_url} target="_blank" rel="noopener" className="text-sm text-primary underline break-all">
                Ver comprovante
              </a>
            )}
            {conta.observacoes && <p className="text-sm text-muted-foreground">{conta.observacoes}</p>}
          </div>
        )}

        {/* Histórico */}
        {logs.length > 0 && (
          <div className="section-card">
            <p className="section-title flex items-center gap-2"><History size={14} /> Histórico</p>
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="text-xs border-l-2 border-border pl-3 py-1">
                  <p className="text-muted-foreground">{formatDateTime(log.criado_em)}</p>
                  <p className="font-medium">
                    {log.acao}
                    {log.status_anterior && log.status_novo && (
                      <span className="text-muted-foreground"> · {log.status_anterior} → {log.status_novo}</span>
                    )}
                  </p>
                  {log.observacao && <p className="text-muted-foreground">{log.observacao}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Actions */}
        {isAdmin && (
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
                    <Check size={16} className="mr-2" /> Aprovar
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
              {conta.status === 'Aprovada' && (
                <>
                  <div className="space-y-1">
                    <label className="label-micro">Forma de pagamento</label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                      <SelectTrigger className="h-11 bg-background">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamento.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => changeStatus('Paga')}
                    disabled={actionLoading}
                    className="w-full h-11 gradient-primary text-primary-foreground font-semibold rounded-xl"
                  >
                    <CreditCard size={16} className="mr-2" /> Marcar como Paga
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
