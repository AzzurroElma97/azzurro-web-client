'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Car, 
  LogOut,
  Loader2,
  ShieldCheck,
  History,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { socketService } from '@/services/socket-service';
import Link from 'next/link';

interface Booking {
  id: number;
  ticket_id: string;
  partenza_indirizzo: string;
  destinazione_indirizzo: string;
  data_partenza: string;
  ora_partenza: string;
  stato_corsa: string;
  preventivo_accettato: number;
  driver_nome?: string;
}

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const authStatus = localStorage.getItem('isCustomerAuthenticated');
    const data = localStorage.getItem('customerData');
    
    if (authStatus !== 'true' || !data) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(data);
    setCustomerData(userData);

    // RECUPERO PRENOTAZIONI DAL MASTER SERVER
    socketService.emit('process_request', {
      action: 'GET_CUSTOMER_BOOKINGS',
      email: userData.email
    }, (res: any) => {
      setIsLoading(false);
      if (res && res.success) {
        setBookings(res.bookings);
      } else {
        setError(res?.message || 'Errore nel recupero delle prenotazioni.');
      }
    });

    // Ascolta aggiornamenti in tempo reale (Tracker)
    socketService.on('sync_customer_bookings', (updatedBookings: Booking[]) => {
      setBookings(updatedBookings);
    });

    return () => {
      socketService.off('sync_customer_bookings');
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isCustomerAuthenticated');
    localStorage.removeItem('customerData');
    router.push('/');
  };

  const statusColors: Record<string, string> = {
    'CODA': 'bg-slate-100 text-slate-600',
    'AVVICINAMENTO': 'bg-blue-100 text-blue-600',
    'ARRIVATO': 'bg-orange-100 text-orange-600',
    'INIZIO': 'bg-green-100 text-green-600',
    'FINE': 'bg-emerald-100 font-bold text-emerald-700',
    'ANNULLATA': 'bg-red-100 text-red-600'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Accesso al Master Server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tighter">ELITE CLIENT</span>
          </Link>
          <Button onClick={handleLogout} variant="ghost" className="text-slate-500 font-bold rounded-xl gap-2">
            <LogOut className="w-4 h-4" /> Esci
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 lg:py-12 max-w-4xl space-y-10">
        {/* Welcome Section */}
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-900 tracking-tight">Ciao, {customerData?.nome}! 👋</h1>
           <p className="text-slate-500 font-medium">Qui trovi lo stato dei tuoi passaggi Elite.</p>
        </div>

        {/* Tabella / Elenco Corse */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" /> Le Tue Prenotazioni
            </h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-black">
              {bookings.length} TOTALE
            </span>
          </div>

          {bookings.length > 0 ? (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <Card key={booking.ticket_id} className="border-none shadow-sm hover:shadow-md transition-all rounded-[2rem] overflow-hidden bg-white group cursor-default">
                  <CardContent className="p-0">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1 space-y-6">
                        {/* Status & Ticket */}
                        <div className="flex items-center justify-between md:justify-start gap-4">
                           <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", statusColors[booking.stato_corsa] || 'bg-slate-100')}>
                              {booking.stato_corsa}
                           </span>
                           <span className="text-xs font-bold text-slate-300">Ticket: {booking.ticket_id}</span>
                        </div>

                        {/* Percorso */}
                        <div className="grid gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2" />
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partenza</p>
                               <p className="text-slate-900 font-bold leading-tight">{booking.partenza_indirizzo}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinazione</p>
                               <p className="text-slate-900 font-bold leading-tight">{booking.destinazione_indirizzo}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info Data e Prezzo */}
                      <div className="flex items-center justify-between md:flex-col md:items-end gap-4 p-6 bg-slate-50 md:bg-transparent rounded-2xl md:p-0">
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data & Ora</p>
                            <p className="text-lg font-black text-slate-900">{booking.data_partenza} - {booking.ora_partenza}</p>
                         </div>
                         <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prezzo Concordato</p>
                             <p className="text-2xl font-black text-blue-600">€{booking.preventivo_accettato}</p>
                         </div>
                      </div>
                    </div>

                    {/* Driver Info (Se assegnato) */}
                    {booking.driver_nome && (
                      <div className="bg-blue-50/50 px-8 py-4 flex items-center justify-between border-t border-blue-100/50">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                               <Car className="w-4 h-4 text-white" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Autista Assegnato</p>
                               <p className="font-bold text-slate-900">{booking.driver_nome}</p>
                            </div>
                         </div>
                         {booking.stato_corsa === 'ARRIVATO' && (
                            <div className="flex items-center gap-2 text-green-600">
                               <CheckCircle2 className="w-4 h-4" />
                               <span className="text-xs font-black uppercase tracking-widest">Ti sta aspettando</span>
                            </div>
                         )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-slate-200 shadow-none rounded-[2rem] bg-transparent">
              <CardContent className="flex flex-col items-center justify-center p-16 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <p className="text-slate-500 font-bold">Non hai ancora effettuato prenotazioni col tuo account.</p>
                <Link href="/">
                   <Button className="rounded-xl h-12 px-8 font-black bg-blue-600 hover:bg-blue-700">Prenota ora il primo viaggio</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <footer className="py-12 bg-white border-t border-slate-200 mt-20">
         <div className="container mx-auto px-4 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">© Azzurro Community Titanium - Local Blackview Engine</p>
         </div>
      </footer>
    </div>
  );
}
