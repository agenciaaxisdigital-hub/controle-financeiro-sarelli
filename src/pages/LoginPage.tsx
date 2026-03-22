import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';

const FOTO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699400706d955b03c8c19827/16e72069d_WhatsAppImage2026-02-17at023641.jpeg';

export default function LoginPage() {
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
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
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden" style={{ background: '#070510' }}>
      {/* 3D Animated background */}
      <Hyperspeed />

      {/* Vignette overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(7,5,16,0.5) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-4 space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Photo + branding */}
        <div className="text-center space-y-3">
          <div className="relative w-28 h-28 mx-auto">
            <div
              className="w-full h-full rounded-full p-[3px]"
              style={{ background: 'linear-gradient(135deg, hsl(340 82% 55%), hsl(350 80% 60%), hsl(330 70% 50%))' }}
            >
              <div className="w-full h-full rounded-full overflow-hidden">
                <img
                  src={FOTO_URL}
                  alt="Dra. Fernanda Sarelli"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#070510]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Dra. Fernanda Sarelli</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'hsl(340 82% 65%)' }}>
              Painel de Suplentes
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Acesso exclusivo da equipe
            </p>
          </div>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px hsl(340 82% 55% / 0.15)',
          }}
        >
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Usuário
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'rgba(255,255,255,0.25)' }} />
              <input
                type="text"
                placeholder="Seu nome de acesso"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoComplete="username"
                className="w-full h-12 pl-10 pr-4 rounded-xl text-white placeholder:text-white/25 outline-none transition-all focus:ring-2"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '16px',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'hsl(340, 82%, 55%)';
                  e.target.style.boxShadow = '0 0 0 2px hsl(340 82% 55% / 0.3)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'rgba(255,255,255,0.25)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-12 pl-10 pr-12 rounded-xl text-white placeholder:text-white/25 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '16px',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'hsl(340, 82%, 55%)';
                  e.target.style.boxShadow = '0 0 0 2px hsl(340 82% 55% / 0.3)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)', touchAction: 'manipulation' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
              className="border-white/20 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
            />
            <label htmlFor="remember" className="text-xs cursor-pointer" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Lembrar meus dados
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, hsl(340 82% 55%), hsl(350 80% 60%))',
              boxShadow: '0 4px 20px hsl(340 82% 55% / 0.4)',
              touchAction: 'manipulation',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Entrando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Entrar
              </span>
            )}
          </button>
        </form>

        <div className="text-center space-y-0.5">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Pré-candidata a Deputada Estadual — GO 2026
          </p>
          <p className="text-[11px]" style={{ color: 'hsl(340 82% 65%)' }}>
            drafernandasarelli.com.br
          </p>
        </div>
      </div>
    </div>
  );
}
