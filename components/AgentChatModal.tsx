'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Paperclip, Terminal, BadgeCheck } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

const THEME: Record<string, { primary: string; bg: string; light: string }> = {
  admin:      { primary: '#3B82F6', bg: '#EFF6FF', light: '#DBEAFE' },
  finance:    { primary: '#7C3AED', bg: '#F5F3FF', light: '#EDE9FE' },
  production: { primary: '#059669', bg: '#ECFDF5', light: '#D1FAE5' },
};

const META: Record<string, { name: string; role: string }> = {
  admin:      { name: 'Administrative Center', role: 'Operations Hub' },
  finance:    { name: 'Financial Vault',        role: 'Economy Management' },
  production: { name: 'Production Engine',      role: 'Technical Services' },
};

export const AgentChatModal: React.FC = () => {
  const { selectedAgent, setSelectedAgent } = useGameStore();
  const [message, setMessage] = useState('');
  const isOpen = selectedAgent !== null;

  const t    = THEME[selectedAgent as string] ?? THEME.admin;
  const meta = META[selectedAgent as string]  ?? { name: 'Agent', role: 'Support' };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAgent(null)}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(15,23,42,0.25)', backdropFilter: 'blur(3px)' }}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-white"
            style={{
              width: 460,
              borderLeft: '1.5px solid #E2E8F0',
              boxShadow: '-20px 0 60px -8px rgba(15,23,42,0.12)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 bg-white border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ background: t.bg, color: t.primary }}
                >
                  <Terminal size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
                    {meta.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {meta.role}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5 bg-slate-50/60">
              {/* System message */}
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                  style={{ background: t.bg, color: t.primary }}
                >
                  <BadgeCheck size={16} />
                </div>
                <div
                  className="p-4 rounded-3xl rounded-tl-none max-w-[88%] bg-white shadow-sm"
                  style={{ border: '1.5px solid #E2E8F0' }}
                >
                  <p className="text-[13px] text-slate-700 leading-relaxed">
                    Greetings, Administrator. Communication channel established. I&apos;m ready to
                    manage{' '}
                    <span style={{ color: t.primary }} className="font-semibold">
                      {meta.name}
                    </span>{' '}
                    tasks. Awaiting your initial directives.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: t.light, color: t.primary }}
                    >
                      AUTH:01 SECURE
                    </span>
                    <span className="text-[9px] text-slate-300 font-mono">14:50</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">
                  Session Start
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            </div>

            {/* Input */}
            <div className="px-7 py-5 bg-white border-t border-slate-100">
              <div
                className="flex items-center gap-2 rounded-full pl-5 pr-2 py-2 bg-slate-50"
                style={{ border: '1.5px solid #E2E8F0' }}
              >
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type command or query…"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
                />
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all">
                  <Paperclip size={16} />
                </button>
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md transition-all hover:scale-105 active:scale-95"
                  style={{ background: t.primary }}
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-3">
                SSL-256 Encrypted · Internal Only
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
