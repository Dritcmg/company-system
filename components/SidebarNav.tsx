'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Users,
  FolderKanban,
  Settings,
  Command,
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
  { id: 'lobby',    icon: LayoutGrid,    label: 'Lobby',     color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'clients',  icon: Users,         label: 'Clientes',  color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'projects', icon: FolderKanban,  label: 'Projetos',  color: '#059669', bg: '#ECFDF5' },
];

export const SidebarNav: React.FC = () => {
  const { currentView, setCurrentView, toggleOmniInput } = useGameStore();

  return (
    <aside
      className="fixed left-0 top-16 bottom-0 z-40 flex flex-col items-center py-4 gap-2"
      style={{
        width: 64,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: '1.5px solid #E2E8F0',
      }}
    >
      {/* Main nav */}
      <div className="flex flex-col gap-1.5 flex-1">
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
      <div className="flex flex-col gap-1.5 pb-2">
        <NavButton
          icon={<Command size={17} />}
          label="Omni ⌘K"
          isActive={false}
          color="#F59E0B"
          bg="#FFFBEB"
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
      className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
      style={{
        background:  isActive ? bg : 'transparent',
        color:       isActive ? color : '#94A3B8',
        boxShadow:   isActive ? `0 4px 12px -2px ${color}30` : 'none',
        border:      isActive ? `1.5px solid ${color}25` : '1.5px solid transparent',
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
