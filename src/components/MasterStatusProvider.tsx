'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '@/services/socket-service';
import { AlertTriangle, Bell, X } from 'lucide-react';

const MasterStatusContext = createContext<{ isOnline: boolean }>({ isOnline: true });

export const useMasterStatus = () => useContext(MasterStatusContext);

export function MasterStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true); // Default true per evitare flash iniziali
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);

  const [avviso, setAvviso] = useState<string | null>(null);

  useEffect(() => {
    // Sottoscrizione allo stato del socket
    const unsubscribe = socketService.subscribeStatus((online) => {
      setIsOnline(online);
      setHasCheckedOnce(true);
    });

    // Listener per gli avvisi globali (Push Notifications) dal Master
    const handleAvviso = (data: any) => {
       if (data && data.message) {
          setAvviso(data.message);
          // Auto-nascondi dopo 15 secondi
          setTimeout(() => setAvviso(null), 15000);
       }
    };
    socketService.on('avviso_globale', handleAvviso);

    return () => {
      unsubscribe();
      socketService.off('avviso_globale');
    };
  }, []);

  // Mostra l'interfaccia in bianco e nero (grayscale) e con un banner rosso se il Master è offline.
  return (
    <MasterStatusContext.Provider value={{ isOnline }}>
      <div className={(!isOnline && hasCheckedOnce) ? "offline-mode" : "online-mode"}>
        {children}
      </div>
      
      {(!isOnline && hasCheckedOnce) && (
        <>
          <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white p-2 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top-4">
             <AlertTriangle className="w-4 h-4" /> 
             SISTEMA OFFLINE - IL MASTER BLACKVIEW NON È CONNESSO - I DATI NON SONO SINCRONIZZATI
          </div>
          
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-slate-900/90 text-white px-12 py-8 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-md transform -rotate-2 animate-in zoom-in-95 duration-700">
              <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-300 to-slate-500 drop-shadow-2xl flex items-center gap-4">
                <AlertTriangle className="w-16 h-16 md:w-24 md:h-24 text-slate-400" />
                MANUTENZIONE
              </h1>
            </div>
          </div>
        </>
      )}

      {/* Banner Avviso Globale (Push Notification) */}
      {avviso && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 pr-12 rounded-2xl shadow-2xl border border-slate-700 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
           <div className="flex items-start gap-3">
              <div className="bg-blue-500/20 p-2 rounded-full mt-1">
                 <Bell className="w-5 h-5 text-blue-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                 <h4 className="font-black text-[10px] tracking-widest text-blue-400 uppercase">Avviso dalla Centrale</h4>
                 <p className="text-sm font-medium leading-relaxed">{avviso}</p>
              </div>
           </div>
           <button onClick={() => setAvviso(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>
      )}
    </MasterStatusContext.Provider>
  );
}
