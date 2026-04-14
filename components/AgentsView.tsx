'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, ShieldCheck, Cpu, Globe,
  Zap, Power, AlertTriangle, CheckCircle2,
  ChevronRight, X, Save, Loader2, Plus,
} from 'lucide-react';
import { useGameStore, SystemAgent } from '@/store/useGameStore';
import { toast } from 'sonner';

// ─── Sector icons & themes ────────────────────────────────────────────────────
const SECTOR_CONFIG: Record<string, {
  Icon: React.ElementType;
  color: string;
  bg: string;
  ring: string;
  label: string;
}> = {
  admin:      { Icon: Building2,   color: '#3B82F6', bg: '#EFF6FF', ring: '#BFDBFE', label: 'Administrativo' },
  finance:    { Icon: ShieldCheck, color: '#7C3AED', bg: '#F5F3FF', ring: '#DDD6FE', label: 'Financeiro' },
  production: { Icon: Cpu,         color: '#059669', bg: '#ECFDF5', ring: '#A7F3D0', label: 'Produção' },
  omni:       { Icon: Globe,       color: '#F59E0B', bg: '#FFFBEB', ring: '#FDE68A', label: 'Omni' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  active:      { label: 'Online',       color: '#059669', bg: '#ECFDF5', Icon: CheckCircle2  },
  maintenance: { label: 'Manutenção',   color: '#D97706', bg: '#FFFBEB', Icon: AlertTriangle },
  offline:     { label: 'Offline',      color: '#DC2626', bg: '#FEF2F2', Icon: Power         },
};

const inputCls = `w-full px-4 py-3 rounded-xl neu-inset
  text-[13px] font-medium text-slate-700 placeholder:text-slate-400
  focus:outline-none transition-all`;
const labelCls = `text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1`;

// ─── Agent Card ───────────────────────────────────────────────────────────────
const AgentCard: React.FC<{ agent: SystemAgent; onClick: () => void }> = ({ agent, onClick }) => {
  const cfg = SECTOR_CONFIG[agent.sector] || SECTOR_CONFIG.admin;
  const st = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
  const { Icon } = cfg;
  const { Icon: StatusIcon } = st;

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: `0 16px 40px -8px rgba(0,0,0,0.10), 0 0 0 2px ${cfg.ring}` }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="neu-btn p-5 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden"
    >
      {/* Top bar gradient */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color}22)` }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.bg, color: cfg.color }}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-900">{agent.name}</p>
            <p className="text-[10px] text-slate-400 font-medium">{cfg.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{ background: st.bg, color: st.color }}>
          <StatusIcon size={10} />
          {st.label}
        </div>
      </div>

      {/* System prompt preview */}
      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
        {agent.system_prompt}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t-2 border-white/60">
        <div className="flex flex-wrap gap-1.5">
          {agent.permissions && Object.keys(agent.permissions).slice(0, 3).map(k => (
            <span key={k} className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest neu-inset text-slate-500">
              {k.replace('can_', '').replace(/_/g, ' ')}
            </span>
          ))}
        </div>
        <ChevronRight size={14} className="text-slate-400" />
      </div>
    </motion.div>
  );
};

// ─── Agent Detail Drawer ──────────────────────────────────────────────────────
const AgentDrawer: React.FC<{ agent: SystemAgent; onClose: () => void }> = ({ agent, onClose }) => {
  const { updateSystemAgent, fetchSystemAgents } = useGameStore();
  const cfg = SECTOR_CONFIG[agent.sector] || SECTOR_CONFIG.admin;
  const [prompt, setPrompt] = useState(agent.system_prompt);
  const [status, setStatus] = useState(agent.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateSystemAgent(agent.id, { system_prompt: prompt, status, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error('Erro ao salvar: ' + error); return; }
    toast.success('Agente atualizado!');
    await fetchSystemAgents();
    onClose();
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed right-0 top-16 md:top-20 bottom-0 w-full sm:w-[420px] max-w-full neu-raised z-40 flex flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.05)] border-l-2 border-white/60"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b-2 border-white/60">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cfg.bg, color: cfg.color }}>
          {React.createElement(cfg.Icon, { size: 18 })}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-slate-900">{agent.name}</p>
          <p className="text-[10px] text-slate-400">{cfg.label} · ID: {agent.id.slice(0, 8)}…</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
        {/* Status */}
        <div>
          <label className={labelCls}>Status Operacional</label>
          <div className="grid grid-cols-3 gap-2">
            {(['active', 'maintenance', 'offline'] as const).map(s => {
              const st = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`py-3 rounded-[1rem] text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    status === s ? 'neu-btn-active pointer-events-none' : 'neu-btn hover:text-slate-700'
                  }`}
                  style={status === s ? {} : { color: st.color }}
                >
                  {React.createElement(st.Icon, { size: 14 })}
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className={labelCls}>System Prompt</label>
          <textarea
            rows={8}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className={`${inputCls} resize-none font-mono text-[12px]`}
            placeholder="Defina o comportamento e missão deste agente..."
          />
        </div>

        {/* Permissions (read-only view) */}
        <div>
          <label className={labelCls}>Permissões</label>
          <div className="flex flex-col gap-2">
            {agent.permissions && Object.entries(agent.permissions).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-4 py-3 rounded-2xl neu-flat">
                <span className="text-[12px] text-slate-700 font-bold uppercase tracking-wider">{k.replace(/_/g, ' ')}</span>
                <span className={`text-[11px] font-bold ${v ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {v ? '✓ Sim' : '— Não'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <label className={labelCls}>Dependências</label>
          <div className="flex flex-col gap-2">
            {agent.dependencies && Object.entries(agent.dependencies).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-4 py-3 rounded-2xl neu-flat">
                <span className="text-[12px] text-slate-600 font-bold uppercase tracking-wider">{k}</span>
                <span className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 border-t-2 border-white/60 shrink-0">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-[1.5rem] neu-btn font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{ color: cfg.color }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </motion.div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────
export const AgentsView: React.FC = () => {
  const { systemAgents, selectedSystemAgent, setSelectedSystemAgent, toggleOmniInput } = useGameStore();
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? systemAgents : systemAgents.filter(a => a.sector === filter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
      className="w-full h-full overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400 mb-1">Unidades Operacionais</p>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Agentes do Sistema</h2>
            <p className="text-[13px] text-slate-500 mt-1">
              {systemAgents.length} agente{systemAgents.length !== 1 ? 's' : ''} configurado{systemAgents.length !== 1 ? 's' : ''}
              &nbsp;·&nbsp;{systemAgents.filter(a => a.status === 'active').length} online
            </p>
          </div>
          <button
            onClick={toggleOmniInput}
            className="flex items-center gap-2 px-6 py-3 rounded-[1.5rem] neu-btn text-blue-600 text-[12px] font-black uppercase tracking-widest transition-all"
          >
            <Plus size={14} strokeWidth={3} />
            Novo Agente
          </button>
        </div>

        {/* Sector filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {[{ key: 'all', label: 'Todos' }, ...Object.entries(SECTOR_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                filter === f.key
                  ? 'neu-btn-active'
                  : 'neu-btn text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Zap size={36} className="mx-auto text-slate-200 mb-4" />
            <p className="text-[14px] font-semibold text-slate-500">Nenhum agente encontrado.</p>
            <p className="text-[12px] text-slate-400 mt-1">Use <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Ctrl+K</kbd> → Configurar Novo Agente para criar um.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => setSelectedSystemAgent(agent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedSystemAgent && (
          <AgentDrawer
            agent={selectedSystemAgent}
            onClose={() => setSelectedSystemAgent(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
