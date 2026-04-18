'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  MoreHorizontal, Calendar, MapPin, Euro, Phone, Loader2, Trash2, MessageCircle, 
  Eye, History, RotateCcw, Save, User, Car, Clock, Briefcase, FileText, CheckCircle2,
  AlertCircle, ArrowRight, Instagram, Plus, X, ArrowDown, Activity, LifeBuoy, Archive,
  Inbox, ListFilter, Zap, TriangleAlert, ChevronDown, ChevronUp, Navigation, Banknote, Percent,
  Home, Info, ExternalLink, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { socketService } from '@/services/socket-service';

// Utility per il calcolo della distanza
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c) * 1.35; 
}

export default function ManageBookingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Inline Delete protection states
  const [confirmingTableDeleteId, setConfirmingTableDeleteId] = useState<string | null>(null);
  const [tableDeleteCountdown, setTableDeleteCountdown] = useState(10);
  
  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterInsertDate, setFilterInsertDate] = useState('');

  useEffect(() => {
    const adminAuth = localStorage.getItem('isAdminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Semplificato per usare il nuovo socketService Titanium
      socketService.emit('client_request', { action: 'GET_ALL_DATA_FOR_BOOKINGS' }, (res: any) => {
          if (res && res.success) {
            setBookings(res.bookings || []);
            setDrivers(res.drivers || []);
            setSettings(res.settings);
          }
          setIsLoading(false);
      });

      const handleEliminazione = (data: any) => {
          if (data && data.rideId) {
             setBookings(prev => prev.filter(b => b.id !== data.rideId && b.ticket_id !== data.rideId));
          }
      };
      
      socketService.on('nuova_eliminazione', handleEliminazione);
      
      return () => {
         socketService.off('nuova_eliminazione');
      };
    }
  }, [isAuthenticated]);

  // Handle countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (confirmingTableDeleteId && tableDeleteCountdown > 0) {
      timer = setTimeout(() => setTableDeleteCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [confirmingTableDeleteId, tableDeleteCountdown]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    socketService.emit('client_request', { 
      action: 'LOGIN_ADMIN', 
      email, 
      password 
    }, (res: any) => {
        setIsLoggingIn(false);
        if (res && res.success) {
          localStorage.setItem('isAdminAuthenticated', 'true');
          setIsAuthenticated(true);
          toast({ title: "Accesso Eseguito", description: "Benvenuto nel centro di controllo Titanium." });
        } else {
          toast({ variant: "destructive", title: "Accesso Negato", description: res?.message || "Credenziali non valide." });
        }
    });
  };

  const handleDelete = (id: string) => {
    socketService.emit('client_request', { action: 'DELETE_RIDE', payload: { rideId: id } }, (res: any) => {
        toast({ title: "Prenotazione eliminata" });
        setBookings(prev => prev.filter(b => b.id !== id));
        if (selectedBooking?.id === id) setSelectedBooking(null);
        setConfirmingTableDeleteId(null);
    });
  };

  const activeBookings = useMemo(() => {
     let filtered = bookings?.filter(b => b.status !== 'ARCHIVED' && b.status !== 'CANCELLED') || [];
     if (filterStartDate) filtered = filtered.filter(b => (b.data_partenza || b.date) === filterStartDate);
     if (filterInsertDate) filtered = filtered.filter(b => b.created_at?.startsWith(filterInsertDate));
     return filtered;
  }, [bookings, filterStartDate, filterInsertDate]);
  
  const archivedBookings = useMemo(() => {
     let filtered = bookings?.filter(b => b.status === 'ARCHIVED' || b.status === 'CANCELLED') || [];
     if (filterStartDate) filtered = filtered.filter(b => (b.data_partenza || b.date) === filterStartDate);
     if (filterInsertDate) filtered = filtered.filter(b => b.created_at?.startsWith(filterInsertDate));
     return filtered;
  }, [bookings, filterStartDate, filterInsertDate]);

  const oldestVersionId = useMemo(() => {
    if (!history || history.length === 0) return null;
    return history[history.length - 1]?.id;
  }, [history]);

  const handleArchive = (id: string) => {
    const bookingToArchive = bookings?.find(b => b.id === id);
    const isCurrentlyArchived = bookingToArchive?.status === 'ARCHIVED';
    const newStatus = isCurrentlyArchived ? 'PENDING' : 'ARCHIVED';

    socketService.emit('client_request', { action: 'UPDATE_RIDE_STATUS', payload: { rideId: id, status: newStatus } }, (res: any) => {
        toast({ 
          title: isCurrentlyArchived ? "Ripristinata" : "Archiviata", 
          description: isCurrentlyArchived ? "La corsa è tornata tra le attive." : "La corsa è stata spostata nell'archivio." 
        });
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
        if (selectedBooking?.id === id) {
          setSelectedBooking((prev: any) => ({ ...prev, status: newStatus }));
        }
    });
  };

  const handleToggleDetails = (booking: any) => {
    if (selectedBooking?.id === booking.id) {
        setSelectedBooking(null);
        setEditData(null);
        setConfirmingTableDeleteId(null);
        return;
    }
    setSelectedBooking(booking);
    setEditData({ 
      ...booking,
      intermediateStops: booking.intermediateStops || []
    });
    setConfirmingTableDeleteId(null);

    // Fetch history via socket
    socketService.emit('client_request', { action: 'GET_RIDE_HISTORY', payload: { rideId: booking.id } }, (res: any) => {
        setHistory(res?.payload || []);
    });
  };

  const handleUpdateBooking = () => {
    if (!selectedBooking || !editData) return;
    setIsSaving(true);

    socketService.emit('client_request', { 
        action: 'UPDATE_RIDE_DETAILS', 
        payload: { rideId: selectedBooking.id, data: editData } 
    }, (res: any) => {
        if (res && res.success) {
            toast({ title: "Modifiche salvate", description: "La prenotazione è stata aggiornata sul Master Server." });
            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...editData, id: selectedBooking.id } : b));
            setSelectedBooking({ ...editData, id: selectedBooking.id });
        } else {
            toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare le modifiche." });
        }
        setIsSaving(false);
    });
  };

  const handleRevert = (historicalData: any) => {
    if (!selectedBooking) return;
    if (!confirm("Ripristinare questa versione della prenotazione?")) return;

    setIsSaving(true);
    socketService.emit('client_request', { action: 'REVERT_RIDE_VERSION', payload: { rideId: selectedBooking.id, versionId: historicalData.id } }, (res: any) => {
        if (res && res.success) {
            const cleanData = res.payload;
            toast({ title: "Versione Ripristinata", description: "La prenotazione è tornata allo stato precedente." });
            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...cleanData, id: selectedBooking.id } : b));
            setSelectedBooking({ ...cleanData, id: selectedBooking.id });
            setEditData({ ...cleanData });
        }
        setIsSaving(false);
    });
  };

  const handleDeleteHistoryEntry = (historyId: string) => {
    if (!selectedBooking) return;
    
    socketService.emit('client_request', { action: 'DELETE_RIDE_HISTORY', payload: { rideId: selectedBooking.id, historyId } }, (res: any) => {
        toast({ title: "Versione eliminata" });
        setHistory(prev => prev.filter(h => h.id !== historyId));
    });
  };

  if (isLoading && !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center bg-slate-50 min-h-screen gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">Accesso al Blackview Master...</p>
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
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Elite Command</h2>
              <p className="text-slate-500 font-medium italic text-sm">Inserisci le credenziali Master Titanium</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4 px-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email Amministratore</Label>
                    <Input 
                      type="email" 
                      placeholder="admin@azzurro.it" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus-visible:ring-blue-500 pl-6"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password Segreta</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus-visible:ring-blue-500 pl-6"
                    />
                  </div>
              </div>
              <Button type="submit" disabled={isLoggingIn} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3">
                {isLoggingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sblocca Pannello Master"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Gestione Prenotazioni</h1>
          <p className="text-muted-foreground font-medium">Monitoraggio e revisione delle corse nel database.</p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-black h-9 flex items-center px-4 uppercase tracking-widest text-[10px]">
                {bookings?.length || 0} Totali nel Database
            </Badge>
        </div>
      </div>

      <div className="w-full">
        <Card className="mb-6 border-none shadow-sm rounded-2xl bg-white p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Filtra per Data Corsa</Label>
                <Input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="flex-1 space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Filtra per Inserimento</Label>
                <Input type="date" value={filterInsertDate} onChange={e => setFilterInsertDate(e.target.value)} className="h-10 rounded-xl" />
            </div>
            {(filterStartDate || filterInsertDate) && (
                <div className="flex items-end">
                    <Button variant="ghost" onClick={() => {setFilterStartDate(''); setFilterInsertDate('');}} className="h-10 rounded-xl text-red-500 hover:bg-red-50">Reset Filtri</Button>
                </div>
            )}
        </Card>
      
        <Tabs defaultValue="active" className="w-full space-y-6">
            <div className="flex items-center justify-between px-1">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-11">
                    <TabsTrigger value="active" className="rounded-lg font-bold text-[10px] uppercase tracking-widest px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ListFilter className="w-3.5 h-3.5 mr-2" /> In Corso ({activeBookings.length})
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="rounded-lg font-bold text-[10px] uppercase tracking-widest px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Archive className="w-3.5 h-3.5 mr-2" /> Archivio ({archivedBookings.length})
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="active" className="mt-0 outline-none">
                <Card className="border-none shadow-lg overflow-hidden rounded-2xl">
                    <CardContent className="p-0">
                        <BookingTable 
                            bookings={activeBookings} 
                            selectedBookingId={selectedBooking?.id} 
                            onToggleDetails={handleToggleDetails}
                            onArchive={handleArchive}
                            confirmingTableDeleteId={confirmingTableDeleteId}
                            tableDeleteCountdown={tableDeleteCountdown}
                            setConfirmingTableDeleteId={(id: string | null) => {
                                setConfirmingTableDeleteId(id);
                                setTableDeleteCountdown(10);
                            }}
                            onDelete={handleDelete}
                            editData={editData}
                            setEditData={setEditData}
                            handleUpdateBooking={handleUpdateBooking}
                            isSaving={isSaving}
                            history={history}
                            oldestVersionId={oldestVersionId}
                            handleRevert={handleRevert}
                            handleDeleteHistoryEntry={handleDeleteHistoryEntry}
                            settings={settings}
                            drivers={drivers}
                        />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="archived" className="mt-0 outline-none">
                <Card className="border-none shadow-lg overflow-hidden rounded-2xl">
                    <CardContent className="p-0">
                        <BookingTable 
                            bookings={archivedBookings} 
                            selectedBookingId={selectedBooking?.id} 
                            onToggleDetails={handleToggleDetails}
                            onArchive={handleArchive}
                            confirmingTableDeleteId={confirmingTableDeleteId}
                            tableDeleteCountdown={tableDeleteCountdown}
                            setConfirmingTableDeleteId={(id: string | null) => {
                                setConfirmingTableDeleteId(id);
                                setTableDeleteCountdown(10);
                            }}
                            onDelete={handleDelete}
                            editData={editData}
                            setEditData={setEditData}
                            handleUpdateBooking={handleUpdateBooking}
                            isSaving={isSaving}
                            history={history}
                            oldestVersionId={oldestVersionId}
                            handleRevert={handleRevert}
                            handleDeleteHistoryEntry={handleDeleteHistoryEntry}
                            settings={settings}
                            drivers={drivers}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
        
        {bookings?.length === 0 && (
            <Card className="text-center py-20 mt-8 bg-slate-50 border-dashed border-2 rounded-3xl">
                <LifeBuoy className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">Nessuna prenotazione trovata.</p>
            </Card>
        )}
        
        <div className="mt-12 text-center pb-12">
            <Link href="/admin" className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center justify-center gap-2 uppercase tracking-widest">
                ← Torna alla Dashboard Admin
            </Link>
        </div>
      </div>
    </div>
  );
}

function BookingTable({ 
    bookings, 
    selectedBookingId, 
    onToggleDetails, 
    onArchive, 
    confirmingTableDeleteId, 
    tableDeleteCountdown, 
    setConfirmingTableDeleteId, 
    onDelete,
    editData,
    setEditData,
    handleUpdateBooking,
    isSaving,
    history,
    oldestVersionId,
    handleRevert,
    handleDeleteHistoryEntry,
    settings,
    drivers
}: any) {
    return (
        <Table>
            <TableHeader className="bg-slate-50">
            <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-12 px-6">Codice / Cliente</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-12">Data & Ora</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-12">Percorso</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-12">Driver</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-12">Stato</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 h-12 px-6">Azioni</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {bookings?.map((booking: any) => {
                const isSelected = selectedBookingId === booking.id;
                const isConfirmingDelete = confirmingTableDeleteId === booking.id;

                return (
                    <React.Fragment key={booking.id}>
                        <TableRow 
                            className={cn(
                                "hover:bg-slate-50/50 transition-colors cursor-pointer group",
                                isSelected && "bg-blue-50/50 hover:bg-blue-50/80",
                                isConfirmingDelete && "bg-red-50 hover:bg-red-50"
                            )} 
                            onClick={() => onToggleDetails(booking)}
                        >
                        <TableCell className="pl-4">
                            {isSelected ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                        </TableCell>
                        <TableCell className="px-6 text-left">
                            <div className="flex flex-col text-left">
                                <span className={cn("font-black text-[10px] tracking-wider uppercase mb-1", isSelected ? "text-blue-700" : "text-blue-600")}>{booking.bookingCode}</span>
                                <span className="font-bold text-slate-900">{booking.passengerName}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-left">
                            <div className="flex flex-col text-xs font-bold text-slate-600">
                                <span className="flex items-center gap-1">{booking.data_partenza || booking.date}</span>
                                <span className="text-slate-400">{booking.ora_partenza || booking.time}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-left">
                            <div className="flex flex-col max-w-[180px]">
                                <span className="text-[10px] truncate font-medium text-slate-500">{booking.partenza_indirizzo || booking.origin}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] truncate font-black text-slate-900">{booking.destinazione_indirizzo || booking.destination}</span>
                                    {booking.intermediateStops && booking.intermediateStops.length > 0 && (
                                        <Badge variant="outline" className="h-3.5 px-1 text-[7px] font-black border-blue-100 bg-blue-50 text-blue-600 uppercase">
                                            +{booking.intermediateStops.length} Tappe
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-left">
                            <Badge variant="outline" className="font-black text-[9px] uppercase border-slate-200">
                                {booking.driverName || 'Non assegnato'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-left">
                            <StatusBadge status={booking.status} />
                        </TableCell>
                        <TableCell className="text-right px-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", isSelected ? "text-blue-700 bg-blue-100" : "text-blue-600 hover:bg-blue-50")} onClick={() => onToggleDetails(booking)}>
                                <Eye className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl p-1 w-48 shadow-xl">
                                        <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2 py-1.5">Opzioni</DropdownMenuLabel>
                                        <DropdownMenuItem className="rounded-lg text-xs font-bold gap-2 cursor-pointer" onClick={() => onToggleDetails(booking)}>Vedi Dettagli</DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg text-xs font-bold gap-2 cursor-pointer" onClick={() => onArchive(booking.id)}>
                                            <Archive className="w-3.5 h-3.5" /> {booking.status === 'ARCHIVED' ? 'Ripristina' : 'Archivia'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </TableCell>
                        </TableRow>

                        {/* DETTAGLIO ESPANSO INLINE */}
                        {isSelected && (
                            <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-none">
                                <TableCell colSpan={7} className="p-0 border-none">
                                    <div className="px-6 py-8 bg-white border-y animate-in slide-in-from-top-4 duration-500 shadow-inner">
                                        <div className="max-w-7xl mx-auto space-y-8">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <Badge className="bg-blue-600 font-black uppercase text-xs tracking-widest px-4 py-1.5 rounded-xl shadow-lg">
                                                        #{booking.bookingCode}
                                                    </Badge>
                                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Analisi Operativa Prenotazione</h3>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {/* Chat temporaneamente disabilitata durante migrazione locale */}
                                                    {/* <ChatDialog 
                                                        chatId={booking.id} 
                                                        collectionPath={`rides/${booking.id}/chatMessages`} 
                                                        title={`Chat #${booking.bookingCode?.slice(-6)}`}
                                                        denormalizedData={{ ridePassengerId: booking.passengerId, rideDriverId: booking.driverId }}
                                                        trigger={
                                                            <Button variant="outline" className="rounded-xl h-10 font-bold text-xs gap-2 border-slate-200 bg-white">
                                                                <MessageCircle className="w-4 h-4 text-blue-600" /> Chat Driver
                                                            </Button>
                                                        }
                                                    /> */}
                                                    
                                                    {isConfirmingDelete ? (
                                                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                                            <Button 
                                                                variant="destructive" 
                                                                className="rounded-xl h-10 px-4 font-black text-[10px] gap-2 uppercase tracking-widest shadow-lg shadow-red-200 min-w-[180px]"
                                                                onClick={() => onDelete(booking.id)}
                                                                disabled={tableDeleteCountdown > 0}
                                                            >
                                                                <AlertCircle className="w-4 h-4" /> 
                                                                {tableDeleteCountdown > 0 ? `Sicurezza (${tableDeleteCountdown}s)` : "Conferma Eliminazione"}
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => setConfirmingTableDeleteId(null)}
                                                                className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            variant="outline" 
                                                            className="rounded-xl h-10 px-4 font-bold text-xs gap-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 transition-all shadow-sm"
                                                            onClick={() => setConfirmingTableDeleteId(booking.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Elimina Corsa
                                                        </Button>
                                                    )}

                                                    <Button variant="ghost" size="icon" onClick={() => onToggleDetails(booking)} className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 hover:text-red-500">
                                                        <X className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <Tabs defaultValue="overview" className="w-full">
                                                <TabsList className="bg-slate-100 p-1 rounded-xl h-12 w-full max-w-md mb-6">
                                                    <TabsTrigger value="overview" className="flex-1 rounded-lg font-bold text-[10px] uppercase h-full">Tragitto & Prezzo</TabsTrigger>
                                                    <TabsTrigger value="edit" className="flex-1 rounded-lg font-bold text-[10px] uppercase h-full">Modifica Dati</TabsTrigger>
                                                    <TabsTrigger value="history" className="flex-1 rounded-lg font-bold text-[10px] uppercase h-full gap-2">Revisioni ({history?.length || 0})</TabsTrigger>
                                                </TabsList>

                                                <TabsContent value="overview" className="animate-in fade-in duration-300">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                                                        <div className="lg:col-span-2 space-y-6">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <DetailBox icon={<User className="w-4 h-4" />} label="Passeggero" title={booking.passengerName} sub={booking.passengerPhone} color="blue" />
                                                                <DetailBox icon={<Car className="w-4 h-4" />} label="Driver" title={booking.driverName || 'Non assegnato'} sub={booking.serviceType} color="emerald" />
                                                                <DetailBox icon={<Calendar className="w-4 h-4" />} label="Data & Ora" title={booking.date} sub={`ORE ${booking.time}`} color="indigo" />
                                                                <DetailBox icon={<Briefcase className="w-4 h-4" />} label="Capacità" title={`${booking.passengers} Pax`} sub={`${booking.luggage || 0} Bagagli`} color="amber" />
                                                            </div>

                                                            <Card className="rounded-[2.5rem] border-none shadow-sm bg-slate-50 p-8 overflow-hidden relative">
                                                                <div className="absolute top-0 right-0 p-8 opacity-5"><Navigation className="w-32 h-32 text-blue-600" /></div>
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /> Percorso Operativo Driver</h4>
                                                                
                                                                <OperationalPath booking={booking} settings={settings} drivers={drivers} />
                                                            </Card>
                                                        </div>

                                                        <div className="space-y-6">
                                                            <PriceBreakdown booking={booking} settings={settings} drivers={drivers} />

                                                            {booking.notes && (
                                                                <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                                                                    <p className="text-[10px] font-black text-amber-600 uppercase mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Note del Passeggero</p>
                                                                    <p className="text-xs text-amber-800 italic leading-relaxed font-medium">"{booking.notes}"</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="edit" className="animate-in fade-in duration-300">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                                                        <div className="lg:col-span-2 space-y-6">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="p-4 rounded-2xl border bg-blue-50 text-blue-600 border-blue-100 flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2 opacity-70">
                                                                        <User className="w-4 h-4" />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">Passeggero</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <Input value={editData?.passengerName} onChange={e => setEditData({...editData, passengerName: e.target.value})} className="h-6 p-0 text-xs font-black border-none bg-transparent focus-visible:ring-0 text-slate-900" />
                                                                        <Input value={editData?.passengerPhone} onChange={e => setEditData({...editData, passengerPhone: e.target.value})} className="h-4 p-0 text-[10px] font-bold border-none bg-transparent opacity-70 focus-visible:ring-0 text-slate-500" />
                                                                    </div>
                                                                </div>
                                                                <div className="p-4 rounded-2xl border bg-emerald-50 text-emerald-600 border-emerald-100 flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2 opacity-70">
                                                                        <Car className="w-4 h-4" />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">Driver</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <Input value={editData?.driverName} onChange={e => setEditData({...editData, driverName: e.target.value})} className="h-6 p-0 text-xs font-black border-none bg-transparent focus-visible:ring-0 text-slate-900" />
                                                                        <select value={editData?.serviceType} onChange={e => setEditData({...editData, serviceType: e.target.value})} className="h-4 w-full p-0 text-[10px] font-bold border-none bg-transparent opacity-70 focus:outline-none appearance-none cursor-pointer text-slate-500">
                                                                            <option value="STANDARD">STANDARD</option>
                                                                            <option value="AIRPORT">AEROPORTO</option>
                                                                            <option value="EVENT">EVENTO</option>
                                                                            <option value="URGENT">URGENTE</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                <div className="p-4 rounded-2xl border bg-indigo-50 text-indigo-600 border-indigo-100 flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2 opacity-70">
                                                                        <Calendar className="w-4 h-4" />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">Data & Ora</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <Input type="date" value={editData?.date} onChange={e => setEditData({...editData, date: e.target.value})} className="h-6 p-0 text-xs font-black border-none bg-transparent focus-visible:ring-0 text-slate-900" />
                                                                        <Input type="time" value={editData?.time} onChange={e => setEditData({...editData, time: e.target.value})} className="h-4 p-0 text-[10px] font-bold border-none bg-transparent opacity-70 focus-visible:ring-0 text-slate-500" />
                                                                    </div>
                                                                </div>
                                                                <div className="p-4 rounded-2xl border bg-amber-50 text-amber-600 border-amber-100 flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2 opacity-70">
                                                                        <Briefcase className="w-4 h-4" />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">Capacità</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-1">
                                                                            <Input type="number" value={editData?.passengers} onChange={e => setEditData({...editData, passengers: parseInt(e.target.value)})} className="h-6 w-8 p-0 text-xs font-black border-none bg-transparent focus-visible:ring-0 text-slate-900" />
                                                                            <span className="text-xs font-black text-slate-900">Pax</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 opacity-70">
                                                                            <Input type="number" value={editData?.luggage} onChange={e => setEditData({...editData, luggage: parseInt(e.target.value)})} className="h-4 w-8 p-0 text-[10px] font-bold border-none bg-transparent focus-visible:ring-0 text-slate-500" />
                                                                            <span className="text-[10px] font-bold text-slate-500">Bagagli</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <Card className="rounded-[2.5rem] border-none shadow-sm bg-slate-50 p-8 overflow-hidden relative">
                                                                <div className="absolute top-0 right-0 p-8 opacity-5"><Navigation className="w-32 h-32 text-blue-600" /></div>
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /> Modifica Percorso</h4>
                                                                
                                                                <div className="space-y-6 relative z-10">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-2">Punto di Partenza</Label>
                                                                        <Input value={editData?.origin} onChange={e => setEditData({...editData, origin: e.target.value})} className="h-12 rounded-xl bg-white border-slate-200 font-bold" />
                                                                    </div>

                                                                    {/* Tappe Intermedie */}
                                                                    <div className="space-y-4">
                                                                        {editData?.intermediateStops?.map((stop: any, idx: number) => (
                                                                            <div key={idx} className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                                                                                <div className="flex items-center justify-between px-2">
                                                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Tappa {idx + 1}</Label>
                                                                                    <Button 
                                                                                        variant="ghost" 
                                                                                        size="icon" 
                                                                                        className="h-6 w-6 text-slate-300 hover:text-red-500"
                                                                                        onClick={() => {
                                                                                            const newStops = editData.intermediateStops.filter((_: any, i: number) => i !== idx);
                                                                                            setEditData({ ...editData, intermediateStops: newStops });
                                                                                        }}
                                                                                    >
                                                                                        <X className="w-3 h-3" />
                                                                                    </Button>
                                                                                </div>
                                                                                <Input 
                                                                                    value={typeof stop === 'string' ? stop : (stop?.address || '')} 
                                                                                    onChange={e => {
                                                                                        const newStops = [...editData.intermediateStops];
                                                                                        if (typeof stop === 'string') {
                                                                                            newStops[idx] = e.target.value;
                                                                                        } else {
                                                                                            newStops[idx] = { ...stop, address: e.target.value };
                                                                                        }
                                                                                        setEditData({ ...editData, intermediateStops: newStops });
                                                                                    }} 
                                                                                    className="h-12 rounded-xl bg-white border-slate-200 font-bold" 
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            className="rounded-xl h-10 px-4 border-dashed border-2 border-slate-200 text-slate-400 font-bold text-[10px] uppercase gap-2 hover:bg-white hover:text-blue-600 hover:border-blue-200"
                                                                            onClick={() => {
                                                                                const newStops = [...(editData?.intermediateStops || []), { address: '', coords: null }];
                                                                                setEditData({ ...editData, intermediateStops: newStops });
                                                                            }}
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" /> Aggiungi Tappa Intermedia
                                                                        </Button>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-2">
                                                                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-2">Destinazione Finale</Label>
                                                                        <Input value={editData?.destination} onChange={e => setEditData({...editData, destination: e.target.value})} className="h-12 rounded-xl bg-white border-slate-200 font-bold" />
                                                                    </div>

                                                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                                                                        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                                                                        <p className="text-[10px] font-bold text-blue-700 leading-tight">Nota: La modifica degli indirizzi qui non ricalcola automaticamente i chilometri nel database, ma aggiorna solo le etichette visualizzate.</p>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        </div>

                                                        <div className="space-y-6">
                                                            <Card className="rounded-[2rem] border-none shadow-xl bg-slate-900 text-white overflow-hidden text-left">
                                                                <CardHeader className="bg-slate-800/50 border-b border-white/5 p-6">
                                                                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                                                        <Banknote className="w-4 h-4 text-emerald-400" /> Configurazione Rapida
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="p-6 space-y-6">
                                                                    <div className="space-y-4">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Stato della Corsa</Label>
                                                                            <select value={editData?.status} onChange={e => setEditData({...editData, status: e.target.value})} className="w-full h-12 rounded-xl bg-slate-800 border-none font-bold text-[10px] px-4 focus:outline-none appearance-none cursor-pointer">
                                                                                <option value="PENDING">IN ATTESA</option>
                                                                                <option value="ACCEPTED">ACCETTATA</option>
                                                                                <option value="WAITING_CONFIRMATION">DA CONFERMARE</option>
                                                                                <option value="IN_PROGRESS">IN VIAGGIO</option>
                                                                                <option value="COMPLETED">COMPLETATA</option>
                                                                                <option value="CANCELLED">ANNULLATA</option>
                                                                                <option value="ARCHIVED">ARCHIVIATA</option>
                                                                            </select>
                                                                        </div>
                                                                        
                                                                        <div className="space-y-2">
                                                                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prezzo Finale (€)</Label>
                                                                            <Input type="number" value={editData?.price} onChange={e => setEditData({...editData, price: e.target.value})} className="h-14 rounded-2xl bg-slate-800 border-none font-black text-3xl focus-visible:ring-0" />
                                                                        </div>
                                                                    </div>

                                                                    <Separator className="bg-white/10" />

                                                                    <Button onClick={handleUpdateBooking} disabled={isSaving} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] gap-3 shadow-xl shadow-blue-500/20">
                                                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Salva Modifiche
                                                                    </Button>
                                                                </CardContent>
                                                            </Card>

                                                            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                                                                <p className="text-[10px] font-black text-amber-600 uppercase mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Note del Passeggero</p>
                                                                <Textarea value={editData?.notes} onChange={e => setEditData({...editData, notes: e.target.value})} className="text-xs text-amber-800 italic leading-relaxed font-medium bg-transparent border-none focus-visible:ring-0 p-0 min-h-[80px]" placeholder="Nessuna nota..." />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="history" className="animate-in fade-in duration-300">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {history && history.length > 0 ? history.map((version: any) => {
                                                            const isOldest = version.id === oldestVersionId;
                                                            return (
                                                                <Card key={version.id} className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white hover:border-blue-200 transition-colors">
                                                                    <div className="p-5 space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-black text-slate-900 text-lg">€{version.price}</span>
                                                                                <StatusBadge status={version.status} className="h-4 px-2 text-[7px]" />
                                                                            </div>
                                                                            {isOldest && <Badge className="bg-emerald-100 text-emerald-700 border-none text-[7px] font-black uppercase">Originale</Badge>}
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Revisione del</p>
                                                                            <p className="text-xs font-bold text-slate-700">
                                                                                {version.timestamp ? (
                                                                                    format(
                                                                                        version.timestamp.toDate ? version.timestamp.toDate() : new Date(version.timestamp), 
                                                                                        'EEEE dd MMMM, HH:mm', 
                                                                                        {locale: it}
                                                                                    )
                                                                                ) : 'Data non disponibile'}
                                                                            </p>
                                                                            <p className="text-[10px] text-blue-600 font-medium">da {version.modifiedBy}</p>
                                                                        </div>
                                                                        <div className="pt-4 border-t border-slate-50 flex items-center gap-2">
                                                                            <Button variant="outline" size="sm" className="flex-1 rounded-xl h-9 text-[10px] font-black uppercase border-blue-100 text-blue-600 hover:bg-blue-50" onClick={() => handleRevert(version)}>
                                                                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Ripristina
                                                                            </Button>
                                                                            {!isOldest && (
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="icon" 
                                                                                    className="h-9 w-9 text-slate-300 hover:text-red-500 rounded-xl" 
                                                                                    onClick={() => handleDeleteHistoryEntry(version.id)}
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </Card>
                                                            );
                                                        }) : (
                                                            <div className="col-span-full py-20 text-center opacity-30 border-2 border-dashed border-slate-100 rounded-[2rem]">
                                                                <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                                                <p className="text-[11px] font-black uppercase tracking-[0.2em]">Nessuna revisione trovata</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </React.Fragment>
                );
            })}
            </TableBody>
        </Table>
    );
}

// Percorso Operativo con Sede Driver
function OperationalPath({ booking, settings, drivers }: any) {
    const driverProfile = drivers?.find((d: any) => d.id === booking.driverId);
    
    const openInMaps = (address: string) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    };

    // Se abbiamo i segmenti pre-calcolati salvati nel database, usiamoli
    if (booking.routeSegments && booking.routeSegments.length > 0) {
        return (
            <div className="space-y-0 relative text-left">
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />
                {booking.routeSegments.map((seg: any, i: number) => (
                    <div key={i} className="mb-8 last:mb-0">
                        <div className="flex items-start gap-6 relative z-10">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-md shrink-0",
                                seg.fromLabel === 'Sede Driver' || seg.fromLabel === 'Ritorno Sede' ? "bg-slate-400" : (seg.fromLabel === 'Partenza' ? "bg-emerald-500" : "bg-white border-slate-300")
                            )}>
                                {seg.fromLabel === 'Sede Driver' || seg.fromLabel === 'Ritorno Sede' ? <Home className="w-3.5 h-3.5 text-white" /> : <div className={cn("w-2 h-2 rounded-full", seg.fromLabel === 'Partenza' ? "bg-white" : "bg-slate-300")} />}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", seg.type === 'OPERATIONAL' ? "text-slate-400" : "text-blue-600")}>{seg.fromLabel}</p>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-300 hover:text-blue-600" onClick={() => openInMaps(seg.from)}>
                                        <ExternalLink className="w-3 h-3" />
                                    </Button>
                                </div>
                                <p className="text-sm font-bold text-slate-800 leading-tight">{seg.from}</p>
                            </div>
                        </div>
                        <div className="ml-14 mt-2 mb-2">
                            <Badge variant="outline" className="bg-white border-slate-100 text-[8px] font-black text-slate-400 uppercase py-0.5 px-2">
                                {seg.km} km • ~{seg.min} min
                            </Badge>
                        </div>
                        {/* Se è l'ultimo segmento, aggiungiamo anche il punto finale */}
                        {i === booking.routeSegments.length - 1 && (
                            <div className="flex items-start gap-6 relative z-10 mt-8">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-md shrink-0 bg-slate-400">
                                    <Home className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">{seg.toLabel}</p>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-300 hover:text-blue-600" onClick={() => openInMaps(seg.to)}>
                                            <ExternalLink className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{seg.to}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Fallback per vecchie prenotazioni senza routeSegments salvati
    const baseAddress = driverProfile?.homeBaseAddress || settings?.homeBaseAddress || 'Sede Centrale Brianza';
    const baseCoords = driverProfile?.homeBaseCoords || settings?.homeBaseCoords || { lat: 45.7785, lon: 9.3285 };

    const points = [
        { label: 'Sede Driver', address: baseAddress, coords: baseCoords, isOperational: true },
        { label: 'Partenza', address: booking.origin, coords: booking.originCoords },
        ...(booking.intermediateStops || []).map((s: any, i: number) => ({
            label: `Tappa ${i + 1}`,
            address: typeof s === 'string' ? s : s.address,
            coords: typeof s === 'string' ? null : s.coords
        })),
        { label: 'Arrivo', address: booking.destination, coords: booking.destinationCoords },
        { label: 'Ritorno Sede', address: baseAddress, coords: baseCoords, isOperational: true }
    ];

    return (
        <div className="space-y-0 relative text-left">
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />
            {points.map((p, i) => {
                const nextPoint = points[i+1];
                let segmentStats = null;
                if (nextPoint && p.coords && nextPoint.coords) {
                    const km = getDistanceKm(p.coords.lat, p.coords.lon, nextPoint.coords.lat, nextPoint.coords.lon);
                    segmentStats = { km: km.toFixed(1), min: Math.round(km * 1.5) };
                }

                return (
                    <div key={i} className="mb-8 last:mb-0">
                        <div className="flex items-start gap-6 relative z-10">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-md shrink-0",
                                p.isOperational ? "bg-slate-400" : (i === 1 ? "bg-emerald-500" : (i === points.length - 2 ? "bg-blue-600" : "bg-white border-slate-300"))
                            )}>
                                {p.isOperational ? <Home className="w-3.5 h-3.5 text-white" /> : (i === points.length - 2 ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <div className={cn("w-2 h-2 rounded-full", i === 1 ? "bg-white" : "bg-slate-300")} />)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", p.isOperational ? "text-slate-400" : "text-blue-600")}>{p.label}</p>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-300 hover:text-blue-600" onClick={() => openInMaps(p.address)}>
                                        <ExternalLink className="w-3 h-3" />
                                    </Button>
                                </div>
                                <p className="text-sm font-bold text-slate-800 leading-tight">{p.address}</p>
                            </div>
                        </div>
                        {segmentStats && (
                            <div className="ml-14 mt-2 mb-2">
                                <Badge variant="outline" className="bg-white border-slate-100 text-[8px] font-black text-slate-400 uppercase py-0.5 px-2">
                                    {segmentStats.km} km • ~{segmentStats.min} min
                                </Badge>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Analisi Prezzo Dettagliata
function PriceBreakdown({ booking, settings, drivers }: any) {
    const driver = drivers?.find((d: any) => d.id === booking.driverId) || {};
    
    const basePriceFloor = (driver.basePrice !== undefined && driver.basePrice !== null && driver.basePrice !== '') ? parseFloat(driver.basePrice) : (settings?.basePrice || 15.00);
    const kmPrice = (driver.kmPrice !== undefined && driver.kmPrice !== null && driver.kmPrice !== '') ? parseFloat(driver.kmPrice) : (settings?.kmPrice || 1.20);
    const nightKmPrice = (driver.nightKmPrice !== undefined && driver.nightKmPrice !== null && driver.nightKmPrice !== '') ? parseFloat(driver.nightKmPrice) : (settings?.nightKmPrice || 1.60);
    const airportMinFloor = (driver.airportMinFare !== undefined && driver.airportMinFare !== null && driver.airportMinFare !== '') ? parseFloat(driver.airportMinFare) : (settings?.airportMinFare || 45.00);
    const urgentFee = (driver.urgentFee !== undefined && driver.urgentFee !== null && driver.urgentFee !== '') ? parseFloat(driver.urgentFee) : (settings?.urgentFee || 20.00);
    const eventSurchargePercent = (driver.eventSurchargePercent !== undefined && driver.eventSurchargePercent !== null && driver.eventSurchargePercent !== '') ? parseFloat(driver.eventSurchargePercent) : (settings?.eventSurchargePercent || 25);
    const extraPaxFixed = (driver.extraPassengerFixed !== undefined && driver.extraPassengerFixed !== null && driver.extraPassengerFixed !== '') ? parseFloat(driver.extraPassengerFixed) : (settings?.extraPassengerFixed || 15.00);
    const extraPaxPercent = (driver.extraPassengerPercent !== undefined && driver.extraPassengerPercent !== null && driver.extraPassengerPercent !== '') ? parseFloat(driver.extraPassengerPercent) : (settings?.extraPassengerPercent || 15);
    const luggagePrice = (driver.luggagePrice !== undefined && driver.luggagePrice !== null && driver.luggagePrice !== '') ? parseFloat(driver.luggagePrice) : (settings?.luggagePrice || 3.00);

    let totalKm = 0;
    if (booking.routeSegments && booking.routeSegments.length > 0) {
        totalKm = booking.routeSegments.reduce((acc: number, seg: any) => acc + parseFloat(seg.km || 0), 0);
    } else if (booking.originCoords && booking.destinationCoords) {
        // Fallback operativo completo
        const driverProfile = drivers?.find((d: any) => d.id === booking.driverId);
        const baseCoords = driverProfile?.homeBaseCoords || settings?.homeBaseCoords || { lat: 45.7785, lon: 9.3285 };
        
        totalKm += getDistanceKm(baseCoords.lat, baseCoords.lon, booking.originCoords.lat, booking.originCoords.lon);
        let curLat = booking.originCoords.lat;
        let curLon = booking.originCoords.lon;
        for (const stop of (booking.intermediateStops || [])) {
            if (stop.coords) {
                totalKm += getDistanceKm(curLat, curLon, stop.coords.lat, stop.coords.lon);
                curLat = stop.coords.lat;
                curLon = stop.coords.lon;
            }
        }
        totalKm += getDistanceKm(curLat, curLon, booking.destinationCoords.lat, booking.destinationCoords.lon);
        totalKm += getDistanceKm(booking.destinationCoords.lat, booking.destinationCoords.lon, baseCoords.lat, baseCoords.lon);
    }

    const [hours] = (booking.time || "12:00").split(':').map(Number);
    const isNight = hours >= 22 || hours < 6;
    const currentKmRate = isNight ? nightKmPrice : kmPrice;
    const kmCost = totalKm * currentKmRate;

    // Calcolo Supplementi
    let extras = 0;
    if (booking.serviceType === 'AIRPORT') {
        if (booking.passengers > 1) extras += (booking.passengers - 1) * extraPaxFixed;
    } else {
        if (booking.passengers > 1) extras += (kmCost * (extraPaxPercent / 100)) * (booking.passengers - 1);
    }
    if (booking.luggage > 0) extras += booking.luggage * luggagePrice;
    if (booking.serviceType === 'EVENT') extras += (kmCost * (eventSurchargePercent / 100));
    if (booking.serviceType === 'URGENT') extras += urgentFee;
    
    let isWeekend = false;
    try {
        const d = new Date(booking.date);
        isWeekend = d.getDay() === 0 || d.getDay() === 6;
    } catch(e) {}
    if (isWeekend) extras += (settings?.weekendSurcharge || 10);
    
    if (booking.intermediateStops?.length > 0) extras += (booking.intermediateStops.length * 10);

    const priceWithExtras = kmCost + extras;
    const floor = booking.serviceType === 'AIRPORT' ? airportMinFloor : basePriceFloor;
    const adjustment = Math.max(0, floor - priceWithExtras);

    return (
        <Card className="rounded-[2rem] border-none shadow-xl bg-slate-900 text-white overflow-hidden text-left">
            <CardHeader className="bg-slate-800/50 border-b border-white/5 p-6">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-400" /> Analisi Tariffa
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                    <CalculationRow label={`Percorso Operativo (${totalKm.toFixed(1)} km)`} value={kmCost} sub={`€${currentKmRate}/km ${isNight ? 'NOTTURNO' : 'DIURNO'}`} icon={<Navigation className="w-3 h-3" />} />
                    
                    {booking.passengers > 1 && (
                        <CalculationRow label="Passeggeri Extra" value={booking.serviceType === 'AIRPORT' ? (booking.passengers - 1) * extraPaxFixed : (kmCost * (extraPaxPercent / 100)) * (booking.passengers - 1)} sub={`${booking.passengers} persone`} />
                    )}
                    
                    {booking.luggage > 0 && (
                        <CalculationRow label="Supplemento Bagagli" value={booking.luggage * luggagePrice} sub={`${booking.luggage} unità`} />
                    )}

                    {booking.intermediateStops?.length > 0 && (
                        <CalculationRow label="Extra Tappe" value={booking.intermediateStops.length * 10} sub={`${booking.intermediateStops.length} stop`} />
                    )}

                    {booking.serviceType === 'EVENT' && (
                        <CalculationRow label="Supplemento Serata" value={kmCost * (eventSurchargePercent / 100)} color="text-amber-400" />
                    )}

                    {booking.serviceType === 'URGENT' && (
                        <CalculationRow label="Supplemento Urgenza" value={urgentFee} color="text-red-400" />
                    )}

                    {isWeekend && (
                        <CalculationRow label="Supplemento Weekend" value={settings?.weekendSurcharge || 10} color="text-emerald-400" />
                    )}

                    {adjustment > 0 && (
                        <CalculationRow label="Adeguamento Minimo" value={adjustment} color="text-blue-400" sub={`Minimo: €${floor}`} icon={<CheckCircle2 className="w-3 h-3" />} />
                    )}
                </div>

                <Separator className="bg-white/10" />

                <div className="flex justify-between items-end pt-2">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Prezzo Finale</p>
                        <p className="text-4xl font-black text-white tracking-tighter">€{booking.price}</p>
                    </div>
                    <Badge className="bg-blue-600 text-white font-black uppercase text-[8px] h-6 px-3">Prezzo Fisso</Badge>
                </div>
            </CardContent>
        </Card>
    );
}

function CalculationRow({ label, value, sub, icon, color = "text-slate-300" }: any) {
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
                {icon || <div className="w-1 h-1 rounded-full bg-slate-600" />}
                <div>
                    <p className={cn("text-[10px] font-black uppercase tracking-wider", color)}>{label}</p>
                    {sub && <p className="text-[8px] font-bold text-slate-500 uppercase">{sub}</p>}
                </div>
            </div>
            <p className="font-black text-xs text-white">+€{parseFloat(value || 0).toFixed(2)}</p>
        </div>
    );
}

function DetailBox({ icon, label, title, sub, color }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100'
    };
    return (
        <div className={cn("p-4 rounded-2xl border flex flex-col gap-2", colors[color])}>
            <div className="flex items-center gap-2 opacity-70">
                {icon}
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <div className="overflow-hidden">
                <p className="font-black text-slate-900 text-xs truncate leading-tight">{title}</p>
                <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">{sub}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status, className }: { status: string, className?: string }) {
  const colors: any = {
    'PENDING': 'bg-amber-100 text-amber-700',
    'ACCEPTED': 'bg-blue-100 text-blue-700',
    'WAITING_CONFIRMATION': 'bg-purple-100 text-purple-700',
    'IN_PROGRESS': 'bg-indigo-100 text-indigo-700',
    'COMPLETED': 'bg-emerald-100 text-emerald-700',
    'CANCELLED': 'bg-red-100 text-red-700',
    'ARCHIVED': 'bg-slate-100 text-slate-700'
  };
  const labels: any = {
    'PENDING': 'IN ATTESA',
    'ACCEPTED': 'ACCETTATA',
    'WAITING_CONFIRMATION': 'DA CONFERMARE',
    'IN_PROGRESS': 'IN VIAGGIO',
    'COMPLETED': 'COMPLETATA',
    'CANCELLED': 'ANNULLATA',
    'ARCHIVIATA': 'ARCHIVIATA'
  };
  return (
    <Badge variant="outline" className={cn("font-black text-[9px] uppercase border-none", colors[status] || 'bg-slate-100 text-slate-600', className)}>
      {labels[status] || status}
    </Badge>
  );
}
