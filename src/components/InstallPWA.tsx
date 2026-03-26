import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Se já está instalado como PWA standalone, não mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as any).standalone === true) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Mostrar só se ainda não foi dispensado hoje
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (dismissed !== new Date().toDateString()) {
        setVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', new Date().toDateString());
    setVisible(false);
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-fade-in">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
          <Download size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instalar como App</p>
          <p className="text-[11px] text-muted-foreground">Acesse direto da tela inicial</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 text-xs font-semibold gradient-primary text-white rounded-lg"
          >
            Instalar
          </button>
          <button onClick={handleDismiss} className="text-muted-foreground p-1">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
