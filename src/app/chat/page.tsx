'use client';
import React from 'react';
import { MessageSquare, Lock, Zap, ArrowLeft, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Sfondo animato con gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-800/30 rounded-full blur-3xl" />
      </div>

      {/* Griglia decorativa */}
      <div className="absolute inset-0 z-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        
        {/* Card principale */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-[3rem] p-10 text-center shadow-2xl space-y-8">
          
          {/* Icona animata */}
          <div className="relative mx-auto w-28 h-28">
            <div className="absolute inset-0 bg-blue-600/20 rounded-[2rem] animate-ping" style={{ animationDuration: '2.5s' }} />
            <div className="relative w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <MessageSquare className="w-14 h-14 text-white" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900">
                <Lock className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Testo principale */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">In Sviluppo</span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">
              Chat Globale<br />
              <span className="text-blue-400">In Arrivo</span>
            </h1>
            <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-xs mx-auto">
              Stiamo costruendo una chat sicura e privata integrata nel sistema Titanium.
              <br /><br />
              Nel frattempo, la comunicazione avviene tramite <strong className="text-white">WhatsApp</strong> con crittografia end-to-end garantita.
            </p>
          </div>

          {/* Features in arrivo */}
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { emoji: '🔒', label: 'Crittografia SQL', desc: 'Nessun server esterno' },
              { emoji: '🚀', label: 'In Tempo Reale', desc: 'Via relay Titanium' },
              { emoji: '👥', label: 'Gruppi Privati', desc: 'Per corsa o driver' },
              { emoji: '📍', label: 'Posizioni Live', desc: 'Tracking integrato' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/30 space-y-1">
                <span className="text-xl">{f.emoji}</span>
                <p className="text-[10px] font-black text-white uppercase tracking-wider leading-none">{f.label}</p>
                <p className="text-[9px] text-slate-500 font-medium">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottone WhatsApp */}
          <div className="space-y-3">
            <a
              href="https://wa.me/393274723787"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 transition-all duration-300 font-black uppercase text-[11px] tracking-widest text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.02]"
            >
              <Phone className="w-5 h-5" />
              Contatta su WhatsApp
            </a>
            <Link href="/" className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
              <ArrowLeft className="w-4 h-4" />
              Torna alla Home
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] font-black text-slate-600 uppercase tracking-widest">
          Azzurro Community · Sistema Titanium v2.0
        </p>
      </div>
    </div>
  );
}
