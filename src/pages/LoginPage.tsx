import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Hyperspeed from '@/components/Hyperspeed';
import { toast } from 'sonner';

const APP_TITLE = 'Financeiro';
const FOTO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699400706d955b03c8c19827/16e72069d_WhatsAppImage2026-02-17at023641.jpeg';

const hyperspeedPreset = {
  onSpeedUp: () => {}, onSlowDown: () => {},
  distortion: 'turbulentDistortion',
  length: 800, roadWidth: 18, islandWidth: 4, lanesPerRoad: 3,
  fov: 100, fovSpeedUp: 140, speedUp: 2, carLightsFade: 0.4,
  totalSideLightSticks: 40, lightPairsPerRoadWay: 80,
  shoulderLinesWidthPercentage: 0.05, brokenLinesWidthPercentage: 0.1, brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5], lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 100], movingCloserSpeed: [-120, -180],
  carLightsLength: [800 * 0.04, 800 * 0.14], carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5], carShiftX: [-0.8, 0.8], carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x080510, islandColor: 0x0a0812, background: 0x070510,
    shoulderLines: 0x1a0a1a, brokenLines: 0x1a0a1a,
    leftCars: [0xec4899, 0xf9a8d4, 0xbe185d, 0xfda4af],
    rightCars: [0xf43f5e, 0xff6b9d, 0xc026d3, 0xe879f9],
    sticks: 0xf472b6,
  },
};

export default function LoginPage() {
  const [nome, setNome] = useState(() => localStorage.getItem('saved_user') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('saved_pass') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem('saved_user'));
  const { signInByNome } = useAuth();
  const navigate = useNavigate();

  const preset = useMemo(() => hyperspeedPreset, []);

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
      if (remember) {
        localStorage.setItem('saved_user', nome);
        localStorage.setItem('saved_pass', password);
      } else {
        localStorage.removeItem('saved_user');
        localStorage.removeItem('saved_pass');
      }
      navigate('/');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: '#070510' }}>
      <Hyperspeed effectOptions={preset} />
      <div className="absolute top-0 left-0 right-0 h-[2px] z-[2]" style={{ background: 'linear-gradient(90deg, #ec4899, #fb7185, #a855f7, #ec4899)' }} />
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(7,5,16,0.5) 100%)' }} />
      <div className="absolute -top-20 -left-20 w-52 h-52 rounded-full blur-3xl bg-pink-500/25 pointer-events-none brand-float-slow" />
      <div className="absolute -bottom-20 -right-16 w-52 h-52 rounded-full blur-3xl bg-purple-500/20 pointer-events-none brand-float-slow" />

      <div className="w-full max-w-sm space-y-6 relative z-10 brand-fade-up">
        <div className="text-center space-y-3">
          <div className="relative mx-auto w-28 h-28 brand-float-slow">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 p-[3px]">
              <div className="w-full h-full rounded-full overflow-hidden bg-black">
                <img src={FOTO_URL} alt="Dra. Fernanda Sarelli" className="w-full h-full object-cover" loading="eager" />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black brand-pulse-glow" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Dra. Fernanda Sarelli</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="h-[2px] w-5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400" />
              <p className="text-xs font-medium text-pink-400 uppercase tracking-widest">{APP_TITLE}</p>
              <span className="h-[2px] w-5 rounded-full bg-gradient-to-r from-rose-400 to-pink-500" />
            </div>
          </div>
          <p className="text-[11px] text-white/40">Acesso exclusivo da equipe</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-black/60 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-[0_8px_32px_hsl(340_82%_55%/0.15)]">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-white/50 font-medium block">Usuário</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                type="text"
                placeholder="Seu nome de acesso"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoComplete="username"
                required
                className="w-full bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-pink-500/50 h-11 pl-10 pr-4 rounded-lg text-sm outline-none focus:ring-1 focus:ring-pink-500/20"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-white/50 font-medium block">Senha</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-pink-500/50 h-11 pl-10 pr-10 rounded-lg text-sm outline-none focus:ring-1 focus:ring-pink-500/20"
                style={{ fontSize: '16px' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors" tabIndex={-1}>
                {showPassword
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/10 accent-pink-500 cursor-pointer"
            />
            <label htmlFor="remember" className="text-xs text-white/50 cursor-pointer select-none">Lembrar meus dados</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(to right, #ec4899, #fb7185)', boxShadow: '0 4px 16px hsl(340 82% 55% / 0.3)' }}
          >
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Entrando...</span>
              : <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  Entrar
                </span>
            }
          </button>
        </form>

        <div className="text-center space-y-1">
          <p className="text-[10px] text-white/25">Pré-candidata a Deputada Estadual — GO 2026</p>
          <a href="https://drafernandasarelli.com.br" target="_blank" rel="noopener noreferrer" className="text-[10px] text-pink-500/50 hover:text-pink-400 transition-colors">
            drafernandasarelli.com.br
          </a>
        </div>
      </div>
    </div>
  );
}
