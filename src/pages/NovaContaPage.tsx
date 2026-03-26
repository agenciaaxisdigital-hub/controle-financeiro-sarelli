import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import UserSelect from '@/components/UserSelect';

const MESES_RECORRENCIA = [
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: '24', label: '2 anos' },
  { value: '0', label: 'Sem data de fim (indeterminado)' },
];

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const parseBRL = (s: string) =>
  parseFloat(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));

export default function NovaContaPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Passo 1
  const [descricao, setDescricao] = useState('');
  const [valorRaw, setValorRaw] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrente, setDiaRecorrente] = useState('');
  const [mesesRecorrencia, setMesesRecorrencia] = useState('12');

  // Passo 2
  const [motivo, setMotivo] = useState('');
  const [criadoPor, setCriadoPor] = useState('');

  const responsavel = criadoPor || usuario?.id || '';

  const handleValor = (raw: string) => {
    const nums = raw.replace(/\D/g, '');
    if (!nums) { setValorRaw(''); return; }
    const cents = parseInt(nums, 10);
    const brl = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setValorRaw(brl);
  };

  const valorNum = parseBRL(valorRaw);

  const recorrenteAte = (() => {
    if (!recorrente || mesesRecorrencia === '0') return null;
    const base = dataVencimento ? new Date(dataVencimento + 'T00:00:00') : new Date();
    base.setMonth(base.getMonth() + parseInt(mesesRecorrencia));
    return format(base, 'yyyy-MM-dd');
  })();

  const goStep2 = () => {
    if (!descricao.trim()) return toast.error('Diga o que precisa ser pago');
    if (!valorRaw || isNaN(valorNum) || valorNum <= 0) return toast.error('Informe o valor corretamente');
    if (!dataVencimento) return toast.error('Informe quando vence');
    if (recorrente && !diaRecorrente) return toast.error('Informe o dia mensal do vencimento');
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!motivo.trim()) return toast.error('Explique o motivo do gasto');
    if (!usuario) return toast.error('Faça login primeiro');

    setLoading(true);

    const payload: Record<string, any> = {
      descricao: descricao.trim(),
      valor: valorNum,
      motivo: motivo.trim(),
      status: 'Lancada',
      criado_por: responsavel,
      data_vencimento: dataVencimento,
      recorrente,
      dia_vencimento_recorrente: recorrente && diaRecorrente ? parseInt(diaRecorrente) : null,
      chave_pix: chavePix.trim() || null,
    };

    if (recorrente && recorrenteAte) {
      payload.observacoes = `recorrente_ate:${recorrenteAte}`;
    }

    const { data: conta, error } = await supabase
      .from('contas_pagar')
      .insert(payload as any)
      .select('id')
      .single();

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.');
      setLoading(false);
      return;
    }

    await supabase.from('contas_pagar_logs').insert({
      conta_id: conta.id,
      usuario_id: responsavel,
      acao: 'CRIADA',
      status_anterior: null,
      status_novo: 'Lancada',
    });

    toast.success('✓ Conta registrada com sucesso!');
    navigate('/');
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => step === 2 ? setStep(1) : navigate(-1)}
            className="text-muted-foreground active:scale-90 p-1"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="page-title">Nova conta</h2>
            <p className="page-subtitle">
              {step === 1 ? 'Passo 1 de 2 — Dados da conta' : 'Passo 2 de 2 — Justificativa'}
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="flex gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-primary" />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step === 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 1 ? (
          <>
            <div className="section-card space-y-4">

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="label-micro">O que precisa ser pago? *</label>
                <Input
                  placeholder="Ex.: Aluguel, material de escritório..."
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              {/* Valor + Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="label-micro">Valor (R$) *</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={valorRaw}
                    onChange={e => handleValor(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label-micro">Vencimento *</label>
                  <Input
                    type="date"
                    value={dataVencimento}
                    onChange={e => setDataVencimento(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Chave PIX */}
              <div className="space-y-1.5">
                <label className="label-micro">Chave PIX (opcional)</label>
                <Input
                  placeholder="CPF, e-mail, telefone ou chave aleatória..."
                  value={chavePix}
                  onChange={e => setChavePix(e.target.value)}
                  className="form-input"
                  autoComplete="off"
                />
                <p className="text-[10px] text-muted-foreground">
                  Se souber agora, já deixa aqui para facilitar na hora do pagamento.
                </p>
              </div>
            </div>

            {/* Recorrência */}
            <div className="section-card space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recorrente}
                  onChange={e => setRecorrente(e.target.checked)}
                  className="w-5 h-5 rounded border-border accent-primary cursor-pointer"
                />
                <div>
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <RefreshCw size={14} className="text-primary" />
                    Conta mensal fixa (recorrente)
                  </span>
                  <p className="text-[11px] text-muted-foreground">Ex.: aluguel, internet, salários</p>
                </div>
              </label>

              {recorrente && (
                <div className="pl-8 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="label-micro">Dia todo mês *</label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Ex.: 10"
                        value={diaRecorrente}
                        onChange={e => setDiaRecorrente(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="label-micro">Duração</label>
                      <select
                        value={mesesRecorrencia}
                        onChange={e => setMesesRecorrencia(e.target.value)}
                        className="form-select"
                      >
                        {MESES_RECORRENCIA.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {recorrenteAte && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
                      <RefreshCw size={12} />
                      <span>Recorrente até <strong>{recorrenteAte.split('-').reverse().join('/')}</strong></span>
                    </div>
                  )}
                  {mesesRecorrencia === '0' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-50 border border-yellow-200 text-xs text-yellow-700">
                      <RefreshCw size={12} />
                      <span>Sem data de fim — recorrência indeterminada</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={goStep2} className="btn-primary">
              Continuar →
            </button>
          </>
        ) : (
          <>
            {/* PASSO 2 */}
            <div className="section-card space-y-4">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
                <HelpCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-blue-700">
                  Explique o motivo para que o administrador possa aprovar mais rápido.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="label-micro">Por que esse gasto é necessário? *</label>
                <Textarea
                  placeholder="Ex.: Aluguel do mês de março do consultório..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                  className="bg-background rounded-xl border border-input"
                  autoFocus
                />
              </div>
            </div>

            <div className="section-card space-y-3">
              <p className="text-sm font-medium">Quem está registrando?</p>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Já está com seu nome. Mude somente se está registrando por outra pessoa.
              </p>
              <UserSelect
                value={responsavel}
                onChange={setCriadoPor}
                placeholder="Selecionar pessoa..."
              />
            </div>

            {/* Resumo */}
            <div className="section-card !space-y-2 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo</p>
              <div className="text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">O quê</span>
                  <span className="font-medium truncate ml-4 text-right max-w-[55%]">{descricao}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-primary">{fmt(valorNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span className="font-medium">{dataVencimento.split('-').reverse().join('/')}</span>
                </div>
                {chavePix && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chave PIX</span>
                    <span className="font-medium truncate ml-4 text-right max-w-[55%]">{chavePix}</span>
                  </div>
                )}
                {recorrente && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recorrente</span>
                    <span className="font-medium text-right">
                      Todo dia {diaRecorrente}
                      {recorrenteAte ? ` até ${recorrenteAte.split('-').reverse().join('/')}` : ' (indeterminado)'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 pb-6">
              <button onClick={handleSubmit} disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : '✓ Registrar conta'}
              </button>
              <button onClick={() => setStep(1)} className="btn-outline">
                ← Voltar
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
