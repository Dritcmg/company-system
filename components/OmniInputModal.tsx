'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FolderPlus,
  UserPlus,
  Zap,
  FileText,
  BarChart2,
  ArrowRight,
  X,
} from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

interface Suggestion {
  icon: React.ElementType;
  label: string;
  description: string;
  iconColor: string;
  iconBg: string;
}

const SUGGESTIONS: Suggestion[] = [
  { icon: FolderPlus, label: 'Criar Novo Projeto',       description: 'Abrir formulário de projeto',         iconColor: '#3B82F6', iconBg: '#EFF6FF' },
  { icon: UserPlus,   label: 'Cadastrar Cliente',        description: 'Adicionar novo cliente ao CRM',       iconColor: '#7C3AED', iconBg: '#F5F3FF' },
  { icon: Zap,        label: 'Disparar Agente IA',       description: 'Executar automação via n8n',           iconColor: '#F59E0B', iconBg: '#FFFBEB' },
  { icon: FileText,   label: 'Analisar Print de Cliente',description: 'Upload de imagem para triagem',        iconColor: '#059669', iconBg: '#ECFDF5' },
  { icon: BarChart2,  label: 'Ver Relatório Financeiro', description: 'Resumo do período atual',              iconColor: '#EC4899', iconBg: '#FDF2F8' },
];

export const OmniInputModal: React.FC = () => {
  const { isOmniInputOpen, setOmniInputOpen, toggleOmniInput } = useGameStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => { setSelectedIndex(0); }, [query]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleOmniInput();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleOmniInput]);
  const filtered = query.trim()
    ? SUGGESTIONS.filter((s) =>
        s.label.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase())
      )
    : SUGGESTIONS;

  const close = () => { 
    setOmniInputOpen(false); 
    setQuery(''); 
    setSelectedIndex(0); 
  };

  const handleExecute = async (suggestion: Suggestion) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: suggestion.label, query })
      });
      // Optionally delay close to show a checkmark or success state
      setTimeout(close, 200);
    } catch (error) {
      console.error("Webhook Execution Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    }
    if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleExecute(filtered[selectedIndex]);
    }
  };

  return (
    <AnimatePresence>
      {isOmniInputOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="omni-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(15,23,42,0.20)', backdropFilter: 'blur(4px)' }}
          />

          {/* Modal */}
          <motion.div
            key="omni-modal"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed z-[61] bg-white rounded-3xl overflow-hidden"
            style={{
              width: 580,
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow:
                '0 0 0 1.5px #E2E8F0, 0 32px 80px -8px rgba(15,23,42,0.18)',
            }}
          >
            {/* Search Input */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
              <Search size={20} className="text-slate-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                disabled={isProcessing}
                placeholder={isProcessing ? "Executando ação..." : "O que você quer fazer?"}
                className="flex-1 text-[17px] font-medium text-slate-900 placeholder:text-slate-400 bg-transparent border-none outline-none disabled:opacity-50"
              />
              <button
                onClick={close}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-600 transition-all text-[11px] font-bold"
              >
                <X size={12} />
                ESC
              </button>
            </div>

            {/* Suggestions */}
            <div className="py-3 pb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 mb-2">
                {query ? 'Resultados' : 'Sugestões de Ação'}
              </p>
              <ul>
                {filtered.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.li
                      key={s.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <button
                        onClick={() => handleExecute(s)}
                        disabled={isProcessing}
                        className={`w-full flex items-center gap-4 px-5 py-3 mx-1 rounded-2xl transition-all group text-left ${
                          selectedIndex === i ? 'bg-slate-100 shadow-sm' : 'hover:bg-slate-50'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                            selectedIndex === i ? 'scale-110' : ''
                          }`}
                          style={{ background: s.iconBg, color: s.iconColor }}
                        >
                          <Icon size={17} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900">{s.label}</p>
                          <p className="text-[11px] text-slate-400 truncate">{s.description}</p>
                        </div>
                        <ArrowRight
                          size={14}
                          className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
                        />
                      </button>
                    </motion.li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="px-6 py-6 text-center text-[13px] text-slate-400">
                    Nenhuma ação encontrada para &quot;{query}&quot;.
                  </li>
                )}
              </ul>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">↑↓</kbd> navegar
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">↵</kbd> executar
              </div>
              <span className="text-[10px] text-slate-300 font-medium">Company System · Omni Input</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
