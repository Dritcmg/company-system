import { create } from 'zustand';

// ─── Data Types ────────────────────────────────────────────────────────────────
export type View = 'lobby' | 'clients' | 'projects';
export type ClientTag = 'lead' | 'active' | 'churned';
export type ProjectStatus = 'backlog' | 'in-progress' | 'done';

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
  // Resources
  budget: number;
  activeProjects: number;

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

  // Data
  clients: Client[];
  projects: Project[];
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Rafael Moura',    company: 'DevStudio Ltda.',   tag: 'active',  value: 12500, initials: 'RM' },
  { id: 'c2', name: 'Juliana Campos',  company: 'Pixel Agency',      tag: 'lead',    value: 8000,  initials: 'JC' },
  { id: 'c3', name: 'Carlos Henrique', company: 'TechFlow SAS',      tag: 'active',  value: 22000, initials: 'CH' },
  { id: 'c4', name: 'Mariana Silva',   company: 'BrandCo',           tag: 'lead',    value: 5500,  initials: 'MS' },
  { id: 'c5', name: 'Anderson Lima',   company: 'SaaS Ventures',     tag: 'churned', value: 3200,  initials: 'AL' },
  { id: 'c6', name: 'Beatriz Rocha',   company: 'StartupXP',         tag: 'active',  value: 17800, initials: 'BR' },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', title: 'Portal do Cliente',     client: 'DevStudio Ltda.',  status: 'in-progress', workload: 62, tags: ['Next.js', 'Supabase'] },
  { id: 'p2', title: 'Speaker IA',            client: 'TechFlow SAS',     status: 'in-progress', workload: 85, tags: ['n8n', 'OpenAI', 'WhatsApp'] },
  { id: 'p3', title: 'Landing Page Pixel',    client: 'Pixel Agency',     status: 'backlog',      workload: 10, tags: ['Figma', 'React'] },
  { id: 'p4', title: 'Dashboard Analytics',   client: 'SaaS Ventures',    status: 'backlog',      workload: 0,  tags: ['TypeScript', 'Recharts'] },
  { id: 'p5', title: 'Branding Redesign',     client: 'BrandCo',          status: 'done',         workload: 100, tags: ['Design', 'Illustrator'] },
  { id: 'p6', title: 'API Integrations v2',   client: 'DevStudio Ltda.',  status: 'done',         workload: 100, tags: ['Node.js', 'REST'] },
];

// ─── Store ─────────────────────────────────────────────────────────────────────
export const useGameStore = create<GameState>((set) => ({
  budget: 50000,
  activeProjects: 3,

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

  clients: MOCK_CLIENTS,
  projects: MOCK_PROJECTS,
}));
