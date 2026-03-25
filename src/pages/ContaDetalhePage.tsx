import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, CreditCard, Paperclip, History, Download, RefreshCw, Clock, User, ChevronRight } from 'lucide-react';
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

const STEPS = [
  { key: 'Lancada', label: 'Registrada', emoji: '📝' },
  { key: 'Aprovada', label: 'Aprovada', emoji: '✅' },
  { key: 'Paga', label: 'Paga', emoji: '💰' },
];

const formasPagamento = ['PIX', 'Dinheiro', 'Transferência', 'Cartão', 'Boleto', 'Cheque'];

interface LogEntry {
  id: string; acao: string; status_anterior: string | null; status_novo: string | null;
  observacao: string | null; criado_em: string; usuario_id: string;
}
interface UsuarioSimples { id: string; nome: string; }

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
    if (error) { toast.error('Erro ao atualizar'); setActionLoading(false); return; }

    await supabase.from('contas_pagar_logs').insert({
      conta_id: conta.id, usuario_id: usuario.id,
      acao: 'STATUS_ALTERADO', status_anterior: conta.status, status_novo: newStatus,
    });

    toast.success(newStatus === 'Paga' ? '💰 Pagamento registrado!' : '✅ Atualizado!');
    fetchConta();
    setActionLoading(false);
  };

  const handleGerarPdf = () => {
    if (!conta) return;
    gerarPdfConta({
      descricao: conta.descricao, valor: Number(conta.valor), categoria: conta.categoria,
      motivo: conta.motivo, status: conta.status, data_vencimento: conta.data_vencimento,
      data_pagamento: conta.data_pagamento, forma_pagamento: conta.forma_pagamento,
      chave_pix: conta.chave_pix, comprovante_url: conta.comprovante_url,
      criado_em: conta.criado_em, observacoes: conta.observacoes,
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
        <div className="text-center py-20 space-y-3">
          <p className="text-3xl">🔍</p>
          <p className="text-muted-foreground">Conta não encontrada</p>
          <button onClick={() => navigate('/')} className="text-sm text-primary font-semibold">
            Voltar ao início
          </button>
        </div>
      </AppLayout>
    );
  }

  // Progresso visual
  const currentStepIdx = conta.status === 'Cancelada' ? -1 : STEPS.findIndex(s => s.key === conta.status);

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">

        {/* Voltar */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground text-sm active:scale-90">
          <ArrowLeft size={18} /> Voltar
        </button>

        {/* Valor + descrição */}
        <div className="section-card !space-y-3">
          <p className="text-2xl font-bold text-primary tabular-nums">{fmt(Number(conta.valor))}</p>
          <h2 className="text-base font-bold leading-tight">{conta.descricao}</h2>
          {conta.categoria && (
            <span className="inline-block text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {conta.categoria}
            </span>
          )}

          {conta.recorrente && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
              <RefreshCw size={13} />
              Conta mensal · vence todo dia {conta.dia_vencimento_recorrente}
            </div>
          )}
        </div>

        {/* Barra de progresso visual */}
        {conta.status !== 'Cancelada' ? (
          <div className="section-card !p-4 !space-y-0">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const done = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-base border-2 transition-all',
                        done
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      )}>
                        {step.emoji}
                      </div>
                      <span className={cn(
                        'text-[10px] mt-1.5 font-medium',
                        isCurrent ? 'text-primary font-bold' : done ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={cn(
                        'w-8 h-0.5 mx-1 rounded-full -mt-4',
                        idx < currentStepIdx ? 'bg-primary' : 'bg-border'
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="section-card !p-3 flex items-center gap-2 bg-red-50 border-red-200 !space-y-0">
            <X size={18} className="text-red-500" />
            <span className="text-sm font-semibold text-red-700">Esta conta foi cancelada</span>
          </div>
        )}

        {/* Informações */}
        <div className="section-card">
          <p className="section-title">Informações</p>
          <div className="space-y-2.5 text-sm">
            <InfoRow label="Vencimento" value={fmtData(conta.data_vencimento)} />
            {conta.data_pagamento && <InfoRow label="Pago em" value={fmtData(conta.data_pagamento)} />}
            {conta.forma_pagamento && <InfoRow label="Forma de pagamento" value={conta.forma_pagamento} />}
            {conta.chave_pix && <InfoRow label="Chave PIX" value={conta.chave_pix} />}
            <InfoRow label="Registrado por" value={getNome(conta.criado_por) ?? '—'} />
            {conta.aprovado_por && <InfoRow label="Aprovado por" value={getNome(conta.aprovado_por) ?? '—'} />}
            {conta.pago_por && <InfoRow label="Pago por" value={getNome(conta.pago_por) ?? '—'} />}
          </div>
        </div>

        {/* Motivo */}
        <div className="section-card">
          <p className="section-title">Motivo do gasto</p>
          <p className="text-sm leading-relaxed">{conta.motivo}</p>
          {conta.observacoes && <p className="text-[11px] text-muted-foreground mt-2">{conta.observacoes}</p>}
        </div>

        {/* Comprovante */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><Paperclip size={14} /> Comprovante</p>
          <FileUpload
            contaId={conta.id}
            currentUrl={conta.comprovante_url}
            onUploaded={(url) => setConta({ ...conta, comprovante_url: url })}
          />
        </div>

        {/* PDF */}
        {(conta.status === 'Paga' || conta.status === 'Aprovada') && (
          <button
            onClick={handleGerarPdf}
            className="w-full h-12 rounded-xl border border-border bg-card flex items-center justify-center gap-2 text-sm font-medium shadow-sm active:scale-[0.98] transition-transform"
          >
            <Download size={16} /> Baixar documento (PDF)
          </button>
        )}

        {/* ========== AÇÕES ADMIN ========== */}
        {isAdmin && conta.status === 'Lancada' && (
          <div className="section-card !space-y-3 border-primary/20">
            <p className="section-title">👆 Próximo passo</p>
            <p className="text-[12px] text-muted-foreground">
              Revise os dados acima e escolha uma ação:
            </p>
            <Button
              onClick={() => changeStatus('Aprovada')}
              disabled={actionLoading}
              className="w-full h-12 gradient-primary text-primary-foreground font-semibold rounded-xl"
            >
              <Check size={16} className="mr-2" /> Aprovar esta conta
            </Button>
            <Button
              variant="outline"
              onClick={() => changeStatus('Cancelada')}
              disabled={actionLoading}
              className="w-full h-11 text-destructive border-destructive/30 rounded-xl text-sm"
            >
              <X size={14} className="mr-2" /> Recusar
            </Button>
          </div>
        )}

        {isAdmin && conta.status === 'Aprovada' && (
          <div className="section-card !space-y-4 border-primary/20">
            <p className="section-title">💳 Registrar pagamento</p>
            <p className="text-[12px] text-muted-foreground">
              Informe como e quem pagou, depois clique em confirmar.
            </p>

            <div className="space-y-1.5">
              <label className="label-micro">Como foi pago? *</label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger className="h-12 bg-background rounded-xl">
                  <SelectValue placeholder="Escolha a forma..." />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {formaPagamento === 'PIX' && (
              <div className="space-y-1.5">
                <label className="label-micro">Chave PIX usada</label>
                <Input
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  value={chavePix}
                  onChange={e => setChavePix(e.target.value)}
                  className="form-input"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="label-micro">Quem pagou?</label>
              <UserSelect
                value={pagoPor || usuario?.id || ''}
                onChange={setPagoPor}
                placeholder="Selecionar quem pagou..."
              />
            </div>

            <Button
              onClick={() => changeStatus('Paga')}
              disabled={actionLoading || !formaPagamento}
              className="w-full h-12 gradient-primary text-primary-foreground font-semibold rounded-xl"
            >
              <CreditCard size={16} className="mr-2" /> Confirmar pagamento
            </Button>

            <Button
              variant="outline"
              onClick={() => changeStatus('Cancelada')}
              disabled={actionLoading}
              className="w-full h-11 text-destructive border-destructive/30 rounded-xl text-sm"
            >
              <X size={14} className="mr-2" /> Cancelar conta
            </Button>
          </div>
        )}

        {/* Após pagar — lembrete de comprovante */}
        {conta.status === 'Paga' && !conta.comprovante_url && (
          <div className="section-card !p-3 flex items-center gap-3 bg-yellow-50 border-yellow-200 !space-y-0">
            <Paperclip size={18} className="text-yellow-600 shrink-0" />
            <p className="text-[12px] text-yellow-700 font-medium">
              Não esqueça de anexar o comprovante! Role até a seção acima.
            </p>
          </div>
        )}

        {/* Histórico */}
        {logs.length > 0 && (
          <div className="section-card">
            <p className="section-title flex items-center gap-2"><History size={14} /> Histórico</p>
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1.5">
                  <p className="text-muted-foreground">{fmtDateTime(log.criado_em)}</p>
                  <p className="font-medium">
                    {log.acao === 'CRIADA' ? '📝 Conta registrada' : '🔄 Status atualizado'}
                    {log.status_anterior && log.status_novo && (
                      <span className="text-muted-foreground font-normal">
                        {' → '}{log.status_novo === 'Paga' ? '💰 Paga' : log.status_novo === 'Aprovada' ? '✅ Aprovada' : log.status_novo}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User size={10} /> {getNome(log.usuario_id) ?? 'Usuário'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pb-4" />
      </div>
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
