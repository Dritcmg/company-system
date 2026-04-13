'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { SidebarNav } from '@/components/SidebarNav';
import { OmniInputModal } from '@/components/OmniInputModal';

export const ClientShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { fetchClients, fetchProjects, fetchAgents } = useGameStore();

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchAgents();
  }, [fetchClients, fetchProjects, fetchAgents]);

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
