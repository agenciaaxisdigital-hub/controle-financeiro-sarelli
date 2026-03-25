import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

const categorias = [
  'Material gráfico',
  'Combustível',
  'Pessoal',
  'Aluguel',
  'Mídia digital',
  'Mídia tradicional (rádio/TV)',
  'Eventos',
  'Serviços (jurídico, contábil, etc.)',
  'Outros',
];

const formasPagamento = ['Dinheiro', 'Transferência', 'PIX', 'Cartão', 'Boleto', 'Cheque'];

export default function NovaContaPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [jaPaguei, setJaPaguei] = useState(false);

  const [form, setForm] = useState({
    descricao: '',
    categoria: '',
    valor: '',
    data_vencimento: '',
    data_pagamento: '',
    forma_pagamento: '',
    motivo: '',
    observacoes: '',
    comprovante_url: '',
  });

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.descricao.trim()) {
      toast.error('Descreva o que foi comprado/pago');
      return;
    }
    if (!form.valor) {
      toast.error('Informe o valor');
      return;
    }
    if (!jaPaguei && !form.data_vencimento) {
      toast.error('Informe a data de vencimento');
      return;
    }
    if (jaPaguei && !form.data_pagamento) {
      toast.error('Informe a data em que foi pago');
      return;
    }
    if (!form.motivo.trim()) {
      toast.error('Explique por que esse gasto foi necessário');
      return;
    }
    if (!usuario) {
      toast.error('Usuário não identificado');
      return;
    }

    setLoading(true);

    const valorNum = parseFloat(
      form.valor.replace(/[^\d,.-]/g, '').replace(',', '.'),
    );
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error('Valor inválido');
      setLoading(false);
      return;
    }

    const { data: conta, error } = await supabase
      .from('contas_pagar')
      .insert({
        descricao: form.descricao.trim(),
        categoria: form.categoria || null,
        valor: valorNum,
        motivo: form.motivo.trim(),
        observacoes: form.observacoes.trim() || null,
        comprovante_url: form.comprovante_url.trim() || null,
        status: 'Lancada',
        criado_por: usuario.id,
        data_vencimento: jaPaguei ? form.data_pagamento : form.data_vencimento,
        data_pagamento: jaPaguei ? form.data_pagamento : null,
        forma_pagamento: jaPaguei && form.forma_pagamento ? form.forma_pagamento : null,
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.');
      setLoading(false);
      return;
    }

    await supabase.from('contas_pagar_logs').insert({
      conta_id: conta.id,
      usuario_id: usuario.id,
      acao: 'CRIADA',
      status_anterior: null,
      status_novo: 'Lancada',
      observacao: jaPaguei ? 'Registrado como já pago pelo lançador' : null,
    });

    toast.success(
      jaPaguei ? 'Pagamento registrado com sucesso!' : 'Conta lançada com sucesso!',
    );
    navigate('/');
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <h2 className="page-title">Registrar gasto</h2>
        </div>

        {/* Toggle: já paguei / preciso pagar */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-card rounded-2xl border border-border shadow-sm">
          <button
            onClick={() => setJaPaguei(false)}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              !jaPaguei
                ? 'gradient-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground'
            }`}
          >
            <Clock size={15} />
            Preciso pagar
          </button>
          <button
            onClick={() => setJaPaguei(true)}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              jaPaguei
                ? 'gradient-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground'
            }`}
          >
            <CheckCircle2 size={15} />
            Já paguei
          </button>
        </div>

        {/* Card principal */}
        <div className="section-card space-y-4">
          <p className="section-title">
            {jaPaguei ? 'DADOS DO PAGAMENTO' : 'DADOS DA CONTA'}
          </p>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="label-micro">
              {jaPaguei ? 'O que foi comprado / pago' : 'O que precisa ser pago'} *
            </label>
            <Input
              placeholder={
                jaPaguei
                  ? 'Ex.: Impressão de panfletos zona norte'
                  : 'Ex.: Aluguel do escritório, conta de energia...'
              }
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              className="form-input"
            />
          </div>

          {/* Valor + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label-micro">Valor (R$) *</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.valor}
                onChange={e => set('valor', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-micro">Categoria</label>
              <select
                value={form.categoria}
                onChange={e => set('categoria', e.target.value)}
                className="form-select"
              >
                <option value="">Selecionar...</option>
                {categorias.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data e forma */}
          {jaPaguei ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="label-micro">Quando foi pago? *</label>
                <Input
                  type="date"
                  value={form.data_pagamento}
                  onChange={e => set('data_pagamento', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-micro">Como foi pago?</label>
                <select
                  value={form.forma_pagamento}
                  onChange={e => set('forma_pagamento', e.target.value)}
                  className="form-select"
                >
                  <option value="">Selecionar...</option>
                  {formasPagamento.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="label-micro">Quando vence / precisa ser pago? *</label>
              <Input
                type="date"
                value={form.data_vencimento}
                onChange={e => set('data_vencimento', e.target.value)}
                className="form-input"
              />
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-1.5">
            <label className="label-micro">
              Por que {jaPaguei ? 'esse gasto foi necessário' : 'esse gasto é necessário'}? *
            </label>
            <Textarea
              placeholder="Ex.: Impressão para evento no bairro X no dia Y..."
              value={form.motivo}
              onChange={e => set('motivo', e.target.value)}
              rows={3}
              className="bg-background rounded-xl"
            />
          </div>
        </div>

        {/* Extras */}
        <div className="section-card space-y-4">
          <p className="section-title">Extras (opcional)</p>

          <div className="space-y-1.5">
            <label className="label-micro">Link do comprovante / nota fiscal</label>
            <Input
              placeholder="https://... (foto, PDF, Google Drive...)"
              value={form.comprovante_url}
              onChange={e => set('comprovante_url', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="space-y-1.5">
            <label className="label-micro">Observações adicionais</label>
            <Textarea
              placeholder="Alguma informação extra que queira registrar..."
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              rows={2}
              className="bg-background rounded-xl"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="space-y-3 pb-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Salvando...' : jaPaguei ? 'Registrar pagamento' : 'Lançar conta'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="btn-outline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
