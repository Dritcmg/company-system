'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Users,
  FolderKanban,
  Settings,
  Command,
  Cpu,
  TrendingUp,
} from 'lucide-react';
import { useGameStore, View } from '@/store/useGameStore';

interface NavItem {
  id: View | 'omni';
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
}

const TOP_ITEMS: NavItem[] = [
  { id: 'lobby',    icon: LayoutGrid,   label: 'Lobby',     color: '#0F172A', bg: '#F1F5F9' },
  { id: 'clients',  icon: Users,        label: 'Clientes',  color: '#0F172A', bg: '#F1F5F9' },
  { id: 'projects', icon: FolderKanban, label: 'Projetos',  color: '#0F172A', bg: '#F1F5F9' },
  { id: 'financials', icon: TrendingUp, label: 'Tesouraria',color: '#0F172A', bg: '#F1F5F9' },
  { id: 'agents',   icon: Cpu,          label: 'Agentes',   color: '#0F172A', bg: '#F1F5F9' },
];

export const SidebarNav: React.FC = () => {
  const { currentView, setCurrentView, toggleOmniInput } = useGameStore();

  return (
    <aside
      className="fixed bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-auto top-auto md:top-6 z-40 flex flex-row md:flex-col items-center justify-around md:justify-start md:py-6 py-3 px-6 md:px-0 gap-3 neu-raised rounded-[2rem] overflow-x-auto md:overflow-visible"
      style={{ width: 'auto', minWidth: 72 }}
    >
      {/* Main nav */}
      <div className="flex flex-row md:flex-col gap-1.5 md:flex-1">
        {TOP_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <NavButton
              key={item.id}
              icon={<Icon size={19} />}
              label={item.label}
              isActive={isActive}
              color={item.color}
              bg={item.bg}
              onClick={() => setCurrentView(item.id as View)}
            />
          );
        })}
      </div>

      {/* Bottom: Omni + Settings */}
      <div className="flex flex-row md:flex-col gap-1.5 md:pb-2 md:mt-auto">
        <NavButton
          icon={<Command size={17} />}
          label="Omni ⌘K"
          isActive={false}
          color="#0F172A"
          bg="#F8FAFC"
          onClick={toggleOmniInput}
        />
        <NavButton
          icon={<Settings size={17} />}
          label="Settings"
          isActive={false}
          color="#64748B"
          bg="#F8FAFC"
          onClick={() => {}}
        />
      </div>
    </aside>
  );
};

// ─── Sub-component ──────────────────────────────────────────────────────────
interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  color: string;
  bg: string;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, color, bg, onClick }) => (
  <div className="relative group">
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`w-[44px] h-[44px] rounded-2xl flex items-center justify-center transition-all duration-300 relative ${isActive ? 'neu-btn-active' : 'neu-btn'}`}
      style={{
        color: isActive ? color : 'var(--neu-text-secondary)',
      }}
    >
      {icon}
    </motion.button>

    {/* Tooltip */}
    <div
      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
      style={{ background: '#1E293B', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
    >
      {label}
    </div>
  </div>
);
