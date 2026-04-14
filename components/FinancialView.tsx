'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { 
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, 
  DollarSign, Activity, FileCheck, Landmark, Filter 
} from 'lucide-react';

export const FinancialView: React.FC = () => {
  const { projects, expenses, clients } = useGameStore();

  const getClientName = (id: string | null) => {
    if (!id) return 'Avulso / Desconhecido';
    return clients.find(c => c.id === id)?.name || 'Avulso / Desconhecido';
  };

  // Grand Totals
  const totalRevenue = projects.reduce((acc, p) => acc + (p.revenue || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Recent History Math
  const getStartOfRollingDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.getTime();
  };

  const getProfitFromDate = (timestampThreshold: number) => {
    const revenue = projects
      .filter(p => p.status === 'done' && p.actual_deadline && new Date(p.actual_deadline).getTime() >= timestampThreshold)
      .reduce((acc, p) => acc + (p.revenue || 0), 0);
    const spent = expenses
      .filter(e => e.date && new Date(e.date).getTime() >= timestampThreshold)
      .reduce((acc, e) => acc + e.amount, 0);
    return revenue - spent;
  };

  const profit7 = getProfitFromDate(getStartOfRollingDays(7));
  const profit30 = getProfitFromDate(getStartOfRollingDays(30));

  // Closed projects table
  const closedProjects = projects
    .filter(p => p.status === 'done')
    .sort((a, b) => (new Date(b.actual_deadline || 0).getTime()) - (new Date(a.actual_deadline || 0).getTime()));

  // Active expenses table
  const sortedExpenses = [...expenses].sort((a, b) => (new Date(b.date || 0).getTime()) - (new Date(a.date || 0).getTime()));

  return (
    <div className="w-full h-full flex flex-col p-10 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[#afbddf]">
            Headquarters
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-3">
            Tesouraria Analítica
            <div className="bg-[#d4e3fe] text-[#00258c] px-3 py-1 rounded-full text-[10px] font-black tracking-[0.2em] uppercase items-center flex gap-1.5 border border-[#afbddf]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Live Sync
            </div>
          </h2>
        </div>
        
        <div className="flex gap-4">
          <div className="neu-flat px-5 py-2.5 rounded-2xl flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Lucro D-7</span>
              <span className={`text-sm font-black mt-1 ${profit7 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {profit7 >= 0 ? '+' : '-'} R$ {Math.abs(profit7).toLocaleString()}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Lucro D-30</span>
              <span className={`text-sm font-black mt-1 ${profit30 >= 0 ? 'text-blue-600' : 'text-rose-500'}`}>
                {profit30 >= 0 ? '+' : '-'} R$ {Math.abs(profit30).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="neu-raised p-6 rounded-[2rem] flex flex-col justify-between"
        >
          <div className="flex items-center gap-3 text-slate-500 mb-8">
            <div className="w-12 h-12 rounded-[1rem] bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Wallet size={20} />
            </div>
            <span className="text-[13px] font-bold uppercase tracking-widest text-slate-600">Receita Bruta Gerada</span>
          </div>
          <span className="text-[40px] font-black text-slate-800 tracking-tight">R$ {totalRevenue.toLocaleString()}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="neu-raised p-6 rounded-[2rem] flex flex-col justify-between"
        >
          <div className="flex items-center gap-3 text-slate-500 mb-8">
            <div className="w-12 h-12 rounded-[1rem] bg-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <ArrowDownRight size={20} />
            </div>
            <span className="text-[13px] font-bold uppercase tracking-widest text-slate-600">Despesas Totais</span>
          </div>
          <span className="text-[40px] font-black text-slate-800 tracking-tight">R$ {totalExpenses.toLocaleString()}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="neu-raised p-6 rounded-[2rem] flex flex-col justify-between border-[3px] border-white/50"
        >
          <div className="flex items-center gap-3 text-slate-500 mb-8">
            <div className="w-12 h-12 rounded-[1rem] bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-600/20">
              <Landmark size={20} />
            </div>
            <span className="text-[13px] font-bold uppercase tracking-widest text-violet-700">Lucro Líquido (Net Profit)</span>
          </div>
          <span className="text-[40px] font-black text-slate-800 tracking-tight">R$ {netProfit.toLocaleString()}</span>
        </motion.div>
      </div>

      {/* Dual Tables Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-[400px] mb-8">
        
        {/* Closed Projects Data Table */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          className="neu-raised rounded-[2rem] p-6 lg:p-8 flex flex-col overflow-hidden"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[16px] font-black tracking-tight text-slate-800 flex items-center gap-2">
              <FileCheck size={18} />
              Entradas de Projetos
            </h3>
            <div className="neu-inset px-4 py-2 rounded-full flex items-center gap-2 w-48">
              <span className="text-slate-400">🔍</span>
              <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-[12px] font-semibold text-slate-600 placeholder:text-slate-400 w-full" />
            </div>
          </div>
          
          <div className="w-full relative">
            <div className="flex text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 pb-3 border-b-2 border-white/70">
              <div className="flex-1">Name</div>
              <div className="w-32 hidden sm:block">Client</div>
              <div className="w-24">Status</div>
              <div className="w-28 text-right">Revenue</div>
            </div>
            
            <div className="flex flex-col max-h-[300px] overflow-y-auto pr-2 mt-2 space-y-1">
              {closedProjects.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">Nenhum projeto finalizado.</p>}
              {closedProjects.map(p => (
                <div key={p.id} className="flex items-center text-[13px] font-semibold text-slate-600 px-4 py-3.5 border-b border-white/50 last:border-0 hover:bg-white/20 transition-colors rounded-xl">
                  <div className="flex-1 truncate pr-4">{p.title}</div>
                  <div className="w-32 truncate hidden sm:block font-medium">{getClientName(p.client_id)}</div>
                  <div className="w-24">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-600 text-[10px] uppercase font-black tracking-widest rounded-full">
                      Done
                    </span>
                  </div>
                  <div className="w-28 text-right font-black">
                    R$ {(p.revenue || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Expenses Data Table */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          className="neu-raised rounded-[2rem] p-6 flex flex-col overflow-hidden"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[16px] font-black tracking-tight text-slate-800 flex items-center gap-2">
              <Activity size={18} />
              Histórico de Gastos
            </h3>
            <div className="neu-inset px-4 py-2 rounded-full flex items-center gap-2 w-48">
              <span className="text-slate-400">🔍</span>
              <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-[12px] font-semibold text-slate-600 placeholder:text-slate-400 w-full" />
            </div>
          </div>
          
          <div className="w-full relative">
            <div className="flex text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 pb-3 border-b-2 border-white/70">
              <div className="flex-1">Description</div>
              <div className="w-32 hidden sm:block">Project</div>
              <div className="w-24">Type</div>
              <div className="w-28 text-right">Cost</div>
            </div>
            
            <div className="flex flex-col max-h-[300px] overflow-y-auto pr-2 mt-2 space-y-1">
              {sortedExpenses.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">Nenhuma despesa registrada.</p>}
              {sortedExpenses.map(e => {
                const proj = projects.find(p => p.id === e.project_id);
                return (
                  <div key={e.id} className="flex items-center text-[13px] font-semibold text-slate-600 px-4 py-3.5 border-b border-white/50 last:border-0 hover:bg-white/20 transition-colors rounded-xl">
                    <div className="flex-1 truncate pr-4">{e.description}</div>
                    <div className="w-32 truncate hidden sm:block font-medium">{proj ? proj.title : 'N/A'}</div>
                    <div className="w-24">
                      <span className="px-2.5 py-1 bg-yellow-100 text-yellow-600 text-[10px] uppercase font-black tracking-widest rounded-full">
                        Expense
                      </span>
                    </div>
                    <div className="w-28 text-right font-black text-rose-500">
                      R$ {(e.amount || 0).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};
