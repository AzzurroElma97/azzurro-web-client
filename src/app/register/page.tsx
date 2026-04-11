'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  ChevronRight, 
  Car, 
  Users,
  Loader2,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { socketService } from '@/services/socket-service';
import Link from 'next/link';

type UserType = 'customer' | 'driver';

export default function RegisterPage() {
  const [userType, setUserType] = useState<UserType>('customer');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    telefono: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const action = userType === 'customer' ? 'REGISTER_CUSTOMER' : 'REGISTER_DRIVER';

    socketService.emit('process_request', {
      action,
      ...formData
    }, (res: any) => {
      setIsLoading(false);
      if (res && res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(res?.message || 'Errore durante la registrazione. Riprova.');
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl overflow-hidden text-center p-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Benvenuto!</h2>
          <p className="text-slate-500 font-medium mb-8">La tua registrazione è andata a buon fine. Verrai reindirizzato al login tra pochi istanti...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Lato Sinistro - Design & Testo */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <Link href="/" className="relative z-10 flex items-center gap-2 group">
          <div className="p-2 bg-blue-600 rounded-lg group-hover:rotate-12 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-xl font-black tracking-tighter">AZZURRO COMMUNITY</span>
        </Link>

        <div className="relative z-10 space-y-6">
          <h1 className="text-6xl font-black leading-tight tracking-tighter italic capitalize">
            Unisciti alla nostra <br />
            <span className="text-blue-500">Elite Fleet.</span>
          </h1>
          <p className="text-slate-400 text-xl font-medium max-w-md">
            Registrati oggi per accedere ai passaggi esclusivi della tua community o diventa parte della flotta ufficiale.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm font-bold text-slate-500 uppercase tracking-widest">
          <span>Decentralized System</span>
          <span className="w-2 h-2 bg-blue-600 rounded-full" />
          <span>Blackview Master Server</span>
        </div>
      </div>

      {/* Lato Destro - Form */}
      <div className="flex items-center justify-center p-8 lg:p-24 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Crea Account</h2>
            <p className="text-slate-500 font-medium">Entra nel sistema Titanium di Azzurro Community</p>
          </div>

          {/* User Type Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button 
              onClick={() => setUserType('customer')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                userType === 'customer' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Users className="w-4 h-4" /> Cliente
            </button>
            <button 
              onClick={() => setUserType('driver')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                userType === 'driver' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Car className="w-4 h-4" /> Autista
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input 
                  placeholder="Nome Completo" 
                  className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input 
                  type="email"
                  placeholder="La tua Email migliore" 
                  className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input 
                  placeholder="Telefono (opzionale)" 
                  className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input 
                  type="password"
                  placeholder="Crea una Password forte" 
                  className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold animate-pulse">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-15 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-500/10 transition-all group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Inviando dati al Master...
                </>
              ) : (
                <>
                  Registrati Ora <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-slate-500 font-medium">Hai già un account?</p>
            <Link href="/login" className="inline-block px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-all">
              Accedi qui
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
