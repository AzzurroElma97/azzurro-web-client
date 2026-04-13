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
import { socketService } from '@/services/socket-service';
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

export default function AdminPlacesPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'verified' | 'forbidden' | 'discovered'>('verified');
  const [discoveredPlaces, setDiscoveredPlaces] = useState<any[]>([]);
  
  // Edit state
  const [editingPlace, setEditingPlace] = useState<any>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editOriginalType, setEditOriginalType] = useState<'verified' | 'forbidden' | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdminAuthenticated') === 'true';
    if (!isAdmin) {
      router.push('/admin');
      return;
    }

    fetchSettings();
  }, []);

  const fetchSettings = () => {
    setIsLoading(true);
    socketService.emit('client_request', { action: 'GET_ALL_DATA_FOR_BOOKINGS' }, (res: any) => {
      setIsLoading(false);
      if (res && res.success) {
        const settings = res.settings || {};
        const verified = settings.verifiedAddresses ? (typeof settings.verifiedAddresses === 'string' ? JSON.parse(settings.verifiedAddresses) : settings.verifiedAddresses) : [];
        const forbidden = settings.forbiddenAddresses ? (typeof settings.forbiddenAddresses === 'string' ? JSON.parse(settings.forbiddenAddresses) : settings.forbiddenAddresses) : [];
        
        setLocalSettings({
          verifiedAddresses: verified,
          forbiddenAddresses: forbidden
        });

        // Simula scoperta dai dati reali (In un sistema full socket, potremmo mappare i rides reali qui)
        if (res.bookings) {
            // Estrai luoghi unici
            const seen = new Set([...verified, ...forbidden].map(p => p.fullAddress.toLowerCase()));
            const discovered: any[] = [];
            res.bookings.slice(0, 50).forEach((ride: any) => {
                const locs = [ride.partenza_indirizzo, ride.destinazione_indirizzo];
                locs.forEach(addr => {
                    if (addr && !seen.has(addr.toLowerCase())) {
                        discovered.push({ name: addr.split(',')[0], fullAddress: addr });
                        seen.add(addr.toLowerCase());
                    }
                });
            });
            setDiscoveredPlaces(discovered.slice(0, 10));
        }
      }
    });
  };

  const handleSave = (updated: any) => {
    // Salva tramite socket
    socketService.emit('client_request', { 
        action: 'UPDATE_APP_SETTING', 
        payload: { key: 'verifiedAddresses', value: JSON.stringify(updated.verifiedAddresses) } 
    });
    socketService.emit('client_request', { 
        action: 'UPDATE_APP_SETTING', 
        payload: { key: 'forbiddenAddresses', value: JSON.stringify(updated.forbiddenAddresses) } 
    });
    
    toast({ title: "Modifiche salvate", description: "Le zone geografiche sono state aggiornate sul Master." });
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

    // Aggiungi alla destinazione
    const { type, ...cleanPlace } = editingPlace;
    updatedSettings[targetListKey] = [...updatedSettings[targetListKey], cleanPlace];

    setLocalSettings(updatedSettings);
    handleSave(updatedSettings);
    setIsEditModalOpen(false);
  };

  if (isLoading || !localSettings) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500 pb-20">
      <div className="mb-10 text-left">
        <Link href="/admin" className="text-xs font-black text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-4 uppercase tracking-widest transition-colors">
            <ArrowLeft className="w-3 h-3" /> Dashboard
        </Link>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Geografia Titanium</h1>
        <p className="text-slate-500 font-medium mt-2">Configura indirizzi verificati e zone proibite (Master Blackview).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-8">
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8 pb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><Plus className="w-5 h-5" /></div>
                        <CardTitle className="text-xl font-black uppercase tracking-tighter">Nuovo Punto</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400 font-medium text-[10px] uppercase tracking-widest">Sincronizzato col server Master</CardDescription>
                </CardHeader>
                <CardContent className="p-8 -mt-6">
                    <div className="bg-white rounded-[2rem] shadow-xl p-6 border border-slate-100 space-y-6">
                        <LocationAutocomplete 
                            onSelect={(place) => {
                                addPlace('verified', place);
                                toast({ title: "Luogo aggiunto", description: `${place.name} salvato.` });
                            }} 
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="p-8 bg-blue-50/50 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg"><Sparkles className="w-5 h-5" /></div>
                            <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tighter">Rilevati</CardTitle>
                                <CardDescription className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Da Registro Corse</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <ScrollArea className="h-[300px]">
                    <CardContent className="p-6 space-y-3">
                        {discoveredPlaces.length > 0 ? discoveredPlaces.map((place, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group animate-in slide-in-from-bottom-2">
                                <div className="overflow-hidden mr-4">
                                    <p className="font-black text-slate-900 text-[10px] truncate leading-tight uppercase">{place.name}</p>
                                    <p className="text-[8px] text-slate-400 font-bold truncate mt-0.5 uppercase tracking-widest">{place.fullAddress}</p>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    <Button size="icon" onClick={() => addPlace('verified', place)} className="h-8 w-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"><Check className="w-4 h-4" /></Button>
                                    <Button size="icon" onClick={() => addPlace('forbidden', place)} className="h-8 w-8 rounded-xl bg-red-500 hover:bg-red-600 text-white"><ShieldAlert className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center py-10 text-[9px] font-black uppercase text-slate-300">Nessun nuovo luogo dal registro</p>
                        )}
                    </CardContent>
                </ScrollArea>
            </Card>
        </div>

        <div className="lg:col-span-7 space-y-8">
            <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-2 w-fit">
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

            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden min-h-[500px] flex flex-col">
                <CardHeader className={cn("p-8 border-b", activeTab === 'verified' ? "bg-emerald-50/30" : "bg-red-50/30")}>
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">
                        {activeTab === 'verified' ? 'Indirizzi Verificati' : 'Zone Proibite'}
                    </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <CardContent className="p-8 space-y-4">
                        {localSettings[activeTab === 'verified' ? 'verifiedAddresses' : 'forbiddenAddresses'].map((place: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 group text-left">
                                <div className="overflow-hidden flex items-center gap-4">
                                    <MapPin className={cn("w-5 h-5", activeTab === 'verified' ? "text-emerald-500" : "text-red-500")} />
                                    <div className="overflow-hidden">
                                        <p className="font-black text-slate-900 text-sm truncate">{place.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-widest mt-0.5">{place.fullAddress}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEditModal(activeTab as 'verified' | 'forbidden', i)} className="text-slate-300 hover:text-blue-600 rounded-2xl h-10 w-10"><Edit2 className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => removePlace(activeTab as 'verified' | 'forbidden', i)} className="text-slate-300 hover:text-red-500 rounded-2xl h-10 w-10"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </ScrollArea>
            </Card>
        </div>
      </div>

      {/* DIALOGO MODIFICA */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-8 max-w-lg">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Modifica Luogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nome Visualizzato</Label>
              <Input value={editingPlace?.name || ''} onChange={e => setEditingPlace({...editingPlace, name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-transparent font-bold" />
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Indirizzo Completo</Label>
              <Input value={editingPlace?.fullAddress || ''} onChange={e => setEditingPlace({...editingPlace, fullAddress: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-transparent font-bold" />
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Stato</Label>
              <Select value={editingPlace?.type} onValueChange={v => setEditingPlace({...editingPlace, type: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="verified">Verificato</SelectItem>
                  <SelectItem value="forbidden">Proibito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-8 flex gap-3">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Annulla</Button>
            <Button onClick={saveEditedPlace} className="bg-slate-900 text-white rounded-xl px-10 font-bold">Salva</Button>
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
                <Input placeholder="Es: Via Milano 10, Monza..." className="h-14 pl-14 pr-12 rounded-2xl bg-slate-50 border-transparent font-bold focus:bg-white transition-all shadow-inner" value={inputValue} onChange={e => handleInputChange(e.target.value)} onFocus={() => setIsMenuOpen(true)} onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)} />
                {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /></div>}
                
                {isMenuOpen && suggestions.length > 0 && (
                    <Card className="absolute top-full left-0 right-0 mt-3 z-[100] rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white ring-1 ring-slate-100">
                        {suggestions.map((s: any, i: number) => (
                            <button key={i} type="button" className="w-full text-left p-5 hover:bg-blue-50 transition-colors flex items-center gap-4 border-b border-slate-50 last:border-none" onMouseDown={(e) => { e.preventDefault(); onSelect(s); setInputValue(''); setSuggestions([]); setIsMenuOpen(false); }}>
                                <div className="p-2.5 bg-slate-100 rounded-xl shrink-0 text-slate-400"><MapPin className="w-4 h-4" /></div>
                                <div className="overflow-hidden"><p className="text-[11px] font-black text-slate-900 leading-tight mb-0.5">{s.name}</p><p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">{s.fullAddress}</p></div>
                            </button>
                        ))}
                    </Card>
                )}
            </div>
        </div>
    );
}