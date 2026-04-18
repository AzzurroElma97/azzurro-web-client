'use client';

import {
  Book,
  Calendar,
  ChevronRight,
  LogOut,
  MapPin,
  MessageSquare,
  Settings,
  Users,
  Loader2,
  User,
  LifeBuoy,
  ShieldCheck,
  Mail,
  Lock,
  Phone,
  ArrowLeft,
  Zap,
  Share2,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { socketService } from '@/services/socket-service';

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [isAutoWaiting, setIsAutoWaiting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const authStatus = localStorage.getItem('isAdminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // RICHIESTA AL BLACKVIEW MASTER SERVER TRAMITE RELAY
    socketService.emit('client_request', { 
      action: 'LOGIN_ADMIN', 
      email, 
      password 
    }, (res: any) => {
      setIsLoading(false);
      if (res && res.success) {
        setIsAuthenticated(true);
        localStorage.setItem('isAdminAuthenticated', 'true');
        localStorage.setItem('adminEmail', email);
      } else {
        setError(res?.message || 'Credenziali non valide. Accesso negato.');
      }
    });
  };

  const handleAutoLogin = () => {
    setIsAutoWaiting(true);
    setError('');

    // Timeout ridotto a 15 secondi come richiesto
    socketService.emit('client_request', {
      action: 'REQUEST_AUTO_LOGIN',
      device: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown Web Client'
    }, (res: any) => {
      setIsAutoWaiting(false);
      if (res && res.success) {
        setIsAuthenticated(true);
        localStorage.setItem('isAdminAuthenticated', 'true');
        localStorage.setItem('adminEmail', 'AUTO_LOGIN');
      } else {
        if (res?.message === 'TIMEOUT_EXCEEDED') {
          setError('Tempo scaduto! Assicurati di accettare la richiesta sul Blackview entro 15 secondi.');
        } else {
          setError(res?.message || 'Accesso automatico rifiutato dal Master.');
        }
      }
    }, 15000); 
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAdminAuthenticated');
    router.push('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        {/* Sfondo Decorativo */}
        <div className="absolute inset-0 z-0 opacity-20">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px]" />
        </div>

        <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-white/5 border-slate-800 p-8 rounded-[3rem] shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-700 z-10 transition-all">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter pt-2">Admin Panel</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Protocollo Titanium v2.0</p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in slide-in-from-top-2">
                <p className="text-[11px] font-bold text-red-500 text-center uppercase tracking-wider">{error}</p>
                <Link href="/" className="block mt-2 text-[9px] text-center font-black text-red-400 uppercase tracking-widest hover:text-red-300">Torna alla Home</Link>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
               <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    type="email" 
                    placeholder="EMAIL" 
                    className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 font-bold focus:ring-2 focus:ring-blue-500/50" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
               </div>
               <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    type="password" 
                    placeholder="PASSWORD" 
                    className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 font-bold focus:ring-2 focus:ring-blue-500/50" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
               </div>
               <Button 
                type="submit" 
                disabled={isLoading || isAutoWaiting} 
                className="w-full h-14 rounded-2xl bg-white text-slate-900 font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all"
               >
                 {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accedi Manualmente"}
               </Button>
            </form>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-[9px] uppercase font-black"><span className="bg-slate-900 px-3 text-slate-600 tracking-[0.2em]">Oppure</span></div>
            </div>

            <Button 
              className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all enabled:hover:scale-[1.02] disabled:opacity-50"
              onClick={handleAutoLogin}
              disabled={isAutoWaiting || isLoading}
            >
              {isAutoWaiting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Attesa Master (15s)...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Autorizza via Blackview
                </>
              )}
            </Button>

            <Link href="/" className="block w-full text-center text-slate-600 hover:text-slate-400 transition-colors text-[9px] font-black uppercase tracking-[0.3em] pt-4">
              <ArrowLeft className="inline w-3 h-3 mr-2" />
              Torna alla Home
            </Link>
          </div>
          
          <div className="text-center">
            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Azzurro Security Enforcement</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-12">
            <main className="max-w-5xl mx-auto space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Dashboard Admin</h1>
                        <p className="text-slate-500 font-medium">Benvenuto nel cuore operativo della Community Azzurro.</p>
                    </div>
                    <Button 
                        onClick={handleLogout} 
                        variant="outline" 
                        className="rounded-xl h-12 px-6 font-bold"
                    >
                        <LogOut className="mr-2 h-4 w-4" /> Disconnetti
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ManagementMenuItem
                      icon={<User className="h-6 w-6" />}
                      title="Mio Profilo"
                      description="Gestisci le tue informazioni personali e visualizza le tue statistiche."
                      href="/admin/profile"
                      color="bg-purple-100 text-purple-600"
                    />
                    <ManagementMenuItem
                      icon={<Settings className="h-6 w-6" />}
                      title="Tariffe Sistema"
                      description="Gestisci costi fissi, supplementi e fasce orarie."
                      href="/admin/settings"
                      color="bg-indigo-100 text-indigo-600"
                    />
                    <ManagementMenuItem
                      icon={<MapPin className="h-6 w-6" />}
                      title="Geografia"
                      description="Indirizzi verificati e blacklist zone operative."
                      href="/admin/places"
                      color="bg-emerald-100 text-emerald-600"
                    />
                    <ManagementMenuItem
                      icon={<Users className="h-6 w-6" />}
                      title="Gestione Flotta"
                      description="Profili driver, veicoli e tariffe individuali."
                      href="/admin/drivers"
                      color="bg-blue-100 text-blue-600"
                    />
                    <ManagementMenuItem
                      icon={<Book className="h-6 w-6" />}
                      title="Prenotazioni"
                      description="Monitoraggio reale di tutte le corse richieste."
                      href="/admin/bookings"
                      color="bg-amber-100 text-amber-600"
                    />
                    <ManagementMenuItem
                      icon={<Calendar className="h-6 w-6" />}
                      title="Calendario"
                      description="Visualizzazione giornaliera del carico di lavoro."
                      href="/admin/calendar"
                      color="bg-rose-100 text-rose-600"
                    />
                    <ManagementMenuItem
                      icon={<MessageSquare className="h-6 w-6" />}
                      title="Community Hub"
                      description="Accedi alla chat globale per moderare i messaggi."
                      href="/chat"
                      color="bg-sky-100 text-sky-600"
                    />
                    <ManagementMenuItem
                      icon={<LifeBuoy className="h-6 w-6" />}
                      title="Supporto Utenti"
                      description="Visualizza i messaggi di assistenza e le richieste SOS."
                      href="/admin/support"
                      color="bg-red-100 text-red-600"
                    />
                    
                    {/* Shareable Link Card */}
                    <Card className="h-full hover:shadow-md transition-all rounded-2xl border-none shadow-sm overflow-hidden cursor-pointer group" onClick={() => {
                        const url = window.location.origin;
                        if (navigator.share) {
                            navigator.share({
                                title: 'Azzurro Community Ride',
                                text: 'Prenota il tuo passaggio con Azzurro!',
                                url: url,
                            }).catch(console.error);
                        } else {
                            navigator.clipboard.writeText(url);
                            alert("Link copiato negli appunti: " + url);
                        }
                    }}>
                      <CardContent className="flex flex-col p-8 h-full">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-pink-100 text-pink-600">
                            <Share2 className="h-6 w-6" />
                        </div>
                        <div className="space-y-2 flex-1">
                            <p className="font-bold text-slate-900 text-xl">Condividi Sito</p>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">Copia o condividi il link pubblico per far prenotare i clienti.</p>
                        </div>
                        <div className="mt-8 flex items-center text-xs font-bold text-pink-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                            Condividi <LinkIcon className="ml-1 h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                </div>

                <div className="pt-10 text-center border-t border-slate-200">
                    <Link href="/" className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">
                        ← Torna all'interfaccia pubblica
                    </Link>
                </div>
            </main>
        </div>
    </div>
  );
}

const ManagementMenuItem = ({
  icon,
  title,
  description,
  href,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
}) => (
  <Link href={href} className="block group">
    <Card className="h-full hover:shadow-md transition-all rounded-2xl border-none shadow-sm overflow-hidden">
      <CardContent className="flex flex-col p-8 h-full">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6", color)}>
            {icon}
        </div>
        <div className="space-y-2 flex-1">
            <p className="font-bold text-slate-900 text-xl">{title}</p>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">{description}</p>
        </div>
        <div className="mt-8 flex items-center text-xs font-bold text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
            Gestisci <ChevronRight className="ml-1 h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  </Link>
);
