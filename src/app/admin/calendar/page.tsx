'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Clock, MapPin, XCircle, 
    Loader2, User, Car, ShieldCheck, Zap, Power, PowerOff, ArrowRight, Settings2, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { socketService } from '@/services/socket-service';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function AdminCalendarPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rides, setRides] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);

    // Gestione Autenticazione Admin locale
    useEffect(() => {
        const authStatus = localStorage.getItem('isAdminAuthenticated');
        if (authStatus !== 'true') {
            router.push('/admin');
        } else {
            setIsAuthenticated(true);
        }
    }, [router]);

    // Caricamento dati dal Blackview Master
    useEffect(() => {
        if (isAuthenticated) {
            setIsLoading(true);
            socketService.emit('process_request', { action: 'GET_ALL_DATA_FOR_BOOKINGS' }, (res: any) => {
                if (res && res.success) {
                    setRides(res.bookings || []);
                    setDrivers(res.drivers || []);
                    setSettings(res.settings || null);
                }
                setIsLoading(false);
            });
        }
    }, [isAuthenticated]);

    const getBookingsSummaryForDate = (date: Date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        // Adattamento per nomi campi SQLite
        const dayRides = (rides || []).filter(r => (r.data_partenza === dateString || r.date === dateString));
        
        const summary = [];
        const confirmed = dayRides.filter(r => ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CONFIRMED'].includes(r.stato_corsa || r.status)).length;
        const pending = dayRides.filter(r => ['PENDING', 'CODA', 'WAITING_CONFIRMATION'].includes(r.stato_corsa || r.status)).length;

        // Recupero days chiusi dalle impostazioni Master
        const isManuallyClosed = (settings?.closedDays ? JSON.parse(settings.closedDays) : []).includes(dateString);
        if (isManuallyClosed) {
            summary.push({ type: 'admin_closed', count: 0 });
        }

        if (confirmed > 0) summary.push({ type: 'confirmed', count: confirmed });
        if (pending > 0) summary.push({ type: 'pending', count: pending });

        // Disponibilità driver dal Master
        const hasAvailableDrivers = (drivers || []).some(d => {
            const availability = typeof d.calendarAvailability === 'string' ? JSON.parse(d.calendarAvailability) : d.calendarAvailability;
            return availability?.[dateString]?.length > 0;
        });

        if (!hasAvailableDrivers && !isManuallyClosed && date > startOfDay(new Date()) && isSameMonth(date, currentDate)) {
            summary.push({ type: 'off', count: 0 });
        }

        return summary;
    }

    const getRidesForDate = (date: Date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        return (rides || []).filter(r => (r.data_partenza === dateString || r.date === dateString));
    }

    const getAvailableDriversForDate = (date: Date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        return (drivers || []).filter(d => {
            const availability = typeof d.calendarAvailability === 'string' ? JSON.parse(d.calendarAvailability) : d.calendarAvailability;
            return availability?.[dateString]?.length > 0;
        });
    }

    const toggleDayClosure = async () => {
        if (!selectedDate) return;
        setIsUpdatingStatus(true);
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        
        const closedDays = settings?.closedDays ? JSON.parse(settings.closedDays) : [];
        const isCurrentlyClosed = closedDays.includes(dateKey);
        const newClosedDays = isCurrentlyClosed 
            ? closedDays.filter((d: string) => d !== dateKey)
            : [...closedDays, dateKey];
        
        socketService.emit('process_request', { 
            action: 'UPDATE_APP_SETTING', 
            payload: { key: 'closedDays', value: JSON.stringify(newClosedDays) } 
        }, (res: any) => {
            if (res && res.success) {
                setSettings({ ...settings, closedDays: JSON.stringify(newClosedDays) });
                toast({ 
                    title: isCurrentlyClosed ? "Giorno Riaperto" : "Giorno Chiuso", 
                    description: isCurrentlyClosed ? "I passeggeri possono ora prenotare." : "Il giorno è stato bloccato al pubblico."
                });
            } else {
                toast({ variant: "destructive", title: "Errore", description: "Impossibile aggiornare lo stato del giorno." });
            }
            setIsUpdatingStatus(false);
        });
    };

    const handleDateChange = (newDate: Date) => {
        setCurrentDate(newDate);
    };

    const handleDayClick = (day: Date) => {
        if (!isSameMonth(day, startOfMonth(currentDate))) return;
        setSelectedDate(day);
        setIsSheetOpen(true);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const Header = () => {
        const todayMonth = startOfMonth(new Date());
        const backLimit = subMonths(todayMonth, 3);
        const forwardLimit = addMonths(todayMonth, 12); 
        
        const isAtBackLimit = startOfMonth(currentDate) <= backLimit;
        const isAtForwardLimit = startOfMonth(currentDate) >= forwardLimit;

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => handleDateChange(subMonths(currentDate, 1))}
                        disabled={isAtBackLimit}
                        className="rounded-xl h-9 px-3 border-slate-200"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Mese Prec.</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleDateChange(new Date())}
                        className="rounded-xl h-9 px-4 border-slate-200 font-bold text-xs"
                    >
                        Oggi
                    </Button>
                </div>
                <h2 className="text-xl font-black text-center capitalize tracking-tighter text-slate-900">
                    {format(currentDate, 'MMMM yyyy', { locale: it })}
                </h2>
                <Button 
                    variant="outline" 
                    onClick={() => handleDateChange(addMonths(currentDate, 1))}
                    disabled={isAtForwardLimit}
                    className="rounded-xl h-9 px-3 border-slate-200"
                >
                    <span className="hidden sm:inline mr-1">Mese Succ.</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        );
    };

    const Days = () => {
        const dayNames = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
        return (
            <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map((day) => (
                    <div key={day} className="text-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const Cells = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {days.map((day, index) => {
                    const summary = getBookingsSummaryForDate(day);
                    const isDayOff = summary.some(s => s.type === 'off');
                    const isAdminClosed = summary.some(s => s.type === 'admin_closed');
                    const hasBookings = summary.some(s => s.type !== 'off' && s.type !== 'admin_closed');
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    
                    // Check if at least one driver is available
                    const dateString = format(day, 'yyyy-MM-dd');
                    const hasAvailableDrivers = (drivers || []).some(d => d.calendarAvailability?.[dateString]?.length > 0);
                   
                    return (
                        <Card
                            key={index}
                            onClick={() => handleDayClick(day)}
                            className={cn(
                                "h-20 sm:h-28 flex flex-col p-1.5 transition-all cursor-pointer hover:shadow-xl border-slate-100",
                                !isCurrentMonth && "bg-slate-50/50 text-slate-300 opacity-30 cursor-default border-transparent shadow-none",
                                isToday(day) && 'border-blue-500 bg-blue-50/10 ring-1 ring-blue-500/20',
                                isAdminClosed && isCurrentMonth && 'bg-purple-50 border-purple-200',
                                isDayOff && isCurrentMonth && !isAdminClosed && 'bg-red-50/30 border-red-100',
                                isCurrentMonth && hasBookings && "hover:bg-blue-50/30"
                            )}
                        >
                            <div className={cn(
                                "font-black text-[10px] sm:text-xs", 
                                isToday(day) ? 'text-blue-600' : 
                                (hasAvailableDrivers && isCurrentMonth ? 'text-emerald-600' : 'text-slate-400')
                            )}>
                                {format(day, 'd')}
                            </div>
                            {isCurrentMonth && (
                                <div className="mt-auto space-y-0.5">
                                    {isAdminClosed && <Badge className="w-full justify-center text-[6px] font-black px-0.5 py-0 h-3 uppercase border-none bg-purple-600 text-white shadow-sm">Chiuso</Badge>}
                                    {isDayOff && !isAdminClosed && <Badge variant="destructive" className="w-full justify-center text-[6px] font-black px-0.5 py-0 h-3 uppercase border-none shadow-sm">Off</Badge>}
                                    {summary.filter(s => s.type !== 'off' && s.type !== 'admin_closed').map((s, i) => (
                                         <Badge key={i} className={cn(
                                             "w-full justify-center text-[7px] font-black px-0.5 py-0 h-3.5 border-none shadow-sm uppercase",
                                             s.type === 'confirmed' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white',
                                         )}>
                                             {s.count} {s.type === 'confirmed' ? 'C' : 'P'}
                                         </Badge>
                                    ))}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        );
    };

    const Legend = () => (
         <div className="flex items-center justify-center flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Confermate</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">In attesa</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-sm" />
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Blocco</span>
            </div>
             <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">No Driver</span>
            </div>
        </div>
    );

    const selectedRides = selectedDate ? getRidesForDate(selectedDate) : [];
    const availableDrivers = selectedDate ? getAvailableDriversForDate(selectedDate) : [];
    const isSelectedDayClosed = selectedDate ? (settings?.closedDays || []).includes(format(selectedDate, 'yyyy-MM-dd')) : false;

    return (
        <div className="container mx-auto px-4 py-6 max-w-5xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="text-left">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Calendario Operativo</h1>
                    <p className="text-slate-500 font-medium mt-1 text-sm">Pianificazione corse e monitoraggio driver (12 mesi).</p>
                </div>
                <Badge variant="outline" className="h-8 px-3 rounded-lg border-blue-100 bg-blue-50 text-blue-600 font-black uppercase tracking-widest text-[9px]">
                    {rides?.length || 0} Corse Totali
                </Badge>
            </div>
            
            <Card className="p-4 sm:p-6 border-none shadow-2xl bg-white rounded-[2rem]">
                <Header />
                <Days />
                <Cells />
                <Legend />
            </Card>

            <div className="mt-8 text-center pb-8">
                <Link href="/admin" className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-2 uppercase tracking-[0.2em]">
                    ← Torna alla Dashboard Admin
                </Link>
            </div>

            {/* Dettagli Giorno (Sheet) */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-md rounded-l-[2rem] p-0 border-none shadow-2xl flex flex-col h-full overflow-hidden bg-white">
                    <SheetHeader className="p-6 border-b bg-slate-50/50">
                        <div className="flex items-center gap-4 mb-1">
                            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <SheetTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                                    {selectedDate ? format(selectedDate, 'EEEE d MMMM', { locale: it }) : 'Dettagli'}
                                </SheetTitle>
                                <SheetDescription className="font-bold text-blue-600 text-[9px] uppercase tracking-widest mt-1">
                                    Agenda operativa giornaliera
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-8">
                            
                            {/* Sezione Stato Giorno */}
                            <div className="space-y-3">
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Settings2 className="w-3 h-3 text-blue-600" /> Stato Operativo Pubblico
                                </h3>
                                <Card className={cn(
                                    "p-4 rounded-xl border-2 transition-all flex items-center justify-between",
                                    isSelectedDayClosed ? "border-purple-200 bg-purple-50/50" : "border-emerald-100 bg-emerald-50/30"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg text-white shadow-md",
                                            isSelectedDayClosed ? "bg-purple-600" : "bg-emerald-500"
                                        )}>
                                            {isSelectedDayClosed ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-slate-900 text-xs leading-none mb-1">
                                                {isSelectedDayClosed ? "GIORNO CHIUSO" : "GIORNO APERTO"}
                                            </p>
                                            <p className="text-[8px] font-bold text-slate-500 uppercase">
                                                {isSelectedDayClosed ? "Nessun passeggero può prenotare" : "Servizio regolarmente attivo"}
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        disabled={isUpdatingStatus}
                                        onClick={toggleDayClosure}
                                        className={cn(
                                            "rounded-lg h-8 px-3 font-black uppercase text-[8px] tracking-widest transition-all",
                                            isSelectedDayClosed ? "bg-white text-purple-600 border border-purple-200 hover:bg-white" : "bg-slate-900 text-white hover:bg-slate-800"
                                        )}
                                    >
                                        {isUpdatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : isSelectedDayClosed ? "RIAPRI" : "CHIUDI"}
                                    </Button>
                                </Card>
                            </div>

                            <Separator className="bg-slate-100" />

                            {/* Sezione Driver Disponibili */}
                            <div className="space-y-3">
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-amber-500" /> Driver Attivi ({availableDrivers.length})
                                </h3>
                                {availableDrivers.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {availableDrivers.map(driver => (
                                            <div key={driver.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5 text-left">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-[10px] uppercase shadow-md">{driver.name?.[0]}</div>
                                                        <div>
                                                            <p className="font-black text-slate-900 text-xs">{driver.name}</p>
                                                            <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase">
                                                                <Car className="w-2.5 h-2.5" /> {driver.vehicle || 'Auto Flotta'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 rounded-lg text-blue-600 font-bold text-[8px] uppercase gap-1 hover:bg-blue-100/50 transition-colors">
                                                        <Link href={`/admin/drivers/${driver.id}/availability`}>
                                                            Orari <ExternalLink className="w-2.5 h-2.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {driver.calendarAvailability[format(selectedDate!, 'yyyy-MM-dd')].map((shift: any, idx: number) => (
                                                        <Badge key={idx} variant="outline" className="text-[8px] font-black border-blue-100 bg-white text-blue-600 px-1.5 py-0">
                                                            {shift.start} - {shift.end}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl border-2 border-dashed border-red-100 bg-red-50/30 text-center">
                                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Nessun driver disponibile</p>
                                    </div>
                                )}
                            </div>

                            <Separator className="bg-slate-100" />

                            {/* Sezione Corse */}
                            <div className="space-y-3">
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Car className="w-3 h-3 text-blue-600" /> Corse in Programma ({selectedRides.length})
                                </h3>
                                {selectedRides.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedRides.map((ride) => (
                                            <Card key={ride.id} className="p-4 border-slate-100 shadow-sm hover:shadow-md transition-all rounded-xl bg-white group text-left">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                                                        </div>
                                                        <span className="font-black text-base text-slate-900 tracking-tighter">{ride.time}</span>
                                                    </div>
                                                    <Badge className={cn(
                                                        "border-none px-2 py-0.5 h-4 font-black text-[8px] uppercase tracking-widest shadow-sm",
                                                        ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(ride.status) ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                                    )}>
                                                        {ride.status}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-black text-[10px] uppercase shadow-inner border border-white">
                                                            {ride.passengerName?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 leading-none mb-0.5 text-xs">{ride.passengerName}</p>
                                                            <p className="text-[8px] text-slate-400 font-bold uppercase flex items-center gap-1 tracking-wider">
                                                                <Users className="w-2.5 h-2.5" /> {ride.passengers} Pax
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="pl-2 border-l-2 border-slate-100 space-y-2 ml-4">
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                                            <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                                            <span className="truncate">{ride.origin}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-900 font-black">
                                                            <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                                            <span className="truncate">{ride.destination}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4 flex gap-2">
                                                    <Button asChild size="sm" variant="outline" className="flex-1 rounded-lg text-[8px] font-black uppercase h-8 tracking-widest border-slate-200">
                                                        <Link href="/admin/bookings">Dettagli</Link>
                                                    </Button>
                                                    {!ride.driverId && (
                                                        <Button size="sm" className="flex-1 rounded-lg text-[8px] font-black uppercase h-8 tracking-widest bg-blue-600 shadow-lg shadow-blue-500/20">
                                                            Assegna
                                                        </Button>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3 opacity-40">
                                        <XCircle className="w-10 h-10 text-slate-200" />
                                        <div>
                                            <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Agenda Vuota</p>
                                            <p className="text-[9px] text-slate-500 font-medium mt-0.5">Nessuna prenotazione.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                    
                    <div className="p-6 bg-slate-50/50 border-t backdrop-blur-md">
                         <Button onClick={() => setIsSheetOpen(false)} className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200">
                            Chiudi Pannello
                         </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
