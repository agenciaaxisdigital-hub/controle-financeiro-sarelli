import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, BarChart3, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/nova-conta', icon: PlusCircle, label: 'Nova' },
  { path: '/relatorios', icon: BarChart3, label: 'Relatórios', adminOnly: true },
  { path: '/perfil', icon: User, label: 'Perfil' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: '#070510', paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Top gradient line */}
      <div className="h-[2px] sticky top-0 z-50" style={{ background: 'linear-gradient(90deg, #ec4899, #fb7185, #a855f7, #ec4899)' }} />

      {/* Header */}
      <header className="sticky top-[2px] z-40 border-b px-4 py-3" style={{ background: 'rgba(7, 5, 16, 0.8)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center" style={{ boxShadow: '0 2px 12px rgba(236,72,153,0.3)' }}>
              <span className="text-xs font-bold text-white">FS</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Controle Financeiro</h1>
              <p className="text-[11px] text-white/40">Dra. Fernanda Sarelli</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-24 hide-scrollbar">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{ background: 'rgba(7, 5, 16, 0.85)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-app mx-auto flex justify-around items-center h-16">
          {filteredNav.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-3 transition-all active:scale-95',
                  active ? 'text-pink-400' : 'text-white/35'
                )}
              >
                <item.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
