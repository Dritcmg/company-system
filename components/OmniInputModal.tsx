'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FolderPlus, UserPlus, Zap, BarChart2,
  X, ArrowRight, ArrowLeft, Loader2, Building2,
  Users, LayoutDashboard, Cpu,
} from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionId = 'create-client' | 'create-project' | 'create-agent' | 'analyze-ai' | 'nav-clients' | 'nav-projects' | 'nav-lobby';

interface Action {
  id: ActionId;
  icon: React.ElementType;
  label: string;
  description: string;
  iconColor: string;
  iconBg: string;
  type: 'form' | 'nav' | 'ai';
}

const ACTIONS: Action[] = [
  { id: 'create-client',  icon: UserPlus,       label: 'Cadastrar Cliente',     description: 'Adicionar novo cliente ao CRM',     iconColor: '#7C3AED', iconBg: '#F5F3FF', type: 'form' },
  { id: 'create-project', icon: FolderPlus,     label: 'Criar Novo Projeto',    description: 'Abrir formulário de projeto',       iconColor: '#3B82F6', iconBg: '#EFF6FF', type: 'form' },
  { id: 'create-agent',   icon: Cpu,            label: 'Configurar Novo Agente',description: 'Adicionar unidade ao sistema',      iconColor: '#059669', iconBg: '#ECFDF5', type: 'form' },
  { id: 'analyze-ai',     icon: Zap,            label: 'Analisar com IA',       description: 'Digitar uma instrução e enviar ao n8n', iconColor: '#F59E0B', iconBg: '#FFFBEB', type: 'ai' },
  { id: 'nav-clients',    icon: Users,          label: 'Ir para Clientes',      description: 'Navegar para o CRM de clientes',   iconColor: '#EC4899', iconBg: '#FDF2F8', type: 'nav' },
  { id: 'nav-projects',   icon: LayoutDashboard,label: 'Ir para Projetos',      description: 'Navegar para o Kanban de projetos', iconColor: '#0EA5E9', iconBg: '#F0F9FF', type: 'nav' },
  { id: 'nav-lobby',      icon: Building2,      label: 'Voltar ao Lobby',       description: 'Ir para a tela inicial',            iconColor: '#6366F1', iconBg: '#EEF2FF', type: 'nav' },
  { id: 'analyze-ai',     icon: BarChart2,      label: 'Relatório Financeiro',  description: 'Solicitar relatório via IA',        iconColor: '#EC4899', iconBg: '#FDF2F8', type: 'ai' },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
const inputCls = `w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50
  text-[13px] font-medium text-slate-900 placeholder:text-slate-400
  focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all`;

const labelCls = `text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block`;

// ─── Form: Create Client ──────────────────────────────────────────────────────
const CreateClientForm: React.FC<{ onBack: () => void; onDone: () => void }> = ({ onBack, onDone }) => {
  const { createClient } = useGameStore();
  const [form, setForm] = useState({ name: '', company: '', tag: 'lead', origin: '', communication_channel: '' });
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim()) return;
    setSaving(true);
    const { error } = await createClient({
      name: form.name,
      company: form.company,
      tag: form.tag as 'lead' | 'active' | 'churned',
      value: 0,
      initials: '',
      origin: form.origin,
      communication_channel: form.communication_channel,
    });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar cliente: ' + error);
    } else {
      toast.success('Cliente cadastrado com sucesso!');
      onDone();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
      <div>
        <label className={labelCls}>Nome do cliente</label>
        <input ref={ref} className={inputCls} placeholder="ex: João Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Empresa</label>
        <input className={inputCls} placeholder="ex: TechFlow Ltda." value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Status do Cliente</label>
        <select className={inputCls} value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
          <option value="lead">Lead / Prospecto</option>
          <option value="active">Ativo</option>
          <option value="churned">Inativo</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Origem / Canal de Aquisição</label>
          <input className={inputCls} placeholder="ex: Google Ads, Indicação" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Meio de Comunicação</label>
          <input className={inputCls} placeholder="ex: WhatsApp, Email" value={form.communication_channel} onChange={e => setForm(f => ({ ...f, communication_channel: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-500 font-semibold hover:bg-slate-50 transition-all">
          Cancelar
        </button>
        <button type="submit" disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-[13px] font-bold hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? 'Salvando...' : 'Cadastrar Cliente'}
        </button>
      </div>
    </form>
  );
};

// ─── Form: Create Project ─────────────────────────────────────────────────────
const CreateProjectForm: React.FC<{ onBack: () => void; onDone: () => void }> = ({ onBack, onDone }) => {
  const { createProject, clients, projects } = useGameStore();
  const [form, setForm] = useState({ 
    title: '', 
    client: '', 
    parent_id: '',
    revenue: '',
    estimated_deadline: '',
    status: 'backlog', 
    workload: '0', 
    tags: '' 
  });
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  
  // Apenas Projetos Pai (nível superior)
  const parentProjects = projects.filter(p => !p.parent_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const { error } = await createProject({
      title: form.title,
      client_id: form.client || null,
      parent_id: form.parent_id || null,
      status: form.status as 'backlog' | 'in-progress' | 'done',
      workload: Number(form.workload) || 0,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      revenue: Number(form.revenue) || 0,
      estimated_deadline: form.estimated_deadline || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Erro ao criar projeto: ' + error);
    } else {
      toast.success('Projeto criado com sucesso!');
      onDone();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
      <div>
        <label className={labelCls}>Nome do Projeto ou Etapa</label>
        <input ref={ref} className={inputCls} placeholder="ex: Portal do Cliente (Projeto) ou Fase 1 (Etapa)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo (Hierarquia)</label>
          <select className={inputCls} value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
            <option value="">Projeto Principal (Independente)</option>
            {parentProjects.length > 0 && parentProjects.map(p => (
              <option key={p.id} value={p.id}>Etapa filha de: {p.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Cliente Associado</label>
          {clients.length > 0 ? (
            <select className={inputCls} value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} disabled={!!form.parent_id}>
              <option value="">Sem vínculo</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <div className="text-[12px] text-slate-400 py-2">Nenhum cliente</div>
          )}
        </div>
      </div>

      {!form.parent_id && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Receita Bruta Esperada (Opcional)</label>
            <input className={inputCls} type="number" placeholder="ex: 5000" value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Prazo Estimado (Opcional)</label>
            <input className={inputCls} type="date" value={form.estimated_deadline} onChange={e => setForm(f => ({ ...f, estimated_deadline: e.target.value }))} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="backlog">Backlog</option>
            <option value="in-progress">Em Progresso</option>
            <option value="done">Concluído</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Workload (%)</label>
          <input className={inputCls} type="number" min="0" max="100" placeholder="0" value={form.workload} onChange={e => setForm(f => ({ ...f, workload: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Tags (separadas por vírgula)</label>
        <input className={inputCls} placeholder="ex: Next.js, Supabase, n8n" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-500 font-semibold hover:bg-slate-50 transition-all">
          Cancelar
        </button>
        <button type="submit" disabled={saving || !form.title.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? 'Salvando...' : 'Criar Projeto'}
        </button>
      </div>
    </form>
  );
};

// ─── Form: Create Agent ──────────────────────────────────────────────────────
const CreateAgentForm: React.FC<{ onBack: () => void; onDone: () => void }> = ({ onBack, onDone }) => {
  const { createSystemAgent } = useGameStore();
  const [form, setForm] = useState({ name: '', sector: 'admin', system_prompt: '' });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  
  useEffect(() => { ref.current?.focus(); }, []);

  const handleGeneratePrompt = () => {
    setGenerating(true);
    // Simulates an AI generating the prompt via N8N/OpenAI
    setTimeout(() => {
      let prompt = '';
      switch(form.sector) {
        case 'admin': prompt = "Você é o Agente Administrativo. Sua função é receber tarefas organizacionais, atualizar CRM, disparar webhooks via n8n e manter as métricas em dia. Sempre responda com tom formal, focando em precisão e eficiência."; break;
        case 'finance': prompt = "Você é o Agente Financeiro. Controle fluxo de caixa, emita faturas via API de pagamento e avalie riscos em novos contratos. Escalonar automaticamente discrepâncias de valor para análise manual. Tom objetivo."; break;
        case 'production': prompt = "Você é o Agente de Produção Tech. Avalie Github Commits, verifique testes, otimize milestones de engenharia e alerte a equipe sobre débitos técnicos críticos. Foque 100% na qualidade do software entregue."; break;
        case 'omni': prompt = "Você é o Agente Omni Router. Sua função é classificar intenções e encaminhar a chamada para o setor correto (Financeiro, Administativo, Produção). Sempre forneça contexto na transição de dados estruturados."; break;
      }
      setForm(f => ({ ...f, system_prompt: prompt }));
      setGenerating(false);
      toast.success('Prompt executivo gerado com sucesso!');
    }, 900);
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !skills.includes(val)) {
        setSkills([...skills, val]);
      }
      setSkillInput('');
    }
  };

  const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.system_prompt.trim()) {
      toast.error('Preencha os dados e gere um prompt!');
      return;
    }
    
    setSaving(true);
    const { error } = await createSystemAgent({
      name: form.name,
      sector: form.sector as 'admin'|'finance'|'production'|'omni',
      system_prompt: form.system_prompt,
      status: 'active',
      permissions: { can_execute: true },
      dependencies: { tools: skills }
    });
    setSaving(false);
    
    if (error) toast.error('Erro ao configurar agente: ' + error);
    else {
      toast.success('Agente habilitado com sucesso!');
      onDone();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Nome do Agente</label>
          <input ref={ref} className={inputCls} placeholder="ex: Financial Oracle" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Setor (Função)</label>
          <select className={inputCls} value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
            <option value="admin">Administrativo</option>
            <option value="finance">Financeiro</option>
            <option value="production">Produção Tech</option>
            <option value="omni">Omni / Router</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className={labelCls}>System Prompt Base</label>
        <div className="relative">
          <textarea 
            className={`${inputCls} resize-none text-[12px] h-24 mb-1 pr-1`} 
            placeholder="Comportamento e objetivos essenciais (digite ou gere com IA)..." 
            value={form.system_prompt} 
            onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))} 
          />
          <button 
            type="button" 
            disabled={generating}
            onClick={handleGeneratePrompt}
            className="absolute top-2 right-2 bg-gradient-to-tr from-amber-400 to-amber-500 text-white p-1.5 rounded-lg shadow-sm hover:scale-105 transition-all outline-none"
            title="Autogerar Prompt Inicial"
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} className="fill-white/80" />}
          </button>
        </div>
      </div>

      <div>
        <label className={labelCls}>Ferramentas / Skills <span className="text-slate-400 font-normal lowercase">(Aperte Enter)</span></label>
        <div className="p-1 mb-2 min-h-8 border border-slate-200 bg-slate-50 flex flex-wrap gap-1.5 rounded-xl cursor-text" onClick={() => document.getElementById('skill-input')?.focus()}>
          {skills.map(s => (
            <span key={s} className="bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
              {s} <X size={10} className="hover:text-emerald-950 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeSkill(s); }} />
            </span>
          ))}
          <input 
            id="skill-input"
            type="text" 
            className="flex-1 min-w-[80px] bg-transparent outline-none border-none text-[12px] font-medium px-2 py-1 text-slate-700" 
            placeholder={skills.length === 0 ? "Ex: read_github_issue, mcp_supabase..." : ""}
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={handleAddSkill}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-500 font-semibold hover:bg-slate-50 transition-all">
          Cancelar
        </button>
        <button type="submit" disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(5,150,105,0.25)]">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? 'Habilitando...' : 'Habilitar Agente'}
        </button>
      </div>
    </form>
  );
};

// ─── Form: AI Analysis ───────────────────────────────────────────────────────
const AIAnalysisForm: React.FC<{ initialQuery: string; onBack: () => void; onDone: () => void }> = ({ initialQuery, onBack, onDone }) => {
  const [prompt, setPrompt] = useState(initialQuery);
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setSending(true);
    const toastId = toast.loading('Enviando para a IA...');
    try {
      const res = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', context_role: 'master_1', query: prompt }),
      });
      if (!res.ok) throw new Error('Falha na requisição');
      toast.success('IA acionada com sucesso!', { id: toastId });
      onDone();
    } catch {
      toast.error('Erro ao contatar o n8n. Verifique a conexão.', { id: toastId });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="px-6 py-5 flex flex-col gap-4">
      <div>
        <label className={labelCls}>Instrução para a IA</label>
        <textarea
          ref={ref}
          rows={4}
          className={`${inputCls} resize-none`}
          placeholder="ex: Analise o contrato da Nicole e me diga os próximos gatilhos de pagamento."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </div>
      <p className="text-[10px] text-slate-400">
        A instrução será enviada ao n8n com o contexto <strong>master_1</strong> e processada pelo agente de IA configurado.
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-500 font-semibold hover:bg-slate-50 transition-all">
          Cancelar
        </button>
        <button type="submit" disabled={sending || !prompt.trim()} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-[13px] font-bold hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {sending ? 'Enviando...' : 'Analisar com IA'}
        </button>
      </div>
    </form>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const OmniInputModal: React.FC = () => {
  const { isOmniInputOpen, setOmniInputOpen, toggleOmniInput, navigateTo, omniInputInitialAction } = useGameStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);

  useEffect(() => {
    if (isOmniInputOpen && omniInputInitialAction) {
      setActiveAction(omniInputInitialAction as ActionId);
      setQuery('');
    }
  }, [isOmniInputOpen, omniInputInitialAction]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleOmniInput();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleOmniInput]);

  const filteredActions = query.trim()
    ? ACTIONS.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.description.toLowerCase().includes(query.toLowerCase())
      )
    : ACTIONS;

  // Deduplicate by label for the list
  const uniqueActions = filteredActions.filter((a, i, arr) => arr.findIndex(b => b.label === a.label) === i);

  const close = () => {
    setOmniInputOpen(false);
    setQuery('');
    setSelectedIndex(0);
    setActiveAction(null);
  };

  const handleSelectAction = (action: Action) => {
    if (action.type === 'nav') {
      if (action.id === 'nav-clients') navigateTo('clients');
      else if (action.id === 'nav-projects') navigateTo('projects');
      else navigateTo('lobby');
      close();
      return;
    }
    setActiveAction(action.id as ActionId);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => (p < uniqueActions.length - 1 ? p + 1 : 0)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(p => (p > 0 ? p - 1 : uniqueActions.length - 1)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (uniqueActions[selectedIndex]) handleSelectAction(uniqueActions[selectedIndex]);
      else if (query.trim()) setActiveAction('analyze-ai'); // free-text → AI
    }
  };

  const formTitle: Record<string, string> = {
    'create-client': 'Cadastrar Cliente',
    'create-project': 'Criar Novo Projeto',
    'create-agent': 'Configurar Agente',
    'analyze-ai': 'Analisar com IA',
  };

  return (
    <AnimatePresence>
      {isOmniInputOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="omni-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(15,23,42,0.22)', backdropFilter: 'blur(4px)' }}
          />

          {/* Panel */}
          <motion.div
            key="omni-panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed z-[61] neu-raised rounded-[2rem] overflow-hidden border-[3px] border-white/60 w-[95vw] md:w-[580px] max-w-full"
            style={{
              top: '14%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b-2 border-white/60">
              {activeAction ? (
                <button
                  onClick={() => setActiveAction(null)}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center neu-btn text-slate-400 hover:text-slate-700 transition-all shrink-0"
                >
                  <ArrowLeft size={16} />
                </button>
              ) : (
                <Search size={18} className="text-slate-400 shrink-0 ml-2" />
              )}

              {activeAction ? (
                <p className="flex-1 text-[15px] font-bold text-slate-800">{formTitle[activeAction]}</p>
              ) : (
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="O que você quer fazer? (ou descreva para a IA...)"
                  className="flex-1 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 bg-transparent border-none outline-none"
                />
              )}

              <button
                onClick={close}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[1rem] neu-btn text-slate-400 hover:text-rose-500 transition-all text-[10px] font-black uppercase tracking-widest shrink-0"
              >
                <X size={12} strokeWidth={3} /> ESC
              </button>
            </div>

            {/* Body — conditional */}
            <AnimatePresence mode="wait">
              {activeAction ? (
                <motion.div
                  key={activeAction}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                >
                  {activeAction === 'create-client' && <CreateClientForm onBack={() => setActiveAction(null)} onDone={close} />}
                  {activeAction === 'create-project' && <CreateProjectForm onBack={() => setActiveAction(null)} onDone={close} />}
                  {activeAction === 'create-agent' && <CreateAgentForm onBack={() => setActiveAction(null)} onDone={close} />}
                  {activeAction === 'analyze-ai' && <AIAnalysisForm initialQuery={query} onBack={() => setActiveAction(null)} onDone={close} />}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                  className="py-2 pb-3 max-h-72 overflow-y-auto"
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-5 mb-1.5 mt-1">
                    {query ? 'Resultados' : 'Ações Disponíveis'}
                  </p>
                  <ul>
                    {uniqueActions.map((action, i) => {
                      const Icon = action.icon;
                      return (
                        <motion.li
                          key={action.label}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <button
                            onClick={() => handleSelectAction(action)}
                            className={`w-full flex items-center gap-4 px-4 py-3 mx-1 rounded-2xl transition-all group text-left ${
                              selectedIndex === i ? 'neu-inset' : 'hover:neu-flat'
                            }`}
                            style={{ width: 'calc(100% - 8px)' }}
                          >
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform ${selectedIndex === i ? 'scale-110' : ''}`}
                              style={{ background: action.iconBg, color: action.iconColor }}
                            >
                              <Icon size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-semibold text-slate-900">{action.label}</p>
                              <p className="text-[10.5px] text-slate-400 truncate">{action.description}</p>
                            </div>
                            <ArrowRight
                              size={13}
                              className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0"
                            />
                          </button>
                        </motion.li>
                      );
                    })}
                    {uniqueActions.length === 0 && (
                      <li className="px-5 py-5 text-center">
                        <p className="text-[13px] text-slate-400">Nenhuma ação encontrada.</p>
                        <button
                          onClick={() => setActiveAction('analyze-ai')}
                          className="mt-2 text-[12px] text-blue-500 font-semibold hover:underline"
                        >
                          Enviar &quot;{query}&quot; para a IA →
                        </button>
                      </li>
                    )}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            {!activeAction && (
              <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">
                  <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">↑↓</kbd> navegar</span>
                  <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">↵</kbd> selecionar</span>
                  <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">ESC</kbd> fechar</span>
                </div>
                <span className="text-[9.5px] text-slate-300 font-medium">Company System · Omni Input</span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
