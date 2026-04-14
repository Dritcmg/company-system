import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// ─── Data Types (aligned with real Supabase schema) ────────────────────────────
export type View = 'lobby' | 'clients' | 'projects' | 'agents' | 'financials';
export type ClientTag = 'lead' | 'active' | 'churned';
export type ProjectStatus = 'backlog' | 'in-progress' | 'done';
export type AgentSector = 'admin' | 'finance' | 'production' | 'omni';
export type AgentStatus = 'active' | 'maintenance' | 'offline';

// Mirrors public.system_agents
export interface SystemAgent {
  id: string;
  name: string;
  sector: AgentSector;
  system_prompt: string;
  permissions: Record<string, boolean>;
  dependencies: Record<string, unknown>;
  status: AgentStatus;
  created_at?: string;
  updated_at?: string;
  // Computed from agent_interactions count (optional)
  workload?: number;
}

// Mirrors public.clients
export interface Client {
  id: string;
  name: string;
  company: string | null;
  tag: ClientTag; // keeps existing status
  tags?: string[]; // new dynamic tags
  value: number;
  initials: string | null;
  avatar_url?: string | null;
  origin: string | null;
  communication_channel: string | null;
  created_at?: string;
}

export interface FileRecord {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  client_id: string;
  project_id: string | null;
  created_at: string;
}

// Mirrors public.projects (client_id is UUID FK)
export interface Project {
  id: string;
  client_id: string | null;   // UUID FK to clients.id
  parent_id: string | null;   // UUID FK to projects.id (hierarchy)
  title: string;
  status: ProjectStatus;
  workload: number;
  tags: string[];
  revenue: number;
  estimated_deadline: string | null;
  actual_deadline: string | null;
  created_at?: string;
  // Joined field (optional, from select with client name)
  client_name?: string;
}

export interface ProjectExpense {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  date: string;
  created_at?: string;
}

// ─── State Shape ───────────────────────────────────────────────────────────────
interface GameState {
  // Navigation
  currentView: View;
  setCurrentView: (view: View) => void;

  // Omni Input
  isOmniInputOpen: boolean;
  omniInputInitialAction: string | null;
  setOmniInputOpen: (open: boolean, action?: string | null) => void;
  toggleOmniInput: () => void;

  // Theme support
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Agent selection (lobby)
  selectedAgent: string | null;
  setSelectedAgent: (agent: string | null) => void;

  // Selected details
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  selectedSystemAgent: SystemAgent | null;
  setSelectedSystemAgent: (agent: SystemAgent | null) => void;

  updateProjectStatus: (projectId: string, newStatus: ProjectStatus) => void;

  // Supabase Fetchers
  fetchClients: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchSystemAgents: () => Promise<void>;
  fetchFiles: () => Promise<void>;
  fetchExpenses: () => Promise<void>;

  // Mutations
  createClient: (data: Omit<Client, 'id' | 'created_at' | 'tags'>) => Promise<{ error: string | null }>;
  updateClientTags: (clientId: string, tags: string[]) => Promise<{ error: string | null }>;
  uploadClientAvatar: (clientId: string, file: File) => Promise<{ error: string | null }>;
  uploadFile: (clientId: string, projectId: string | null, file: File) => Promise<{ error: string | null }>;
  deleteFile: (fileId: string) => Promise<{ error: string | null }>;
  
  createProject: (data: Omit<Project, 'id' | 'created_at' | 'client_name' | 'actual_deadline'>) => Promise<{ error: string | null }>;
  markProjectAsDone: (projectId: string) => Promise<{ error: string | null }>;
  
  createExpense: (data: Omit<ProjectExpense, 'id' | 'created_at'>) => Promise<{ error: string | null }>;
  deleteExpense: (id: string) => Promise<{ error: string | null }>;

  createSystemAgent: (data: Omit<SystemAgent, 'id' | 'created_at' | 'updated_at' | 'workload'>) => Promise<{ error: string | null }>;
  updateSystemAgent: (id: string, data: Partial<SystemAgent>) => Promise<{ error: string | null }>;

  // Quick Nav
  navigateTo: (view: View) => void;

  // Realtime
  hasInitializedRealtime: boolean;
  initRealtimeSubscription: () => void;

  // Data
  clients: Client[];
  projects: Project[];
  systemAgents: SystemAgent[];
  files: FileRecord[];
  expenses: ProjectExpense[];
}

// ─── Store ─────────────────────────────────────────────────────────────────────
export const useGameStore = create<GameState>((set, get) => ({
  currentView: 'lobby',
  setCurrentView: (view) => set({ currentView: view }),

  isOmniInputOpen: false,
  omniInputInitialAction: null,
  setOmniInputOpen: (open, action = null) => set({ isOmniInputOpen: open, omniInputInitialAction: action }),
  toggleOmniInput: () => set((s) => ({ isOmniInputOpen: !s.isOmniInputOpen, omniInputInitialAction: null })),

  theme: 'dark',
  toggleTheme: () => set(state => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    if (typeof document !== 'undefined') {
      if (newTheme === 'dark') document.documentElement.className = 'dark';
      else document.documentElement.className = '';
    }
    return { theme: newTheme };
  }),

  selectedAgent: null,
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),

  selectedClient: null,
  setSelectedClient: (client) => set({ selectedClient: client }),

  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),

  selectedSystemAgent: null,
  setSelectedSystemAgent: (agent) => set({ selectedSystemAgent: agent }),

  updateProjectStatus: (projectId, newStatus) => set((state) => ({
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, status: newStatus } : p
    )
  })),

  // ─── Fetchers ────────────────────────────────────────────────────────────────
  fetchClients: async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) set({ clients: data });
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    }
  },

  fetchProjects: async () => {
    try {
      // Join client name for display
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name, company)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped = data.map((p: Project & { clients: { name: string; company: string } | null }) => ({
          ...p,
          client_name: p.clients?.company || p.clients?.name || '—',
        }));
        set({ projects: mapped });
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    }
  },

  fetchSystemAgents: async () => {
    try {
      const { data, error } = await supabase
        .from('system_agents')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data) set({ systemAgents: data });
    } catch (e) {
      console.error('Failed to fetch system_agents:', e);
    }
  },

  fetchFiles: async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) set({ files: data });
    } catch (e) {
      console.error('Failed to fetch files:', e);
    }
  },

  fetchExpenses: async () => {
    try {
      const { data, error } = await supabase
        .from('project_expenses')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      if (data) set({ expenses: data });
    } catch (e) {
      console.error('Failed to fetch expenses:', e);
    }
  },

  // ─── Mutations ───────────────────────────────────────────────────────────────
  createClient: async (data) => {
    const initials = data.name
      .split(' ').slice(0, 2).map((n: string) => n[0].toUpperCase()).join('');
    const { error } = await supabase.from('clients').insert([{ ...data, initials }]);
    if (error) return { error: error.message };
    set((state) => ({ ...state })); // dummy update if needed
    await get().fetchClients();
    return { error: null };
  },

  updateClientTags: async (clientId, tags) => {
    const { error } = await supabase.from('clients').update({ tags }).eq('id', clientId);
    if (error) return { error: error.message };
    await get().fetchClients();
    return { error: null };
  },

  uploadClientAvatar: async (clientId, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, file);
    if (uploadError) return { error: uploadError.message };

    const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(fileName);
    const { error: updateError } = await supabase.from('clients').update({ avatar_url: publicUrlData.publicUrl }).eq('id', clientId);
    
    if (updateError) return { error: updateError.message };
    await get().fetchClients();
    return { error: null };
  },

  uploadFile: async (clientId, projectId, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, file);
    if (uploadError) return { error: uploadError.message };

    const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(fileName);
    const { error: insertError } = await supabase.from('files').insert([{
      name: file.name,
      url: publicUrlData.publicUrl,
      size: file.size,
      type: file.type || fileExt,
      client_id: clientId,
      project_id: projectId
    }]);

    if (insertError) return { error: insertError.message };
    await get().fetchFiles();
    return { error: null };
  },

  deleteFile: async (fileId) => {
    const { error } = await supabase.from('files').delete().eq('id', fileId);
    if (error) return { error: error.message };
    await get().fetchFiles();
    return { error: null };
  },

  createProject: async (data) => {
    const { error } = await supabase.from('projects').insert([data]);
    if (error) return { error: error.message };
    await get().fetchProjects();
    return { error: null };
  },

  markProjectAsDone: async (projectId) => {
    const { error } = await supabase.from('projects').update({ 
      status: 'done', 
      actual_deadline: new Date().toISOString() 
    }).eq('id', projectId);
    
    if (error) return { error: error.message };
    await get().fetchProjects();
    return { error: null };
  },

  createExpense: async (data) => {
    const { error } = await supabase.from('project_expenses').insert([data]);
    if (error) return { error: error.message };
    await get().fetchExpenses();
    return { error: null };
  },

  deleteExpense: async (id) => {
    const { error } = await supabase.from('project_expenses').delete().eq('id', id);
    if (error) return { error: error.message };
    await get().fetchExpenses();
    return { error: null };
  },

  createSystemAgent: async (data) => {
    const { error } = await supabase.from('system_agents').insert([data]);
    if (error) return { error: error.message };
    await useGameStore.getState().fetchSystemAgents();
    return { error: null };
  },

  updateSystemAgent: async (id, data) => {
    const { error } = await supabase.from('system_agents').update(data).eq('id', id);
    if (error) return { error: error.message };
    await useGameStore.getState().fetchSystemAgents();
    return { error: null };
  },

  navigateTo: (view) => set({ currentView: view, isOmniInputOpen: false }),

  // ─── Realtime ────────────────────────────────────────────────────────────────
  hasInitializedRealtime: false,
  initRealtimeSubscription: () => {
    const { hasInitializedRealtime } = get();
    if (hasInitializedRealtime) return;

    // Limpa canais pré-existentes p/ evitar colisões do React StrictMode/HMR
    supabase.getChannels().forEach(ch => supabase.removeChannel(ch));

    supabase.channel('global-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'INSERT') {
            if (s.projects.find(p => p.id === payload.new.id)) return s;
            return { projects: [payload.new as Project, ...s.projects] };
          }
          if (payload.eventType === 'DELETE') return { projects: s.projects.filter(p => p.id !== payload.old.id) };
          if (payload.eventType === 'UPDATE') return { projects: s.projects.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as Project : p) };
          return s;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'INSERT') {
            if (s.clients.find(c => c.id === payload.new.id)) return s;
            return { clients: [payload.new as Client, ...s.clients] };
          }
          if (payload.eventType === 'DELETE') return { clients: s.clients.filter(p => p.id !== payload.old.id) };
          if (payload.eventType === 'UPDATE') return { clients: s.clients.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as Client : p) };
          return s;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_agents' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'INSERT') {
            if (s.systemAgents.find(a => a.id === payload.new.id)) return s;
            return { systemAgents: [...s.systemAgents, payload.new as SystemAgent] };
          }
          if (payload.eventType === 'DELETE') return { systemAgents: s.systemAgents.filter(a => a.id !== payload.old.id) };
          if (payload.eventType === 'UPDATE') return { systemAgents: s.systemAgents.map(a => a.id === payload.new.id ? { ...a, ...payload.new } as SystemAgent : a) };
          return s;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'INSERT') {
            if (s.files.find(f => f.id === payload.new.id)) return s;
            return { files: [payload.new as FileRecord, ...s.files] };
          }
          if (payload.eventType === 'DELETE') return { files: s.files.filter(f => f.id !== payload.old.id) };
          if (payload.eventType === 'UPDATE') return { files: s.files.map(f => f.id === payload.new.id ? { ...f, ...payload.new } as FileRecord : f) };
          return s;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_expenses' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'INSERT') {
            if (s.expenses.find(e => e.id === payload.new.id)) return s;
            return { expenses: [payload.new as ProjectExpense, ...s.expenses] };
          }
          if (payload.eventType === 'DELETE') return { expenses: s.expenses.filter(e => e.id !== payload.old.id) };
          if (payload.eventType === 'UPDATE') return { expenses: s.expenses.map(e => e.id === payload.new.id ? { ...e, ...payload.new } as ProjectExpense : e) };
          return s;
        });
      })
      .subscribe();

    set({ hasInitializedRealtime: true });
  },

  clients: [],
  projects: [],
  systemAgents: [],
  files: [],
  expenses: [],
}));
