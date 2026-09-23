import React, { useState, useEffect } from 'react';
import { Download, Share2, X, Smartphone, PlusSquare } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando como app instalado
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Detecta Android/Desktop Chrome install event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detecta iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Se é iOS e não foi dispensado
    const hasSeenPrompt = localStorage.getItem('saberx_pwa_dismissed');
    if (isIosDevice && !hasSeenPrompt) {
      setShowIosPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIosPrompt(false);
    localStorage.setItem('saberx_pwa_dismissed', 'true');
  };

  if (dismissed) return null;

  // Banner para Android / Desktop Chrome
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-slate-900 border border-blue-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Instalar o SaberX no seu celular</h4>
            <p className="text-[11px] text-slate-300">Acesse direto da tela inicial, rápido e sem travar.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Guia para iOS Safari (Adicionar à Tela de Início)
  if (isIos && showIosPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl backdrop-blur-md space-y-2.5 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-white">Instalar App no iPhone (iOS)</h4>
          </div>
          <button onClick={handleDismiss} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Para ter o SaberX como aplicativo na sua tela de início:
        </p>
        <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <li className="flex items-center gap-1.5">
            1. Toque no ícone de <Share2 className="w-3.5 h-3.5 text-blue-400 inline" /> Compartilhar.
          </li>
          <li className="flex items-center gap-1.5">
            2. Selecione <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> <strong>"Adicionar à Tela de Início"</strong>.
          </li>
        </ol>
      </div>
    );
  }

  return null;
};
