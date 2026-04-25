'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  MoreHorizontal, 
  Edit2, 
  User, 
  Car, 
  Save, 
  Star, 
  Loader2, 
  ShieldAlert,
  Search,
  RefreshCcw,
  Trash2,
  CheckSquare,
  Square,
  Plane,
  DatabaseZap,
  Crown,
  Info,
  Users,
  Briefcase,
  Percent,
  Banknote,
  Navigation,
  Clock,
  AlertCircle,
  X,
  CalendarRange
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';

import { socketService } from '@/services/socket-service';

export default function ManageDriversPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("account");

  const [rawUsers, setRawUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Inline Revocation Logic States
  const [confirmingRevocationId, setConfirmingRevocationId] = useState<string | null>(null);
  const [revocationCountdown, setRevocationCountdown] = useState(10);

  useEffect(() => {
    const authStatus = localStorage.getItem('isAdminAuthenticated');
    if (authStatus !== 'true') {
      router.push('/admin');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      socketService.emit('client_request', { action: 'GET_ALL_DATA_FOR_BOOKINGS' }, (res: any) => {
          if (res && res.success) {
            setRawUsers(res.users || []);
            setDrivers(res.drivers || []);
            setAppSettings(res.settings || null);
          } else {
            // Fallback: prova solo la lista driver
            setDrivers([]);
            setRawUsers([]);
          }
          setIsLoading(false);
          setIsRefreshing(false);
      }, 20000);
    }
  }, [isAuthenticated, refreshKey]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (confirmingRevocationId && revocationCountdown > 0) {
      timer = setTimeout(() => setRevocationCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [confirmingRevocationId, revocationCountdown]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
  };

  const handleResetPassword = (type: 'DRIVER' | 'CUSTOMER', id: number, nome: string) => {
    const tempPass = 'AzzurroTempo' + Math.floor(1000 + Math.random() * 9000);
    if (!confirm(`Vuoi resettare la password di ${nome}? Verrà impostata la password temporanea: ${tempPass}`)) return;

    socketService.emit('client_request', { 
        action: 'RESET_PASSWORD', 
        type: type, 
        id: id, 
        tempPass 
    }, (res: any) => {
        if (res && res.success) {
            toast({ title: "Password Resettata", description: `La nuova password per ${nome} è: ${tempPass}` });
        } else {
            toast({ variant: "destructive", title: "Errore", description: "Impossibile resettare la password." });
        }
    }, 15000);
  };

  const handleEditClick = (person: any, tab: string = "account") => {
    const driverProfile = drivers?.find(d => d.userId === person.id || d.id === person.id);
    setSelectedPerson({ 
        ...person, 
        ...driverProfile,
        id: driverProfile?.id || person.id,
        isDriver: !!driverProfile,
        activeServices: driverProfile?.activeServices || ['STANDARD', 'AIRPORT', 'EVENT', 'URGENT']
    });
    setActiveTab(tab);
    setIsEditDialogOpen(true);
  };

  const toggleServiceInEdit = (sId: string) => {
    if (!selectedPerson) return;
    const current = selectedPerson.activeServices || [];
    const newList = current.includes(sId) ? current.filter((s: string) => s !== sId) : [...current, sId];
    setSelectedPerson({ ...selectedPerson, activeServices: newList });
  };

  const handleRevokeClick = (personId: string) => {
    setConfirmingRevocationId(personId);
    setRevocationCountdown(10);
  };

  const executeRevocation = async (personId: string) => {
    socketService.emit('client_request', { action: 'REVOKE_DRIVER', payload: { userId: personId } }, (res: any) => {
      toast({ title: "Richiesta completata", description: "Revoca eseguita sul Master Server." });
      setConfirmingRevocationId(null);
      setRefreshKey(k => k + 1);
    }, 15000);
  };

  const handleToggleApproval = async (personId: string, currentStatus: boolean) => {
    socketService.emit('client_request', { 
        action: 'TOGGLE_DRIVER_APPROVAL', 
        payload: { userId: personId, status: !currentStatus } 
    }, (res: any) => {
      toast({ title: "Aggiornamento completato", description: "Database Master aggiornato." });
      setRefreshKey(k => k + 1);
    }, 15000);
  };

  const handleSaveEdit = async () => {
    if (!selectedPerson) return;
    socketService.emit('client_request', { 
        action: 'UPDATE_DRIVER_PROFILE', 
        payload: selectedPerson 
    }, (res: any) => {
      setIsEditDialogOpen(false);
      toast({ title: "Modifiche salvate", description: "Il profilo driver è stato aggiornato sul telefono." });
      setRefreshKey(k => k + 1);
    }, 15000);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Eliminare definitivamente questo utente dal database del Blackview?")) return;
    
    socketService.emit('client_request', { action: 'DELETE_USER', payload: { userId } }, (res: any) => {
      toast({ title: "Utente rimosso", description: "Database Master aggiornato." });
      setRefreshKey(k => k + 1);
    }, 15000);
  };

  if (isLoading && !isRefreshing) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold animate-pulse">Connessione al Blackview Master...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const people = (rawUsers || []).map((u: any) => {
      // Uniamo il profilo esteso del driver basandoci sull'email (per evitare collisioni di ID tra tabella Clienti e Autisti)
      const driver = drivers?.find((d: any) => d.email === u.email);
      return { 
        ...u, 
        name: u.nome || (u.email?.split('@')[0] || 'Sconosciuto'), 
        isDriver: u.type === 'DRIVER' || !!driver, 
        driverProfile: driver || (u.type === 'DRIVER' ? u : null)
      };
  });

  const filteredPeople = people.filter(p => {
    const search = searchTerm.toLowerCase();
    const name = (p.name || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-10 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="text-left">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Gestione Community</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="text-blue-600 border-blue-100 bg-blue-50 font-bold">{people.length} Iscritti Totali</Badge>
              <Badge variant="outline" className="text-emerald-600 border-emerald-100 bg-emerald-50 font-bold">{drivers?.length || 0} Driver</Badge>
            </div>
          </div>
          <Button variant="outline" onClick={handleManualRefresh} disabled={isRefreshing} className="rounded-xl h-10 font-bold border-slate-200">
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="mr-2 h-4 w-4" />} Sincronizza Server
          </Button>
        </div>

        <Card className="mb-6 border-none shadow-sm rounded-2xl bg-white p-4">
          <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Cerca per nome o email..." className="h-12 pl-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-12 px-6">Identità</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-12">Stato</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-12 text-center">Ruolo Driver</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 h-12 px-6">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeople.length > 0 ? filteredPeople.map((person) => {
                  const isApproved = person.driverProfile?.isApproved;
                  const isConfirmingRevoke = confirmingRevocationId === person.id;

                  return (
                    <TableRow key={person.id} className="hover:bg-slate-50/30 transition-colors">
                      <TableCell className="px-6 py-4 text-left">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl border flex items-center justify-center font-bold text-xs uppercase shadow-sm bg-slate-50 text-slate-400 border-slate-100">{person.name?.charAt(0)}</div>
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-slate-900 text-sm">{person.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{person.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        {person.isDriver ? (
                          <div className="flex flex-col">
                              <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5"><Car className="w-3 h-3 text-blue-500" /> {person.driverProfile.vehicle || 'Auto non impostata'}</span>
                              <div className="flex items-center gap-1 text-[9px] text-yellow-500 font-bold"><Star className="w-2.5 h-2.5 fill-yellow-400" /> {person.driverProfile.driverRating || '5.0'}</div>
                          </div>
                        ) : <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Passeggero</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {isConfirmingRevoke ? (
                          <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in-95 duration-300">
                            <span className="text-[8px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 animate-pulse" /> Sicuro? {revocationCountdown}s
                            </span>
                            <div className="flex gap-1.5 mt-0.5">
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                disabled={revocationCountdown > 0}
                                onClick={() => executeRevocation(person.id)}
                                className={cn(
                                  "h-6 px-3 text-[8px] font-black rounded-lg uppercase transition-all",
                                  revocationCountdown > 0 ? "opacity-50" : "opacity-100 shadow-sm shadow-red-200"
                                )}
                              >
                                Conferma
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setConfirmingRevocationId(null)}
                                className="h-6 px-3 text-[8px] font-black rounded-lg uppercase text-slate-400 hover:bg-slate-100"
                              >
                                Annulla
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant={isApproved ? 'default' : 'outline'} className={cn("font-black text-[8px] px-2 py-0 h-4 border-none uppercase", isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600')}>{isApproved ? 'Autorizzato' : 'Non Attivo'}</Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => isApproved ? handleRevokeClick(person.id) : handleToggleApproval(person.id, !!isApproved)} 
                              className="h-6 text-[9px] font-bold px-2 rounded-lg text-blue-600 hover:bg-blue-50"
                            >
                              {isApproved ? 'Sospendi' : 'Rendi Driver'}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(person, "account")} className="h-8 w-8 text-slate-400 hover:text-blue-600 rounded-lg"><Edit2 className="h-4 w-4" /></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-lg">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2 py-1.5">Opzioni</DropdownMenuLabel>
                                {person.isDriver && (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/drivers/${person.id}/availability`} className="rounded-lg text-xs font-bold gap-2 cursor-pointer">
                                      <CalendarRange className="w-3.5 h-3.5" /> Gestisci Disponibilità
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => isApproved ? handleRevokeClick(person.id) : handleToggleApproval(person.id, !!isApproved)} className="rounded-lg text-xs font-bold gap-2 cursor-pointer">{isApproved ? 'Revoca Driver' : 'Promuovi a Driver'}</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleResetPassword(person.isDriver ? 'DRIVER' : 'CUSTOMER', person.id, person.name)} className="rounded-lg text-xs font-bold gap-2 cursor-pointer text-blue-600">
                                    <RefreshCcw className="w-3.5 h-3.5" /> Resetta Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteUser(person.id)} className="text-red-600 rounded-lg text-xs font-bold gap-2 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Elimina Utente</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow><TableCell colSpan={4} className="py-24 text-center"><div className="flex flex-col items-center gap-4 opacity-40"><RefreshCcw className="w-12 h-12 text-slate-300 animate-spin-slow" /><p className="text-sm font-black uppercase tracking-widest text-slate-400">Nessun membro trovato nel database.</p></div></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog Modifica */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[850px] w-[95vw] h-[85vh] p-0 border-none shadow-2xl rounded-[2.5rem] overflow-hidden text-left bg-white flex flex-col">
            <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col min-h-0">
              <DialogHeader className="p-8 pb-4 bg-slate-50/80 border-b shrink-0">
                <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl text-white shadow-lg bg-blue-600"><User className="w-5 h-5" /></div>
                  {selectedPerson?.name}
                </DialogTitle>
                <TabsList className="grid w-full grid-cols-4 bg-slate-200/50 rounded-2xl p-1 h-12 mt-4">
                  <TabsTrigger value="account" className="rounded-xl font-bold text-[10px]">Profilo</TabsTrigger>
                  <TabsTrigger value="rates" className="rounded-xl font-bold text-[10px]" disabled={!selectedPerson?.isDriver}>Tariffe</TabsTrigger>
                  <TabsTrigger value="extra" className="rounded-xl font-bold text-[10px]" disabled={!selectedPerson?.isDriver}>Supplementi</TabsTrigger>
                  <TabsTrigger value="services" className="rounded-xl font-bold text-[10px]" disabled={!selectedPerson?.isDriver}>Servizi</TabsTrigger>
                </TabsList>
              </DialogHeader>
              
              {selectedPerson && (
                <ScrollArea className="flex-1 min-h-0 w-full">
                  <div className="p-8 pt-4 pb-12">
                    <TabsContent value="account" className="mt-0 space-y-6 outline-none">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Visualizzato</Label>
                          <Input value={selectedPerson.name || ''} onChange={e => setSelectedPerson({...selectedPerson, name: e.target.value})} className="rounded-xl h-12 font-bold bg-slate-50/50 border-transparent focus:bg-white" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Veicolo Attuale</Label>
                          <Input value={selectedPerson.vehicle || ''} onChange={e => setSelectedPerson({...selectedPerson, vehicle: e.target.value})} className="rounded-xl h-12 font-bold bg-slate-50/50 border-transparent focus:bg-white" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="rates" className="mt-0 space-y-6 outline-none">
                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3 mb-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-[10px] font-bold text-blue-700 leading-tight">I campi vuoti usano i <b>Valori di Default</b> del sistema. I dati personalizzati sono evidenziati in blu.</p>
                      </div>
                      
                      <div className="space-y-8">
                        <div>
                          <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2"><Navigation className="w-3 h-3" /> Basi & Accettazione</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DriverConfigInput label="Quota Fissa Base (€)" value={selectedPerson.basePrice} placeholder={appSettings?.basePrice} onChange={v => setSelectedPerson({...selectedPerson, basePrice: v})} icon={<Banknote className="w-4 h-4" />} />
                            <DriverConfigInput label="Minimo Accettazione (€)" value={selectedPerson.minAcceptableFare} placeholder={appSettings?.minAcceptableFare} onChange={v => setSelectedPerson({...selectedPerson, minAcceptableFare: v})} icon={<CheckSquare className="w-4 h-4" />} />
                          </div>
                        </div>
                        <Separator className="bg-slate-100" />
                        <div>
                          <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2"><Clock className="w-3 h-3" /> Tariffe Chilometriche</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DriverConfigInput label="Prezzo KM Diurno (€)" value={selectedPerson.kmPrice} placeholder={appSettings?.kmPrice} onChange={v => setSelectedPerson({...selectedPerson, kmPrice: v})} step={0.01} icon={<Car className="w-4 h-4" />} />
                            <DriverConfigInput label="Prezzo KM Notturno (€)" value={selectedPerson.nightKmPrice} placeholder={appSettings?.nightKmPrice} onChange={v => setSelectedPerson({...selectedPerson, nightKmPrice: v})} step={0.01} icon={<Clock className="w-4 h-4" />} />
                          </div>
                        </div>
                        <Separator className="bg-slate-100" />
                        <div>
                          <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2"><Percent className="w-3 h-3" /> Supplementi Servizi</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <DriverConfigInput label="Minimo Aeroporto (€)" value={selectedPerson.airportMinFare} placeholder={appSettings?.airportMinFare} onChange={v => setSelectedPerson({...selectedPerson, airportMinFare: v})} icon={<Plane className="w-4 h-4" />} />
                            <DriverConfigInput label="Supplemento Urgenza (€)" value={selectedPerson.urgentFee} placeholder={appSettings?.urgentFee} onChange={v => setSelectedPerson({...selectedPerson, urgentFee: v})} icon={<ShieldAlert className="w-4 h-4" />} />
                            <DriverConfigInput label="Ricarico Serata (%)" value={selectedPerson.eventSurchargePercent} placeholder={appSettings?.eventSurchargePercent} onChange={v => setSelectedPerson({...selectedPerson, eventSurchargePercent: v})} icon={<Percent className="w-4 h-4" />} />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="extra" className="mt-0 space-y-8 outline-none">
                      <div className="space-y-8">
                        <div>
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-5 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Persone Extra</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <DriverConfigInput label="Extra Pax Aeroporto (€)" value={selectedPerson.extraPassengerFixed} placeholder={appSettings?.extraPassengerFixed} onChange={v => setSelectedPerson({...selectedPerson, extraPassengerFixed: v})} icon={<Banknote className="w-4 h-4" />} tooltip="Somma fissa per ogni passeggero oltre il primo negli aeroporti" />
                            <DriverConfigInput label="Extra Pax Altri (%)" value={selectedPerson.extraPassengerPercent} placeholder={appSettings?.extraPassengerPercent} onChange={v => setSelectedPerson({...selectedPerson, extraPassengerPercent: v})} icon={<Percent className="w-4 h-4" />} tooltip="Percentuale aggiunta per ogni passeggero extra negli altri servizi" />
                          </div>
                        </div>
                        <Separator className="bg-slate-100" />
                        <div>
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-5 flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" /> Bagagli</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <DriverConfigInput label="Prezzo Singolo Bagaglio (€)" value={selectedPerson.luggagePrice} placeholder={appSettings?.luggagePrice} onChange={v => setSelectedPerson({...selectedPerson, luggagePrice: v})} icon={<Briefcase className="w-4 h-4" />} tooltip="Costo fisso aggiunto per ogni bagaglio inserito" />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="services" className="mt-0 space-y-4 outline-none">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                              { id: 'STANDARD', label: 'Standard', icon: <Car className="w-5 h-5" /> },
                              { id: 'AIRPORT', label: 'Aeroporti', icon: <Plane className="w-5 h-5" /> },
                              { id: 'EVENT', label: 'Serata / Disco', icon: <Star className="w-5 h-5" /> },
                              { id: 'URGENT', label: 'Urgenze', icon: <ShieldAlert className="w-5 h-5" /> }
                          ].map((serv) => (
                              <button key={serv.id} onClick={() => toggleServiceInEdit(serv.id)} className={cn("flex items-center justify-between p-5 rounded-2xl border-2 transition-all group", selectedPerson.activeServices?.includes(serv.id) ? "border-blue-600 bg-blue-50/50 shadow-sm" : "border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200")}>
                                  <div className="flex items-center gap-4">
                                      <div className={cn("p-2.5 rounded-xl transition-colors", selectedPerson.activeServices?.includes(serv.id) ? "bg-blue-600 text-white shadow-md" : "bg-slate-100 text-slate-400")}>{serv.icon}</div>
                                      <span className="font-bold text-sm text-slate-900">{serv.label}</span>
                                  </div>
                                  {selectedPerson.activeServices?.includes(serv.id) ? <CheckSquare className="w-6 h-6 text-blue-600 fill-blue-50" /> : <Square className="w-6 h-6 text-slate-200" />}
                              </button>
                          ))}
                      </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              )}

              <div className="p-8 bg-slate-50/80 border-t backdrop-blur-sm shrink-0">
                <DialogFooter className="gap-4 sm:justify-between items-center">
                  <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-2xl font-bold text-xs h-12 text-slate-400 hover:bg-slate-100">Annulla</Button>
                  <Button onClick={handleSaveEdit} className="rounded-2xl font-black text-xs h-12 px-12 bg-slate-900 text-white gap-2 shadow-xl uppercase tracking-widest hover:bg-slate-800"><Save className="w-4 h-4" /> Salva Modifiche</Button>
                </DialogFooter>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>

        <div className="mt-12 text-center pb-12"><Link href="/admin" className="text-xs font-black text-slate-300 hover:text-blue-600 transition-colors inline-flex items-center gap-2 uppercase tracking-widest">← Dashboard</Link></div>
      </div>
    </TooltipProvider>
  );
}

function DriverConfigInput({ label, value, placeholder, onChange, icon, step = 0.5, tooltip }: { label: string, value: any, placeholder: any, onChange: (v: number | string) => void, icon?: React.ReactNode, step?: number, tooltip?: string }) {
  const isCustom = value !== undefined && value !== null && value !== '';
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</Label>
          {tooltip && (
            <Tooltip><TooltipTrigger asChild><div className="p-0.5 hover:bg-slate-100 rounded-full transition-colors cursor-help"><Info className="w-3 h-3 text-slate-300" /></div></TooltipTrigger><TooltipContent className="rounded-xl text-[10px] font-bold p-3 max-w-[220px] shadow-2xl border-none bg-slate-900 text-white">{tooltip}</TooltipContent></Tooltip>
          )}
        </div>
        <Badge variant="outline" className={cn("text-[8px] font-black uppercase px-2 h-4 border-none transition-all", isCustom ? "bg-blue-100 text-blue-600 animate-in fade-in zoom-in-95 shadow-sm shadow-blue-200" : "bg-slate-100 text-slate-400 opacity-60")}>{isCustom ? "Pers." : "Def."}</Badge>
      </div>
      <div className="relative">
        {icon && (<div className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors scale-90", isCustom ? "text-blue-500" : "text-slate-300 group-focus-within:text-blue-500")}>{icon}</div>)}
        <Input type="number" step={step} placeholder={placeholder !== undefined ? String(placeholder) : 'Def.'} value={value ?? ''} onChange={e => { const v = e.target.value; onChange(v === '' ? '' : parseFloat(v)); }} className={cn("rounded-xl h-10 text-xs font-bold transition-all border-2", icon ? "pl-10" : "px-4", isCustom ? "border-blue-200 bg-white ring-4 ring-blue-50/50" : "border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-100")} />
      </div>
    </div>
  );
}
