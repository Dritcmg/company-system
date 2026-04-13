'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, Client } from '@/store/useGameStore';
import { Building2, CircleUser, MoreHorizontal, X, Briefcase, Mail } from 'lucide-react';

export const ClientsView: React.FC = () => {
  const { clients } = useGameStore();

  return (
    <div className="w-full h-full flex flex-col p-10 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
            CRM Central
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Gestão de Clientes
          </h2>
        </div>
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
          Total: {clients.length}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
        {clients.map((client, i) => (
          <ClientCard key={client.id} client={client} index={i} />
        ))}
      </div>
      
      <ClientSlideOver />
    </div>
  );
};

const ClientCard: React.FC<{ client: Client; index: number }> = ({ client, index }) => {
  const isLead = client.tag === 'lead';
  const isActive = client.tag === 'active';
  
  const tagColor = isLead 
    ? 'bg-amber-100 text-amber-700 border-amber-200' 
    : isActive 
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
      : 'bg-slate-100 text-slate-500 border-slate-200';

  const { setSelectedClient } = useGameStore();

  return (
    <motion.div
      onClick={() => setSelectedClient(client)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(15,23,42,0.1)' }}
      className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
          <CircleUser size={24} strokeWidth={1.5} />
        </div>
        <button className="text-slate-300 hover:text-slate-500 transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="mb-4 flex-1">
        <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">{client.name}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-slate-500">
          <Building2 size={12} />
          <p className="text-[12px] font-medium">{client.company}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tagColor}`}>
          {client.tag}
        </div>
        <span className="text-[13px] font-bold text-slate-900">
          ${client.value.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
};

const ClientSlideOver: React.FC = () => {
  const { selectedClient, setSelectedClient } = useGameStore();

  return (
    <AnimatePresence>
      {selectedClient && (
        <>
          <motion.div
            key="client-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedClient(null)}
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(15,23,42,0.15)', backdropFilter: 'blur(2px)' }}
          />

          <motion.div
            key="client-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-[71] flex flex-col bg-slate-50 w-full max-w-md"
            style={{
              borderLeft: '1.5px solid #E2E8F0',
              boxShadow: '-20px 0 60px -8px rgba(15,23,42,0.1)',
            }}
          >
            <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-200">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-900">
                Client Details
              </h3>
              <button
                onClick={() => setSelectedClient(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 font-black text-xl">
                  {selectedClient.initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{selectedClient.name}</h2>
                  <p className="text-sm font-medium text-slate-500">{selectedClient.company}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Briefcase size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Account Value</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">${selectedClient.value.toLocaleString()}</span>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Mail size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Status</span>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{selectedClient.tag}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-h-[200px]">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Activity Log</h4>
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 mt-8">
                  <span className="text-sm">No recent activity.</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
