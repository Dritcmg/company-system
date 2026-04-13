'use client';

import React from 'react';
import { Wallet, Briefcase, Bell, Settings } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { motion } from 'framer-motion';

export const TopBarHUD: React.FC = () => {
  const { clients, projects } = useGameStore();
  
  const budget = clients.reduce((acc, c) => acc + (c.value || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'in-progress' || p.status === 'backlog').length;

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 bg-white/90 border-b border-slate-200/80"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Left — stats */}
      <div className="flex items-center gap-5">
        <Stat
          icon={<Wallet size={15} />}
          label="Budget"
          value={`$${budget.toLocaleString()}`}
          bg="bg-blue-50"
          fg="text-blue-500"
          border="border-blue-100"
        />
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
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <h1 className="text-sm font-black tracking-[0.22em] uppercase text-slate-900">
          Company <span className="text-blue-500">System</span>
        </h1>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <Bell size={17} />
        </button>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
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
}
const Stat: React.FC<StatProps> = ({ icon, label, value, bg, fg, border }) => (
  <div className="flex items-center gap-2.5">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${bg} ${fg} ${border}`}>
      {icon}
    </div>
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-[13px] font-bold text-slate-900">{value}</p>
    </div>
  </div>
);
