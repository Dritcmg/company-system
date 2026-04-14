'use client';

import React from 'react';
import { Wallet, Briefcase, Bell, Settings, Moon, Sun } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CalendarCheck, CalendarDays, TrendingUp } from 'lucide-react';

export const TopBarHUD: React.FC = () => {
  const { projects, expenses, theme, toggleTheme } = useGameStore();
  const [isFinPanelOpen, setFinPanelOpen] = React.useState(false);
  
  const budget = projects.reduce((acc, p) => acc + (p.revenue || 0), 0) - expenses.reduce((acc, e) => acc + e.amount, 0);
  const activeProjects = projects.filter(p => p.status === 'in-progress' || p.status === 'backlog').length;

  const getStartOfDay = () => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  };
  const getStartOfWeek = () => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  };
  const getStartOfMonth = () => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  };

  const completedProjects = projects.filter(p => p.status === 'done' && p.actual_deadline);

  const getProfitFromDate = (timestampThreshold: number) => {
    const revenue = completedProjects
      .filter(p => new Date(p.actual_deadline!).getTime() >= timestampThreshold)
      .reduce((acc, p) => acc + (p.revenue || 0), 0);
    const spent = expenses
      .filter(e => e.date && new Date(e.date).getTime() >= timestampThreshold)
      .reduce((acc, e) => acc + e.amount, 0);
    return revenue - spent;
  };

  const profitToday = getProfitFromDate(getStartOfDay().getTime());
  const profitWeek = getProfitFromDate(getStartOfWeek().getTime());
  const profitMonth = getProfitFromDate(getStartOfMonth().getTime());

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-2 md:top-4 left-4 md:left-32 right-4 md:right-8 z-50 h-[64px] md:h-[72px] flex items-center justify-between px-4 md:px-8 neu-raised rounded-2xl md:rounded-3xl"
    >
      {/* Left — stats */}
      <div className="flex items-center gap-2 md:gap-5">
        <div className="relative">
          <Stat
            icon={<Wallet size={15} />}
            label="Budget"
            value={`R$ ${budget.toLocaleString()}`}
            bg="bg-blue-50"
            fg="text-blue-500"
            border="border-blue-100"
            interactive
            onClick={() => setFinPanelOpen(!isFinPanelOpen)}
          />

          <AnimatePresence>
            {isFinPanelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-16 left-0 w-72 neu-raised p-4 z-50 overflow-hidden rounded-3xl"
              >
                <div className="flex items-center gap-2 text-slate-900 font-black tracking-tight mb-4 pb-3 border-b border-slate-100">
                  <TrendingUp size={16} className="text-emerald-500" />
                  Relatório de Ganho Líquido
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Calendar size={14} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Hoje</span>
                    </div>
                    <span className={`text-[13px] font-black ${profitToday >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      R$ {profitToday.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <CalendarDays size={14} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Semana</span>
                    </div>
                    <span className={`text-[13px] font-black ${profitWeek >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                      R$ {profitWeek.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                        <CalendarCheck size={14} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Mês</span>
                    </div>
                    <span className={`text-[13px] font-black ${profitMonth >= 0 ? 'text-violet-600' : 'text-rose-600'}`}>
                      R$ {profitMonth.toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="w-px h-6 bg-slate-200" />
        <Stat
          icon={<Briefcase size={15} />}
          label="Active"
          value={`${activeProjects} projects`}
          bg="bg-emerald-50"
          fg="text-emerald-600"
          border="border-emerald-100"
        />
      </div>

      {/* Center — brand */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
        </span>
        <h1 className="hidden md:block text-[13px] font-black tracking-[0.25em] uppercase text-slate-900">
          Executive <span className="text-[#afbddf]">HUD</span>
        </h1>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1.5 md:gap-3">
        <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center text-slate-400 neu-btn rounded-xl transition-all">
          {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <button className="hidden md:flex w-10 h-10 items-center justify-center text-slate-400 neu-btn rounded-xl transition-all">
          <Bell size={17} />
        </button>
        <button className="hidden md:flex w-10 h-10 items-center justify-center text-slate-400 neu-btn rounded-xl transition-all">
          <Settings size={17} />
        </button>
        <div className="ml-3 flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-semibold text-slate-800">Admin</span>
            <span className="text-[10px] text-emerald-500 font-semibold">● Ops Center</span>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg,#60A5FA,#818CF8)' }}
          >
            A
          </div>
        </div>
      </div>
    </motion.header>
  );
};

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
  fg: string;
  border: string;
  interactive?: boolean;
  onClick?: () => void;
}
const Stat: React.FC<StatProps> = ({ icon, label, value, bg, fg, border, interactive, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2 ${interactive ? 'cursor-pointer hover:opacity-80 transition-all active:scale-[0.98]' : ''}`}
  >
    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center neu-btn text-slate-600`}>
      {icon}
    </div>
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-[13px] font-bold text-slate-900">{value}</p>
    </div>
  </div>
);
