'use client';

import { virtualAssistantRideBooking } from '@/ai/flows/virtual-assistant-ride-booking';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addMonths, startOfMonth, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, Car, Loader2, MapPin, MessageSquare, Send, User, ChevronRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { socketService } from '@/services/socket-service';
import { RideSummaryCard } from '@/components/common/ride-summary-card';
import { Badge } from '@/components/ui/badge';

const bookingSchema = z.object({
  serviceType: z.string().min(1, 'Il tipo di servizio è obbligatorio'),
  pickupLocation: z.string().min(1, 'La partenza è obbligatoria'),
  dropoffLocation: z.string().min(1, 'La destinazione è obbligatoria'),
  rideDate: z.date({ required_error: 'La data è obbligatoria.' }),
  rideTime: z.string().min(1, 'L\'ora è obbligatoria'),
  passengerName: z.string().min(2, 'Inserisci il tuo nome'),
  passengerPhone: z.string().min(6, 'Inserisci il tuo numero WhatsApp'),
});

type BookingFormValues = z.infer<typeof bookingSchema>;
type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function BookingClient() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [appSettings, setAppSettings] = useState<any>({});
  const [isBookingDone, setIsBookingDone] = useState(false);
  const [finalRideData, setFinalRideData] = useState<any>(null);
  const [finalTicketId, setFinalTicketId] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceType: 'standard',
      pickupLocation: '',
      dropoffLocation: '',
      rideTime: '',
      passengerName: '',
      passengerPhone: '',
    },
  });

  useEffect(() => {
    socketService.emit('client_request', { action: 'GET_SETTINGS' }, (res: any) => {
        if (res && res.success) setAppSettings(res.payload);
    });
    
    // Fallback if settings don't load or for dev
    const now = new Date();
    const leadTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    form.setValue('rideDate', leadTime);
    form.setValue('rideTime', format(leadTime, 'HH:mm'));
  }, [form]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleBookingCompletion = (rideDetails: any) => {
    const ticketId = 'AZR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const rideData = {
        ...rideDetails,
        ticket_id: ticketId,
        date: rideDetails.rideDate ? format(new Date(rideDetails.rideDate), 'dd/MM/yyyy') : format(form.getValues('rideDate'), 'dd/MM/yyyy'),
        time: rideDetails.rideTime || form.getValues('rideTime'),
        origin: rideDetails.pickupLocation || form.getValues('pickupLocation'),
        destination: rideDetails.dropoffLocation || form.getValues('dropoffLocation'),
        passengerName: rideDetails.passengerName || form.getValues('passengerName'),
        passengerPhone: rideDetails.passengerPhone || form.getValues('passengerPhone'),
        serviceType: (rideDetails.serviceType || form.getValues('serviceType')).toUpperCase(),
        price: "Da concordare" // L'AI non calcola il prezzo fisso tecnico, lo farà il driver
    };

    setFinalRideData(rideData);
    setFinalTicketId(ticketId);
    setIsBookingDone(true);

    // Invia al server Blackview
    socketService.emit('client_request', { 
        action: 'PRENOTA_CORSA_CLIENTE', 
        payload: {
            ...rideData,
            data_partenza: rideDetails.rideDate ? format(new Date(rideDetails.rideDate), 'yyyy-MM-dd') : format(form.getValues('rideDate'), 'yyyy-MM-dd'),
            ora_partenza: rideData.time,
            cliente_nome: rideData.passengerName,
            cliente_telefono: rideData.passengerPhone,
            partenza_obj: { address: rideData.origin },
            destinazione_obj: { address: rideData.destination },
            tipo_servizio: rideData.serviceType
        } 
    });

    toast({
        title: "Prenotazione Completata!",
        description: "Redirecting to WhatsApp...",
    });

    // Automatic WhatsApp Redirect after 2 seconds
    setTimeout(() => {
        const waMessage = 
          `🚗 *PRENOTAZIONE AZZURRO (AI ASSISTANT)*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 *Codice:* ${ticketId}\n` +
          `🏷️ *Servizio:* ${rideData.serviceType}\n` +
          `👤 *Passeggero:* ${rideData.passengerName}\n` +
          `📅 *Data:* ${rideData.date} alle ${rideData.time}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🟢 *Partenza:* ${rideData.origin}\n` +
          `🔴 *Arrivo:* ${rideData.destination}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🤖 _Richiesta generata via AI Assistant_`;
        
        const cleanNumber = (appSettings.admin_whatsapp || '393274723787').replace(/\+/g, '').replace(/\s/g, '');
        window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(waMessage)}`, '_blank');
    }, 2000);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(true);

    try {
      const currentBookingDetails = form.getValues();
      const response = await virtualAssistantRideBooking({
        query: chatInput,
        currentBookingDetails: {
            ...currentBookingDetails,
            rideDate: currentBookingDetails.rideDate ? format(currentBookingDetails.rideDate, 'yyyy-MM-dd') : undefined,
        },
      });

      const assistantMessage: ChatMessage = { role: 'assistant', content: response.response };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update form fields
      Object.entries(response.rideDetails).forEach(([key, value]) => {
        if (key in form.getValues() && value) {
            if(key === 'rideDate') {
                form.setValue(key as keyof BookingFormValues, new Date(value as string));
            } else {
                form.setValue(key as keyof BookingFormValues, value as any);
            }
        }
      });
      
      if (response.isBookingComplete) {
        handleBookingCompletion(response.rideDetails);
      }

    } catch (error) {
      console.error('Error with virtual assistant:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Scusami, ho riscontrato un errore. Per favore riprova.',
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast({
        variant: "destructive",
        title: "Errore AI Assistant",
        description: "Impossibile comunicare con l'assistente.",
      })
    } finally {
      setIsLoading(false);
    }
  };

  function onSubmit(data: BookingFormValues) {
    handleBookingCompletion(data);
  }

  const selectedDateStr = form.watch('rideDate') ? format(form.watch('rideDate'), 'yyyy-MM-dd') : '';
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const minTime = selectedDateStr === todayStr ? format(new Date(), 'HH:mm') : undefined;

  if (isBookingDone && finalRideData) {
    return (
        <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-8 animate-in zoom-in-95 duration-1000">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-6 animate-bounce"><CheckCircle2 className="w-12 h-12" /></div>
            <div className="space-y-3">
                <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-tight">Ottimo lavoro!</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto text-base leading-relaxed opacity-80">
                    L'assistente ha completato la prenotazione.<br />
                    Sto aprendo WhatsApp per la conferma finale...
                </p>
            </div>
            <div className="max-w-md mx-auto">
                <RideSummaryCard ride={finalRideData} finalCode={finalTicketId} adminWhatsapp={appSettings.admin_whatsapp} />
            </div>
            <Button variant="ghost" onClick={() => window.location.reload()} className="font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-blue-600">Nuova Prenotazione</Button>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto py-8 px-4 animate-in fade-in duration-700">
      
      {/* Virtual Assistant */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-md flex flex-col h-[650px]">
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg"><MessageSquare className="w-5 h-5 text-white" /></div>
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest leading-none">Azzurro AI</h2>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online</p>
                </div>
            </div>
            <Badge variant="outline" className="text-slate-400 border-slate-800 text-[8px] font-black tracking-widest uppercase">Titanium Intelligence</Badge>
          </div>
          
          <ScrollArea className="flex-1 p-6" ref={chatContainerRef}>
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm"><Zap className="w-4 h-4"/></div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-4 max-w-[85%] shadow-sm">
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                          Ciao! Sono il tuo assistente Azzurro. Dimmi pure dove vuoi andare e quando, mi occuperò io di compilare tutto! 🚀
                      </p>
                  </div>
              </div>

              {messages.map((msg, index) => (
                <div key={index} className={cn('flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300', msg.role === 'user' ? 'justify-end' : '')}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm"><Zap className="w-4 h-4"/></div>
                  )}
                  <div className={cn('p-4 max-w-[85%] shadow-sm', 
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none font-bold text-xs' 
                        : 'bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none text-xs font-bold text-slate-700 leading-relaxed'
                    )}>
                    <p>{msg.content}</p>
                  </div>
                   {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-white shadow-sm"><User className="w-4 h-4"/></div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm"><Zap className="w-4 h-4"/></div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600"/>
                    </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 bg-slate-50/50 border-t border-slate-100">
            <form onSubmit={handleChatSubmit} className="flex gap-3">
              <Input
                placeholder="Scrivi qui... (es: domani alle 14:00 da Merate a Linate)"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isLoading}
                className="h-12 rounded-xl border-slate-200 bg-white px-5 text-xs font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <Button type="submit" size="icon" disabled={isLoading || !chatInput.trim()} className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0">
                <Send className="w-4 h-4 text-white" />
              </Button>
            </form>
          </div>
      </Card>
      
      {/* Booking Form */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-8">
          <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-emerald-500" /> Riepilogo Corsa</h2>
              <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">Step Finale</Badge>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto max-h-[450px] pr-2 scrollbar-thin scrollbar-thumb-slate-100">
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Servizio</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold px-5 focus:bg-white transition-all">
                                    <SelectValue placeholder="Seleziona servizio" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-none shadow-2xl font-bold">
                                <SelectItem value="standard" className="rounded-xl">Standard</SelectItem>
                                <SelectItem value="airport" className="rounded-xl">Aeroporto</SelectItem>
                                <SelectItem value="urgent" className="rounded-xl">Urgente</SelectItem>
                                <SelectItem value="event" className="rounded-xl">Eventi</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pickupLocation"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Partenza</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input placeholder="Via, Piazza o Località..." {...field} className="h-14 pl-12 rounded-2xl bg-slate-50 border-transparent font-bold focus:bg-white transition-all" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dropoffLocation"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Destinazione</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input placeholder="Es: Aeroporto Malpensa..." {...field} className="h-14 pl-12 rounded-2xl bg-slate-50 border-transparent font-bold focus:bg-white transition-all" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="rideDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Data</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "h-14 rounded-2xl bg-slate-50 border-transparent font-bold px-5 hover:bg-white transition-all justify-start",
                                        !field.value && "text-slate-400"
                                    )}
                                >
                                    <CalendarIcon className="mr-3 h-4 w-4 text-slate-400" />
                                    {field.value ? format(field.value, "dd MMMM yyyy", { locale: it }) : "Scegli data"}
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl bg-white" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < startOfDay(new Date()) || date > addMonths(startOfMonth(new Date()), 6)}
                                    initialFocus
                                    locale={it}
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="rideTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Ora</FormLabel>
                        <FormControl>
                            <Input type="time" {...field} min={minTime} className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold px-5 focus:bg-white transition-all" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                  control={form.control}
                  name="passengerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Tuo Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Cognome o Nome..." {...field} className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold px-5 focus:bg-white transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="passengerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="+39..." {...field} className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold px-5 focus:bg-white transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4">
                <Button type="submit" size="lg" className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-[12px] bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 gap-3">
                  Conferma Prenotazione <ChevronRight className="w-4 h-4" />
                </Button>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mt-4">Nessun pagamento anticipato richiesto</p>
              </div>
            </form>
          </Form>
      </Card>
    </div>
  );
}
