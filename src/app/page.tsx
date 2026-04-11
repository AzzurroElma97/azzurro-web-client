'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils";
import { Label } from '@/components/ui/label';
import {
    MapPin, Plane, Car, MessageCircle, Loader2, CheckCircle2, Calendar as CalendarIcon, Music, AlertTriangle, Info, Clock, Users, Briefcase, ChevronRight, ArrowLeft, TriangleAlert, ChevronLeft, ShieldCheck, PlaneTakeoff, PlaneLanding, CalendarDays, MessagesSquare, History, Plus, X, Globe, Download, Zap, ShieldAlert
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, startOfDay, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import Image from 'next/image';
import { socketService } from '@/services/socket-service';
import { RideSummaryCard } from '@/components/common/ride-summary-card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toPng } from 'html-to-image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';

// --- TYPES & CONSTANTS ---
export enum ServiceType {
    AIRPORT = 'AIRPORT',
    EVENT = 'EVENT',
    STANDARD = 'STANDARD',
    URGENT = 'URGENT',
}

export const SERVICE_INFO = {
  [ServiceType.AIRPORT]: { label: 'Aeroporto', description: 'BGY, LIN, MXP. Puntuale con monitoraggio voli.', icon: <Plane className="w-10 h-10" />, minLeadTime: 6 },
  [ServiceType.EVENT]: { label: 'Serata / Disco', description: 'Discoteche, concerti o cene. Viaggia sicuro.', icon: <Music className="w-10 h-10" />, minLeadTime: 4 },
  [ServiceType.STANDARD]: { label: 'Standard', description: 'Spostamenti quotidiani in Brianza e Lecco.', icon: <Car className="w-10 h-10" />, minLeadTime: 4 },
  [ServiceType.URGENT]: { label: 'Urgente', description: 'Hai fretta? Priorità assoluta per te.', icon: <AlertTriangle className="w-10 h-10" />, minLeadTime: 0.25, maxLeadTime: 3.75 },
};

const AIRPORTS = [
    { name: 'Malpensa Terminal 1', address: 'Aeroporto Malpensa Terminal 1, Ferno (VA)', coords: { lat: 45.6301, lon: 8.7231 } },
    { name: 'Malpensa Terminal 2', address: 'Aeroporto Malpensa Terminal 2, Somma Lombardo (VA)', coords: { lat: 45.6484, lon: 8.7114 } },
    { name: 'Milano Linate', address: 'Aeroporto Milano Linate, Segrate (MI)', coords: { lat: 45.4451, lon: 9.2767 } },
    { name: 'Orio al Serio (BGY)', address: 'Aeroporto Orio al Serio, Bergamo (BG)', coords: { lat: 45.6662, lon: 9.7041 } },
];

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
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

async function getDrivingDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
            return (data.routes[0].distance / 1000) * 1.05; // 5% margine di sicurezza traffico
        }
    } catch(e) {
        console.error('OSRM route failed, fallback to air distance', e);
    }
    return getDistanceKm(lat1, lon1, lat2, lon2);
}

function getSegmentStats(c1: any, c2: any) {
    if (!c1 || !c2) return { km: '?', min: '?' };
    const km = getDistanceKm(c1.lat, c1.lon, c2.lat, c2.lon);
    const min = Math.round(km * 1.5); 
    return { km: km.toFixed(1), min: String(min) };
}

export default function HomePage() {
  const { toast } = useToast();
  const [socketConnected, setSocketConnected] = useState(false);
  const [appSettings, setAppSettings] = useState<any>({});
  
  useEffect(() => {
    socketService.on('master_response', (res: any) => {
       if (res.action === 'GET_SETTINGS') setAppSettings(res.payload);
    });
    return () => {
      socketService.off('master_response');
    };
  }, []);
  const bookingRef = useRef<HTMLDivElement>(null);
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [airportDirection, setAirportDirection] = useState<'TO' | 'FROM'>('TO');
  const [selectedAirportIndex, setSelectedAirportIndex] = useState(0);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    instagram: '',
    origin: '', 
    originCoords: null as {lat: number, lon: number} | null,
    destination: '', 
    destinationCoords: null as {lat: number, lon: number} | null,
    intermediateStops: [] as {address: string, coords: {lat: number, lon: number} | null}[],
    time: '', 
    passengers: 1, 
    luggage: 0, 
    flightNumber: '', 
    venueName: '', 
    notes: '' 
  });

  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [isFallbackDrivers, setIsFallbackDrivers] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [finalCode, setFinalCode] = useState('');
  const [lastRideData, setLastRideData] = useState<any>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const isDayManuallyClosed = (date: Date) => {
    return false;
  };

  const hasDriversForDay = (date: Date) => {
    return true;
  };

  const handleLookup = async () => {
    if (!lookupCode.trim()) return;
    setIsSearching(true);
    setLookupResult(null);

    // Timeout di sicurezza: se il server non risponde entro 10s, mostriamo errore
    const timeoutId = setTimeout(() => {
      setIsSearching(false);
      setLookupResult('NOT_FOUND');
    }, 10000);

    socketService.emit(
      'client_request',
      { action: 'TRACK_RIDE', payload: { ticket_id: lookupCode.trim().toUpperCase() } },
      (res: any) => {
        clearTimeout(timeoutId);
        setIsSearching(false);
        if (res && res.success && res.ride) {
          // Mappa i campi backend al formato visual
          const r = res.ride;
          setLookupResult({
            bookingCode: r.ticket_id || r.bookingCode,
            serviceType: r.tipo_servizio || r.serviceType || 'Standard',
            passengerName: r.cliente_nome || r.passengerName || 'N/D',
            passengerPhone: r.cliente_telefono || r.passengerPhone || '',
            date: r.data_partenza || r.date || '',
            time: r.ora_partenza || r.time || '',
            origin: r.partenza_obj?.address || r.origin || '',
            destination: r.destinazione_obj?.address || r.destination || '',
            price: r.preventivo_accettato || r.price || 0,
            passengers: r.passeggeri || r.passengers || 1,
            driverName: r.driverName || 'Autista Azzurro',
            driverVehicle: r.driverVehicle || 'Auto Flotta',
            intermediateStops: r.tappe_intermedie ? (typeof r.tappe_intermedie === 'string' ? JSON.parse(r.tappe_intermedie) : r.tappe_intermedie) : [],
          });
        } else {
          setLookupResult('NOT_FOUND');
        }
      }
    );
  };

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date);
    setBookingStep(1); 
    setIsCalendarOpen(false); 
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSelectService = (type: ServiceType) => {
    const leadTimeHours = SERVICE_INFO[type].minLeadTime;
    const earliest = new Date(Date.now() + (leadTimeHours * 60 * 60 * 1000));
    
    if (!selectedDate || selectedDate < startOfDay(earliest)) {
        setSelectedDate(earliest);
        if (!formData.time) {
            setFormData(prev => ({ ...prev, time: format(earliest, 'HH:mm') }));
        }
    }
    
    if (type === ServiceType.AIRPORT && !formData.destination && !formData.origin) {
        setFormData(prev => ({
            ...prev,
            destination: airportDirection === 'TO' ? AIRPORTS[0].address : prev.destination,
            destinationCoords: airportDirection === 'TO' ? AIRPORTS[0].coords : prev.destinationCoords,
            origin: airportDirection === 'FROM' ? AIRPORTS[0].address : prev.origin,
            originCoords: airportDirection === 'FROM' ? AIRPORTS[0].coords : prev.originCoords,
        }));
    }
    
    setSelectedService(type);
    setBookingStep(2);
  };

  const calculatePrice = async (driver: any) => {
    if (!appSettings) return "0";
    
    const basePriceFloor = (driver.basePrice !== undefined && driver.basePrice !== null && driver.basePrice !== '') ? parseFloat(driver.basePrice) : (appSettings.basePrice || 15.00);
    const kmPrice = (driver.kmPrice !== undefined && driver.kmPrice !== null && driver.kmPrice !== '') ? parseFloat(driver.kmPrice) : (appSettings.kmPrice || 1.20);
    const nightKmPrice = (driver.nightKmPrice !== undefined && driver.nightKmPrice !== null && driver.nightKmPrice !== '') ? parseFloat(driver.nightKmPrice) : (appSettings.nightKmPrice || 1.60);
    const airportMinFloor = (driver.airportMinFare !== undefined && driver.airportMinFare !== null && driver.airportMinFare !== '') ? parseFloat(driver.airportMinFare) : (appSettings.airportMinFare || 45.00);
    const urgentFee = (driver.urgentFee !== undefined && driver.urgentFee !== null && driver.urgentFee !== '') ? parseFloat(driver.urgentFee) : (appSettings.urgentFee || 20.00);
    const eventSurchargePercent = (driver.eventSurchargePercent !== undefined && driver.eventSurchargePercent !== null && driver.eventSurchargePercent !== '') ? parseFloat(driver.eventSurchargePercent) : (appSettings.eventSurchargePercent || 25);
    const extraPaxFixed = (driver.extraPassengerFixed !== undefined && driver.extraPassengerFixed !== null && driver.extraPassengerFixed !== '') ? parseFloat(driver.extraPassengerFixed) : (appSettings.extraPassengerFixed || 15.00);
    const extraPaxPercent = (driver.extraPassengerPercent !== undefined && driver.extraPassengerPercent !== null && driver.extraPassengerPercent !== '') ? parseFloat(driver.extraPassengerPercent) : (appSettings.extraPassengerPercent || 15);
    const luggagePrice = (driver.luggagePrice !== undefined && driver.luggagePrice !== null && driver.luggagePrice !== '') ? parseFloat(driver.luggagePrice) : (appSettings.luggagePrice || 3.00);

    let isNight = false;
    if (formData.time) {
        const [hours] = formData.time.split(':').map(Number);
        const nStart = parseInt(appSettings.nightStart?.split(':')[0] || '22');
        const nEnd = parseInt(appSettings.nightEnd?.split(':')[0] || '06');
        if (nStart > nEnd) isNight = (hours >= nStart || hours < nEnd);
        else isNight = (hours >= nStart && hours < nEnd);
    }
    const currentKmRate = isNight ? nightKmPrice : kmPrice;
    
    let totalKm = 0;
    const baseCoords = driver.homeBaseCoords || appSettings?.homeBaseCoords || { lat: 45.7785, lon: 9.3285 };

    if (formData.originCoords && formData.destinationCoords) {
        let firstLeg = await getDrivingDistanceKm(baseCoords.lat, baseCoords.lon, formData.originCoords.lat, formData.originCoords.lon);
        totalKm += firstLeg;
        
        let currentLat = formData.originCoords.lat;
        let currentLon = formData.originCoords.lon;
        for (const stop of formData.intermediateStops) {
            if (stop.coords) {
                let leg = await getDrivingDistanceKm(currentLat, currentLon, stop.coords.lat, stop.coords.lon);
                totalKm += leg;
                currentLat = stop.coords.lat;
                currentLon = stop.coords.lon;
            }
        }
        let lastLeg = await getDrivingDistanceKm(currentLat, currentLon, formData.destinationCoords.lat, formData.destinationCoords.lon);
        totalKm += lastLeg;
        
        let returnLeg = await getDrivingDistanceKm(formData.destinationCoords.lat, formData.destinationCoords.lon, baseCoords.lat, baseCoords.lon);
        totalKm += returnLeg;
    } else {
        if (selectedService === ServiceType.AIRPORT) totalKm = 90;
        else if (selectedService === ServiceType.EVENT) totalKm = 60;
        else totalKm = 25;
    }

    const kmCost = currentKmRate * totalKm;
    let extras = 0;

    if (selectedService === ServiceType.AIRPORT) {
        if (formData.passengers > 1) extras += (formData.passengers - 1) * extraPaxFixed;
    } else {
        if (formData.passengers > 1) {
            extras += (kmCost * (extraPaxPercent / 100)) * (formData.passengers - 1);
        }
    }

    if (formData.luggage > 0) extras += formData.luggage * luggagePrice;
    if (selectedService === ServiceType.EVENT) extras += (kmCost * (eventSurchargePercent / 100));
    if (selectedService === ServiceType.URGENT) extras += urgentFee;
    
    if (selectedDate && (getDay(selectedDate) === 0 || getDay(selectedDate) === 6)) {
        extras += (appSettings.weekendSurcharge || 10);
    }
    
    if (formData.intermediateStops.length > 0) {
        extras += (formData.intermediateStops.length * 10); 
    }

    const calculatedTotal = kmCost + extras;
    const floor = selectedService === ServiceType.AIRPORT ? airportMinFloor : basePriceFloor;

    return Math.max(calculatedTotal, floor).toFixed(0);
  };

  const handleCalculatePrice = async () => {
    if (!selectedDate || !formData.time || !selectedService) return;
    
    // Integrazione futura: Recupero autisti via socket
    // Per ora usiamo un autista di default basato sulle impostazioni master
    const calculatedPrice = await calculatePrice({ id: '1' });
    const defaultDriver = {
        id: '1',
        name: appSettings.app_name || 'Autista Master',
        vehicle: 'Auto Standard',
        isAvailable: true,
        calculatedPrice
    };

    setAvailableDrivers([defaultDriver]);
    setIsFallbackDrivers(false);
    setSelectedDriverId('1');
    
    setBookingStep(3);
  };

  const handleFinalSubmit = async () => {
    const code = 'AZR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // The visual UI variables needed by RideSummaryCard
    const visualPrice = availableDrivers.find(d => d.id === selectedDriverId)?.calculatedPrice || 0;
    const driverDetails = availableDrivers.find(d => d.id === selectedDriverId) || {};

    const rideData = {
        // BACKEND TITANIUM DATA
        ticket_id: code, 
        cliente_nome: formData.name, 
        cliente_telefono: formData.phone,
        tipo_servizio: selectedService, 
        partenza_obj: { address: formData.origin, lat: formData.originCoords?.lat || 0, lon: formData.originCoords?.lon || 0 },
        destinazione_obj: { address: formData.destination, lat: formData.destinationCoords?.lat || 0, lon: formData.destinationCoords?.lon || 0 },
        tappe_intermedie: JSON.stringify(formData.intermediateStops),
        passeggeri: formData.passengers, 
        bagagli: formData.luggage,
        data_partenza: format(selectedDate!, 'yyyy-MM-dd'), 
        ora_partenza: formData.time,
        km_calcolati: 0, // Verrà ricalcolato dal Master
        preventivo_accettato: visualPrice,
        id_autista_assegnato: 1, // Default Master
        note_cliente: formData.notes || '',

        // FRONTEND VISUAL DATA
        serviceType: SERVICE_INFO[selectedService!].label,
        passengerName: formData.name,
        passengerPhone: formData.phone,
        date: format(selectedDate!, 'dd/MM/yyyy'),
        time: formData.time,
        origin: formData.origin,
        destination: formData.destination,
        price: visualPrice,
        passengers: formData.passengers,
        driverName: driverDetails.name || 'Auto Master',
        driverVehicle: driverDetails.vehicle || 'Standard',
        intermediateStops: formData.intermediateStops
    };

    setLastRideData(rideData);
    setFinalCode(code);

    // Invia al Blackview
    socketService.emit('client_request', { action: 'PRENOTA_CORSA_CLIENTE', payload: rideData });

    setBookingStep(4);
    
    toast({ title: "Richiesta Inviata!", description: "Il tuo autista ti contatterà a breve." });
  };

  const validation = useMemo(() => {
    const missing = [];
    const critical = [];
    if (!formData.origin?.trim()) missing.push("Punto di Partenza");
    if (!formData.destination?.trim()) missing.push("Punto di Arrivo");
    if (!formData.time) missing.push("Ora del passaggio");
    if (!selectedDate) missing.push("Data del passaggio");
    if (formData.passengers < 1) missing.push("Passeggeri");
    if (formData.intermediateStops.some(s => !s.address?.trim())) missing.push("Indirizzo tappe");

    const checkForbidden = (addr: string) => {
        if (!appSettings?.forbiddenAddresses) return null;
        return appSettings.forbiddenAddresses.find((fa: any) => 
            addr.toLowerCase().includes(fa.fullAddress.toLowerCase()) || 
            addr.toLowerCase().includes(fa.name.toLowerCase())
        );
    };

    const fbOrigin = checkForbidden(formData.origin);
    const fbDest = checkForbidden(formData.destination);
    if (fbOrigin) critical.push(`Partenza non servita: ${fbOrigin.name}`);
    if (fbDest) critical.push(`Arrivo non servito: ${fbDest.name}`);

    if (selectedDate && formData.time && selectedService) {
        const [h, m] = formData.time.split(':').map(Number);
        const bookingTime = new Date(selectedDate);
        bookingTime.setHours(h, m, 0, 0);
        const leadTime = SERVICE_INFO[selectedService].minLeadTime;
        const minAllowed = new Date(Date.now() + leadTime * 60 * 60 * 1000);
        if (bookingTime < minAllowed) {
            critical.push(`Serve almeno ${leadTime}h di preavviso per ${SERVICE_INFO[selectedService].label}.`);
        }
    }
    return { missing, critical, isValid: missing.length === 0 && critical.length === 0 };
  }, [formData, selectedDate, selectedService, appSettings]);

  const isStep3Valid = useMemo(() => {
    return selectedDriverId && formData.name.trim().length > 2 && formData.phone.trim().length > 5;
  }, [selectedDriverId, formData.name, formData.phone]);

  const heroBackgroundUrl = appSettings.bg_image || PlaceHolderImages.find(p => p.id === 'hero-image')?.imageUrl;

  return (
    <div className="min-h-screen bg-white relative overflow-hidden pb-20">
      <div className="absolute inset-0 z-0 h-[600px] w-full">
        {heroBackgroundUrl && (
          <Image src={heroBackgroundUrl} alt="Background" fill className="object-cover opacity-20" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white" />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-4 pt-12 pb-4 flex justify-center items-start gap-8 md:gap-16">
          <ActionIcon icon={<CalendarDays />} label="Calendario" onClick={() => setIsCalendarOpen(true)} color="indigo" />
          <ActionIcon icon={<MessagesSquare />} label="Chat Amici" href="/chat" color="blue" hasNotification={hasUnreadMessages} />
          <ActionIcon icon={<History />} label="Stato Corse" onClick={() => {}} color="cyan" isDialog={true} dialogContent={<LookupContent lookupCode={lookupCode} setLookupCode={setLookupCode} handleLookup={handleLookup} isSearching={isSearching} lookupResult={lookupResult} />} />
        </div>

        <div className="container mx-auto px-4 py-8 text-center space-y-4">
          <Badge variant="outline" className="border-blue-200 bg-blue-50/50 text-blue-600 font-black px-6 py-1.5 rounded-full uppercase tracking-widest text-[9px] backdrop-blur-sm shadow-sm">AZZURRO COMMUNITY FRIENDS</Badge>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[0.9]">Hai bisogno di un<br /><span className="text-blue-600">passaggio?</span></h1>
          <p className="text-slate-500 font-medium max-w-md mx-auto text-sm leading-relaxed opacity-80">Il network di amici della Brianza.<br />Scegli il servizio e calcola il tuo prezzo fisso.</p>
        </div>

        {bookingStep < 4 && (
            <div className="container mx-auto px-4 flex justify-center mb-8">
                <div className="flex items-center gap-2 bg-slate-100/50 backdrop-blur-sm p-2 rounded-3xl border border-white/50 shadow-inner">
                    <StepIndicator step={1} current={bookingStep} label="Servizio" />
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <StepIndicator step={2} current={bookingStep} label="Dettagli" />
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <StepIndicator step={3} current={bookingStep} label="Conferma" />
                </div>
            </div>
        )}

        <div ref={bookingRef} className="container mx-auto px-4 max-w-4xl min-h-[500px]">
          {bookingStep === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-in slide-in-from-bottom-8 duration-700">
                {Object.values(ServiceType).map(t => (
                    <ServiceCard key={t} type={t} isDisabled={appSettings?.deactivatedServices?.includes(t)} customMessage={appSettings?.serviceMessages?.[t]} onClick={() => handleSelectService(t)} />
                ))}
            </div>
          )}

          {bookingStep === 2 && selectedService && (
            <Card className="max-w-xl mx-auto p-10 rounded-[3rem] border-none shadow-2xl bg-white/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-500">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setBookingStep(1)} className="rounded-2xl h-10 text-[11px] font-black text-slate-400 gap-2 uppercase tracking-widest hover:text-blue-600 transition-colors"><ArrowLeft className="w-4 h-4" /> Indietro</Button>
                    <Badge className={cn("uppercase font-black px-5 py-1.5 tracking-widest text-[9px] shadow-lg", selectedService === ServiceType.URGENT ? "bg-red-600" : "bg-blue-600")}>{SERVICE_INFO[selectedService].label}</Badge>
                </div>
                <div className="space-y-6">
                    {selectedService === ServiceType.AIRPORT && <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl"><DirectionButton active={airportDirection === 'TO'} onClick={() => setAirportDirection('TO')} icon={<PlaneTakeoff className="w-4 h-4" />} label="Verso" /><DirectionButton active={airportDirection === 'FROM'} onClick={() => setAirportDirection('FROM')} icon={<PlaneLanding className="w-4 h-4" />} label="Da" /></div>}
                    <div className="space-y-4">
                        <LocationInput label="Partenza" value={formData.origin} onSelect={(addr: string, coords: any) => setFormData({...formData, origin: addr, originCoords: coords})} isAirport={selectedService === ServiceType.AIRPORT && airportDirection === 'FROM'} airportIndex={selectedAirportIndex} onAirportChange={(idx: number) => { setSelectedAirportIndex(idx); setFormData({...formData, origin: AIRPORTS[idx].address, originCoords: AIRPORTS[idx].coords}); }} verifiedPlaces={appSettings?.verifiedAddresses || []} />

                        <div className="space-y-3">
                          {formData.intermediateStops.map((stop, idx) => (
                            <div key={idx} className="flex items-end gap-2 animate-in slide-in-from-left-2 duration-300">
                              <div className="flex-1">
                                <LocationInput label={`Tappa ${idx + 1}`} value={stop.address} onSelect={(addr: string, coords: any) => {
                                    const stops = [...formData.intermediateStops];
                                    stops[idx] = { address: addr, coords };
                                    setFormData({...formData, intermediateStops: stops});
                                }} verifiedPlaces={appSettings?.verifiedAddresses || []} />
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => setFormData({ ...formData, intermediateStops: formData.intermediateStops.filter((_, i) => i !== idx) })} className="h-14 w-10 text-slate-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></Button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, intermediateStops: [...formData.intermediateStops, { address: '', coords: null }] })} className="rounded-xl h-8 text-[9px] font-black uppercase text-blue-600 gap-2 hover:bg-blue-50">
                            <Plus className="w-3 h-3" /> Aggiungi Tappa
                          </Button>
                        </div>

                        <LocationInput label="Arrivo" value={formData.destination} onSelect={(addr: string, coords: any) => setFormData({...formData, destination: addr, destinationCoords: coords})} isAirport={selectedService === ServiceType.AIRPORT && airportDirection === 'TO'} airportIndex={selectedAirportIndex} onAirportChange={(idx: number) => { setSelectedAirportIndex(idx); setFormData({...formData, destination: AIRPORTS[idx].address, destinationCoords: AIRPORTS[idx].coords}); }} verifiedPlaces={appSettings?.verifiedAddresses || []} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <DateTimeInput label="Data" value={selectedDate} onChange={(d: any) => setSelectedDate(d)} minDate={startOfDay(new Date(Date.now() + (SERVICE_INFO[selectedService].minLeadTime * 60 * 60 * 1000)))} disabledDays={(date: Date) => isDayManuallyClosed(date) || !hasDriversForDay(date)} />
                            <DateTimeInput label="Ora" type="time" value={formData.time} onChange={(v: string) => setFormData({...formData, time: v})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <NumberInput label="Pax" value={formData.passengers} onChange={(v: number) => setFormData({...formData, passengers: v})} icon={<Users className="w-4 h-4" />} max={8} />
                            <NumberInput label="Bagagli" value={formData.luggage} onChange={(v: number) => setFormData({...formData, luggage: v})} icon={<Briefcase className="w-4 h-4" />} max={15} />
                        </div>
                    </div>
                </div>

                {(validation.missing.length > 0 || validation.critical.length > 0) && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        {validation.critical.length > 0 && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2"><ShieldAlert className="w-3 h-3" /> Errore Critico</p>
                                <ul className="space-y-1">{validation.critical.map((err, i) => (<li key={i} className="text-[10px] text-red-700 font-bold leading-tight">{err}</li>))}</ul>
                            </div>
                        )}
                        {validation.missing.length > 0 && (
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><TriangleAlert className="w-3 h-3" /> Campi da completare</p>
                                <ul className="grid grid-cols-2 gap-x-4 gap-y-1">{validation.missing.map((f, i) => (<li key={i} className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-300" /> {f}</li>))}</ul>
                            </div>
                        )}
                    </div>
                )}

                <Button 
                    className={cn(
                        "w-full h-16 rounded-[1.5rem] font-black tracking-widest text-[12px] uppercase shadow-2xl transition-all duration-500", 
                        validation.isValid 
                            ? (selectedService === ServiceType.URGENT ? "bg-red-600 hover:bg-red-700 shadow-red-500/30 hover:scale-[1.02]" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:scale-[1.02]")
                            : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    )} 
                    onClick={validation.isValid ? handleCalculatePrice : undefined}
                    disabled={!validation.isValid}
                >
                    {validation.isValid ? "Vedi Disponibilità & Prezzo" : "Completa il Modulo"}
                </Button>
              </div>
            </Card>
          )}

          {bookingStep === 3 && (
              <div className="space-y-8 max-w-lg mx-auto animate-in slide-in-from-right-12 duration-700">
                  <div className="text-center space-y-2"><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Driver Disponibili</p></div>
                  <div className="space-y-4">
                      {availableDrivers.length > 0 ? availableDrivers.map(d => (
                          <div key={d.id} className={cn("p-6 rounded-[2.5rem] border-4 cursor-pointer transition-all flex items-center justify-between group", selectedDriverId === d.id ? "border-blue-600 bg-blue-50 shadow-2xl scale-[1.02]" : "border-slate-100 bg-white hover:border-slate-200 shadow-lg")} onClick={() => setSelectedDriverId(d.id)}>
                              <div className="flex items-center gap-5">
                                  <Avatar className="h-16 w-16 border-2 border-white shadow-xl transition-transform group-hover:scale-110"><AvatarFallback className="font-black bg-slate-900 text-white text-xl">{d.name[0]}</AvatarFallback></Avatar>
                                  <div className="text-left">
                                      <p className="font-black text-slate-900 text-xl leading-none mb-1.5">{d.name}</p>
                                      <div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> {d.vehicle || 'Auto Flotta'}</span>{d.isFallback && <Badge className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0 border-none uppercase">Conferma Manuale</Badge>}</div>
                                  </div>
                              </div>
                              <div className="text-right"><p className="text-3xl font-black text-blue-600 tracking-tight">€{d.calculatedPrice}</p><div className={cn("w-6 h-6 rounded-full border-4 ml-auto mt-2 flex items-center justify-center transition-all", selectedDriverId === d.id ? "bg-blue-600 border-blue-600" : "border-slate-100")}>{selectedDriverId === d.id && <CheckCircle2 className="w-4 h-4 text-white" />}</div></div>
                          </div>
                      )) : (
                        <Card className="p-10 rounded-[3rem] border-none shadow-xl text-center bg-white space-y-4">
                            <TriangleAlert className="w-12 h-12 text-amber-500 mx-auto" />
                            <p className="font-black uppercase text-slate-900">Nessun Driver Trovato</p>
                            <Button variant="outline" onClick={() => setBookingStep(2)} className="rounded-2xl font-bold uppercase text-[10px] h-10 tracking-widest">Correggi Dettagli</Button>
                        </Card>
                      )}
                  </div>
                  
                  {availableDrivers.length > 0 && (
                    <>
                        <Card className="p-10 rounded-[3rem] border-none shadow-2xl bg-white">
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">Tuo Nome</Label>
                                <Input placeholder="Inserisci..." className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold px-6 focus:bg-white" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">WhatsApp</Label>
                                <Input placeholder="+39..." className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold px-6 focus:bg-white" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">Username Instagram (Opzionale)</Label>
                                <Input placeholder="@..." className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold px-6 focus:bg-white" value={formData.instagram} onChange={e=>setFormData({...formData, instagram: e.target.value})} />
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">Note extra</Label>
                                <Textarea placeholder="Indica il numero del volo o dettagli utili..." className="min-h-[100px] rounded-2xl bg-slate-50 border-transparent font-medium px-6 py-4 focus:bg-white" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} />
                              </div>
                            </div>
                          </div>
                        </Card>
                        <div className="flex gap-4">
                          <Button variant="ghost" onClick={() => setBookingStep(2)} className="flex-1 h-16 rounded-[1.5rem] font-black text-slate-400 uppercase text-[11px] tracking-widest">Indietro</Button>
                          <Button 
                            className={cn(
                                "flex-[2] h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-[12px] shadow-2xl transition-all duration-500",
                                isStep3Valid 
                                    ? (selectedService === ServiceType.URGENT ? "bg-red-600 hover:bg-red-700 shadow-red-500/30" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30")
                                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            )} 
                            onClick={isStep3Valid ? handleFinalSubmit : undefined}
                            disabled={!isStep3Valid}
                          >
                            {isStep3Valid ? (isFallbackDrivers ? 'Invia Richiesta' : 'Conferma Prenotazione') : "Inserisci i tuoi dati"}
                          </Button>
                        </div>
                    </>
                  )}
              </div>
          )}

          {bookingStep === 4 && lastRideData && (
            <div className="text-center py-8 space-y-8 animate-in zoom-in-95 duration-1000">
                <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-6 animate-bounce"><CheckCircle2 className="w-12 h-12" /></div>
                <div className="space-y-3">
                    <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-tight">Ottimo lavoro!</h3>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto text-base leading-relaxed opacity-80">Abbiamo inviato i dati all'amministratore.<br />Controlla il tuo WhatsApp per la conferma finale.</p>
                </div>

                <div className="max-w-md mx-auto">
                    <RideSummaryCard ride={lastRideData} finalCode={finalCode} adminWhatsapp={appSettings.admin_whatsapp} />
                    <div className="mt-8 flex flex-col gap-3">
                        <Button variant="ghost" className="h-14 rounded-2xl font-black uppercase text-[11px] tracking-widest text-slate-400 hover:text-blue-600 transition-all w-full" onClick={() => { setBookingStep(1); setFinalCode(''); setLastRideData(null); }}>
                            Torna alla Home
                        </Button>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="rounded-[3rem] max-w-[350px] border-none shadow-2xl p-0 overflow-hidden text-left bg-white">
            <DialogHeader className="p-8 bg-slate-50 border-b">
                <DialogTitle className="font-black text-2xl uppercase tracking-tighter text-slate-900">Operatività</DialogTitle>
                <DialogDescription className="font-medium text-slate-500 text-[11px] leading-tight">Consulta giorni attivi e disponibilità.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" size="icon" onClick={()=>setCurrentCalendarDate(subMonths(currentCalendarDate, 1))} disabled={isSameMonth(currentCalendarDate, new Date())} className="h-8 w-8 rounded-xl"><ChevronLeft className="w-4 h-4" /></Button>
                    <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-900">{format(currentCalendarDate, 'MMMM yyyy', { locale: it })}</h3>
                    <Button variant="ghost" size="icon" onClick={()=>setCurrentCalendarDate(addMonths(currentCalendarDate, 1))} disabled={currentCalendarDate >= addMonths(startOfMonth(new Date()), 6)} className="h-8 w-8 rounded-xl"><ChevronRight className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                    {["L", "M", "M", "G", "V", "S", "D"].map((d, idx)=><div key={idx} className="text-center text-[10px] font-black text-slate-300 mb-2">{d}</div>)}
                    {eachDayOfInterval({ 
                        start: startOfWeek(startOfMonth(currentCalendarDate), {weekStartsOn: 1}), 
                        end: endOfWeek(endOfMonth(currentCalendarDate), {weekStartsOn: 1}) 
                    }).map((day, i) => { 
                        const isClosed = isDayManuallyClosed(day); 
                        const hasDrivers = hasDriversForDay(day);
                        const isCurrent = isSameMonth(day, currentCalendarDate); 
                        const past = day < startOfDay(new Date()); 
                        
                        return (
                            <div 
                                key={i} 
                                onClick={()=>!past && !isClosed && hasDrivers && isCurrent && handleSelectDay(day)} 
                                className={cn(
                                    "aspect-square rounded-xl flex items-center justify-center text-[12px] font-black transition-all relative",
                                    !isCurrent ? "opacity-0 pointer-events-none" : 
                                    past ? "text-slate-200 bg-slate-50/50 cursor-not-allowed" : 
                                    isClosed ? "text-red-300 bg-red-50/50 cursor-not-allowed border-2 border-red-100" : 
                                    !hasDrivers ? "text-slate-300 bg-slate-100/50 cursor-not-allowed border-2 border-dashed border-slate-200" :
                                    "bg-white border-2 border-slate-50 hover:border-blue-200 text-slate-900 cursor-pointer"
                                )}
                            >
                                {format(day, 'd')}
                                {isCurrent && !past && (
                                    <>
                                        {isClosed && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />}
                                        {!isClosed && hasDrivers && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />}
                                        {!isClosed && !hasDrivers && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" />}
                                    </>
                                )}
                            </div> 
                        );
                    })}
                </div>
                <div className="pt-4 border-t border-slate-100 space-y-2">
                    <LegendItem color="bg-emerald-400" label="Servizio Attivo" />
                    <LegendItem color="bg-red-50" label="Chiuso (Admin)" />
                    <LegendItem color="bg-amber-400" label="Nessun Driver" />
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function LegendItem({ color, label }: { color: string, label: string }) {
    return (<div className="flex items-center gap-2"><div className={cn("w-2 h-2 rounded-full", color)} /><span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{label}</span></div>);
}

function ActionIcon({ icon, label, href, onClick, color, isDialog, dialogContent, hasNotification }: any) {
    const content = (
        <div className="flex flex-col items-center gap-3 cursor-pointer group" onClick={onClick}>
            <div className={cn("w-16 h-16 rounded-[1.5rem] border-2 bg-white/90 backdrop-blur-md shadow-xl flex items-center justify-center transition-all duration-500 relative", color === 'indigo' ? "text-indigo-500 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white" : color === 'blue' ? "text-blue-500 border-blue-100 group-hover:bg-blue-600 group-hover:text-white" : "text-cyan-500 border-cyan-100 group-hover:bg-cyan-600 group-hover:text-white")}>
                {React.cloneElement(icon, { className: "w-7 h-7" })}
                {hasNotification && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse" />}
            </div>
            <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors leading-tight text-center px-1", color === 'indigo' ? "text-indigo-400" : color === 'blue' ? "text-blue-400" : "text-cyan-400")}>{label}</span>
        </div>
    );
    if (href) return <Link href={href}>{content}</Link>;
    if (isDialog) return (
      <Dialog>
        <DialogTrigger asChild>{content}</DialogTrigger>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white text-left max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-2 bg-slate-50 border-b shrink-0">
            <DialogTitle className="font-black text-xl uppercase tracking-tighter text-slate-900">Azione</DialogTitle>
            <DialogDescription className="font-medium text-slate-500 text-[10px] leading-tight">Visualizza i dettagli richiesti.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {dialogContent}
          </div>
        </DialogContent>
      </Dialog>
    );
    return content;
}

function ServiceCard({ type, onClick, isDisabled, customMessage }: any) {
  const info = SERVICE_INFO[type as ServiceType];
  const color = type === ServiceType.URGENT ? "red" : type === ServiceType.STANDARD ? "emerald" : "blue";
  return (
    <Card onClick={!isDisabled ? onClick : undefined} className={cn("flex flex-col items-center justify-center gap-4 p-8 aspect-square rounded-[3rem] border-4 bg-white shadow-2xl transition-all duration-500 relative overflow-hidden group", !isDisabled ? `hover:border-${color}-200 hover:-translate-y-4 cursor-pointer` : "opacity-60 bg-slate-50 cursor-not-allowed")}>
      {isDisabled && <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center"><TriangleAlert className="w-10 h-10 text-amber-600 mb-3" /><p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">{customMessage || "Sospeso"}</p></div>}
      <div className={cn("w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-400 transition-all duration-500", !isDisabled && `group-hover:bg-${color}-50 group-hover:text-${color}-600`)}><div className="transform group-hover:scale-110 transition-transform">{info.icon}</div></div>
      <div className="text-center space-y-1.5"><span className={cn("text-base font-black text-slate-900 uppercase tracking-tighter leading-none block", !isDisabled && `group-hover:text-${color}-700`)}>{info.label}</span><p className="text-[10px] font-medium text-slate-400 leading-tight opacity-80">{info.description}</p></div>
    </Card>
  );
}



function StepIndicator({ step, current, label }: any) {
    const active = current === step; const completed = current > step;
    return (
        <div className="flex items-center gap-2 px-4 py-1">
            <div className={cn("w-6 h-6 rounded-xl flex items-center justify-center text-[11px] font-black transition-all", active ? "bg-blue-600 text-white shadow-lg scale-110" : completed ? "bg-emerald-100 text-emerald-600" : "bg-white text-slate-300")}>{completed ? <CheckCircle2 className="w-4 h-4" /> : step}</div>
            <span className={cn("text-[10px] font-black uppercase tracking-widest hidden sm:inline", active ? "text-blue-600" : completed ? "text-emerald-600" : "text-slate-300")}>{label}</span>
        </div>
    );
}

function LookupContent({ lookupCode, setLookupCode, handleLookup, isSearching, lookupResult, adminWhatsapp }: any) {
    return (
        <div className="space-y-4">
            <div className="text-center space-y-1 mb-2">
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter leading-none">Cerca Prenotazione</h3>
                <p className="text-slate-500 text-xs font-medium">Codice AZR per controllare lo stato.</p>
            </div>
            <div className="flex gap-2">
                <Input placeholder="AZR-XXXXXX" value={lookupCode} onChange={e=>setLookupCode(e.target.value)} className="h-12 rounded-xl font-black uppercase bg-slate-50 border-transparent px-4 text-sm" />
                <Button onClick={handleLookup} disabled={isSearching} className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs">{isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CERCA'}</Button>
            </div>
            {lookupResult && lookupResult !== 'NOT_FOUND' && (
              <div className="space-y-4 pt-2">
                <RideSummaryCard ride={lookupResult} finalCode={lookupResult.bookingCode} adminWhatsapp={adminWhatsapp} />
              </div>
            )}
            {lookupResult === 'NOT_FOUND' && <p className="text-center font-bold text-red-500 bg-red-50 p-3 rounded-xl text-xs">Codice non trovato.</p>}
        </div>
    );
}

function LocationInput({ label, value, onSelect, isAirport, airportIndex, onAirportChange, verifiedPlaces = [] }: any) {
    const [inputValue, setInputValue] = useState(value || '');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const debounceTimer = useRef<any>(null);

    useEffect(() => { setInputValue(value || ''); }, [value]);

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) { setSuggestions([]); return; }
        setIsLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=it&limit=5`);
            const data = await res.json();
            const formatted = data.map((item: any) => ({
                name: item.display_name.split(',')[0],
                fullAddress: item.display_name,
                coords: { lat: parseFloat(item.lat), lon: parseFloat(item.lon) },
                type: 'global'
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

    const filteredVerified = verifiedPlaces.filter((s: any) => 
        s.name.toLowerCase().includes(inputValue.toLowerCase()) || 
        s.fullAddress.toLowerCase().includes(inputValue.toLowerCase())
    ).map((v: any) => ({ ...v, type: 'verified' }));

    const allSuggestions = [...filteredVerified, ...suggestions.filter(s => !filteredVerified.some((v: any) => v.fullAddress === s.fullAddress))];

    return (
        <div className="space-y-1.5 text-left relative">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">{label}</Label>
            {isAirport ? (
                <Select value={airportIndex.toString()} onValueChange={v => onAirportChange(parseInt(v))}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold px-6 focus:bg-white transition-all"><div className="flex items-center gap-3"><Plane className="w-5 h-5 text-blue-600" /><SelectValue /></div></SelectTrigger>
                    <SelectContent className="rounded-2xl">{AIRPORTS.map((a, i) => <SelectItem key={i} value={i.toString()} className="font-bold rounded-xl">{a.name}</SelectItem>)}</SelectContent>
                </Select>
            ) : (
                <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <Input placeholder="Cerca via, città o luogo..." className="h-14 pl-14 pr-10 rounded-2xl bg-slate-50 border-transparent font-bold focus:bg-white transition-all" value={inputValue} onChange={e => handleInputChange(e.target.value)} onFocus={() => setIsMenuOpen(true)} onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)} />
                    {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /></div>}
                    {isMenuOpen && allSuggestions.length > 0 && (
                        <Card className="absolute top-full left-0 right-0 mt-2 z-[100] rounded-3xl shadow-2xl border-none overflow-hidden max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 bg-white">
                            {allSuggestions.map((s: any, i: number) => (
                                <button key={i} type="button" className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center gap-4 border-b border-slate-50 last:border-none" onMouseDown={(e) => { e.preventDefault(); setInputValue(s.fullAddress); onSelect(s.fullAddress, s.coords); setIsMenuOpen(false); }}>
                                    <div className={cn("p-2 rounded-xl shrink-0", s.type === 'verified' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400")}>{s.type === 'verified' ? <ShieldCheck className="w-4 h-4" /> : <Globe className="w-4 h-4" />}</div>
                                    <div className="overflow-hidden"><p className="text-[11px] font-black text-slate-900 leading-tight mb-0.5">{s.name}</p><p className="text-[9px] font-medium text-slate-400 truncate">{s.fullAddress}</p></div>
                                </button>
                            ))}
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

function DateTimeInput({ label, type, value, onChange, minDate, disabledDays }: any) {
    if (type === 'time') return (
        <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">{label}</Label><div className="relative"><Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" /><Input type="time" className="h-14 pl-14 rounded-2xl bg-slate-50 border-transparent font-bold focus:bg-white transition-all" value={value} onChange={e=>onChange(e.target.value)} /></div></div>
    );
    return (
        <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">{label}</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full h-14 justify-start text-left font-bold rounded-2xl bg-slate-50 border-transparent px-6 hover:bg-white transition-all"><CalendarIcon className="mr-3 w-5 h-5 text-slate-300" />{value ? format(value, "dd/MM/yy") : "Scegli..."}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl bg-white" align="start"><Calendar mode="single" selected={value} onSelect={d=>d && onChange(d)} disabled={(date) => date < minDate || (disabledDays && disabledDays(date))} initialFocus locale={it} /></PopoverContent></Popover></div>
    );
}

function NumberInput({ label, value, onChange, icon, max }: any) {
    return (
        <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">{label}</Label><div className="relative"><div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">{icon}</div><Input type="number" min="0" max={max} className="h-14 pl-14 rounded-2xl bg-slate-50 border-transparent font-bold focus:bg-white transition-all" value={value} onChange={e=>onChange(parseInt(e.target.value || '0'))} /></div></div>
    );
}

function DirectionButton({ active, onClick, icon, label }: any) {
    return <button onClick={onClick} className={cn("flex-1 h-11 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all", active ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>{icon} {label}</button>;
}
