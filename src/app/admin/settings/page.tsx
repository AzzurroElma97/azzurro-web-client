'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Banknote, Landmark, Power, Save, ArrowLeft, MessageSquareText, Loader2, Car, Percent, Plane, Users, Briefcase, Palette, Upload, X, Globe
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { socketService } from '@/services/socket-service';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

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
      socketService.emit('client_request', { action: 'GET_SETTINGS' }, (res: any) => {
        if (res && res.success) {
           setLocalSettings(res.payload || res.settings);
           setSettingsLoading(false);
        } else {
           toast({ 
             title: "Errore caricamento", 
             description: res?.message || "Il Master non ha risposto correttamente.",
             variant: "destructive" 
           });
        }
      }, 15000); // 15s timeout
    }
  }, [isAuthenticated, toast]);

  const handleSave = async () => {
    if (!localSettings) return;

    socketService.emit('client_request', { 
        action: 'UPDATE_SETTINGS', 
        payload: localSettings 
    }, (res: any) => {
        if (res && res.success) {
            toast({ title: "Database Sincronizzato!", description: "Le tariffe sono state salvate permanentemente sul Blackview." });
        } else {
            toast({ title: "Errore Salvataggio", description: "Il Master non ha confermato la scrittura.", variant: "destructive" });
        }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'heroImageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLocalSettings({ ...localSettings, [field]: base64 });
    };
    reader.readAsDataURL(file);
  };

  const toggleService = (serviceId: string, isActive: boolean) => {
    const deactivated = localSettings.deactivatedServices || [];
    const newList = isActive ? deactivated.filter((s: string) => s !== serviceId) : [...deactivated, serviceId];
    setLocalSettings({ ...localSettings, deactivatedServices: newList });
  };

  const updateServiceMessage = (serviceId: string, message: string) => {
    const messages = { ...(localSettings.serviceMessages || {}) };
    messages[serviceId] = message;
    setLocalSettings({ ...localSettings, serviceMessages: messages });
  };

  if (settingsLoading || !localSettings) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-bold text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-2"><ArrowLeft className="w-4 h-4" /> Torna alla dashboard</Link>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Sistema & Tariffe Default</h1>
            <p className="text-slate-500 font-medium">Configura i parametri globali usati se il driver non li personalizza.</p>
          </div>
          <Button onClick={handleSave} className="rounded-xl h-12 px-8 font-black bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200"><Save className="w-4 h-4 mr-2" /> Salva modifiche</Button>
        </div>

        <Tabs defaultValue="tariffe" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-12 flex-wrap">
              <TabsTrigger value="tariffe" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Tariffe</TabsTrigger>
              <TabsTrigger value="extra" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Extra</TabsTrigger>
              <TabsTrigger value="branding" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Immagini</TabsTrigger>
              <TabsTrigger value="servizi" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Stato Servizi</TabsTrigger>
              <TabsTrigger value="info" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Contatti</TabsTrigger>
          </TabsList>

          <TabsContent value="tariffe" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="rounded-2xl border-none shadow-sm">
                      <CardHeader className="border-b bg-slate-50/50"><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Banknote className="w-4 h-4 text-emerald-600" /> Basi & Minimi</CardTitle></CardHeader>
                      <CardContent className="p-6 space-y-4">
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Quota Fissa Base (€)</Label><Input type="number" step="0.5" value={localSettings.tariffa_base_fissa} onChange={e => setLocalSettings({...localSettings, tariffa_base_fissa: e.target.value})} className="rounded-xl font-bold" /></div>
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Minimo Aeroporto (€)</Label><div className="relative"><Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /><Input type="number" step="1" value={localSettings.tariffa_minima_aeroporto} onChange={e => setLocalSettings({...localSettings, tariffa_minima_aeroporto: e.target.value})} className="rounded-xl font-bold pl-10" /></div></div>
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Supplemento Urgenza (€)</Label><Input type="number" step="1" value={localSettings.supplemento_urgenza} onChange={e => setLocalSettings({...localSettings, supplemento_urgenza: e.target.value})} className="rounded-xl font-bold" /></div>
                      </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-none shadow-sm">
                      <CardHeader className="border-b bg-slate-50/50"><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Car className="w-4 h-4 text-blue-600" /> Costi Chilometrici</CardTitle></CardHeader>
                      <CardContent className="p-6 space-y-4">
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">€ / KM Diurno</Label><Input type="number" step="0.01" value={localSettings.tariffa_km_diurna} onChange={e => setLocalSettings({...localSettings, tariffa_km_diurna: e.target.value})} className="rounded-xl font-bold" /></div>
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">€ / KM Notturno</Label><Input type="number" step="0.01" value={localSettings.tariffa_km_notturna} onChange={e => setLocalSettings({...localSettings, tariffa_km_notturna: e.target.value})} className="rounded-xl font-bold" /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Inizio Notte</Label><Input type="time" value={localSettings.nightStart || '22:00'} onChange={e => setLocalSettings({...localSettings, nightStart: e.target.value})} className="rounded-xl font-bold" /></div>
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Fine Notte</Label><Input type="time" value={localSettings.nightEnd || '06:00'} onChange={e => setLocalSettings({...localSettings, nightEnd: e.target.value})} className="rounded-xl font-bold" /></div>
                          </div>
                      </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-none shadow-sm">
                      <CardHeader className="border-b bg-slate-50/50"><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Percent className="w-4 h-4 text-amber-600" /> Ricarichi (%)</CardTitle></CardHeader>
                      <CardContent className="p-6 space-y-4">
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Ricarico Eventi (%)</Label><div className="relative"><Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /><Input type="number" step="1" value={localSettings.supplemento_eventi_perc} onChange={e => setLocalSettings({...localSettings, supplemento_eventi_perc: e.target.value})} className="rounded-xl font-bold" /></div></div>
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Persona Extra Std (%)</Label><div className="relative"><Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /><Input type="number" step="1" value={localSettings.extra_pax_std_perc} onChange={e => setLocalSettings({...localSettings, extra_pax_std_perc: e.target.value})} className="rounded-xl font-bold" /></div></div>
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Supplemento Weekend (€)</Label><Input type="number" step="1" value={localSettings.supplemento_weekend} onChange={e => setLocalSettings({...localSettings, supplemento_weekend: e.target.value})} className="rounded-xl font-bold" /></div>
                      </CardContent>
                  </Card>
              </div>
          </TabsContent>

          <TabsContent value="extra" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="rounded-2xl border-none shadow-sm">
                      <CardHeader className="border-b bg-slate-50/50"><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4 text-indigo-600" /> Passeggeri & Bagagli</CardTitle></CardHeader>
                      <CardContent className="p-6 space-y-4">
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Extra Pax Aeroporto (€)</Label><Input type="number" step="1" value={localSettings.extra_pax_aero} onChange={e => setLocalSettings({...localSettings, extra_pax_aero: e.target.value})} className="rounded-xl font-bold" /></div>
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Supplemento Bagaglio (€)</Label><Input type="number" step="0.5" value={localSettings.supplemento_bagaglio} onChange={e => setLocalSettings({...localSettings, supplemento_bagaglio: e.target.value})} className="rounded-xl font-bold" /></div>
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Supplemento Tappa (€)</Label><Input type="number" step="0.5" value={localSettings.supplemento_tappa} onChange={e => setLocalSettings({...localSettings, supplemento_tappa: e.target.value})} className="rounded-xl font-bold" /></div>
                      </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-none shadow-sm">
                      <CardHeader className="border-b bg-slate-50/50"><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Zap className="w-4 h-4 text-blue-600" /> Lead Time (Preavviso)</CardTitle></CardHeader>
                      <CardContent className="p-6 space-y-4">
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Aeroporti (Ore)</Label><Input type="number" value={localSettings.lead_time_aero_ore} onChange={e => setLocalSettings({...localSettings, lead_time_aero_ore: e.target.value})} className="rounded-xl font-bold" /></div>
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Standard / Eventi (Ore)</Label><Input type="number" value={localSettings.lead_time_std_ore} onChange={e => setLocalSettings({...localSettings, lead_time_std_ore: e.target.value})} className="rounded-xl font-bold" /></div>
                          <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Urgenze (Minuti)</Label><Input type="number" value={localSettings.lead_time_urgenza_min} onChange={e => setLocalSettings({...localSettings, lead_time_urgenza_min: e.target.value})} className="rounded-xl font-bold" /></div>
                      </CardContent>
                  </Card>
              </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b"><CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2"><Palette className="w-5 h-5 text-blue-600" /> Aspetto & Branding</CardTitle></CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Logo Personalizzato</Label>
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                <div className="flex-1 w-full space-y-2">
                                    <Input placeholder="Inserisci URL o carica file..." value={localSettings.logoUrl || ''} onChange={e => setLocalSettings({...localSettings, logoUrl: e.target.value})} className="rounded-xl h-12 font-bold" />
                                    <div className="flex gap-2">
                                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
                                        <Button variant="outline" onClick={() => logoInputRef.current?.click()} className="flex-1 rounded-xl h-10 font-bold border-dashed border-2"><Upload className="w-4 h-4 mr-2" /> Carica dal dispositivo</Button>
                                        {localSettings.logoUrl && <Button variant="ghost" onClick={() => setLocalSettings({...localSettings, logoUrl: ''})} className="rounded-xl h-10 text-red-500 hover:text-red-600"><X className="w-4 h-4" /></Button>}
                                    </div>
                                </div>
                                {localSettings.logoUrl && <div className="h-20 w-40 relative border rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2"><img src={localSettings.logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain" /></div>}
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Sfondo Home (Hero)</Label>
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                <div className="flex-1 w-full space-y-2">
                                    <Input placeholder="Inserisci URL o carica file..." value={localSettings.heroImageUrl || ''} onChange={e => setLocalSettings({...localSettings, heroImageUrl: e.target.value})} className="rounded-xl h-12 font-bold" />
                                    <div className="flex gap-2">
                                        <input type="file" ref={heroInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'heroImageUrl')} />
                                        <Button variant="outline" onClick={() => heroInputRef.current?.click()} className="flex-1 rounded-xl h-10 font-bold border-dashed border-2"><Upload className="w-4 h-4 mr-2" /> Carica dal dispositivo</Button>
                                        {localSettings.heroImageUrl && <Button variant="ghost" onClick={() => setLocalSettings({...localSettings, heroImageUrl: ''})} className="rounded-xl h-10 text-red-500 hover:text-red-600"><X className="w-4 h-4" /></Button>}
                                    </div>
                                </div>
                                {localSettings.heroImageUrl && <div className="h-20 w-40 relative border rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center"><img src={localSettings.heroImageUrl} alt="Hero Preview" className="h-full w-full object-cover" /></div>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
              </div>
          </TabsContent>

          <TabsContent value="servizi" className="space-y-6">
              <Card className="rounded-2xl border-none shadow-sm bg-blue-50/50 overflow-hidden">
                  <CardHeader className="p-8">
                      <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-blue-700"><Power className="w-6 h-6" /> Disponibilità Globale Servizi</CardTitle>
                      <CardDescription className="text-blue-600/70 font-medium">Disattiva un servizio per tutta la piattaforma o imposta un avviso.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {['STANDARD', 'AIRPORT', 'EVENT', 'URGENT'].map((sId) => (
                            <ServiceStatusToggle key={sId} label={sId === 'EVENT' ? 'Serata / Disco' : sId.charAt(0) + sId.slice(1).toLowerCase()} isActive={!localSettings.deactivatedServices?.includes(sId)} onToggle={(checked) => toggleService(sId, checked)} message={localSettings.serviceMessages?.[sId] || ''} onMessageChange={(msg) => updateServiceMessage(sId, msg)} />
                          ))}
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b"><CardTitle className="text-lg font-black uppercase tracking-widest">Dati di Contatto Sistema</CardTitle></CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Numero WhatsApp Assistenza</Label><Input value={localSettings.admin_whatsapp} onChange={e => setLocalSettings({...localSettings, admin_whatsapp: e.target.value})} className="rounded-xl h-12 font-bold" /></div>
                        <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Sede Operativa (Base)</Label><Input value={localSettings.sede_base} onChange={e => setLocalSettings({...localSettings, sede_base: e.target.value})} className="rounded-xl h-12 font-bold" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Latitudine Sede</Label><Input value={localSettings.sede_lat} onChange={e => setLocalSettings({...localSettings, sede_lat: e.target.value})} className="rounded-xl h-12 font-bold" /></div>
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">Longitudine Sede</Label><Input value={localSettings.sede_lon} onChange={e => setLocalSettings({...localSettings, sede_lon: e.target.value})} className="rounded-xl h-12 font-bold" /></div>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Link Sito Pubblico (Condivisione)</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input value={localSettings.public_site_url || 'https://azzurro-community.vercel.app'} onChange={e => setLocalSettings({...localSettings, public_site_url: e.target.value})} className="rounded-xl h-12 font-bold pl-10" placeholder="https://..." />
                            </div>
                        </div>
                    </CardContent>
                </Card>
              </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

function ServiceStatusToggle({ label, isActive, onToggle, message, onMessageChange }: { label: string, isActive: boolean, onToggle: (checked: boolean) => void, message: string, onMessageChange: (msg: string) => void }) {
    return (
        <Card className={cn("p-6 rounded-2xl transition-all border", isActive ? "bg-white border-slate-100 shadow-sm" : "bg-slate-50 border-slate-200")}>
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", isActive ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400")}><Car className="w-4 h-4" /></div>
                        <div>
                            <span className="font-bold text-base text-slate-900 block leading-tight">{label}</span>
                            <span className={cn("text-[9px] font-black uppercase tracking-widest", isActive ? "text-emerald-500" : "text-red-500")}>{isActive ? 'Servizio Attivo' : 'Servizio Sospeso'}</span>
                        </div>
                    </div>
                    <Switch checked={isActive} onCheckedChange={onToggle} />
                </div>
                <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-2"><MessageSquareText className="w-3.5 h-3.5 text-slate-400" /><Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Messaggio Utente</Label></div>
                    <Input placeholder="Es: Disponibile dopo le 20:00..." value={message} onChange={(e) => onMessageChange(e.target.value)} className="rounded-xl text-xs h-10 bg-white" />
                </div>
            </div>
        </Card>
    );
}
