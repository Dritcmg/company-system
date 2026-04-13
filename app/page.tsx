'use client';

import { useGameStore } from '@/store/useGameStore';
import { AgentDesk } from '@/components/AgentDesk';
import { ClientsView } from '@/components/ClientsView';
import { ProjectsKanbanView } from '@/components/ProjectsKanbanView';
import { Building2, ShieldCheck, Cpu, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { currentView } = useGameStore();

  return (
    <div className="relative w-full h-full bg-dots">
      <AnimatePresence mode="wait">
        {currentView === 'lobby' && <LobbyView key="lobby" />}
        {currentView === 'clients' && <ClientsView key="clients" />}
        {currentView === 'projects' && <ProjectsKanbanView key="projects" />}
      </AnimatePresence>
    </div>
  );
}

// Emcapsulating original lobby into a sub-component for easy routing
const LobbyView = () => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 0.3 }}
    className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
  >
    {/* Soft ambient colour washes — very subtle */}
    <div className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 20% 30%, rgba(96,165,250,0.10) 0%, transparent 70%),' +
          'radial-gradient(ellipse 50% 45% at 80% 70%, rgba(167,139,250,0.09) 0%, transparent 70%)',
      }}
    />

    {/* Section heading */}
    <div className="mb-8 flex flex-col items-center gap-1 z-10">
      <span className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">
        Headquarters Floor
      </span>
      <h2 className="text-xl font-black text-slate-900 tracking-tight">
        Select an Operational Sector
      </h2>
    </div>

    {/* Cards grid */}
    <div className="grid grid-cols-3 gap-6 w-full max-w-3xl px-6 z-10">
      <AgentDesk
        type="admin"
        title="Administrative"
        subTitle="Front Office & Logistics"
        icon={Building2}
        progress={45}
      />
      <AgentDesk
        type="finance"
        title="Financial Center"
        subTitle="Contracts & Treasury"
        icon={ShieldCheck}
        progress={22}
      />
      <AgentDesk
        type="production"
        title="Tech Production"
        subTitle="Delivery & Pipelines"
        icon={Cpu}
        progress={88}
      />
    </div>

    {/* Bottom hint pill */}
    <div className="mt-8 flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white shadow-sm z-10 border border-slate-200">
      <MousePointer2 size={13} className="text-blue-400" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        Click a sector to open the control panel
      </span>
    </div>
  </motion.div>
);
