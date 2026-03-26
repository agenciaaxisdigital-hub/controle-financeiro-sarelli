import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  ArrowLeft, Check, X, CreditCard, Paperclip, History,
  Download, RefreshCw, User, Pencil, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

// [FEATURE 5] Label dinâmico do campo extra por forma de pagamento
const extraPagLabel: Record<string, string | null> = {
  'PIX': 'Chave PIX usada',
  'Transferência': 'Banco + dados da conta',
  'Boleto': 'Código do boleto (opcional)',
  'Cheque': 'Número do cheque (opcional)',
  'Dinheiro': null,
  'Cartão': null,
};

interface LogEntry {
  id: string; acao: string; status_anterior: string | null; status_novo: string | null;
  observacao: string | null; criado_em: string; usuario_id: string;
}
interface UsuarioSimples { id: string; nome: string; }

const parseBRL = (s: string) =>
  parseFloat(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));

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

  // [FEATURE 4] Aviso de comprovante antes de confirmar pagamento
  const [avisoSemComprovante, setAvisoSemComprovante] = useState(false);

  // [FEATURE 6] Modo de edição
  const [editMode, setEditMode] = useState(false);
  const [editDescricao, setEditDescricao] = useState('');
  const [editValorRaw, setEditValorRaw] = useState('');
  const [editDataVencimento, setEditDataVencimento] = useState('');
  const [editMotivo, setEditMotivo] = useState('');
  const [editCategoria, setEditCategoria] = useState('');

  useEffect(() => {
    if (id) fetchConta();
    fetchUsuarios();
  }, [id]);

  // Pré-preenche forma de pagamento e chave PIX quando a conta tem chave_pix salva
  useEffect(() => {
    if (conta?.chave_pix) {
      setChavePix(conta.chave_pix);
      setFormaPagamento(prev => prev || 'PIX');
    }
  }, [conta?.id]);

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

  // [FEATURE 6] Abrir edição com valores atuais
  const abrirEdicao = () => {
    setEditDescricao(conta.descricao || '');
    setEditValorRaw(
      Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    setEditDataVencimento(conta.data_vencimento || '');
    setEditMotivo(conta.motivo || '');
    setEditCategoria(conta.categoria || '');
    setEditMode(true);
  };

  const handleValorEdit = (raw: string) => {
    const nums = raw.replace(/\D/g, '');
    if (!nums) { setEditValorRaw(''); return; }
    const cents = parseInt(nums, 10);
    const brl = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setEditValorRaw(brl);
  };

  const handleSalvarEdicao = async () => {
    const valorNum = parseBRL(editValorRaw);
    if (!editDescricao.trim()) return toast.error('Informe a descrição');
    if (!editValorRaw || isNaN(valorNum) || valorNum <= 0) return toast.error('Valor inválido');
    if (!editDataVencimento) return toast.error('Informe o vencimento');

    setActionLoading(true);
    const { error } = await supabase
      .from('contas_pagar')
      .update({
        descricao: editDescricao.trim(),
        valor: valorNum,
        data_vencimento: editDataVencimento,
        motivo: editMotivo.trim(),
        categoria: editCategoria.trim() || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', conta.id);

    if (error) { toast.error('Erro ao salvar alterações'); setActionLoading(false); return; }

    await supabase.from('contas_pagar_logs').insert({
      conta_id: conta.id,
      usuario_id: usuario!.id,
      acao: 'EDITADA',
      status_anterior: conta.status,
      status_novo: conta.status,
    });

    toast.success('✓ Alterações salvas!');
    setEditMode(false);
    fetchConta();
    setActionLoading(false);
  };

  const changeStatus = async (newStatus: string) => {
    if (!conta || !usuario) return;
    setActionLoading(true);
    setAvisoSemComprovante(false);

    const updates: any = { status: newStatus, atualizado_em: new Date().toISOString() };
    if (newStatus === 'Aprovada') updates.aprovado_por = usuario.id;
    if (newStatus === 'Paga') {
      updates.pago_por = pagoPor || usuario.id;
      updates.data_pagamento = new Date().toISOString().split('T')[0];
      if (formaPagamento) updates.forma_pagamento = formaPagamento;
      if (chavePix.trim()) updates.chave_pix = chavePix.trim();
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

  // [FEATURE 4] Confirmar pagamento com aviso se sem comprovante
  const handleConfirmarPagamento = () => {
    if (!formaPagamento) return toast.error('Informe como foi pago');
    if (!conta.comprovante_url && !avisoSemComprovante) {
      setAvisoSemComprovante(true);
      return;
    }
    changeStatus('Paga');
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

  // [FEATURE 10] Labels de log melhorados
  const getLogLabel = (log: LogEntry) => {
    if (log.acao === 'CRIADA') return '📝 Conta registrada';
    if (log.acao === 'EDITADA') return '✏️ Dados editados';
    if (log.status_novo === 'Aprovada') return '✅ Aprovação concedida';
    if (log.status_novo === 'Paga') return '💰 Pagamento registrado';
    if (log.status_novo === 'Cancelada') return '❌ Conta cancelada';
    if (log.status_novo === 'Lancada') return '↩️ Devolvida para revisão';
    return '🔄 Status atualizado';
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

  const currentStepIdx = conta.status === 'Cancelada' ? -1 : STEPS.findIndex((s: any) => s.key === conta.status);
  const podeEditar = conta.status === 'Lancada' && (isAdmin || conta.criado_por === usuario?.id);

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">

        {/* Voltar */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground text-sm active:scale-90">
            <ArrowLeft size={18} /> Voltar
          </button>
          {/* [FEATURE 6] Botão editar para contas lançadas */}
          {podeEditar && !editMode && (
            <button
              onClick={abrirEdicao}
              className="flex items-center gap-1.5 text-sm text-primary font-semibold active:scale-90"
            >
              <Pencil size={14} /> Editar
            </button>
          )}
        </div>

        {/* [FEATURE 6] Formulário de edição inline */}
        {editMode ? (
          <div className="section-card space-y-4">
            <p className="section-title flex items-center gap-2">
              <Pencil size={14} /> Editar conta
            </p>

            <div className="space-y-1.5">
              <label className="label-micro">O que precisa ser pago? *</label>
              <Input
                value={editDescricao}
                onChange={e => setEditDescricao(e.target.value)}
                className="form-input"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="label-micro">Valor (R$) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={editValorRaw}
                  onChange={e => handleValorEdit(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-micro">Vencimento *</label>
                <Input
                  type="date"
                  value={editDataVencimento}
                  onChange={e => setEditDataVencimento(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="label-micro">Categoria</label>
              <Input
                value={editCategoria}
                onChange={e => setEditCategoria(e.target.value)}
                placeholder="Ex.: Aluguel, Material..."
                className="form-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="label-micro">Motivo</label>
              <Textarea
                value={editMotivo}
                onChange={e => setEditMotivo(e.target.value)}
                rows={2}
                className="bg-background rounded-xl border border-input"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSalvarEdicao}
                disabled={actionLoading}
                className="flex-1 h-12 gradient-primary text-primary-foreground font-semibold rounded-xl"
              >
                <Save size={15} className="mr-2" />
                {actionLoading ? 'Salvando...' : 'Salvar alterações'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditMode(false)}
                disabled={actionLoading}
                className="h-12 px-4 rounded-xl"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
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
                  {STEPS.map((step: any, idx: number) => {
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
                {conta.chave_pix && <InfoRow label={extraPagLabel[conta.forma_pagamento] ?? 'Referência'} value={conta.chave_pix} />}
                <InfoRow label="Registrado por" value={getNome(conta.criado_por) ?? '—'} />
                {conta.aprovado_por && <InfoRow label="Aprovado por" value={getNome(conta.aprovado_por) ?? '—'} />}
                {conta.pago_por && <InfoRow label="Pago por" value={getNome(conta.pago_por) ?? '—'} />}
              </div>
            </div>

            {/* Motivo */}
            <div className="section-card">
              <p className="section-title">Motivo do gasto</p>
              <p className="text-sm leading-relaxed">{conta.motivo}</p>
              {conta.observacoes && !conta.observacoes.startsWith('recorrente_ate:') && (
                <p className="text-[11px] text-muted-foreground mt-2">{conta.observacoes}</p>
              )}
            </div>
          </>
        )}

        {/* Comprovante */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><Paperclip size={14} /> Comprovante</p>
          <FileUpload
            contaId={conta.id}
            currentUrl={conta.comprovante_url}
            onUploaded={(url) => {
              setConta({ ...conta, comprovante_url: url });
              setAvisoSemComprovante(false); // Comprovante enviado — limpa aviso
            }}
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
        {isAdmin && conta.status === 'Lancada' && !editMode && (
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
              <Select value={formaPagamento} onValueChange={v => { setFormaPagamento(v); setChavePix(v === 'PIX' && conta?.chave_pix ? conta.chave_pix : ''); setAvisoSemComprovante(false); }}>
                <SelectTrigger className="h-12 bg-background rounded-xl">
                  <SelectValue placeholder="Escolha a forma..." />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* [FEATURE 5] Campo extra dinâmico baseado na forma de pagamento */}
            {formaPagamento && extraPagLabel[formaPagamento] && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="label-micro">{extraPagLabel[formaPagamento]}</label>
                  {formaPagamento === 'PIX' && conta?.chave_pix && chavePix === conta.chave_pix && (
                    <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                      ✓ do cadastro
                    </span>
                  )}
                </div>
                <Input
                  placeholder={
                    formaPagamento === 'PIX' ? 'CPF, e-mail, telefone ou chave aleatória' :
                    formaPagamento === 'Transferência' ? 'Ex.: Itaú · Ag. 1234 · CC 56789-0' :
                    'Opcional...'
                  }
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

            {/* [FEATURE 4] Aviso de comprovante ausente */}
            {avisoSemComprovante && !conta.comprovante_url && (
              <div className="px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-xl space-y-2">
                <p className="text-sm font-semibold text-yellow-800">⚠️ Nenhum comprovante anexado</p>
                <p className="text-xs text-yellow-700">
                  Recomendamos anexar o comprovante acima antes de confirmar. Deseja registrar mesmo assim?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAvisoSemComprovante(false)}
                    className="flex-1 h-9 rounded-xl border border-yellow-400 text-yellow-800 text-xs font-semibold"
                  >
                    Voltar e anexar
                  </button>
                  <button
                    onClick={() => changeStatus('Paga')}
                    className="flex-1 h-9 rounded-xl bg-yellow-500 text-white text-xs font-semibold"
                  >
                    Confirmar assim mesmo
                  </button>
                </div>
              </div>
            )}

            <Button
              onClick={handleConfirmarPagamento}
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

        {/* [FEATURE 10] Histórico melhorado */}
        {logs.length > 0 && (
          <div className="section-card">
            <p className="section-title flex items-center gap-2"><History size={14} /> Histórico</p>
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex gap-3">
                  <div className="w-1 bg-primary/20 rounded-full shrink-0 mt-1" />
                  <div className="flex-1 pb-1">
                    <p className="text-xs font-semibold">{getLogLabel(log)}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <User size={9} className="text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground">
                        {getNome(log.usuario_id) ?? 'Usuário'} · {fmtDateTime(log.criado_em)}
                      </p>
                    </div>
                  </div>
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
