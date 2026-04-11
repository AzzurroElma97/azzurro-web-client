'use client';

import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, LifeBuoy, Phone, Calendar, Clock, Trash2, ArrowLeft, MessageCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';

// Local stubs replacing firebase/firestore (not used in this ecosystem)
const collection = (..._args: any[]) => null;
const query = (..._args: any[]) => null;
const orderBy = (..._args: any[]) => null;
const deleteDoc = (..._args: any[]) => Promise.resolve();
const doc = (..._args: any[]) => ({ path: '' });
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { ChatDialog } from '@/components/chat/chat-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const ADMIN_EMAIL = 'creator.azzurro@gmail.com';

export default function AdminSupportPage() {
  const { user, isUserLoading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Reindirizzamento se non admin
  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, userLoading, router]);

  // Guard query: Only create reference if user is confirmed as admin
  const supportRef = useMemoFirebase(() => 
    (db && isAdmin) 
      ? query(collection(db, 'support_requests'), orderBy('createdAt', 'desc')) 
      : null, 
  [db, isAdmin]);

  const { data: requests, isLoading: collectionLoading } = useCollection(supportRef);
  
  const handleDelete = async (id: string) => {
    if (!db || !isAdmin) return;
    if (!confirm("Rimuovere questa richiesta definitivamente?")) return;

    const requestRef = doc(db, 'support_requests', id);
    deleteDoc(requestRef)
      .then(() => {
        toast({ title: "Richiesta rimossa dalla lista" });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: requestRef.path,
          operation: 'delete',
        }));
      });
  };

  if (userLoading || (isAdmin && collectionLoading)) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <Link href="/admin" className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-2 uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <LifeBuoy className="text-red-600" /> Centro Assistenza
          </h1>
          <p className="text-muted-foreground font-medium">Gestione delle richieste di aiuto e segnalazioni dagli utenti.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="rounded-xl h-10 font-bold border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                <Link href="/chat" className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Moderazione Chat
                </Link>
            </Button>
            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 font-black h-10 px-4 flex items-center uppercase text-[10px] tracking-widest">
                {requests?.length || 0} Ticket Aperti
            </Badge>
        </div>
      </div>

      <Card className="border-none shadow-lg overflow-hidden rounded-[2rem] bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-14 px-8">Utente</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-14">Data Segnalazione</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-14">Dettagli / Messaggio</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 h-14 px-8">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests && requests.length > 0 ? requests.map((req) => (
                <TableRow key={req.id} className="hover:bg-slate-50/30 transition-colors">
                  <TableCell className="px-8 py-5">
                    <div className="flex flex-col text-left">
                        <span className="font-bold text-slate-900">{req.userName || 'Membro Anonimo'}</span>
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-blue-500" /> {req.userPhone || 'Non fornito'}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-[11px] font-bold text-slate-600 text-left">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-300" /> 
                            {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'dd MMM yyyy', { locale: it }) : '-'}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-300" /> 
                            {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'HH:mm') : '-'}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[450px] text-left">
                        <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{req.message}"</p>
                        {req.context && (
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border-none">
                                    {req.context}
                                </Badge>
                                {req.reportedUserName && (
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                                        Segnalato: {req.reportedUserName}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex items-center justify-end gap-3">
                        <ChatDialog 
                          chatId={req.id} 
                          collectionPath={`support_requests/${req.id}/messages`} 
                          title={`Assistenza: ${req.userName}`}
                          trigger={
                            <Button variant="outline" size="sm" className="rounded-xl h-10 px-5 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm">
                              <MessageCircle className="w-4 h-4" /> Rispondi
                            </Button>
                          }
                        />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 text-slate-300 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                            onClick={() => handleDelete(req.id)}
                        >
                            <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={4} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-30">
                            <div className="w-20 h-20 bg-slate-100 rounded-[2.5rem] flex items-center justify-center">
                                <ShieldCheck className="w-10 h-10 text-slate-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Tutto sotto controllo</p>
                                <p className="text-xs font-medium text-slate-500">Nessuna richiesta di assistenza pendente.</p>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="mt-12 text-center pb-12">
          <Link href="/admin" className="text-xs font-black text-slate-300 hover:text-blue-600 transition-colors inline-flex items-center gap-2 uppercase tracking-widest">
              ← Torna alla Dashboard Admin
          </Link>
      </div>
    </div>
  );
}
