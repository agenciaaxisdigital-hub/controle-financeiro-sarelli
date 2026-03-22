import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, DollarSign, CalendarDays, FileText, MessageSquare, Paperclip } from 'lucide-react';
import AppLayout from '@/components/AppLayout';


export default function NovaContaPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    descricao: '',
    categoria: '',
    
    valor: '',
    data_emissao: '',
    data_vencimento: '',
    motivo: '',
    observacoes: '',
    comprovante_url: '',
  });


  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.descricao.trim() || !form.valor || !form.data_vencimento || !form.motivo.trim()) {
      toast.error('Preencha os campos obrigatórios: Descrição, Valor, Vencimento e Motivo');
      return;
    }

    if (!usuario) {
      toast.error('Usuário não identificado');
      return;
    }

    setLoading(true);

    const valorNum = parseFloat(form.valor.replace(/[^\d,.-]/g, '').replace(',', '.'));
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
        data_emissao: form.data_emissao || null,
        data_vencimento: form.data_vencimento,
        motivo: form.motivo.trim(),
        observacoes: form.observacoes.trim() || null,
        comprovante_url: form.comprovante_url.trim() || null,
        status: 'Lancada',
        criado_por: usuario.id,
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Erro ao salvar conta');
      setLoading(false);
      return;
    }

    // Create log
    await supabase.from('contas_pagar_logs').insert({
      conta_id: conta.id,
      usuario_id: usuario.id,
      acao: 'CRIADA',
      status_anterior: null,
      status_novo: 'Lancada',
    });

    toast.success('Conta lançada com sucesso');
    navigate('/');
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">Nova Conta</h2>
            <p className="text-micro">Status inicial: Lançada</p>
          </div>
        </div>

        {/* Seção 1 - Dados da conta */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><FileText size={14} /> Dados da Conta</p>

          <div className="space-y-1">
            <label className="label-micro">Descrição *</label>
            <Input
              placeholder="Ex.: Impressão de 10.000 santinhos zona 45"
              value={form.descricao}
              onChange={e => update('descricao', e.target.value)}
              className="h-12 bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="label-micro">Categoria</label>
            <Input
              placeholder="Ex.: Material gráfico, Combustível, Pessoal..."
              value={form.categoria}
              onChange={e => update('categoria', e.target.value)}
              className="h-12 bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label-micro">Valor (R$) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={e => update('valor', e.target.value)}
                  className="pl-9 h-12 bg-background"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="label-micro">Vencimento *</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={e => update('data_vencimento', e.target.value)}
                  className="pl-9 h-12 bg-background"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="label-micro">Data de emissão</label>
            <Input
              type="date"
              value={form.data_emissao}
              onChange={e => update('data_emissao', e.target.value)}
              className="h-12 bg-background"
            />
          </div>
        </div>


        {/* Seção 3 - Motivo */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><MessageSquare size={14} /> Motivo / Justificativa *</p>
          <Textarea
            placeholder="Explique por que essa despesa é necessária para a campanha (ex.: impressão de material para ação no bairro X, combustível para deslocamento da equipe, etc.)."
            value={form.motivo}
            onChange={e => update('motivo', e.target.value)}
            rows={4}
            className="bg-background"
          />
        </div>

        {/* Seção 4 - Anexos */}
        <div className="section-card">
          <p className="section-title flex items-center gap-2"><Paperclip size={14} /> Anexos e Observações</p>

          <div className="space-y-1">
            <label className="label-micro">URL do comprovante/nota</label>
            <Input
              placeholder="https://..."
              value={form.comprovante_url}
              onChange={e => update('comprovante_url', e.target.value)}
              className="h-12 bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="label-micro">Observações</label>
            <Textarea
              placeholder="Observações adicionais (opcional)"
              value={form.observacoes}
              onChange={e => update('observacoes', e.target.value)}
              rows={2}
              className="bg-background"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pb-4">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-lg rounded-xl active:scale-[0.97] transition-transform"
          >
            {loading ? 'Salvando...' : 'Salvar Conta'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="w-full h-12"
          >
            Cancelar
          </Button>
        </div>
      </div>

    </AppLayout>
  );
}
