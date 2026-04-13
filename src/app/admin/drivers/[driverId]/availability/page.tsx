'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Clock, Loader2, Save, ArrowLeft, Plus, Trash2, Zap, ChevronLeft, ChevronRight, Copy, ClipboardPaste, CalendarRange, Info, User, Briefcase, Sun, Calendar as CalendarIcon
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { socketService } from '@/services/socket-service';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AdminDriverAvailabilityPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [driverNome, setDriverNome] = useState('Driver');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [clipboard, setClipboard] = useState<any[] | null>(null);
  const [localAvailability, setLocalAvailability] = useState<any>({});

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdminAuthenticated') === 'true';
    if (!isAdmin) {
      router.push('/admin');
      return;
    }

    fetchAvailability();
  }, [driverId]);

  const fetchAvailability = () => {
    setIsLoading(true);
    socketService.emit('client_request', { action: 'GET_DRIVER_AVAILABILITY', payload: { driverId } }, (res: any) => {
        setIsLoading(false);
        if (res && res.success) {
            setLocalAvailability(res.availability || {});
        }
    });

    // Recupera anche info driver per il titolo
    socketService.emit('client_request', { action: 'GET_DRIVERS_DATA' }, (res: any) => {
        if (res && res.success) {
            const d = res.drivers.find((d: any) => d.id === parseInt(driverId));
            if (d) setDriverNome(d.nome);
        }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    socketService.emit('client_request', { 
        action: 'SAVE_DRIVER_AVAILABILITY', 
        payload: { driverId, availability: localAvailability } 
    }, (res: any) => {
        setIsSaving(false);
        if (res && res.success) {
            toast({ title: "Calendario Sincronizzato", description: "Le disponibilità sono state salvate sul Master." });
        } else {
            toast({ title: "Errore durante il salvataggio", variant: 'destructive' });
        }
    });
  };

  const todayStart = startOfMonth(new Date());
  const minMonthLimit = subMonths(todayStart, 1);
  const maxMonthLimit = addMonths(todayStart, 6);
  const isBackDisabled = startOfMonth(currentMonth) <= minMonthLimit;
  const isForwardDisabled = startOfMonth(currentMonth) >= maxMonthLimit;

  const handleAddShift = () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const currentShifts = localAvailability[dateKey] || [];
    setLocalAvailability({
      ...localAvailability,
      [dateKey]: [...currentShifts, { start: '08:00', end: '12:00' }]
    });
  };

  const handleRemoveShift = (index: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const currentShifts = [...(localAvailability[dateKey] || [])];
    currentShifts.splice(index, 1);
    const newCal = { ...localAvailability };
    if (currentShifts.length === 0) delete newCal[dateKey];
    else newCal[dateKey] = currentShifts;
    setLocalAvailability(newCal);
  };

  const handleUpdateShift = (index: number, field: 'start' | 'end', value: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const currentShifts = [...(localAvailability[dateKey] || [])];
    currentShifts[index] = { ...currentShifts[index], [field]: value };
    setLocalAvailability({ ...localAvailability, [dateKey]: currentShifts });
  };

  const copyShifts = () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const shifts = localAvailability[dateKey];
    if (!shifts || shifts.length === 0) {
        toast({ variant: "destructive", title: "Nessun turno", description: "Non c'è nulla da copiare." });
        return;
    }
    setClipboard(shifts);
    toast({ title: "Orari Copiati", description: "Turni pronti per essere incollati." });
  };

  const applyBulk = (daysFilter: (d: Date) => boolean) => {
    if (!clipboard) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const targets = days.filter(daysFilter);
    const newCal = { ...localAvailability };
    targets.forEach(d => { newCal[format(d, 'yyyy-MM-dd')] = [...clipboard]; });
    setLocalAvailability(newCal);
    toast({ title: "Modifica Massiva Applicata" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const shiftsForSelectedDate = localAvailability[selectedDateKey] || [];
  const monthStartDay = startOfMonth(currentMonth);
  const monthEndDay = endOfMonth(monthStartDay);
  const calendarStart = startOfWeek(monthStartDay, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEndDay, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="container mx-auto px-4 py-10 max-w-5xl animate-in fade-in duration-500">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-left">
            <Link href="/admin/drivers" className="text-xs font-black text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-2 uppercase tracking-widest">
              <ArrowLeft className="w-3 h-3" /> Torna alla Flotta
            </Link>
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg"><CalendarRange className="w-6 h-6" /></div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Planner Disponibilità</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Gestisci gli orari di <b>{driverNome}</b></p>
                </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salva Calendario
            </Button>
          </div>
        </div>

        <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-white">
          <div className="grid grid-cols-1 md:grid-cols-[380px_1fr]">
            <div className="p-8 border-r border-slate-100">
               <div className="flex items-center justify-between mb-8">
                <Button variant="ghost" size="icon" disabled={isBackDisabled} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-5 h-5" /></Button>
                <h3 className="text-lg font-black text-slate-900 capitalize tracking-tight">{format(currentMonth, 'MMMM yyyy', { locale: it })}</h3>
                <Button variant="ghost" size="icon" disabled={isForwardDisabled} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-5 h-5" /></Button>
              </div>
              <div className="grid grid-cols-7 mb-4">
                {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, idx) => (
                  <div key={idx} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const hasShifts = (localAvailability[format(day, 'yyyy-MM-dd')] || []).length > 0;
                  return (
                    <button key={idx} onClick={() => setSelectedDate(day)} disabled={!isCurrentMonth} className={cn("aspect-square w-full rounded-xl flex flex-col items-center justify-center transition-all", !isCurrentMonth && "opacity-0 pointer-events-none", isSelected ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600")}>
                      <span className="text-xs font-bold">{format(day, 'd')}</span>
                      {hasShifts && <div className={cn("w-1 h-1 rounded-full mt-1", isSelected ? "bg-white" : "bg-blue-500")} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50/30 p-8">
               <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Turnazione Giornaliera</h4>
                  <Badge className="bg-blue-100 text-blue-600 border-none font-bold text-[10px] uppercase tracking-widest">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</Badge>
               </div>
               <ScrollArea className="h-[300px] mb-8">
                  <div className="space-y-4 pr-4">
                    {shiftsForSelectedDate.map((shift: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-right-4">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                           <div>
                             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Inizio</Label>
                             <Input type="time" value={shift.start} onChange={e => handleUpdateShift(index, 'start', e.target.value)} className="h-11 rounded-xl bg-slate-50 border-transparent font-bold" />
                           </div>
                           <div>
                             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Fine</Label>
                             <Input type="time" value={shift.end} onChange={e => handleUpdateShift(index, 'end', e.target.value)} className="h-11 rounded-xl bg-slate-50 border-transparent font-bold" />
                           </div>
                        </div>
                        <Button variant="ghost" onClick={() => handleRemoveShift(index)} className="h-11 w-11 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 p-0 self-end"><Trash2 className="w-5 h-5" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" onClick={handleAddShift} className="w-full h-14 rounded-2xl border-dashed border-2 border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all gap-2">
                       <Plus className="w-4 h-4" /> Aggiungi Fascia Oraria
                    </Button>
                  </div>
               </ScrollArea>

               <div className="pt-8 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button variant="outline" onClick={copyShifts} className="h-12 rounded-xl font-bold text-xs gap-2 border-slate-200 bg-white">
                    <Copy className="w-4 h-4" /> Copia
                  </Button>
                  <Button variant="outline" onClick={() => applyBulk(d => isSameDay(d, selectedDate))} disabled={!clipboard} className="h-12 rounded-xl font-bold text-xs gap-2 border-slate-200 bg-white">
                    <ClipboardPaste className="w-4 h-4" /> Incolla
                  </Button>
                  <Button variant="outline" onClick={() => applyBulk(d => getDay(d) === getDay(selectedDate))} disabled={!clipboard} className="h-12 rounded-xl font-bold text-xs gap-2 border-slate-200 bg-white">
                    <CalendarRange className="w-4 h-4" /> Ogni {format(selectedDate, 'EEE')}
                  </Button>
                  <Button onClick={() => applyBulk(d => true)} disabled={!clipboard} className="h-12 rounded-xl font-bold text-xs gap-2 bg-slate-900 text-white">
                    <CalendarIcon className="w-4 h-4" /> Tutto il Mese
                  </Button>
               </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
