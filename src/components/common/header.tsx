"use client";

import Link from 'next/link';
import { Zap, LogOut, ArrowRightToLine, LayoutDashboard, Car, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socketService } from '@/services/socket-service';
import { cn } from '@/lib/utils';

export default function Header() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [userName, setUserName] = useState('');
  const [isMasterOnline, setIsMasterOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdminAuthenticated') === 'true');
    setIsDriver(localStorage.getItem('isDriverAuthenticated') === 'true');
    setIsCustomer(localStorage.getItem('isCustomerAuthenticated') === 'true');
    setUserName(localStorage.getItem('userName') || 'Utente');
    
    // Sottoscrizione allo stato del Master
    const unsubscribe = socketService.subscribeStatus((status) => {
      setIsMasterOnline(status);
    });

    setLoading(false);
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('isDriverAuthenticated');
    localStorage.removeItem('isCustomerAuthenticated');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    setIsAdmin(false);
    setIsDriver(false);
    setIsCustomer(false);
    router.push('/');
  };

  const isLoggedIn = isAdmin || isDriver || isCustomer;
  const initial = isAdmin ? 'A' : (isDriver ? 'D' : (userName.charAt(0).toUpperCase() || 'U'));

  return (
    <header className="w-full bg-white border-b border-slate-100">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          {settings?.logoUrl ? (
            <div className="relative h-10 w-32">
              <Image 
                src={settings.logoUrl} 
                alt="Azzurro Community Logo" 
                fill 
                className="object-contain"
              />
            </div>
          ) : (
            <>
              <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                <Zap className="h-5 w-5" />
              </div>
              <span className="font-black text-xl text-slate-900 tracking-tight">Azzurro<span className="text-blue-600">Ride</span></span>
            </>
          )}
        </Link>
        
        <div className="flex items-center gap-4">
          {/* Indicatore Stato Master */}
          <div className={cn(
            "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
            isMasterOnline 
              ? "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/10" 
              : "bg-slate-50 border-slate-200 text-slate-400"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isMasterOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            )} />
            {isMasterOnline ? "Titanium Link Active" : "Master Offline"}
          </div>

          {!loading && isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden border hover:border-blue-200 transition-colors">
                  <Avatar className="h-full w-full">
                    <AvatarFallback className={isAdmin ? "bg-amber-100 text-amber-700 font-black" : (isDriver ? "bg-emerald-100 text-emerald-700 font-black" : "bg-blue-50 text-blue-600 font-bold")}>
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mt-2 rounded-xl border-slate-200" align="end">
                <DropdownMenuLabel className="font-bold text-xs text-slate-500">MIO ACCOUNT</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <p className="text-sm font-bold text-slate-900 truncate">
                      {isAdmin ? 'Amministratore Master' : userName}
                  </p>
                </div>
                <DropdownMenuSeparator />
                
                {isAdmin && (
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/admin" className="flex items-center gap-2 font-semibold text-sm text-amber-600 hover:text-amber-700">
                      <LayoutDashboard className="h-4 w-4" /> Pannello Admin Master
                    </Link>
                  </DropdownMenuItem>
                )}

                {isDriver && (
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/driver" className="flex items-center gap-2 font-semibold text-sm text-emerald-600 hover:text-emerald-700">
                      <Car className="h-4 w-4" /> Dashboard Driver
                    </Link>
                  </DropdownMenuItem>
                )}

                {isCustomer && (
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/customer/dashboard" className="flex items-center gap-2 font-semibold text-sm text-blue-600 hover:text-blue-700">
                      <User className="h-4 w-4" /> Le mie Prenotazioni
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer text-red-600 font-semibold text-sm">
                  <LogOut className="h-4 w-4 mr-2" /> Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !loading && (
            <Link href="/login" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-all hover:translate-x-1">
              <ArrowRightToLine className="h-4 w-4" />
              Area Riservata
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
