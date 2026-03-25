import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import UserSelect from '@/components/UserSelect';

const categorias = [
  'Material gráfico', 'Combustível', 'Pessoal', 'Aluguel',
  'Mídia digital', 'Mídia tradicional (rádio/TV)', 'Eventos',
  'Serviços (jurídico, contábil, etc.)', 'Outros',
];

export default function NovaContaPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [motivo, setMotivo] = useState('');
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrente, setDiaRecorrente] = useState('');
  const [criadoPor, setCriadoPor] = useState('');

  const responsavel = criadoPor || usuario?.id || '';

  const handleSubmit = async () => {
    if (!descricao.trim()) return toast.error('Diga o que precisa ser pago');
    if (!valor) return toast.error('Informe o valor');
    if (!dataVencimento) return toast.error('Informe quando vence');
    if (!motivo.trim()) return toast.error('Explique o motivo do gasto');
    if (!usuario) return toast.error('Faça login primeiro');

    const valorNum = parseFloat(valor.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) return toast.error('Valor inválido');

    setLoading(true);

    const { data: conta, error } = await supabase
      .from('contas_pagar')
      .insert({
        descricao: descricao.trim(),
        categoria: categoria || null,
        valor: valorNum,
        motivo: motivo.trim(),
        status: 'Lancada',
        criado_por: responsavel,
        data_vencimento: dataVencimento,
        recorrente,
        dia_vencimento_recorrente: recorrente && diaRecorrente ? parseInt(diaRecorrente) : null,
      } as any)
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

    toast.success('Conta registrada! Agora é só aguardar aprovação.');
    navigate('/');
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="page-title">Nova conta</h2>
            <p className="page-subtitle">Registre um gasto que precisa ser pago</p>
          </div>
        </div>

        {/* O que é + valor */}
        <div className="section-card space-y-4">
          <div className="space-y-1.5">
            <label className="label-micro">O que precisa ser pago? *</label>
            <Input
              placeholder="Ex.: Aluguel do escritório, panfletos..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label-micro">Valor (R$) *</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={e => setValor(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-micro">Quando vence? *</label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label-micro">Categoria</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="form-select"
            >
              <option value="">Escolha uma categoria...</option>
              {categorias.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="label-micro">Por que esse gasto é necessário? *</label>
            <Textarea
              placeholder="Ex.: Material para evento no bairro X..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={2}
              className="bg-background rounded-xl border border-input"
            />
          </div>
        </div>

        {/* Recorrente */}
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
                Essa conta se repete todo mês
              </span>
              <p className="text-[11px] text-muted-foreground">Ex.: aluguel, internet, salários</p>
            </div>
          </label>

          {recorrente && (
            <div className="space-y-1.5 pl-8">
              <label className="label-micro">Dia do vencimento mensal</label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="Ex.: 10"
                value={diaRecorrente}
                onChange={e => setDiaRecorrente(e.target.value)}
                className="form-input max-w-[120px]"
              />
            </div>
          )}
        </div>

        {/* Quem tá registrando */}
        <div className="section-card space-y-3">
          <p className="text-sm font-medium">Quem está registrando?</p>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Já vem com seu nome. Mude só se outra pessoa pediu pra registrar.
          </p>
          <UserSelect
            value={responsavel}
            onChange={setCriadoPor}
            placeholder="Selecionar pessoa..."
          />
        </div>

        {/* Botões */}
        <div className="space-y-3 pb-6">
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : '✓ Registrar conta'}
          </button>
          <button onClick={() => navigate(-1)} className="btn-outline">
            Cancelar
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
