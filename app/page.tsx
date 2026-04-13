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

const ICONS: Record<string, React.ElementType> = {
  admin: Building2,
  finance: ShieldCheck,
  production: Cpu,
};

const LobbyView = () => {
  const { agents } = useGameStore();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 20% 30%, rgba(96,165,250,0.10) 0%, transparent 70%),' +
            'radial-gradient(ellipse 50% 45% at 80% 70%, rgba(167,139,250,0.09) 0%, transparent 70%)',
        }}
      />

      <div className="mb-8 flex flex-col items-center gap-1 z-10">
        <span className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">
          Headquarters Floor
        </span>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          Select an Operational Sector
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-6 w-full max-w-3xl px-6 z-10">
        {agents.length === 0 ? (
          <div className="col-span-3 text-center py-10 opacity-60">
            <Cpu size={32} className="mx-auto text-slate-300 mb-3" />
            <span className="text-sm font-semibold text-slate-500 block">Nenhum agente online detectado.</span>
            <span className="text-xs text-slate-400">Alimente o seu banco de dados para ativar as Unidades.</span>
          </div>
        ) : (
          agents.map((agent) => {
            const Icon = ICONS[agent.type] || MousePointer2;
            return (
              <AgentDesk
                key={agent.id}
                type={agent.type}
                title={agent.title}
                subTitle={agent.sub_title}
                icon={Icon}
                progress={agent.progress}
              />
            );
          })
        )}
      </div>

      <div className="mt-8 flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white shadow-sm z-10 border border-slate-200">
        <MousePointer2 size={13} className="text-blue-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Click a sector to open the control panel
        </span>
      </div>
    </motion.div>
  );
};
