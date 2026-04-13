'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { SidebarNav } from '@/components/SidebarNav';
import { OmniInputModal } from '@/components/OmniInputModal';

export const ClientShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { fetchClients, fetchProjects, fetchAgents, initRealtimeSubscription } = useGameStore();

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchAgents();
    initRealtimeSubscription();
  }, [fetchClients, fetchProjects, fetchAgents, initRealtimeSubscription]);

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
