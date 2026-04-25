'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  Phone, 
  ChevronRight, 
  Car, 
  Users,
  Loader2,
  ShieldCheck,
  Smartphone,
  History
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { socketService } from '@/services/socket-service';
import Link from 'next/link';

type UserType = 'customer' | 'driver';
type LoginMethod = 'email' | 'phone';

export default function LoginPage() {
  const [userType, setUserType] = useState<UserType>('customer');
  const [method, setMethod] = useState<LoginMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const isCust = localStorage.getItem('isCustomerAuthenticated') === 'true';
    const isDriver = localStorage.getItem('isDriverAuthenticated') === 'true';
    if (isCust) router.push('/customer/dashboard');
    else if (isDriver) router.push('/driver');
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Riconosce automaticamente se hai inserito una mail o un telefono dal formato
    const isPhone = /^\+?[0-9\s\-]+$/.test(identifier);

    socketService.login({
      type: 'CUSTOMER', // Invia sempre come customer, il database Master cercherà in entrambe le tabelle!
      email: !isPhone ? identifier : undefined,
      telefono: isPhone ? identifier : undefined,
      password
    }, (res: any) => {
      setIsLoading(false);
      if (res && res.success) {
        // Il backend restituisce il tipo effettivo (actual_type: 'DRIVER' o 'CUSTOMER')
        const actualType = res.customer?.actual_type || 'CUSTOMER';

        if (actualType === 'CUSTOMER') {
          if (res.customer?.reset_required) {
            router.push(`/change-password?id=${res.customer.id}&type=CUSTOMER`);
            return;
          }
          localStorage.setItem('isCustomerAuthenticated', 'true');
          localStorage.setItem('customerData', JSON.stringify(res.customer));
          localStorage.setItem('userName', res.customer.nome);
          router.push('/customer/dashboard');
        } else {
          // E' un Driver!
          if (res.customer?.reset_required) {
            router.push(`/change-password?id=${res.customer.id}&type=DRIVER`);
            return;
          }
          localStorage.setItem('isDriverAuthenticated', 'true');
          localStorage.setItem('driverData', JSON.stringify(res.customer));
          localStorage.setItem('userName', res.customer.nome);
          router.push('/driver');
        }
      } else {
        const errorMsg = res?.message || res?.error || 'Errore imprevisto durante il login.';
        console.error("❌ Errore Login ricevuto:", res);
        setError(errorMsg.includes('TIMEOUT') ? 'Il Master Server (Blackview) non risponde. Verifica che sia Online.' : errorMsg);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 lg:p-8">
      <Link href="/" className="flex items-center gap-2 mb-10 group">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-transform">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <span className="text-2xl font-black text-slate-900 tracking-tighter">AZZURRO TITANIUM</span>
      </Link>

      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white p-2">
        <CardContent className="p-8 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Bentornato</h2>
            <p className="text-slate-500 font-medium italic">Seleziona il tuo profilo</p>
          </div>

          {/* Unified Login Header */}
          <div className="flex justify-center">
            <div className="px-6 py-2 bg-slate-100 rounded-full font-bold text-slate-500 flex items-center gap-2">
              <Users className="w-4 h-4" /> Passeggero / Driver
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <Input 
                  type="text"
                  placeholder="La tua Email o Telefono"
                  className="h-15 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-lg font-medium"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <Input 
                  type="password"
                  placeholder="Password Segreta"
                  className="h-15 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-lg font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                  <p className="text-rose-500 text-sm font-bold text-center animate-pulse">{error}</p>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xl shadow-2xl transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Connessione al Master...
                </>
              ) : (
                <>
                  Entra Ora <ChevronRight className="w-6 h-6" />
                </>
              )}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-4">
             <Link href="/register" className="text-slate-500 font-bold hover:text-blue-600 transition-colors">
                Non hai un account? <span className="text-blue-600 underline">Registrati</span>
             </Link>
             <Link href="/admin" className="text-xs font-black uppercase tracking-widest text-slate-300 hover:text-slate-500 transition-colors">
                Accesso Amministratore
             </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 flex items-center gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm">
         <History className="w-5 h-5 text-slate-400" />
         <p className="text-sm font-medium text-slate-600">I tuoi dati sono protetti e salvati esclusivamente sul Master Server locale.</p>
      </div>
    </div>
  );
}
