'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Clock, Navigation, Calendar as CalendarIcon, Car, Loader2, ShieldAlert, Phone, CheckCircle2, MapPin, ChevronRight, User, Settings, Save, Banknote, ShieldCheck, Info, Briefcase, Plus, Trash2, Search, Copy, ClipboardPaste, CalendarRange, ChevronLeft, Zap, Sun, Users, MessageSquare, MessageCircle, ExternalLink
} from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import Link from 'next/link';

import { socketService } from '@/services/socket-service';

export default function DriverPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [isLoading, setIsLoading] = useState(true);
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [clipboard, setClipboard] = useState<any[] | null>(null);

  // Driver Data from Master
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [localSettings, setLocalSettings] = useState<any>(null);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [availableRides, setAvailableRides] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    const savedDriver = localStorage.getItem('driver_session');
    if (savedDriver) {
      setIsAuthenticated(true);
      // Dati caricati via socket nel prossimo useEffect
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const session = JSON.parse(localStorage.getItem('driver_session') || '{}');
      socketService.emit('client_request', { 
        action: 'GET_DRIVER_DASHBOARD', 
        payload: { driverId: session.id } 
      });

      socketService.on('master_response', (res: any) => {
        if (res.action === 'GET_DRIVER_DASHBOARD') {
          setDriverProfile(res.payload.profile);
          setLocalSettings(res.payload.profile);
          setMyRides(res.payload.myRides || []);
          setAvailableRides(res.payload.availableRides || []);
          setGlobalSettings(res.payload.globalSettings);
          setIsLoading(false);
        }
      });

      return () => { socketService.off('master_response'); };
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    socketService.emit('client_request', { 
      action: 'DRIVER_LOGIN', 
      payload: loginData 
    });

    socketService.once('master_response', (res: any) => {
      if (res.action === 'DRIVER_LOGIN' && res.success) {
        localStorage.setItem('driver_session', JSON.stringify(res.payload));
        setIsAuthenticated(true);
        toast({ title: "Benvenuto a bordo!", description: "Accesso driver completato." });
      } else {
        toast({ variant: "destructive", title: "Errore Accesso", description: "Credenziali non valide o profilo non autorizzato." });
        setIsLoading(false);
      }
    });
  };

  const toggleAvailability = async (checked: boolean) => {
    if (!driverProfile) return;

    socketService.emit('client_request', { 
        action: 'UPDATE_DRIVER_AVAILABILITY', 
        payload: { driverId: driverProfile.id, isAvailable: checked } 
    });
    
    // Ottimistico update locale
    setDriverProfile({ ...driverProfile, isAvailable: checked });
    toast({ title: checked ? "Sei Online!" : "Sei Offline" });
  };

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-500">
          <CardContent className="p-10 space-y-8">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20">
                <Car className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Portale Driver</h2>
              <p className="text-slate-500 font-medium">Entra nel team Elite di AzzurroCommunity</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email o Nome</Label>
                    <Input 
                      placeholder="driver@azzurro.it" 
                      value={loginData.identifier}
                      onChange={(e) => setLoginData({...loginData, identifier: e.target.value})}
                      className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold"
                    />
                </div>
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-lg shadow-xl transition-all">
                Accedi al Portale
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Navigation Limits Logic (Strict: 1 month back, 6 months forward)
  const todayDate = startOfMonth(new Date());
  const minMonthLimit = subMonths(todayDate, 1);
  const maxMonthLimit = addMonths(todayDate, 6);

  const isBackDisabled = useMemo(() => {
    return startOfMonth(currentMonth) <= minMonthLimit;
  }, [currentMonth, minMonthLimit]);

  const isForwardDisabled = useMemo(() => {
    return startOfMonth(currentMonth) >= maxMonthLimit;
  }, [currentMonth, maxMonthLimit]);

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    setIsSavingSettings(true);
    
    socketService.emit('client_request', { 
        action: 'UPDATE_DRIVER_PROFILE', 
        payload: localSettings 
    });
    
    socketService.once('master_response', () => {
        toast({ title: "Impostazioni Salvate", description: "Il tuo profilo è stato aggiornato sul Master Server." });
        setIsSavingSettings(false);
    });
  };

  // --- CALENDAR LOGIC ---
  const handleAddShift = () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const currentShifts = localSettings.calendarAvailability[dateKey] || [];
    setLocalSettings({
      ...localSettings,
      calendarAvailability: {
        ...localSettings.calendarAvailability,
        [dateKey]: [...currentShifts, { start: '08:00', end: '12:00' }]
      }
    });
  };

  const handleRemoveShift = (index: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const currentShifts = [...(localSettings.calendarAvailability[dateKey] || [])];
    currentShifts.splice(index, 1);
    const newCal = { ...localSettings.calendarAvailability };
    if (currentShifts.length === 0) delete newCal[dateKey];
    else newCal[dateKey] = currentShifts;
    setLocalSettings({ ...localSettings, calendarAvailability: newCal });
  };

  const handleUpdateShift = (index: number, field: 'start' | 'end', value: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const currentShifts = [...(localSettings.calendarAvailability[dateKey] || [])];
    currentShifts[index] = { ...currentShifts[index], [field]: value };
    setLocalSettings({
      ...localSettings,
      calendarAvailability: { ...localSettings.calendarAvailability, [dateKey]: currentShifts }
    });
  };

  const copyShifts = () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const shifts = localSettings.calendarAvailability[dateKey];
    if (!shifts || shifts.length === 0) {
        toast({ variant: "destructive", title: "Nessun turno", description: "Non c'è nulla da copiare in questa data." });
        return;
    }
    setClipboard(shifts);
    toast({ title: "Orari Copiati", description: `Hai copiato ${shifts.length} turni negli appunti.` });
  };

  const applyToAllSameWeekdays = () => {
    if (!clipboard) return;
    const weekday = getDay(selectedDate);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const sameWeekdays = days.filter(d => getDay(d) === weekday);
    
    const newCal = { ...localSettings.calendarAvailability };
    sameWeekdays.forEach(d => {
        newCal[format(d, 'yyyy-MM-dd')] = [...clipboard];
    });
    
    setLocalSettings({ ...localSettings, calendarAvailability: newCal });
    toast({ title: "Applicato massivamente", description: "Orari incollati su tutti i giorni corrispondenti del mese." });
  };

  const applyToWeekdays = () => {
    if (!clipboard) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const weekDays = days.filter(d => getDay(d) >= 1 && getDay(d) <= 5);
    const newCal = { ...localSettings.calendarAvailability };
    weekDays.forEach(d => { newCal[format(d, 'yyyy-MM-dd')] = [...clipboard]; });
    setLocalSettings({ ...localSettings, calendarAvailability: newCal });
    toast({ title: "Modifica Massiva", description: "Orari incollati su tutti i giorni feriali del mese." });
  };

  const applyToWeekends = () => {
    if (!clipboard) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const weekends = days.filter(d => getDay(d) === 0 || getDay(d) === 6);
    const newCal = { ...localSettings.calendarAvailability };
    weekends.forEach(d => { newCal[format(d, 'yyyy-MM-dd')] = [...clipboard]; });
    setLocalSettings({ ...localSettings, calendarAvailability: newCal });
    toast({ title: "Modifica Massiva", description: "Orari incollati su tutti i weekend del mese." });
  };

  const applyToAllMonth = () => {
    if (!clipboard) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const newCal = { ...localSettings.calendarAvailability };
    days.forEach(d => { newCal[format(d, 'yyyy-MM-dd')] = [...clipboard]; });
    setLocalSettings({ ...localSettings, calendarAvailability: newCal });
    toast({ title: "Modifica Massiva", description: "Orari incollati su ogni giorno del mese." });
  };

  // --- RIDE LOGIC ---
  const handleClaimRide = async (rideId: string) => {
    if (!driverProfile) return;
    setIsUpdating(rideId);

    socketService.emit('client_request', { 
      action: 'CLAIM_RIDE', 
      payload: { rideId, driverId: driverProfile.id, driverName: driverProfile.name } 
    });

    socketService.once('master_response', (res: any) => {
      if (res.success) {
        toast({ title: "Corsa Accettata!" });
        // Refresh locale
        setAvailableRides(prev => prev.filter(r => r.id !== rideId));
      } else {
        toast({ variant: "destructive", title: "Errore", description: res.message || "Impossibile accettare la corsa." });
      }
      setIsUpdating(null);
    });
  };

  const handleUpdateStatus = async (rideId: string, newStatus: string) => {
    setIsUpdating(rideId);

    socketService.emit('client_request', { 
      action: 'UPDATE_RIDE_STATUS', 
      payload: { rideId, status: newStatus } 
    });

    socketService.once('master_response', () => {
      toast({ title: "Stato Aggiornato" });
      setIsUpdating(null);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!driverProfile && isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] shadow-xl space-y-6">
            <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Profilo non sincronizzato</h1>
            <p className="text-slate-500 font-medium">Contatta l'amministratore per attivare il tuo profilo sul Master Server.</p>
            <Button onClick={() => { localStorage.removeItem('driver_session'); window.location.reload(); }} className="w-full h-12 rounded-2xl bg-blue-600 font-bold">Logout e Riprova</Button>
        </div>
      </div>
    );
  }

  const activeRides = myRides.filter(r => ['ACCEPTED', 'IN_PROGRESS', 'WAITING_CONFIRMATION', 'PENDING'].includes(r.status));
  const completedRides = myRides.filter(r => r.status === 'COMPLETED');
  const earnings = completedRides.reduce((acc, r) => acc + (parseFloat(r.price) || 0), 0);

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const shiftsForSelectedDate = localSettings?.calendarAvailability?.[selectedDateKey] || [];

  // Calendar Grid Data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-500">
          
          {/* Header Profilo */}
          <Card className="mb-8 rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
            <CardContent className="flex flex-col md:flex-row items-center justify-between p-8 gap-8">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 rounded-3xl border-4 border-slate-50 shadow-lg">
                    <AvatarFallback className="bg-slate-900 text-white text-3xl font-black uppercase">{driverProfile?.name?.[0] || 'D'}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{driverProfile?.name || 'Mio Profilo'}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-blue-100 bg-blue-50 py-1 px-3">
                          <Car className="w-3.5 h-3.5 mr-1.5" /> {driverProfile?.vehicle || 'Auto Aziendale'}
                      </Badge>
                      <Badge className={cn("text-[10px] font-black uppercase border-none py-1 px-3", driverProfile?.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                          {driverProfile?.isApproved ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />}
                          {driverProfile?.isApproved ? 'Approvato' : 'In Attesa'}
                      </Badge>
                  </div>
                </div>
              </div>
              <div className={cn("flex items-center gap-6 p-6 rounded-3xl border-2 transition-all", driverProfile.isAvailable ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100")}>
                <div className="text-right hidden sm:block">
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", driverProfile.isAvailable ? "text-emerald-600" : "text-slate-400")}>{driverProfile.isAvailable ? "Online" : "Offline"}</p>
                    <p className="text-xs text-slate-500 font-medium">Ricezione corse</p>
                </div>
                <Switch checked={driverProfile.isAvailable} onCheckedChange={toggleAvailability} className="data-[state=checked]:bg-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="rides" className="w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 px-2">
              <TabsList className="bg-slate-200/50 rounded-2xl h-14 p-1 w-full sm:w-auto">
                <TabsTrigger value="rides" className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Gestione Corse</TabsTrigger>
                <TabsTrigger value="availability" className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Disponibilità</TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Impostazioni</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-blue-200 w-full sm:w-auto">
                  {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salva Modifiche
                </Button>
              </div>
            </div>

            <TabsContent value="rides" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto sm:mx-0">
                    <Badge variant="outline" className="bg-white border-transparent text-slate-900 font-black px-4 py-2 text-[10px] uppercase">Mie Corse: {activeRides.length}</Badge>
                    <Badge variant="outline" className="bg-blue-600 border-transparent text-white font-black px-4 py-2 text-[10px] uppercase">Disponibili: {availableRides.length}</Badge>
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight ml-2">I miei impegni</h2>
                    {activeRides.length > 0 ? activeRides.map(ride => (
                      <RideCard key={ride.id} ride={ride} isOwner={true} onUpdateStatus={(s: string) => handleUpdateStatus(ride.id, s)} isUpdating={isUpdating === ride.id} />
                    )) : (
                      <Card className="py-16 text-center border-dashed border-4 border-slate-100 bg-white rounded-[3rem] opacity-60"><Navigation className="w-10 h-10 mx-auto mb-4 text-slate-200" /><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nessuna corsa attiva</p></Card>
                    )}
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight ml-2">Corse Libere Community</h2>
                    {availableRides.length > 0 ? availableRides.map(ride => (
                      <RideCard key={ride.id} ride={ride} isOwner={false} onClaim={() => handleClaimRide(ride.id)} isUpdating={isUpdating === ride.id} />
                    )) : (
                      <Card className="py-16 text-center border-dashed border-4 border-slate-100 bg-white rounded-[3rem] opacity-60"><Search className="w-10 h-10 mx-auto mb-4 text-slate-200" /><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nessuna richiesta libera</p></Card>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white overflow-hidden">
                      <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Guadagni Totali</CardTitle></CardHeader>
                      <CardContent className="p-8 space-y-6 text-center">
                          <p className="text-5xl font-black tracking-tighter">€{earnings.toFixed(0)}</p>
                          <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                              <div className="text-center"><p className="text-xl font-black">{completedRides.length}</p><p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Concluse</p></div>
                              <div className="text-center"><p className="text-xl font-black">{activeRides.length}</p><p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">In Corso</p></div>
                          </div>
                      </CardContent>
                  </Card>

                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-blue-600 text-white overflow-hidden group">
                    <Link href="/chat" className="block">
                      <CardContent className="p-8 space-y-4 text-center relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <MessageSquare className="w-10 h-10 mx-auto opacity-80" />
                        <div>
                          <h3 className="text-xl font-black uppercase tracking-tighter">Community Hub</h3>
                          <p className="text-blue-100 text-xs font-medium mt-1">Chatta con gli amici e modera i messaggi.</p>
                        </div>
                        <Button className="w-full rounded-xl bg-white text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest h-11">
                          Entra in Chat
                        </Button>
                      </CardContent>
                    </Link>
                  </Card>
                  
                  <div className="p-6 bg-slate-100 rounded-[2.5rem] text-slate-900 border border-slate-200 text-center space-y-4">
                      <Phone className="w-8 h-8 mx-auto text-blue-600 opacity-50" />
                      <p className="text-sm font-bold">Assistenza Driver h24</p>
                      <Button variant="outline" className="w-full rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold" onClick={() => window.open('https://wa.me/393274723787', '_blank')}>Contatta Admin</Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="availability" className="mt-0">
              <div className="max-w-5xl mx-auto">
                <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-[420px_1fr] items-start">
                    
                    {/* CALENDARIO (SINISTRA) */}
                    <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100 bg-white h-full">
                      <div className="flex items-center justify-between mb-8">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
                          disabled={isBackDisabled} 
                          className="h-10 w-10 rounded-full hover:bg-slate-50 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </Button>
                        <h3 className="text-lg font-black text-slate-900 capitalize tracking-tight">{format(currentMonth, 'MMMM yyyy', { locale: it })}</h3>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
                          disabled={isForwardDisabled} 
                          className="h-10 w-10 rounded-full hover:bg-slate-50 disabled:opacity-30"
                        >
                          <ChevronRight className="w-5 h-5 text-slate-600" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-7 mb-4">
                        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, idx) => (
                          <div key={idx} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">{day}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                          const isSelected = isSameDay(day, selectedDate);
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const dayKey = format(day, 'yyyy-MM-dd');
                          const hasShifts = (localSettings?.calendarAvailability?.[dayKey] || []).length > 0;

                          return (
                            <div key={idx} className="flex flex-col items-center relative">
                              <button 
                                onClick={() => setSelectedDate(day)}
                                disabled={!isCurrentMonth}
                                className={cn(
                                  "aspect-square w-full flex items-center justify-center rounded-xl text-sm font-bold transition-all relative z-10",
                                  !isCurrentMonth && "text-slate-200 cursor-default",
                                  isCurrentMonth && !isSelected && "text-slate-600 hover:bg-slate-50",
                                  isSelected && "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                )}
                              >
                                {format(day, 'd')}
                              </button>
                              {isCurrentMonth && hasShifts && (
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20",
                                  isSelected ? "bg-white" : "bg-blue-500"
                                )} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-slate-400 text-center mt-8 font-black uppercase tracking-[0.2em] opacity-60">I giorni con un puntino sono pianificati</p>
                    </div>

                    {/* EDITOR GIORNO (DESTRA) */}
                    <div className="flex flex-col bg-slate-50/20 h-full min-h-[500px]">
                      {/* Barra Superiore */}
                      <div className="p-6 pb-4 border-b flex items-center justify-between bg-white/50 backdrop-blur-sm">
                        <div className="text-left">
                          <h4 className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1">Turni Giornalieri</h4>
                          <p className="text-blue-600 font-bold text-[9px] uppercase tracking-[0.2em]">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</p>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-xl h-8 px-3 font-bold text-[10px] border-slate-200 bg-white" onClick={() => setSelectedDate(new Date())}>Oggi</Button>
                      </div>

                      {/* Area Scroll Ottimizzata */}
                      <ScrollArea className="flex-1 px-8">
                        <div className="space-y-4 py-8">
                          {shiftsForSelectedDate.length > 0 ? (
                            shiftsForSelectedDate.map((shift: any, index: number) => (
                              <div key={index} className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all animate-in slide-in-from-right-4 duration-300">
                                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div className="flex-1 flex items-center gap-4">
                                  <div className="flex-1 space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Inizio</Label>
                                    <Input type="time" value={shift.start} onChange={(e) => handleUpdateShift(index, 'start', e.target.value)} className="h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 font-bold text-sm" />
                                  </div>
                                  <div className="pt-5 text-slate-300 font-black">-</div>
                                  <div className="flex-1 space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Fine</Label>
                                    <Input type="time" value={shift.end} onChange={(e) => handleUpdateShift(index, 'end', e.target.value)} className="h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 font-bold text-sm" />
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveShift(index)} className="rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 h-11 w-11 transition-colors self-end">
                                  <Trash2 className="w-4.5 h-4.5" />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-[2rem] bg-slate-100/50 border-2 border-dashed border-slate-200">
                              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                                <Zap className="w-8 h-8 text-slate-200" />
                              </div>
                              <p className="font-black text-slate-900 uppercase tracking-tight">Giorno Libero</p>
                              <p className="text-[11px] text-slate-500 font-medium max-w-[200px] mt-1 leading-relaxed">Nessun orario impostato. Aggiungi una fascia per risultare disponibile ai clienti.</p>
                            </div>
                          )}
                          
                          <Button onClick={handleAddShift} variant="outline" className="w-full h-16 rounded-2xl border-dashed border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 font-black text-[11px] uppercase tracking-widest gap-3 transition-all">
                            <Plus className="w-5 h-5" /> Aggiungi Fascia Oraria
                          </Button>
                        </div>
                      </ScrollArea>

                      {/* Footer Azioni */}
                      <div className="p-8 bg-slate-50/50 border-t space-y-6">
                        <div className="text-left">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Azioni Veloci</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button variant="outline" onClick={copyShifts} disabled={!shiftsForSelectedDate.length} className="h-14 rounded-2xl font-bold text-xs gap-3 border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all active:scale-95">
                              <Copy className="w-4 h-4 text-blue-500" /> Copia Orari
                            </Button>
                            
                            {clipboard ? (
                              <>
                                <Button variant="outline" onClick={() => {
                                  const dateKey = format(selectedDate, 'yyyy-MM-dd');
                                  setLocalSettings({ ...localSettings, calendarAvailability: { ...localSettings.calendarAvailability, [dateKey]: [...clipboard] } });
                                  toast({ title: "Orari Incollati", description: "Turni applicati alla data corrente." });
                                }} className="h-14 rounded-2xl font-bold text-xs gap-3 border-blue-200 bg-blue-50 text-blue-600 shadow-sm animate-in zoom-in-95">
                                  <ClipboardPaste className="w-4 h-4" /> Incolla qui
                                </Button>
                                <Button onClick={applyToAllSameWeekdays} className="h-14 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold text-xs gap-3 shadow-sm transition-all active:scale-[0.98]">
                                  <CalendarRange className="w-5 h-5 text-blue-500" /> 
                                  Incolla ogni {format(selectedDate, 'EEEE', { locale: it })}
                                </Button>
                                <Button onClick={applyToWeekdays} className="h-14 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold text-xs gap-3 shadow-sm transition-all active:scale-[0.98]">
                                  <Briefcase className="w-5 h-5 text-blue-500" /> 
                                  Tutta la Settimana
                                </Button>
                                <Button onClick={applyToWeekends} className="h-14 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold text-xs gap-3 shadow-sm transition-all active:scale-[0.98]">
                                  <Sun className="w-5 h-5 text-orange-500" /> 
                                  Tutto il Weekend
                                </Button>
                                <Button onClick={applyToAllMonth} className="sm:col-span-2 h-14 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs gap-3 shadow-lg transition-all active:scale-[0.98]">
                                  <CalendarIcon className="w-5 h-5" /> 
                                  Incolla su tutto il Mese
                                </Button>
                              </>
                            ) : (
                              <Button disabled variant="outline" className="h-14 rounded-2xl font-bold text-xs gap-3 border-slate-100 bg-slate-100/50 text-slate-300">
                                <ClipboardPaste className="w-4 h-4" /> Incolla
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden h-fit">
                  <CardHeader className="p-8 bg-slate-50/50 border-b">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><User className="w-6 h-6" /></div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight text-left">Profilo & Veicolo</CardTitle>
                        <CardDescription className="font-medium text-left">Le tue informazioni pubbliche visualizzate dai passeggeri.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nome Visualizzato</Label>
                      <Input value={localSettings?.name || ''} onChange={(e) => setLocalSettings({...localSettings, name: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-transparent font-bold focus:bg-white" />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Modello Veicolo</Label>
                      <Input value={localSettings?.vehicle || ''} onChange={(e) => setLocalSettings({...localSettings, vehicle: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-transparent font-bold focus:bg-white" placeholder="Es: Toyota Prius (Nera)" />
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                      <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                      <p className="text-[10px] font-bold text-amber-800 leading-relaxed italic text-left">Assicurati che il nome e l'auto siano corretti: verranno mostrati al passeggero al momento della prenotazione.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden h-fit">
                  <CardHeader className="p-8 bg-slate-50/50 border-b">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg"><Banknote className="w-6 h-6" /></div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight text-left">Tariffe Personali</CardTitle>
                        <CardDescription className="font-medium text-left">Sovrascrivi i prezzi di default del sistema.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3 mb-8">
                      <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5" />
                      <p className="text-[10px] font-bold text-blue-700 leading-tight text-left">Lasciando i campi vuoti, verranno applicati i <b>Valori di Default</b> impostati dall'amministratore.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <DriverConfigInput label="Quota Base (€)" value={localSettings?.basePrice} placeholder={globalSettings?.basePrice} onChange={v => setLocalSettings({...localSettings, basePrice: v})} icon={<Banknote className="w-4 h-4" />} />
                      <DriverConfigInput label="Minimo Corsa (€)" value={localSettings?.minFare} placeholder={globalSettings?.minFare} onChange={v => setLocalSettings({...localSettings, minFare: v})} icon={<ShieldCheck className="w-4 h-4" />} />
                      <DriverConfigInput label="€/KM Diurno" value={localSettings?.kmPrice} placeholder={globalSettings?.kmPrice} onChange={v => setLocalSettings({...localSettings, kmPrice: v})} step={0.01} icon={<Car className="w-4 h-4" />} />
                      <DriverConfigInput label="€/KM Notturno" value={localSettings?.nightKmPrice} placeholder={globalSettings?.nightKmPrice} onChange={v => setLocalSettings({...localSettings, nightKmPrice: v})} step={0.01} icon={<Clock className="w-4 h-4" />} />
                      <DriverConfigInput label="Extra Bagaglio (€)" value={localSettings?.luggagePrice} placeholder={globalSettings?.luggagePrice} onChange={v => setLocalSettings({...localSettings, luggagePrice: v})} icon={<Briefcase className="w-4 h-4" />} />
                      <DriverConfigInput label="Urgenza (€)" value={localSettings?.urgentFee} placeholder={globalSettings?.urgentFee} onChange={v => setLocalSettings({...localSettings, urgentFee: v})} icon={<ShieldAlert className="w-4 h-4" />} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}

function DriverConfigInput({ label, value, placeholder, onChange, icon, step = 0.5 }: { label: string, value: any, placeholder: any, onChange: (v: number | string) => void, icon?: React.ReactNode, step?: number }) {
  const isCustom = value !== undefined && value !== null && value !== '';
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between px-1">
        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</Label>
        <Badge variant="outline" className={cn("text-[8px] font-black uppercase px-2 h-4 border-none", isCustom ? "bg-blue-100 text-blue-600 shadow-sm" : "bg-slate-100 text-slate-400 opacity-60")}>{isCustom ? "PERS." : "DEF."}</Badge>
      </div>
      <div className="relative">
        <div className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", isCustom ? "text-blue-500" : "text-slate-300 group-focus-within:text-blue-500")}>{icon}</div>
        <Input type="number" step={step} placeholder={placeholder !== undefined ? String(placeholder) : '0'} value={value ?? ''} onChange={e => { const v = e.target.value; onChange(v === '' ? '' : parseFloat(v)); }} className={cn("h-11 rounded-xl text-xs font-bold transition-all border-2 pl-10", isCustom ? "border-blue-200 bg-white ring-4 ring-blue-50/50" : "border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-100")} />
      </div>
    </div>
  );
}

function RideCard({ ride, isOwner, onClaim, onUpdateStatus, isUpdating }: any) {
    const statusColors: any = {
        'PENDING': 'bg-amber-100 text-amber-700',
        'ACCEPTED': 'bg-blue-100 text-blue-700',
        'IN_PROGRESS': 'bg-indigo-100 text-indigo-700',
        'COMPLETED': 'bg-emerald-100 text-emerald-700',
        'CANCELLED': 'bg-red-100 text-red-700',
        'WAITING_CONFIRMATION': 'bg-purple-100 text-purple-700'
    };

    const statusLabels: any = {
        'PENDING': 'IN ATTESA',
        'ACCEPTED': 'ACCETTATA',
        'IN_PROGRESS': 'IN VIAGGIO',
        'COMPLETED': 'COMPLETATA',
        'CANCELLED': 'ANNULLATA',
        'WAITING_CONFIRMATION': 'DA CONFERMARE'
    };

    const openInMaps = (address: string, coords?: any) => {
        const url = coords 
            ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    };

    return (
        <Card className="rounded-[2.5rem] border-none shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white border border-slate-100">
            <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black shadow-inner">
                            {ride.passengerName?.[0] || <User className="w-5 h-5" />}
                        </div>
                        <div className="text-left">
                            <h3 className="font-black text-xl text-slate-900 leading-none mb-1.5">{ride.passengerName}</h3>
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                <CalendarIcon className="w-3 h-3" /> {ride.date} <Clock className="w-3 h-3 ml-2" /> {ride.time}
                            </div>
                        </div>
                    </div>
                    <div className="text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                        <p className="text-3xl font-black text-blue-600 tracking-tighter">€{ride.price}</p>
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase border-none py-1 px-3", statusColors[ride.status] || 'bg-slate-100')}>
                            {statusLabels[ride.status] || ride.status}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
                    <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100/50">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 flex flex-col items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <div className="w-0.5 h-8 bg-slate-200" />
                                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="group/item">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Partenza</p>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/item:opacity-100 transition-opacity" onClick={() => openInMaps(ride.origin, ride.originCoords)}>
                                            <ExternalLink className="w-3 h-3 text-blue-600" />
                                        </Button>
                                    </div>
                                    <p className="text-xs font-bold text-slate-700">{ride.origin}</p>
                                </div>
                                {ride.intermediateStops?.map((stop: any, i: number) => (
                                    <div key={i} className="group/item">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Tappa {i+1}</p>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/item:opacity-100 transition-opacity" onClick={() => openInMaps(typeof stop === 'string' ? stop : stop.address, typeof stop === 'string' ? null : stop.coords)}>
                                                <ExternalLink className="w-3 h-3 text-blue-600" />
                                            </Button>
                                        </div>
                                        <p className="text-xs font-medium text-slate-600">{typeof stop === 'string' ? stop : stop.address}</p>
                                    </div>
                                ))}
                                <div className="group/item">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Arrivo</p>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/item:opacity-100 transition-opacity" onClick={() => openInMaps(ride.destination, ride.destinationCoords)}>
                                            <ExternalLink className="w-3 h-3 text-blue-600" />
                                        </Button>
                                    </div>
                                    <p className="text-xs font-black text-slate-900">{ride.destination}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 p-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Dettagli Corsa</span>
                            <span className="text-blue-600 font-black">{ride.serviceType}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /><span className="text-xs font-bold">{ride.passengers} Pax</span></div>
                            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400" /><span className="text-xs font-bold">{ride.luggage || 0} Bagagli</span></div>
                        </div>
                        {ride.notes && <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100"><p className="text-[9px] font-black text-amber-600 uppercase mb-1">Note passeggero</p><p className="text-[10px] text-amber-800 italic leading-tight font-medium">"{ride.notes}"</p></div>}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {isOwner ? (
                        <>
                            {/* Chat Corsa temporarily disabled during migration to local Master Server */}
                            {/* <ChatDialog 
                              chatId={ride.id} 
                              collectionPath={`rides/${ride.id}/chatMessages`} 
                              title={`Chat Corsa #${ride.bookingCode?.slice(-6)}`}
                              denormalizedData={{ ridePassengerId: ride.passengerId, rideDriverId: ride.driverId }}
                              trigger={
                                <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black bg-white border-slate-200 text-slate-600 text-[11px] uppercase tracking-widest gap-2">
                                  <MessageCircle className="w-4 h-4 text-blue-600" /> Chat Corsa
                                </Button>
                              }
                            /> */}
                            <Button className="flex-1 h-14 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 text-[11px] uppercase tracking-widest gap-2 text-white" onClick={() => window.open(`https://wa.me/${ride.passengerPhone?.replace(/\D/g, '')}?text=Ciao ${ride.passengerName}, sono il tuo driver Azzurro. Sto arrivando!`, '_blank')}><Phone className="w-4 h-4" /> WhatsApp</Button>
                            {(ride.status === 'ACCEPTED' || ride.status === 'PENDING') && <Button className="flex-1 h-14 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700 text-[11px] uppercase tracking-widest gap-2 text-white" onClick={() => onUpdateStatus('IN_PROGRESS')} disabled={isUpdating}>{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />} Inizia Viaggio</Button>}
                            {ride.status === 'IN_PROGRESS' && <Button className="flex-1 h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-[11px] uppercase tracking-widest gap-2 text-white" onClick={() => onUpdateStatus('COMPLETED')} disabled={isUpdating}>{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Concludi Corsa</Button>}
                        </>
                    ) : (
                        <Button className="w-full h-14 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 text-[11px] uppercase tracking-widest gap-2 text-white" onClick={onClaim} disabled={isUpdating}>{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Accetta e Prendi in Carico</Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
