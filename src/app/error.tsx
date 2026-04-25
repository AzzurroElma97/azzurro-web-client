'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, Home, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { socketService } from '@/services/socket-service';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('🔴 Errore Critico Titanium:', error);
    // Invia automaticamente il report al Blackview
    socketService.reportError(
      error.message || 'Errore sconosciuto',
      'CRASH_PAGINA',
      { stack: error.stack?.substring(0, 300), digest: error.digest }
    );
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
      {/* Sfondo Decorativo */}
      <div className="absolute inset-0 z-0 opacity-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Oops! Qualcosa è andato storto</h1>
          <p className="text-slate-400 font-medium text-sm leading-relaxed">
            Il sistema Titanium ha riscontrato un'interruzione imprevista. 
            Potrebbe essere un calo di connessione con il Blackview o un errore temporaneo del server.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4">
          <Button 
            onClick={() => reset()}
            className="h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all"
          >
            <RefreshCcw className="w-5 h-5" />
            Riprova a caricare
          </Button>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 bg-white/5 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-white/10">
                <Home className="w-4 h-4 mr-2" /> Home
              </Button>
            </Link>
            <Link href="/login" className="flex-1">
              <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 bg-white/5 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-white/10">
                <Smartphone className="w-4 h-4 mr-2" /> Login
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-8 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">
          Protocollo di Ripristino Titanium v3.3
        </div>
      </div>
    </div>
  );
}
