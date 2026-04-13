'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  MessageSquare, 
  ArrowLeft, 
  ShieldCheck, 
  Loader2,
  Trash2,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { socketService } from '@/services/socket-service';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Message {
  id: number;
  utente: string;
  messaggio: string;
  timestamp: string;
  full_info?: string;
  isSelf?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check Admin Auth
    const authStatus = localStorage.getItem('isAdminAuthenticated');
    setIsAdmin(authStatus === 'true');

    // Recupera Nickname salvato
    const savedNick = localStorage.getItem('chatNickname');
    if (savedNick) setNickname(savedNick);

    // Carica Storico
    socketService.emit('client_request', { action: 'GET_CHAT_HISTORY' }, (res: any) => {
      setIsLoading(false);
      if (res && res.success) {
        setMessages(res.history);
      }
    });

    // Ascolta Nuovi Messaggi
    socketService.on('chat_message', (payload: any) => {
      setMessages(prev => [...prev, payload]);
    });

    return () => {
      socketService.off('chat_message');
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      localStorage.setItem('chatNickname', nickname.trim());
      setIsJoined(true);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !nickname.trim()) return;

    const messageData = {
      action: 'SEND_CHAT_MESSAGE',
      utente: nickname.trim(),
      messaggio: newMessage.trim(),
      full_info: isAdmin ? `ADMIN_${nickname}` : `CLIENT_${navigator.userAgent.substring(0, 20)}`
    };

    socketService.emit('client_request', messageData, (res: any) => {
      if (res && res.success) {
        setNewMessage('');
      }
    });
  };

  const obfuscateName = (name: string, info?: string) => {
    if (isAdmin) return name; // Admin vede tutto
    const suffix = info ? ` (#${info.slice(-4)})` : '';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0].substring(0, 3)}... ${parts[parts.length - 1].charAt(0)}..${suffix}`;
    }
    return (name.length > 4 ? `${name.substring(0, 3)}...` : name) + suffix;
  };

  const getDiversifier = (name: string) => {
    // Genera un colore o hash basato sul nome per diversificare
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
    return colors[Math.abs(hash) % colors.length];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Sincronizzazione Protocollo Chat...</p>
      </div>
    );
  }

  if (!isJoined && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 text-center"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Global Chat</h1>
            <p className="text-slate-500 text-sm font-medium">Entra nel network della Community Azzurro.</p>
          </div>

          <Card className="p-8 bg-slate-900/50 backdrop-blur-xl border-white/5 rounded-[2.5rem] shadow-2xl">
            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Il tuo Nickname</label>
                <Input 
                  placeholder="Esempio: Marco Rider" 
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold px-6 focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest transition-all">
                Entra nella Conversazione
              </Button>
            </form>
          </Card>

          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-400 font-black uppercase tracking-widest text-[9px] transition-colors">
            <ArrowLeft className="w-3 h-3" /> Torna alla Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col h-screen max-h-screen overflow-hidden font-sans select-none">
      {/* Header Titanico */}
      <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-black text-sm uppercase tracking-tighter">Community Hub</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{isAdmin ? 'ADMIN MODE' : nickname}</span>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[9px] font-black text-blue-500 tracking-widest">VISIBILITÀ TOTALE</span>
          </div>
        )}
      </header>

      {/* Area Messaggi */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth pb-10"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div 
              key={msg.id || i}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.utente === nickname ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <div className={cn("w-5 h-5 rounded-md flex items-center justify-center", getDiversifier(msg.utente))}>
                  <User className="w-3 h-3 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {obfuscateName(msg.utente, msg.full_info)}
                </span>
                {isAdmin && msg.full_info && (
                   <span className="text-[8px] font-mono text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">
                      {msg.full_info}
                   </span>
                )}
              </div>
              
              <div className={cn(
                "p-4 rounded-3xl text-sm font-medium shadow-sm leading-relaxed",
                msg.utente === nickname 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-slate-900 border border-white/5 text-slate-100 rounded-tl-none"
              )}>
                {msg.messaggio}
              </div>
              <span className="text-[8px] font-black uppercase text-slate-600 mt-1.5 tracking-tighter">
                {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : '--:--'}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input titanico */}
      <footer className="p-6 bg-slate-900/50 backdrop-blur-md border-t border-white/5 shrink-0">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3">
          <Input 
            placeholder="Scrivi un messaggio nel network..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-medium px-6 focus:ring-2 focus:ring-blue-500/50"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shrink-0 p-0 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Send className="w-6 h-6" />
          </Button>
        </form>
        <p className="text-center mt-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
          <Lock className="inline w-2.5 h-2.5 mr-1.5 opacity-50" /> Messaggi protetti dal protocollo Titanium
        </p>
      </footer>
    </div>
  );
}
