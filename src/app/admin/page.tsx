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
  const router = useRouter();

  useEffect(() => {
    const authStatus = localStorage.getItem('isAdminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, router]);

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

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAdminAuthenticated');
    router.push('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-500">
          <CardContent className="p-8 space-y-8">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900">Elite Master</h2>
              <p className="text-slate-500 font-medium italic">Sistema di Controllo Titanium</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <Input 
                    type="email" 
                    placeholder="Email Amministratore" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all text-slate-900 font-medium"
                    autoFocus
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input 
                    type="password" 
                    placeholder="Password Segreta" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all text-slate-900 font-medium"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-red-500 text-sm font-bold text-center animate-pulse">{error}</p>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-500/10 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifica in corso...
                  </>
                ) : (
                  <>Accedi al Sistema Master</>
                )}
              </Button>
            </form>

            <div className="text-center pt-4">
               <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Powered by Blackview SQLite Master</p>
            </div>
          </CardContent>
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
