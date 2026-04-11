'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Trash2, ShieldCheck, ShieldAlert, Loader2, Save, ArrowLeft, Search, Globe, Sparkles, Check, X, Navigation, Info, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { doc, setDoc, collection, query, limit } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ADMIN_EMAIL = 'creator.azzurro@gmail.com';

export default function AdminPlacesPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase())) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'global') : null, [db]);
  const { data: remoteSettings, isLoading: settingsLoading } = useDoc(settingsRef);
  
  const ridesRef = useMemoFirebase(() => (db && user) ? query(collection(db, 'rides'), limit(100)) : null, [db, user]);
  const { data: rides, isLoading: ridesLoading } = useCollection(ridesRef);

  const [localSettings, setLocalSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'verified' | 'forbidden' | 'discovered'>('verified');
  
  // Edit state
  const [editingPlace, setEditingPlace] = useState<any>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editOriginalType, setEditOriginalType] = useState<'verified' | 'forbidden' | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (remoteSettings) {
      setLocalSettings({
        ...remoteSettings,
        verifiedAddresses: remoteSettings.verifiedAddresses || [],
        forbiddenAddresses: remoteSettings.forbiddenAddresses || [],
      });
    } else if (!settingsLoading) {
      setLocalSettings({
        verifiedAddresses: [],
        forbiddenAddresses: []
      });
    }
  }, [remoteSettings, settingsLoading]);

  // Estrai luoghi unici dalle prenotazioni che non sono già registrati
  const discoveredPlaces = React.useMemo(() => {
    if (!rides || !localSettings) return [];
    
    const allAddresses = new Map();
    const existing = [
        ...(localSettings.verifiedAddresses || []),
        ...(localSettings.forbiddenAddresses || [])
    ].map(p => (p.fullAddress || '').toLowerCase());

    rides.forEach(ride => {
        const locations = [
            { name: ride.origin || '', fullAddress: ride.origin || '', coords: ride.originCoords || null },
            { name: ride.destination || '', fullAddress: ride.destination || '', coords: ride.destinationCoords || null },
            ...(ride.intermediateStops || []).map((s: any) => ({
                name: typeof s === 'string' ? s : (s.address || ''),
                fullAddress: typeof s === 'string' ? s : (s.address || ''),
                coords: typeof s === 'string' ? null : (s.coords || null)
            }))
        ];

        locations.forEach(loc => {
            if (loc.fullAddress && !existing.includes(loc.fullAddress.toLowerCase())) {
                allAddresses.set(loc.fullAddress.toLowerCase(), loc);
            }
        });
    });

    return Array.from(allAddresses.values());
  }, [rides, localSettings]);

  const handleSave = async (data: any) => {
    if (!db) return;

    // Funzione per rimuovere valori undefined (non supportati da Firestore)
    const sanitize = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(sanitize);
      if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, sanitize(v)])
        );
      }
      return obj;
    };

    const sanitizedData = sanitize(data);
    const globalSettingsRef = doc(db, 'settings', 'global');
    
    return setDoc(globalSettingsRef, sanitizedData, { merge: true })
      .then(() => {
        toast({ title: "Database aggiornato", description: "Le modifiche ai luoghi sono state salvate." });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: globalSettingsRef.path,
          operation: 'update',
          requestResourceData: sanitizedData,
        }));
      });
  };

  const addPlace = (type: 'verified' | 'forbidden', place: any) => {
    const listKey = type === 'verified' ? 'verifiedAddresses' : 'forbiddenAddresses';
    const newList = [...(localSettings[listKey] || []), place];
    const updatedSettings = { ...localSettings, [listKey]: newList };
    setLocalSettings(updatedSettings);
    handleSave(updatedSettings);
  };

  const removePlace = (type: 'verified' | 'forbidden', index: number) => {
    const listKey = type === 'verified' ? 'verifiedAddresses' : 'forbiddenAddresses';
    const newList = localSettings[listKey].filter((_: any, i: number) => i !== index);
    const updatedSettings = { ...localSettings, [listKey]: newList };
    setLocalSettings(updatedSettings);
    handleSave(updatedSettings);
  };

  const openEditModal = (type: 'verified' | 'forbidden', index: number) => {
    const listKey = type === 'verified' ? 'verifiedAddresses' : 'forbiddenAddresses';
    setEditingPlace({ ...localSettings[listKey][index], type });
    setEditIndex(index);
    setEditOriginalType(type);
    setIsEditModalOpen(true);
  };

  const saveEditedPlace = () => {
    if (editIndex === null || !editOriginalType || !editingPlace) return;

    const updatedSettings = { ...localSettings };
    const originalListKey = editOriginalType === 'verified' ? 'verifiedAddresses' : 'forbiddenAddresses';
    const targetListKey = editingPlace.type === 'verified' ? 'verifiedAddresses' : 'forbiddenAddresses';

    // Rimuovi dall'originale
    const filteredList = updatedSettings[originalListKey].filter((_: any, i: number) => i !== editIndex);
    updatedSettings[originalListKey] = filteredList;

    // Aggiungi alla destinazione (può essere la stessa o diversa)
    const { type, ...cleanPlace } = editingPlace;
    updatedSettings[targetListKey] = [...updatedSettings[targetListKey], cleanPlace];

    setLocalSettings(updatedSettings);
    handleSave(updatedSettings);
    setIsEditModalOpen(false);
  };

  if (authLoading || settingsLoading || !localSettings) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500 pb-20">
      <div className="mb-10 text-left">
        <Link href="/admin" className="text-xs font-black text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-4 uppercase tracking-widest transition-colors">
            <ArrowLeft className="w-3 h-3" /> Dashboard
        </Link>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Geografia & Zone</h1>
        <p className="text-slate-500 font-medium mt-2">Configura indirizzi verificati, zone proibite e scopri nuovi luoghi dalle prenotazioni.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLONNA SINISTRA: INPUT E SCOPERTA */}
        <div className="lg:col-span-5 space-y-8">
            
            {/* AGGIUNGI LUOGO CON AUTOCOMPLETE */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8 pb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><Plus className="w-5 h-5" /></div>
                        <CardTitle className="text-xl font-black uppercase tracking-tighter">Nuovo Punto</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400 font-medium">Usa l'autocompletamento per inserire indirizzi precisi.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 -mt-6">
                    <div className="bg-white rounded-[2rem] shadow-xl p-6 border border-slate-100 space-y-6">
                        <LocationAutocomplete 
                            onSelect={(place) => {
                                // Default a verificato se aggiunto da qui
                                addPlace('verified', place);
                                toast({ title: "Luogo aggiunto", description: `${place.name} è ora tra i verificati.` });
                            }} 
                        />
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-[10px] font-bold text-blue-700 leading-tight">Cerca un luogo e clicca per aggiungerlo istantaneamente alla lista dei <b>Verificati</b>.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* LUOGHI RILEVATI DALLE PRENOTAZIONI */}
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="p-8 bg-blue-50/50 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg"><Sparkles className="w-5 h-5" /></div>
                            <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tighter">Rilevati</CardTitle>
                                <CardDescription className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Dalle prenotazioni recenti</CardDescription>
                            </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 font-black border-none px-3 py-1">{discoveredPlaces.length}</Badge>
                    </div>
                </CardHeader>
                <ScrollArea className="h-[400px]">
                    <CardContent className="p-6 space-y-3">
                        {discoveredPlaces.length > 0 ? discoveredPlaces.map((place, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group animate-in slide-in-from-bottom-2">
                                <div className="overflow-hidden mr-4">
                                    <p className="font-black text-slate-900 text-xs truncate leading-tight">{place.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5 uppercase tracking-widest">{place.fullAddress}</p>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    <Button 
                                        size="icon" 
                                        onClick={() => addPlace('verified', place)}
                                        className="h-8 w-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                                        title="Verifica Luogo"
                                    >
                                        <Check className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        size="icon" 
                                        onClick={() => addPlace('forbidden', place)}
                                        className="h-8 w-8 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-sm"
                                        title="Blocca Luogo"
                                    >
                                        <ShieldAlert className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center space-y-3 opacity-30">
                                <Search className="w-10 h-10 mx-auto text-slate-300" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Nessun nuovo luogo trovato</p>
                            </div>
                        )}
                    </CardContent>
                </ScrollArea>
            </Card>
        </div>

        {/* COLONNA DESTRA: LISTE REGISTRATE */}
        <div className="lg:col-span-7 space-y-8">
            <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-2 w-fit mx-auto lg:mx-0">
                <Button 
                    variant="ghost" 
                    onClick={() => setActiveTab('verified')}
                    className={cn("rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest transition-all", activeTab === 'verified' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
                >
                    <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verificati ({localSettings.verifiedAddresses.length})
                </Button>
                <Button 
                    variant="ghost" 
                    onClick={() => setActiveTab('forbidden')}
                    className={cn("rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest transition-all", activeTab === 'forbidden' ? "bg-white text-red-600 shadow-sm" : "text-slate-400")}
                >
                    <ShieldAlert className="w-3.5 h-3.5 mr-2" /> Proibiti ({localSettings.forbiddenAddresses.length})
                </Button>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden min-h-[600px] flex flex-col">
                <CardHeader className={cn("p-8 border-b", activeTab === 'verified' ? "bg-emerald-50/30" : "bg-red-50/30")}>
                    <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-2xl text-white shadow-lg", activeTab === 'verified' ? "bg-emerald-500" : "bg-red-500")}>
                            {activeTab === 'verified' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                        </div>
                        <div className="text-left">
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter">
                                {activeTab === 'verified' ? 'Indirizzi Verificati' : 'Zone Proibite'}
                            </CardTitle>
                            <CardDescription className="font-medium text-slate-500">
                                {activeTab === 'verified' ? 'Luoghi sicuri suggeriti agli utenti con scudetto.' : 'Zone dove il servizio è sospeso o non autorizzato.'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <CardContent className="p-8 space-y-4">
                        {(activeTab === 'verified' ? localSettings.verifiedAddresses : localSettings.forbiddenAddresses).length > 0 ? (
                            (activeTab === 'verified' ? localSettings.verifiedAddresses : localSettings.forbiddenAddresses).map((place: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all group text-left">
                                    <div className="overflow-hidden flex items-center gap-4">
                                        <div className={cn("p-3 rounded-xl", activeTab === 'verified' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-slate-900 text-sm truncate">{place.name}</p>
                                                <Badge className={cn("text-[7px] font-black uppercase tracking-widest h-3.5 px-1.5", activeTab === 'verified' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                                    {activeTab === 'verified' ? 'OK' : 'OFF'}
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-wider mt-0.5">{place.fullAddress}</p>
                                            {activeTab === 'forbidden' && place.reason && (
                                                <p className="text-[9px] text-red-500 font-bold italic mt-1 flex items-center gap-1">
                                                    <Navigation className="w-2.5 h-2.5" /> "{place.reason}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => openEditModal(activeTab as 'verified' | 'forbidden', i)} 
                                            className="text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all h-12 w-12"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => removePlace(activeTab as 'verified' | 'forbidden', i)} 
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all h-12 w-12"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-32 text-center space-y-4 opacity-30">
                                <Globe className="w-16 h-16 mx-auto text-slate-200" />
                                <p className="font-black uppercase tracking-widest text-slate-400">Nessun dato registrato</p>
                            </div>
                        )}
                    </CardContent>
                </ScrollArea>
            </Card>
        </div>
      </div>

      {/* DIALOGO MODIFICA LUOGO */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-w-lg">
          <DialogHeader className="p-8 bg-slate-50 border-b">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
                <Edit2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Modifica Luogo</DialogTitle>
                <DialogDescription className="font-medium text-slate-500">Aggiorna le informazioni o cambia lo stato del punto.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-8 space-y-6">
            <div className="space-y-4 text-left">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nome Visualizzato</Label>
                <Input 
                  value={editingPlace?.name || ''} 
                  onChange={e => setEditingPlace({...editingPlace, name: e.target.value})} 
                  className="h-12 rounded-xl bg-slate-50 border-transparent font-bold focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Indirizzo Completo</Label>
                <Input 
                  value={editingPlace?.fullAddress || ''} 
                  onChange={e => setEditingPlace({...editingPlace, fullAddress: e.target.value})} 
                  className="h-12 rounded-xl bg-slate-50 border-transparent font-bold focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Stato Operativo</Label>
                <Select 
                  value={editingPlace?.type} 
                  onValueChange={v => setEditingPlace({...editingPlace, type: v})}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-transparent font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="verified" className="font-bold text-emerald-600">Verificato (Suggerito)</SelectItem>
                    <SelectItem value="forbidden" className="font-bold text-red-600">Proibito (Bloccato)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t flex flex-col sm:flex-row gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setIsEditModalOpen(false)} 
              className="rounded-xl h-12 font-bold text-slate-400 px-6"
            >
              Annulla
            </Button>
            <Button 
              onClick={saveEditedPlace} 
              className="rounded-xl h-12 px-10 font-black uppercase tracking-widest text-[10px] bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200"
            >
              <Save className="w-4 h-4 mr-2" /> Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationAutocomplete({ onSelect }: { onSelect: (place: any) => void }) {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const debounceTimer = useRef<any>(null);

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) { setSuggestions([]); return; }
        setIsLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=it&limit=5`);
            const data = await res.json();
            const formatted = data.map((item: any) => ({
                name: item.display_name.split(',')[0],
                fullAddress: item.display_name,
                coords: { lat: parseFloat(item.lat), lon: parseFloat(item.lon) }
            }));
            setSuggestions(formatted);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const handleInputChange = (val: string) => {
        setInputValue(val);
        setIsMenuOpen(true);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchSuggestions(val), 500);
    };

    return (
        <div className="space-y-2 relative text-left">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">Cerca Indirizzo</Label>
            <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <Input 
                    placeholder="Es: Via Milano 10, Monza..." 
                    className="h-14 pl-14 pr-12 rounded-2xl bg-slate-50 border-transparent font-bold focus:bg-white transition-all shadow-inner" 
                    value={inputValue} 
                    onChange={e => handleInputChange(e.target.value)}
                    onFocus={() => setIsMenuOpen(true)}
                    onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)}
                />
                {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /></div>}
                
                {isMenuOpen && suggestions.length > 0 && (
                    <Card className="absolute top-full left-0 right-0 mt-3 z-[100] rounded-[2rem] shadow-2xl border-none overflow-hidden animate-in fade-in slide-in-from-top-4 bg-white ring-1 ring-slate-100">
                        {suggestions.map((s: any, i: number) => (
                            <button 
                                key={i} 
                                type="button"
                                className="w-full text-left p-5 hover:bg-blue-50 transition-colors flex items-center gap-4 border-b border-slate-50 last:border-none"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelect(s);
                                    setInputValue('');
                                    setSuggestions([]);
                                    setIsMenuOpen(false);
                                }}
                            >
                                <div className="p-2.5 bg-slate-100 rounded-xl shrink-0 text-slate-400">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[11px] font-black text-slate-900 leading-tight mb-0.5">{s.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">{s.fullAddress}</p>
                                </div>
                            </button>
                        ))}
                    </Card>
                )}
            </div>
        </div>
    );
}