import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  contaId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
}

export default function FileUpload({ contaId, currentUrl, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande (máx. 10MB)');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${contaId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('comprovantes')
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error('Erro ao enviar arquivo');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('comprovantes')
      .getPublicUrl(path);

    await supabase
      .from('contas_pagar')
      .update({ comprovante_url: urlData.publicUrl })
      .eq('id', contaId);

    onUploaded(urlData.publicUrl);
    toast.success('Comprovante anexado!');
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleUpload}
        className="hidden"
      />

      {currentUrl ? (
        <div className="flex items-center gap-2">
          <FileCheck size={16} className="text-green-500" />
          <a href={currentUrl} target="_blank" rel="noopener" className="text-sm text-primary underline truncate flex-1">
            Ver comprovante →
          </a>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs text-muted-foreground underline"
          >
            Trocar
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-12 rounded-xl border-2 border-dashed border-border bg-background flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/50 transition-colors"
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> Enviando...</>
          ) : (
            <><Upload size={16} /> Anexar comprovante (foto ou PDF)</>
          )}
        </button>
      )}
    </div>
  );
}
