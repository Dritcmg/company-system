'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

/* Per-desk color tokens — all LIGHT pastel */
const THEME: Record<string, {
  icon: string;       // icon bg
  iconText: string;   // icon colour
  badge: string;      // online badge bg
  badgeText: string;  // online badge text
  bar: string;        // progress bar gradient
  ring: string;       // selected ring
  glow: string;       // hover/selected glow
  corner: string;     // decorative corner colour
}> = {
  admin: {
    icon:      '#EFF6FF',
    iconText:  '#3B82F6',
    badge:     '#ECFDF5',
    badgeText: '#10B981',
    bar:       'linear-gradient(90deg,#60A5FA,#818CF8)',
    ring:      '#BFDBFE',
    glow:      'rgba(96,165,250,0.18)',
    corner:    '#BFDBFE',
  },
  finance: {
    icon:      '#F5F3FF',
    iconText:  '#7C3AED',
    badge:     '#ECFDF5',
    badgeText: '#10B981',
    bar:       'linear-gradient(90deg,#A78BFA,#EC4899)',
    ring:      '#DDD6FE',
    glow:      'rgba(167,139,250,0.18)',
    corner:    '#DDD6FE',
  },
  production: {
    icon:      '#ECFDF5',
    iconText:  '#059669',
    badge:     '#ECFDF5',
    badgeText: '#10B981',
    bar:       'linear-gradient(90deg,#34D399,#0EA5E9)',
    ring:      '#A7F3D0',
    glow:      'rgba(52,211,153,0.18)',
    corner:    '#A7F3D0',
  },
};

interface AgentDeskProps {
  type: string;
  title: string;
  subTitle: string;
  icon: LucideIcon;
  progress: number;
}

export const AgentDesk: React.FC<AgentDeskProps> = ({
  type, title, subTitle, icon: Icon, progress,
}) => {
  const { selectedAgent, setSelectedAgent } = useGameStore();
  const isSelected = selectedAgent === type;
  const t = THEME[type] ?? THEME.admin;

  return (
    <motion.div
      onClick={() => setSelectedAgent(type)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -8,
        boxShadow: `0 24px 48px -8px ${t.glow}, 0 0 0 2px ${t.ring}`,
      }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="relative group cursor-pointer flex flex-col p-6 rounded-3xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: isSelected ? `2px solid ${t.ring}` : '1.5px solid #E2E8F0',
        boxShadow: isSelected
          ? `0 0 0 4px ${t.glow}, 0 20px 40px -8px ${t.glow}`
          : '0 4px 24px -4px rgba(15,23,42,0.07)',
      }}
    >
      {/* Subtle tinted top stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
        style={{ background: t.bar }}
      />

      {/* Top row */}
      <div className="flex items-center justify-between mb-6 mt-1">
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: t.badge, color: t.badgeText }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: t.badgeText }}
          />
          Online
        </div>
        <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">
          {type.slice(0, 3).toUpperCase()}-05
        </span>
      </div>

      {/* Icon + text centre */}
      <div className="flex flex-col items-center flex-1 justify-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
          style={{
            background: isSelected ? t.iconText : t.icon,
            color:      isSelected ? '#fff' : t.iconText,
            boxShadow:  isSelected ? `0 8px 20px -4px ${t.glow}` : 'none',
          }}
        >
          <Icon size={30} />
        </div>

        <div className="text-center">
          <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subTitle}</p>
        </div>
      </div>

      {/* Workload bar */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex justify-between mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Workload
          </span>
          <span className="text-[9px] font-bold text-slate-500">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: t.bar }}
          />
        </div>
      </div>

      {/* Corner marks */}
      {['top-3 left-3 border-t border-l rounded-tl-sm',
        'top-3 right-3 border-t border-r rounded-tr-sm',
        'bottom-3 left-3 border-b border-l rounded-bl-sm',
        'bottom-3 right-3 border-b border-r rounded-br-sm',
      ].map((cls, i) => (
        <span key={i} className={`absolute w-2.5 h-2.5 ${cls}`}
          style={{ borderColor: t.corner }} />
      ))}
    </motion.div>
  );
};
