'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  ShieldAlert, 
  ShieldCheck, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { socketService } from '@/services/socket-service';

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    if (newPassword.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    setIsLoading(true);
    setError('');

    const timeout = setTimeout(() => {
      setIsLoading(false);
      setError('Errore di connessione: timeout scaduto.');
    }, 15000);

    socketService.emit('client_request', {
      action: 'UPDATE_PASSWORD',
      id,
      type,
      newPass: newPassword
    }, (res: any) => {
      clearTimeout(timeout);
      setIsLoading(false);
      if (res && res.success) {
        setIsSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(res?.message || 'Errore durante l\'aggiornamento. Riprova.');
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Sicurezza Aggiornata</h2>
        <p className="text-slate-500">La tua nuova password è attiva. Verrai reindirizzato al login...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cambio Password Obbligatorio</h1>
        <p className="text-slate-500 text-sm">Il Master Server ha rilevato un reset. Imposta una nuova password sicura per procedere.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              type="password"
              placeholder="Nuova Password" 
              className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              type="password"
              placeholder="Conferma Password" 
              className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Aggiorna Credenziali'}
        </Button>
      </form>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl overflow-hidden p-8 lg:p-12 bg-white">
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>}>
          <ChangePasswordForm />
        </Suspense>
      </Card>
    </div>
  );
}
