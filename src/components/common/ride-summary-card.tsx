'use client';

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Download, MessageCircle } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function RideSummaryCard({ ride, finalCode, adminWhatsapp }: { ride: any, finalCode: string, adminWhatsapp?: string }) {
    const resultCardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const { toast } = useToast();

    const handleDownload = () => {
        if (!resultCardRef.current) return;
        setIsDownloading(true);

        // Opzioni che prevengono SecurityError da CSS cross-origin (es. Google Fonts)
        const options = {
            cacheBust: true,
            backgroundColor: '#ffffff',
            skipFonts: true,          // Evita di leggere regole CSS cross-origin
            skipAutoScale: false,
            pixelRatio: 2,            // Alta qualità
            filter: (node: HTMLElement) => {
                // Esclude elementi che potrebbero causare errori di sicurezza
                if (node.tagName === 'LINK') return false;
                if (node.tagName === 'SCRIPT') return false;
                if (node.tagName === 'STYLE') return false;
                if ((node as HTMLElement).style?.display === 'none') return false;
                return true;
            }
        };

        toPng(resultCardRef.current, options)
        .then((dataUrl) => {
            const link = document.createElement('a');
            link.download = `azzurro-prenotazione-${finalCode}.png`;
            link.href = dataUrl;
            link.click();
            toast({ title: "📸 Foto salvata!", description: "Controlla la galleria del tuo dispositivo." });
        })
        .catch((err) => {
            // Se è un SecurityError CSS, riprova senza leggere gli stili esterni
            if (err?.name === 'SecurityError' || err?.message?.includes('cssRules')) {
                toPng(resultCardRef.current!, { 
                    cacheBust: true, 
                    backgroundColor: '#ffffff', 
                    skipFonts: true,
                    filter: () => true 
                })
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = `azzurro-prenotazione-${finalCode}.png`;
                    link.href = dataUrl;
                    link.click();
                    toast({ title: "📸 Foto salvata!", description: "Immagine salvata con successo." });
                })
                .catch(() => toast({ title: "Errore", description: "Non è stato possibile salvare l'immagine.", variant: 'destructive' }));
            } else {
                toast({ title: "Errore download", description: "Riprova tra un momento.", variant: 'destructive' });
            }
        })
        .finally(() => setIsDownloading(false));
    };

    const handleWhatsAppResend = () => {
        let stopsMessage = "";
        if (ride.intermediateStops?.length > 0) {
            const tappeItems = ride.intermediateStops.map((s: any, i: number) => 
                `> 🔵 Tappa ${i + 1}: ${typeof s === 'string' ? s : s.address}`
            );
            stopsMessage = "\n" + tappeItems.join("\n");
        }
        const waMessage = 
          `🚗 *PRENOTAZIONE AZZURRO COMMUNITY*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 *Codice:* ${finalCode}\n` +
          `🏷️ *Servizio:* ${ride.serviceType || 'Standard'}\n` +
          `👤 *Passeggero:* ${ride.passengerName}\n` +
          `📱 *WhatsApp:* ${ride.passengerPhone}\n` +
          `📅 *Data:* ${ride.date} alle ${ride.time}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🟢 *Partenza:*\n> ${ride.origin || ride.pickupLocation}${stopsMessage}\n` +
          `🔴 *Arrivo:*\n> ${ride.destination || ride.dropoffLocation}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💶 *Prezzo Fisso:* €${ride.price || '0'}`;
          
        const cleanNumber = (adminWhatsapp || '393274723787').replace(/\+/g, '').replace(/\s/g, '');
        window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(waMessage)}`, '_blank');
    };

    return (
        <div className="space-y-4">
            <div ref={resultCardRef} className="bg-white p-5 rounded-[2rem] border-4 border-slate-100 text-left shadow-2xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Car className="w-24 h-24 text-blue-600" /></div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">RIEPILOGO PRENOTAZIONE</p>
                        <p className="text-xl font-black text-slate-900 tracking-tight">#{finalCode}</p>
                    </div>
                    <Badge className="bg-blue-600 font-black uppercase text-[8px] py-0.5 px-2 rounded-lg shadow-md">{ride.serviceType || 'Standard'}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PASSEGGERO</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{ride.passengerName}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">DATA E ORA</p>
                        <p className="text-xs font-bold text-slate-700">{ride.date} • {ride.time}</p>
                    </div>
                </div>

                <div className="space-y-2 py-2">
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div className="w-0.5 flex-1 bg-slate-100 my-1" />
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="space-y-0.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PARTENZA</p>
                                <p className="text-[10px] font-bold text-slate-600 leading-tight">{ride.origin || ride.pickupLocation}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ARRIVO</p>
                                <p className="text-[10px] font-bold text-slate-600 leading-tight">{ride.destination || ride.dropoffLocation}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-3 border-t-2 border-dashed border-slate-100 flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PREZZO FISSO</p>
                        <p className="text-2xl font-black text-blue-600 tracking-tighter">€{ride.price || '0'}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                        <img src="/logo-small.png" alt="Azzurro" className="h-6 opacity-30 grayscale" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleDownload} disabled={isDownloading} className="h-12 rounded-2xl border-2 font-black uppercase text-[9px] tracking-widest gap-2 bg-white/50 backdrop-blur-sm">
                    {isDownloading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-4 h-4" />} Salva Foto
                </Button>
                <Button onClick={handleWhatsAppResend} className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 font-black uppercase text-[9px] tracking-widest gap-2">
                    <MessageCircle className="w-4 h-4" /> Invia WhatsApp
                </Button>
            </div>
        </div>
    );
}

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
