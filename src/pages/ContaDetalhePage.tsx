import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, CreditCard, Clock, FileText, MessageSquare, Paperclip, History, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import UserSelect from '@/components/UserSelect';
import FileUpload from '@/components/FileUpload';
import { gerarPdfConta } from '@/lib/gerarPdfConta';

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

interface UsuarioSimples {
  id: string;
  nome: string;
}

export default function ContaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario, isAdmin } = useAuth();
  const [conta, setConta] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [pagoPor, setPagoPor] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioSimples[]>([]);

  useEffect(() => {
    if (id) fetchConta();
    fetchUsuarios();
  }, [id]);

  const fetchUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nome').order('nome');
    if (data) setUsuarios(data);
  };

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

  const getNome = (userId: string | null) => {
    if (!userId) return null;
    return usuarios.find(u => u.id === userId)?.nome ?? null;
  };

  const changeStatus = async (newStatus: string) => {
    if (!conta || !usuario) return;
    setActionLoading(true);

    const updates: any = { status: newStatus, atualizado_em: new Date().toISOString() };
    if (newStatus === 'Aprovada') updates.aprovado_por = usuario.id;
    if (newStatus === 'Paga') {
      updates.pago_por = pagoPor || usuario.id;
      updates.data_pagamento = new Date().toISOString().split('T')[0];
      if (formaPagamento) updates.forma_pagamento = formaPagamento;
      if (formaPagamento === 'PIX' && chavePix.trim()) updates.chave_pix = chavePix.trim();
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

  const handleGerarPdf = () => {
    if (!conta) return;
    gerarPdfConta({
      descricao: conta.descricao,
      valor: Number(conta.valor),
      categoria: conta.categoria,
      motivo: conta.motivo,
      status: conta.status,
      data_vencimento: conta.data_vencimento,
      data_pagamento: conta.data_pagamento,
      forma_pagamento: conta.forma_pagamento,
      chave_pix: conta.chave_pix,
      comprovante_url: conta.comprovante_url,
      criado_em: conta.criado_em,
      observacoes: conta.observacoes,
      criado_por_nome: getNome(conta.criado_por) ?? undefined,
      aprovado_por_nome: getNome(conta.aprovado_por) ?? undefined,
      pago_por_nome: getNome(conta.pago_por) ?? undefined,
    });
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
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground mt-1 active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="page-title leading-tight">{conta.descricao}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border', cfg.style)}>
                {cfg.label}
              </span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {fmt(Number(conta.valor))}
              </span>
            </div>
          </div>
        </div>

        {/* Recorrente badge */}
        {conta.recorrente && (
          <div className="section-card !p-3 flex items-center gap-2 bg-blue-500/5 border-blue-400/30">
            <RefreshCw size={16} className="text-blue-500" />
            <span className="text-sm font-medium text-blue-600">
              Conta recorrente · Vence todo dia {conta.dia_vencimento_recorrente}
            </span>
          </div>
        )}

        {/* Detalhes */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><FileText size={14} /> DETALHES</p>
          <div className="space-y-2.5 text-sm">
            <Row label="O que é" value={conta.descricao} />
            {conta.categoria && <Row label="Categoria" value={conta.categoria} />}
            <Row label="Valor" value={fmt(Number(conta.valor))} />
            <Row label={conta.status === 'Paga' ? 'Data do pagamento' : 'Vencimento'} value={fmtData(conta.data_pagamento ?? conta.data_vencimento)} />
            {conta.forma_pagamento && <Row label="Forma de pagamento" value={conta.forma_pagamento} />}
            {conta.chave_pix && <Row label="Chave PIX" value={conta.chave_pix} />}
          </div>
        </div>

        {/* Motivo */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><MessageSquare size={14} /> MOTIVO</p>
          <p className="text-sm leading-relaxed">{conta.motivo}</p>
        </div>

        {/* Responsáveis */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><Clock size={14} /> RESPONSÁVEIS</p>
          <div className="space-y-2.5 text-sm">
            <Row label="Situação atual" value={cfg.label} />
            <Row label="Registrado em" value={fmtDateTime(conta.criado_em)} />
            <Row label="Registrado por" value={getNome(conta.criado_por) ?? '—'} />
            {conta.aprovado_por && <Row label="Aprovado por" value={getNome(conta.aprovado_por) ?? '—'} />}
            {conta.pago_por && <Row label="Pago por" value={getNome(conta.pago_por) ?? '—'} />}
            {conta.data_pagamento && <Row label="Pago em" value={fmtData(conta.data_pagamento)} />}
          </div>
        </div>

        {/* Comprovante */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><Paperclip size={14} /> COMPROVANTE</p>
          <FileUpload
            contaId={conta.id}
            currentUrl={conta.comprovante_url}
            onUploaded={(url) => setConta({ ...conta, comprovante_url: url })}
          />
          {conta.observacoes && (
            <p className="text-sm text-muted-foreground mt-2">{conta.observacoes}</p>
          )}
        </div>

        {/* Gerar PDF */}
        {(conta.status === 'Paga' || conta.status === 'Aprovada') && (
          <button
            onClick={handleGerarPdf}
            className="w-full h-12 rounded-xl border border-border bg-card flex items-center justify-center gap-2 text-sm font-medium text-foreground shadow-sm active:scale-[0.98] transition-transform"
          >
            <Download size={16} /> Gerar documento (PDF)
          </button>
        )}

        {/* Histórico */}
        {logs.length > 0 && (
          <div className="section-card">
            <p className="section-title flex items-center gap-2"><History size={14} /> HISTÓRICO</p>
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1.5">
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
                  <p className="text-muted-foreground">por {getNome(log.usuario_id) ?? 'Usuário'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações — somente admin */}
        {isAdmin && (conta.status === 'Lancada' || conta.status === 'Aprovada') && (
          <div className="section-card">
            <p className="section-title">AÇÕES</p>
            <div className="space-y-3">
              {conta.status === 'Lancada' && (
                <>
                  <Button
                    onClick={() => changeStatus('Aprovada')}
                    disabled={actionLoading}
                    className="w-full h-12 gradient-primary text-primary-foreground font-semibold rounded-xl"
                  >
                    <Check size={16} className="mr-2" /> Aprovar conta
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => changeStatus('Cancelada')}
                    disabled={actionLoading}
                    className="w-full h-12 text-destructive border-destructive/30 rounded-xl"
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
                      <SelectTrigger className="h-12 bg-background rounded-xl">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamento.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {formaPagamento === 'PIX' && (
                    <div className="space-y-1.5">
                      <label className="label-micro">Chave PIX</label>
                      <Input
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                        value={chavePix}
                        onChange={e => setChavePix(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  )}

                  <UserSelect
                    value={pagoPor || usuario?.id || ''}
                    onChange={setPagoPor}
                    label="Quem está pagando?"
                    placeholder="Selecionar quem pagou..."
                  />

                  <Button
                    onClick={() => changeStatus('Paga')}
                    disabled={actionLoading}
                    className="w-full h-12 gradient-primary text-primary-foreground font-semibold rounded-xl"
                  >
                    <CreditCard size={16} className="mr-2" /> Confirmar pagamento
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => changeStatus('Cancelada')}
                    disabled={actionLoading}
                    className="w-full h-12 text-destructive border-destructive/30 rounded-xl"
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
