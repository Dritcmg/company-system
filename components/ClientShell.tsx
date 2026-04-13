'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { SidebarNav } from '@/components/SidebarNav';
import { OmniInputModal } from '@/components/OmniInputModal';

export const ClientShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toggleOmniInput } = useGameStore();

  // Keyboard shortcut for Omni Input (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleOmniInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleOmniInput]);

  return (
    <>
      <SidebarNav />
      <main className="relative pl-[64px] pt-16 w-screen h-screen overflow-hidden"> 
        {children}
      </main>
      <OmniInputModal />
    </>
  );
};
