'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User as UserIcon, LogOut, ChevronRight, BarChart2 } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const admin = localStorage.getItem('isAdminAuthenticated') === 'true';
            const driver = localStorage.getItem('isDriverAuthenticated') === 'true';
            const customer = localStorage.getItem('isCustomerAuthenticated') === 'true';
            
            if (admin || driver || customer) {
                setIsLoggedIn(true);
                setUserName(localStorage.getItem('userName') || 'Utente');
                setUserEmail(localStorage.getItem('userEmail') || 'Nessuna email');
            }
        };
        checkAuth();
    }, []);

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center bg-white p-10 rounded-[3rem] shadow-xl">
                    <UserIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="font-bold text-slate-900 mb-4">Non sei loggato</p>
                    <Link href="/" className="text-blue-600 font-bold">Torna alla Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-2xl mx-auto mt-8 bg-white border-4 border-slate-100 rounded-[3rem] shadow-2xl p-8 text-center space-y-6">
                <div className="w-24 h-24 bg-blue-100 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner text-blue-600 text-3xl font-black uppercase">
                    {userName[0]}
                </div>
                <h2 className="text-3xl font-black text-slate-900">{userName}</h2>
                <p className="text-slate-500 font-bold">{userEmail}</p>

                <div className="grid grid-cols-2 gap-4 text-left">
                    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-[10px] text-slate-400 font-black uppercase">Corse Totali</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-2xl font-black text-blue-600">0</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-[10px] text-slate-400 font-black uppercase">Rating</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-2xl font-black text-emerald-600">--</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="pt-6 border-t border-slate-100 text-center">
                    <Link href="/" className="text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest">
                        ← Torna all'interfaccia pubblica
                    </Link>
                </div>
            </div>
        </div>
    );
}
