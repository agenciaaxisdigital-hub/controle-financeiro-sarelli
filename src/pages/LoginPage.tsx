import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

const FOTO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699400706d955b03c8c19827/16e72069d_WhatsAppImage2026-02-17at023641.jpeg';

export default function LoginPage() {
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInByNome } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !password.trim()) {
      toast.error('Preencha nome e senha');
      return;
    }
    setLoading(true);
    const { error } = await signInByNome(nome.trim(), password);
    setLoading(false);
    if (error) {
      toast.error('Nome ou senha inválidos');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Gradient line top */}
      <div className="gradient-header h-[1.5px] w-full fixed top-0 left-0" />

      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Photo + branding */}
        <div className="text-center space-y-3">
          <div className="w-28 h-28 rounded-full mx-auto overflow-hidden border-[3px] border-primary shadow-lg shadow-primary/20">
            <img 
              src={FOTO_URL} 
              alt="Dra. Fernanda Sarelli" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">Contas a Pagar</h1>
            <p className="text-sm text-muted-foreground">Campanha – Dra. Fernanda Sarelli</p>
          </div>
        </div>

        {/* Login card */}
        <form onSubmit={handleSubmit} className="section-card space-y-4">
          <div className="space-y-1">
            <label className="label-micro">Nome de usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type="text"
                placeholder="Seu nome de acesso"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="pl-10 h-12 bg-card border-border"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="label-micro">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 bg-card border-border"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-lg rounded-xl active:scale-[0.97] transition-transform"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-micro text-center">
          Sistema exclusivo para membros da campanha
        </p>
      </div>
    </div>
  );
}
