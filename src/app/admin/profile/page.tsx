'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart2, 
  User as UserIcon, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  ChevronRight, 
  Settings, 
  Loader2,
  Users,
  BookOpen,
  LifeBuoy,
  ArrowLeft
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, BarChart, Bar, XAxis, YAxis, CartesianGrid } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { socketService } from '@/services/socket-service';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const ADMIN_EMAIL = 'creator.azzurro@gmail.com';

const chartConfig = { rides: { label: "Gestite", color: "hsl(var(--primary))" } };

export default function AdminProfilePage() {
    const router = useRouter();
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rides, setRides] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [support, setSupport] = useState<any[]>([]); // Mocked for now
    
    const adminData = {
        email: ADMIN_EMAIL,
        displayName: 'Azzurro Admin',
        photoURL: null,
        metadata: { creationTime: '2024-01-01' }
    };

    // Controllo autenticazione admin locale
    useEffect(() => {
        const authStatus = localStorage.getItem('isAdminAuthenticated');
        if (authStatus !== 'true') {
            router.push('/admin');
        } else {
            setIsAuthenticated(true);
        }
    }, [router]);

    // Caricamento dati statistici dal Master
    useEffect(() => {
        if (isAuthenticated) {
            setIsLoading(true);
            socketService.emit('client_request', { action: 'GET_ALL_DATA_FOR_BOOKINGS' }, (res: any) => {
                if (res && res.success) {
                    setRides(res.bookings || []);
                    setDrivers(res.drivers || []);
                    // supportRequests non ancora centralizzati su SQLite, usiamo array vuoto
                    setSupport([]);
                }
                setIsLoading(false);
            }, 15000);
        }
    }, [isAuthenticated]);

    // Calcolo dati del grafico dalle corse del Blackview
    const chartData = useMemo(() => {
        if (!rides) return [];

        const monthsLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const dataPoints: any[] = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            dataPoints.push({
                month: monthsLabels[d.getMonth()],
                monthIndex: d.getMonth(),
                year: d.getFullYear(),
                rides: 0
            });
        }

        rides.forEach(ride => {
            const dateStr = ride.data_partenza || ride.date || ride.createdAt;
            if (dateStr) {
                const rideDate = new Date(dateStr);
                if (!isNaN(rideDate.getTime())) {
                    const m = rideDate.getMonth();
                    const y = rideDate.getFullYear();
                    const point = dataPoints.find(p => p.monthIndex === m && p.year === y);
                    if (point) point.rides++;
                }
            }
        });

        return dataPoints.map(({ month, rides }) => ({ month, rides }));
    }, [rides]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const joinDate = new Date(adminData.metadata.creationTime);
    const user = adminData; // Alias per mantenere compatibilità col template sotto


    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Hero Header */}
            <div className="bg-slate-900 pt-12 pb-24 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-48 -mt-48" />
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-6xl mx-auto">
                        <Link href="/admin" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 mb-8 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" /> TORNA ALLA DASHBOARD
                        </Link>
                        
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="relative group">
                                <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 blur opacity-40 group-hover:opacity-60 transition duration-1000"></div>
                                <Avatar className="h-32 w-32 rounded-[2rem] border-4 border-slate-800 shadow-2xl relative">
                                    <AvatarImage src={user.photoURL || ''} alt="Admin" />
                                    <AvatarFallback className="text-4xl font-black bg-slate-800 text-blue-500 uppercase">
                                        A
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            
                            <div className="flex-1 text-center md:text-left space-y-3">
                                <div className="space-y-1">
                                    <Badge className="bg-blue-600 hover:bg-blue-700 font-black px-4 py-1 rounded-full uppercase tracking-[0.2em] text-[10px]">
                                        Account Amministratore
                                    </Badge>
                                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                                        {user.displayName || 'System Admin'}
                                    </h1>
                                </div>
                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 text-slate-400 font-medium text-sm">
                                    <span className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50"><Mail className="w-4 h-4 text-blue-400" /> {user.email}</span>
                                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500" /> Attivo da {format(joinDate, 'MMMM yyyy', { locale: it })}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button asChild variant="outline" className="rounded-2xl h-12 px-6 font-bold border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800 hover:text-white">
                                    <Link href="/admin/settings">
                                        <Settings className="w-4 h-4 mr-2" /> Impostazioni Sistema
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="container mx-auto px-4 -mt-12 relative z-20">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: System Stats */}
                    <div className="space-y-8">
                        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Panoramica Sistema</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-1 gap-3">
                                    <StatBox 
                                        icon={<BookOpen className="w-4 h-4 text-blue-600" />} 
                                        label="Corse Gestite" 
                                        value={rides?.length.toString() || "0"} 
                                        color="bg-blue-50 border-blue-100" 
                                        href="/admin/bookings"
                                    />
                                    <StatBox 
                                        icon={<Users className="w-4 h-4 text-emerald-600" />} 
                                        label="Driver Flotta" 
                                        value={drivers?.length.toString() || "0"} 
                                        color="bg-emerald-50 border-emerald-100" 
                                        href="/admin/drivers"
                                    />
                                    <StatBox 
                                        icon={<LifeBuoy className="w-4 h-4 text-red-600" />} 
                                        label="Supporto Pendente" 
                                        value={support?.length.toString() || "0"} 
                                        color="bg-red-50 border-red-100" 
                                        href="/admin/support"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden">
                            <CardContent className="p-8 space-y-6">
                                <div className="p-3 bg-white/10 rounded-2xl w-fit">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Sicurezza Totale</h3>
                                    <p className="text-blue-100 text-xs font-medium leading-relaxed">
                                        Il tuo account ha privilegi di accesso completo. Ricorda di non condividere mai le tue credenziali e di monitorare regolarmente i log di sistema.
                                    </p>
                                </div>
                                <Button asChild className="w-full bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-xs h-11">
                                    <Link href="/admin/settings">Gestisci Sicurezza</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Details & Chart */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="rounded-[2rem] border-none shadow-xl bg-white">
                            <CardHeader className="border-b border-slate-100 p-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter">Dati Amministrativi</CardTitle>
                                        <CardDescription className="font-medium text-slate-500 text-sm">Informazioni account per il controllo dei servizi.</CardDescription>
                                    </div>
                                    <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                                        <UserIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email di Sistema</label>
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            {user.email}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Stato Ruolo</label>
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-emerald-600">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                            Super Admin (Attivo)
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
                            <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-black text-slate-900 tracking-tighter">Volume Richieste</CardTitle>
                                    <CardDescription className="font-medium text-slate-500">Andamento mensile delle corse gestite dalla piattaforma.</CardDescription>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl">
                                    <BarChart2 className="w-6 h-6 text-blue-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                                    <BarChart accessibilityLayer data={chartData}>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="month" 
                                            tickLine={false} 
                                            tickMargin={10} 
                                            axisLine={false} 
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                        />
                                        <YAxis 
                                            hide 
                                        />
                                        <ChartTooltip content={<ChartTooltipContent className="rounded-xl border-none shadow-xl" />} />
                                        <Bar 
                                            dataKey="rides" 
                                            fill="hsl(var(--primary))" 
                                            radius={[8, 8, 0, 0]} 
                                            barSize={40}
                                        />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                
                <div className="mt-12 pt-8 border-t border-slate-200 text-center">
                    <Link href="/" className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-2 uppercase tracking-[0.2em]">
                        Torna alla vista pubblica ←
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StatBox({ icon, label, value, color, href }: { icon: React.ReactNode, label: string, value: string, color: string, href: string }) {
    return (
        <Link href={href} className="block group">
            <div className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all group-hover:scale-[1.02] group-hover:shadow-md", color)}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/80 rounded-xl shadow-sm">
                        {icon}
                    </div>
                    <span className="text-xs font-bold text-slate-600">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900">{value}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
            </div>
        </Link>
    );
}
