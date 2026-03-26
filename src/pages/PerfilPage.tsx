import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function PerfilPage() {
  const { usuario, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const tipoLabel = usuario?.tipo === 'admin' ? 'Administrador Financeiro' : 'Lançador';

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <h2 className="page-title">Perfil</h2>

        <div className="section-card items-center flex flex-col py-10">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-4 shadow-lg">
            <User size={32} className="text-primary-foreground" />
          </div>
          <p className="text-xl font-bold">{usuario?.nome || '—'}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Shield size={14} className="text-primary" />
            <span className="text-sm text-primary font-medium">{tipoLabel}</span>
          </div>
        </div>

        <div className="section-card">
          <p className="section-title">INFORMAÇÕES</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-xs text-muted-foreground">{usuario?.id?.slice(0, 8)}...</span>
          </div>
        </div>

        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full h-12 rounded-xl text-destructive border-destructive/30 font-medium"
        >
          <LogOut size={18} className="mr-2" /> Sair
        </Button>

        <p className="text-micro text-center pt-4">
          Financeiro Escritório v2.0 · Dra. Fernanda Sarelli
        </p>
      </div>
    </AppLayout>
  );
}
