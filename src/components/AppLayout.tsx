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
    <div className="min-h-[100dvh] bg-muted flex flex-col" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Header gradient bar */}
      <div className="bg-gradient-to-r from-primary via-rose-400 to-pink-300 h-1.5 sticky top-0 z-50" />

      {/* Header */}
      <header className="sticky top-1.5 z-40 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-rose-400 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">FS</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">Controle Financeiro</h1>
              <p className="text-[10px] text-muted-foreground">Dra. Fernanda Sarelli</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24 hide-scrollbar">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-app mx-auto flex justify-around items-center h-16">
          {filteredNav.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-3 transition-colors active:scale-95',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
