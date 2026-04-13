import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// ─── Data Types ────────────────────────────────────────────────────────────────
export type View = 'lobby' | 'clients' | 'projects';
export type ClientTag = 'lead' | 'active' | 'churned';
export type ProjectStatus = 'backlog' | 'in-progress' | 'done';

export interface Agent {
  id: string;
  type: string;
  title: string;
  sub_title: string;
  progress: number;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  tag: ClientTag;
  value: number;
  initials: string;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  status: ProjectStatus;
  workload: number;
  tags: string[];
}

// ─── State Shape ───────────────────────────────────────────────────────────────
interface GameState {
  // Navigation
  currentView: View;
  setCurrentView: (view: View) => void;

  // Omni Input
  isOmniInputOpen: boolean;
  setOmniInputOpen: (open: boolean) => void;
  toggleOmniInput: () => void;

  // Agent selection (lobby)
  selectedAgent: string | null;
  setSelectedAgent: (agent: string | null) => void;

  // Selected details
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  updateProjectStatus: (projectId: string, newStatus: ProjectStatus) => void;

  // Supabase Fetchers
  fetchClients: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchAgents: () => Promise<void>;

  // Mutations
  createClient: (data: Omit<Client, 'id'>) => Promise<{ error: string | null }>;
  createProject: (data: Omit<Project, 'id'>) => Promise<{ error: string | null }>;
  createAgent: (data: Omit<Agent, 'id'>) => Promise<{ error: string | null }>;

  // Quick Nav
  navigateTo: (view: View) => void;

  // Realtime Setup
  hasInitializedRealtime: boolean;
  initRealtimeSubscription: () => void;

  // Data
  clients: Client[];
  projects: Project[];
  agents: Agent[];
}

// Real Data ─────────────────────────────────────────────────────────────────

// ─── Store ─────────────────────────────────────────────────────────────────────
export const useGameStore = create<GameState>((set) => ({
  currentView: 'lobby',
  setCurrentView: (view) => set({ currentView: view }),

  isOmniInputOpen: false,
  setOmniInputOpen: (open) => set({ isOmniInputOpen: open }),
  toggleOmniInput: () => set((s) => ({ isOmniInputOpen: !s.isOmniInputOpen })),

  selectedAgent: null,
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),

  selectedClient: null,
  setSelectedClient: (client) => set({ selectedClient: client }),

  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),

  updateProjectStatus: (projectId, newStatus) => set((state) => ({
    projects: state.projects.map((p) => 
      p.id === projectId ? { ...p, status: newStatus } : p
    )
  })),

  fetchClients: async () => {
    try {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) throw error;
      if (data) set({ clients: data });
    } catch (e) {
      console.error("Failed to fetch clients from Supabase:", e);
    }
  },

  fetchProjects: async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw error;
      if (data) set({ projects: data });
    } catch (e) {
      console.error("Failed to fetch projects from Supabase:", e);
    }
  },

  fetchAgents: async () => {
    try {
      const { data, error } = await supabase.from('agents').select('*');
      if (error) throw error;
      if (data) set({ agents: data });
    } catch (e) {
      console.error("Failed to fetch agents from Supabase:", e);
    }
  },

  createClient: async (data) => {
    const initials = data.name
      .split(' ').slice(0, 2).map((n: string) => n[0].toUpperCase()).join('');
    const { error } = await supabase.from('clients').insert([{ ...data, initials }]);
    if (error) return { error: error.message };
    return { error: null };
  },

  createProject: async (data) => {
    const { error } = await supabase.from('projects').insert([data]);
    if (error) return { error: error.message };
    return { error: null };
  },

  createAgent: async (data) => {
    const { error } = await supabase.from('agents').insert([data]);
    if (error) return { error: error.message };
    return { error: null };
  },

  navigateTo: (view) => set({ currentView: view, isOmniInputOpen: false }),

  hasInitializedRealtime: false,
  initRealtimeSubscription: () => {
    set((state) => {
      if (state.hasInitializedRealtime) return state;
      
      supabase.channel('global-database-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
          set((s) => {
            if (payload.eventType === 'INSERT') return { projects: [...s.projects, payload.new as Project] };
            if (payload.eventType === 'DELETE') return { projects: s.projects.filter(p => p.id !== payload.old.id) };
            if (payload.eventType === 'UPDATE') return { projects: s.projects.map(p => p.id === payload.new.id ? payload.new as Project : p) };
            return s;
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
          set((s) => {
            if (payload.eventType === 'INSERT') return { clients: [...s.clients, payload.new as Client] };
            if (payload.eventType === 'DELETE') return { clients: s.clients.filter(p => p.id !== payload.old.id) };
            if (payload.eventType === 'UPDATE') return { clients: s.clients.map(p => p.id === payload.new.id ? payload.new as Client : p) };
            return s;
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => {
          set((s) => {
            if (payload.eventType === 'INSERT') return { agents: [...s.agents, payload.new as Agent] };
            if (payload.eventType === 'DELETE') return { agents: s.agents.filter(p => p.id !== payload.old.id) };
            if (payload.eventType === 'UPDATE') return { agents: s.agents.map(p => p.id === payload.new.id ? payload.new as Agent : p) };
            return s;
          });
        })
        .subscribe();

      return { hasInitializedRealtime: true };
    });
  },

  clients: [],
  projects: [],
  agents: [],
}));
