'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Trophy, Play, RefreshCcw, Car as CarIcon, Cloud, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MaintenanceOverlay() {
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Game Logic State
  const [carPos, setCarPos] = useState(50); // 0 to 100 percentage
  const [obstacles, setObstacles] = useState<{ id: number, x: number; y: number }[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const lastObstacleRef = useRef(0);

  const startGame = () => {
    setScore(0);
    setCarPos(50);
    setObstacles([]);
    setGameState('PLAYING');
    lastObstacleRef.current = Date.now();
  };

  const moveCar = useCallback((direction: 'LEFT' | 'RIGHT') => {
    setCarPos(prev => {
      const step = 8;
      if (direction === 'LEFT') return Math.max(0, prev - step);
      return Math.min(100, prev + step);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      if (e.key === 'ArrowLeft') moveCar('LEFT');
      if (e.key === 'ArrowRight') moveCar('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, moveCar]);

  // Game Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const loop = () => {
      setObstacles(prev => {
        let next = prev.map(o => ({ ...o, y: o.y + (3 + score / 500) })); // Increase speed with score
        
        // Remove off-screen obstacles
        next = next.filter(o => o.y < 110);

        // Add new obstacle
        if (Date.now() - lastObstacleRef.current > (800 - (score / 10))) {
          next.push({ id: Date.now(), x: Math.random() * 90, y: -10 });
          lastObstacleRef.current = Date.now();
        }

        // Collision Check
        const carRect = { x: carPos, y: 85, width: 10, height: 10 };
        const hasCollision = next.some(o => {
          return (
            o.y > 80 && o.y < 95 && // vertical hit range
            Math.abs(o.x - carPos) < 12 // horizontal hit range
          );
        });

        if (hasCollision) {
          setGameState('GAMEOVER');
          return prev;
        }

        return next;
      });

      setScore(s => s + 1);
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [gameState, carPos, score]);

  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 gap-12 items-center">
        {/* Info Side */}
        <div className="text-left space-y-8 order-2 md:order-1">
          <div className="space-y-4">
            <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-500 border border-red-600/30"
            >
              <ShieldAlert className="w-8 h-8" />
            </motion.div>
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter leading-none uppercase italic">
              SISTEMA IN <br />
              <span className="text-blue-500">STANDBY.</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium max-w-md">
              Il server Master Blackview non è raggiungibile. Il sito tornerà online automaticamente appena il sistema fisico sarà riattivato.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
               <div className="p-2 bg-blue-600/20 rounded-lg text-blue-500"><Zap className="w-5 h-5" /></div>
               <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Tentativo di riconnessione automatico...</p>
            </div>
            <div className="px-2">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-loose">
                  Nessun accesso è consentito finché il server non conferma l'identità Titanium. Ci scusiamo per il disagio temporaneo.
                </p>
            </div>
          </div>
        </div>

        {/* Game Side */}
        <div className="order-1 md:order-2">
            <CardContainer>
                <div className="relative w-full aspect-[4/5] bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
                    {/* Game UI Overlay */}
                    <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
                        <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                            <p className="text-lg font-mono font-black text-blue-500 leading-none">{score}</p>
                        </div>
                        <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">High</p>
                            <p className="text-lg font-mono font-black text-white leading-none">{highScore}</p>
                        </div>
                    </div>

                    {/* Road Lines */}
                    <div className="absolute inset-0 flex justify-center gap-[30%] pointer-events-none opacity-20">
                        <div className="w-[1px] h-full bg-blue-500/50 border-dashed border-l-2" />
                        <div className="w-[1px] h-full bg-blue-500/50 border-dashed border-l-2" />
                    </div>

                    {/* Game Content */}
                    <AnimatePresence>
                        {gameState === 'IDLE' && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8 text-center"
                            >
                                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-500/20">
                                    <CarIcon className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">Azzurro Racer</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Schiva le nuvole Firebase!</p>
                                <Button onClick={startGame} className="bg-white text-slate-950 rounded-xl h-14 w-full font-black uppercase text-xs tracking-widest gap-2 hover:bg-blue-500 hover:text-white transition-all">
                                    <Play className="w-4 h-4 fill-current" /> Inizia Gara
                                </Button>
                                <p className="mt-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Usa le frecce o tocca ai lati</p>
                            </motion.div>
                        )}

                        {gameState === 'GAMEOVER' && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-red-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center border-4 border-red-600/30"
                            >
                                <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white mb-6 animate-shake">
                                    <ShieldAlert className="w-8 h-8" />
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-1 italic">Incidente Cloud!</h3>
                                <p className="text-red-200 text-xs font-bold uppercase tracking-widest mb-8">Score Finale: {score}</p>
                                <Button onClick={startGame} className="bg-white text-red-600 rounded-xl h-14 w-full font-black uppercase text-xs tracking-widest gap-2 hover:bg-slate-100 shadow-xl transition-all">
                                    <RefreshCcw className="w-4 h-4" /> Riprova
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Game Elements */}
                    <div className="absolute inset-0 p-4">
                        {/* Obstacles (Clouds representing Firebase legacy) */}
                        {obstacles.map(o => (
                            <div 
                                key={o.id}
                                className="absolute text-blue-400/80 transition-all duration-300"
                                style={{ 
                                    left: `${o.x}%`, 
                                    top: `${o.y}%`,
                                    filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.3))'
                                }}
                            >
                                <Cloud className="w-12 h-12" />
                            </div>
                        ))}

                        {/* Player Car (Azzurro Mobile) */}
                        <motion.div 
                            animate={{ x: `${carPos}%`, left: '0' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="absolute bottom-10 z-10"
                            style={{ left: 0 }}
                        >
                            <div className="relative">
                                <div className="absolute -inset-2 bg-blue-500/40 rounded-full blur-xl animate-pulse" />
                                <CarIcon className="w-12 h-12 text-blue-500" />
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-4 opacity-50">
                                    <div className="w-1 h-3 bg-red-500 blur-[2px]" />
                                    <div className="w-1 h-3 bg-red-500 blur-[2px]" />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Touch Controls */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 z-40 flex">
                        <button onClick={() => moveCar('LEFT')} className="flex-1 h-full cursor-pointer active:bg-white/5 transition-colors" />
                        <button onClick={() => moveCar('RIGHT')} className="flex-1 h-full cursor-pointer active:bg-white/5 transition-colors" />
                    </div>
                </div>
            </CardContainer>
        </div>
      </div>

      <div className="absolute bottom-8 text-center sm:text-left sm:left-12 opacity-30">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Azzurro Community Titanium v2.2</p>
      </div>
    </div>
  );
}

function CardContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="p-1 rounded-[3rem] bg-gradient-to-b from-slate-700 to-slate-900 shadow-2xl">
            {children}
        </div>
    );
}
