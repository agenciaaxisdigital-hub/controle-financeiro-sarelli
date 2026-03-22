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
      <div className="space-y-4 animate-fade-in">
        <h2 className="text-xl font-bold">Perfil</h2>

        <div className="section-card items-center flex flex-col py-8">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-3">
            <User size={28} className="text-primary-foreground" />
          </div>
          <p className="text-lg font-bold">{usuario?.nome || '—'}</p>
          <div className="flex items-center gap-1 mt-1">
            <Shield size={14} className="text-primary" />
            <span className="text-sm text-primary font-medium">{tipoLabel}</span>
          </div>
        </div>

        <div className="section-card">
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
          Contas a Pagar v1.0 · Campanha Dra. Fernanda Sarelli
        </p>
      </div>
    </AppLayout>
  );
}
