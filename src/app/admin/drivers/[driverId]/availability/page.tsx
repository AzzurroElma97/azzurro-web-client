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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { it } from 'date-fns/locale';

const ADMIN_EMAIL = 'creator.azzurro@gmail.com';

export default function AdminDriverAvailabilityPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = use(params);
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isSaving, setIsSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [clipboard, setClipboard] = useState<any[] | null>(null);

  const isAdmin = useMemo(() => user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(), [user]);

  // Navigation Limits
  const todayStart = startOfMonth(new Date());
  const minMonthLimit = subMonths(todayStart, 1);
  const maxMonthLimit = addMonths(todayStart, 6);

  const isBackDisabled = startOfMonth(currentMonth) <= minMonthLimit;
  const isForwardDisabled = startOfMonth(currentMonth) >= maxMonthLimit;

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  // Driver Profile Data
  const driverRef = useMemoFirebase(() => (db && driverId) ? doc(db, 'drivers', driverId) : null, [db, driverId]);
  const { data: driverProfile, isLoading: driverLoading } = useDoc(driverRef);

  // Local state for availability editing
  const [localAvailability, setLocalAvailability] = useState<any>({});

  useEffect(() => {
    if (driverProfile) {
      setLocalAvailability(driverProfile.calendarAvailability || {});
    }
  }, [driverProfile]);

  const handleSave = async () => {
    if (!db || !driverId) return;
    setIsSaving(true);
    const driverDocRef = doc(db, 'drivers', driverId);
    updateDoc(driverDocRef, { 
      calendarAvailability: localAvailability, 
      updatedAt: serverTimestamp() 
    })
      .then(() => {
        toast({ title: "Calendario Sincronizzato", description: "Le disponibilità del driver sono state aggiornate." });
      })
      .finally(() => setIsSaving(false));
  };

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
    const newCal = { ...localAvailability };
    sameWeekdays.forEach(d => { newCal[format(d, 'yyyy-MM-dd')] = [...clipboard]; });
    setLocalAvailability(newCal);
    toast({ title: "Modifica Massiva", description: "Orari incollati su tutti i giorni uguali del mese." });
  };

  const applyToWeekdays = () => {
    if (!clipboard) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const weekDays = days.filter(d => getDay(d) >= 1 && getDay(d) <= 5);
    const newCal = { ...localAvailability };
    weekDays.forEach(d => { newCal[format(d, 'yyyy-MM-dd')] = [...clipboard]; });
    setLocalAvailability(newCal);
    toast({ title: "Modifica Massiva", description: "Orari incollati su tutti i giorni feriali del mese." });
  };

  const applyToWeekends = () => {
    if (!clipboard) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const weekends = days.filter(d => getDay(d) === 0 || getDay(d) === 6);
    const newCal = { ...localAvailability };
    weekends.forEach(d => { newCal[format(d, 'yyyy-MM-dd')] = [...clipboard]; });
    setLocalAvailability(newCal);
    toast({ title: "Modifica Massiva", description: "Orari incollati su tutti i weekend del mese." });
  };

  const applyToAllMonth = () => {
    if (!clipboard) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const newCal = { ...localAvailability };
    days.forEach(d => { newCal[format(d, 'yyyy-MM-dd')] = [...clipboard]; });
    setLocalAvailability(newCal);
    toast({ title: "Modifica Massiva", description: "Orari incollati su ogni giorno del mese." });
  };

  if (authLoading || driverLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin || !driverProfile) {
    return null;
  }

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const shiftsForSelectedDate = localAvailability[selectedDateKey] || [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
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
                    <p className="text-slate-500 font-medium text-sm mt-1">Gestisci gli orari di <b>{driverProfile.name}</b></p>
                </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild className="rounded-xl h-12 px-6 font-bold border-slate-200 bg-white">
                <Link href="/admin/drivers">Annulla</Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salva Calendario
            </Button>
          </div>
        </div>

        <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-white">
          <div className="grid grid-cols-1 md:grid-cols-[420px_1fr] items-start">
            
            {/* CALENDARIO (SINISTRA) */}
            <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100 bg-white h-full">
              <div className="flex items-center justify-between mb-8">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={isBackDisabled}
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
                  className="h-10 w-10 rounded-full hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </Button>
                <h3 className="text-lg font-black text-slate-900 capitalize tracking-tight">{format(currentMonth, 'MMMM yyyy', { locale: it })}</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={isForwardDisabled}
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
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
                  const hasShifts = (localAvailability[dayKey] || []).length > 0;

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
              <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-[10px] font-bold text-blue-700 leading-tight">I giorni con un puntino hanno orari già impostati e salvati.</p>
              </div>
            </div>

            {/* EDITOR GIORNO (DESTRA) */}
            <div className="flex flex-col bg-slate-50/20 h-full min-h-[500px]">
              <div className="p-6 pb-4 border-b flex items-center justify-between bg-white/50 backdrop-blur-sm">
                <div className="text-left">
                  <h4 className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1">Turni Giornalieri</h4>
                  <p className="text-blue-600 font-bold text-[9px] uppercase tracking-[0.2em]">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl h-8 px-3 font-bold text-[10px] border-slate-200 bg-white" onClick={() => setSelectedDate(new Date())}>Oggi</Button>
              </div>

              <ScrollArea className="flex-1 h-[240px] px-8">
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
                      <p className="font-black text-slate-900 uppercase tracking-tight">Nessun Turno Attivo</p>
                      <p className="text-[11px] text-slate-500 font-medium max-w-[200px] mt-1 leading-relaxed">Aggiungi una fascia oraria per farti trovare dai passeggeri.</p>
                    </div>
                  )}
                  
                  <Button onClick={handleAddShift} variant="outline" className="w-full h-16 rounded-2xl border-dashed border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 font-black text-[11px] uppercase tracking-widest gap-3 transition-all">
                    <Plus className="w-5 h-5" /> Aggiungi Fascia Oraria
                  </Button>
                </div>
              </ScrollArea>

              <div className="p-8 bg-slate-50/50 border-t space-y-6">
                <div className="text-left">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Strumenti di Pianificazione</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button variant="outline" onClick={copyShifts} disabled={!shiftsForSelectedDate.length} className="h-14 rounded-2xl font-bold text-xs gap-3 border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all active:scale-95">
                      <Copy className="w-4 h-4 text-blue-500" /> Copia Turni
                    </Button>
                    {clipboard ? (
                      <>
                        <Button variant="outline" onClick={() => {
                          const dateKey = format(selectedDate, 'yyyy-MM-dd');
                          setLocalAvailability({ ...localAvailability, [dateKey]: [...clipboard] });
                          toast({ title: "Orari Incollati", description: "Turni applicati alla data corrente." });
                        }} className="h-14 rounded-2xl font-bold text-xs gap-3 border-blue-200 bg-blue-50 text-blue-600 shadow-sm animate-in zoom-in-95">
                          <ClipboardPaste className="w-4 h-4" /> Incolla qui
                        </Button>
                        <Button onClick={applyToAllSameWeekdays} className="h-14 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold text-xs gap-3 shadow-sm transition-all active:scale-[0.98]">
                          <CalendarRange className="w-5 h-5 text-blue-500" /> 
                          Ogni {format(selectedDate, 'EEEE', { locale: it })}
                        </Button>
                        <Button onClick={applyToWeekdays} className="h-14 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold text-xs gap-3 shadow-sm transition-all active:scale-[0.98]">
                          <Briefcase className="w-5 h-5 text-blue-500" /> 
                          Giorni Feriali
                        </Button>
                        <Button onClick={applyToWeekends} className="h-14 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold text-xs gap-3 shadow-sm transition-all active:scale-[0.98]">
                          <Sun className="w-5 h-5 text-orange-500" /> 
                          Solo Weekend
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
    </div>
  );
}
