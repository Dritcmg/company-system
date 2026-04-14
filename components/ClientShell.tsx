'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { SidebarNav } from '@/components/SidebarNav';
import { OmniInputModal } from '@/components/OmniInputModal';

export const ClientShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { fetchClients, fetchProjects, fetchSystemAgents, fetchFiles, fetchExpenses, initRealtimeSubscription } = useGameStore();

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchSystemAgents();
    fetchFiles();
    fetchExpenses();
    initRealtimeSubscription();
  }, [fetchClients, fetchProjects, fetchSystemAgents, fetchFiles, fetchExpenses, initRealtimeSubscription]);

  return (
    <>
      <SidebarNav />
      <main className="relative px-4 md:pl-[116px] md:pr-8 pt-[84px] md:pt-[104px] pb-24 md:pb-6 w-screen h-screen overflow-hidden"> 
        {children}
      </main>
      <OmniInputModal />
    </>
  );
};
