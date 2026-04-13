'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, Project, ProjectStatus } from '@/store/useGameStore';
import { AlignLeft, Clock, X, Tags, Activity } from 'lucide-react';

export const ProjectsKanbanView: React.FC = () => {
  const { projects } = useGameStore();

  const backlog = projects.filter((p) => p.status === 'backlog');
  const inProgress = projects.filter((p) => p.status === 'in-progress');
  const done = projects.filter((p) => p.status === 'done');

  return (
    <div className="w-full h-full flex flex-col p-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
          Centro de Comando
        </span>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Workflows & Entregas
        </h2>
      </motion.div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        <KanbanColumn title="Backlog" status="backlog" projects={backlog} color="bg-slate-200" text="text-slate-600" />
        <KanbanColumn title="In Progress" status="in-progress" projects={inProgress} color="bg-blue-200" text="text-blue-700" />
        <KanbanColumn title="Done" status="done" projects={done} color="bg-emerald-200" text="text-emerald-700" />
      </div>
      
      <ProjectSlideOver />
    </div>
  );
};

interface KanbanColumnProps {
  title: string;
  status: ProjectStatus;
  projects: Project[];
  color: string;
  text: string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, projects, color, text }) => {
  return (
    <div className="flex-1 min-w-[320px] bg-slate-50/50 rounded-3xl p-4 flex flex-col border border-slate-100">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h3 className={`text-[13px] font-bold uppercase tracking-widest ${text}`}>{title}</h3>
        </div>
        <span className="text-[11px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
          {projects.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {projects.map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} />
        ))}
      </div>
    </div>
  );
};

const ProjectCard: React.FC<{ project: Project; index: number }> = ({ project, index }) => {
  const { setSelectedProject } = useGameStore();

  return (
    <motion.div
      onClick={() => setSelectedProject(project)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, boxShadow: '0 8px 16px -4px rgba(15,23,42,0.08)' }}
      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer flex flex-col gap-3 transition-all hover:border-slate-300"
    >
      <div className="flex flex-wrap gap-1.5 mb-1">
        {project.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
            {tag}
          </span>
        ))}
      </div>

      <div>
        <h4 className="text-[14px] font-bold text-slate-900 leading-tight">{project.title}</h4>
        <p className="text-[11px] font-medium text-slate-500 mt-1">{project.client}</p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 text-slate-400">
          <AlignLeft size={14} />
          <Clock size={14} />
        </div>
        
        {project.status !== 'done' && (
          <div className="flex items-center gap-2">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Work: {project.workload}%</span>
             <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${project.workload}%` }} 
                />
             </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ProjectSlideOver: React.FC = () => {
  const { selectedProject, setSelectedProject } = useGameStore();

  return (
    <AnimatePresence>
      {selectedProject && (
        <>
          <motion.div
            key="project-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProject(null)}
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(15,23,42,0.15)', backdropFilter: 'blur(2px)' }}
          />

          <motion.div
            key="project-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-[71] flex flex-col bg-slate-50 w-full max-w-md"
            style={{
              borderLeft: '1.5px solid #E2E8F0',
              boxShadow: '-20px 0 60px -8px rgba(15,23,42,0.1)',
            }}
          >
            <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-200">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-900">
                Project Dashboard
              </h3>
              <button
                onClick={() => setSelectedProject(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500">
                    {selectedProject.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
                  {selectedProject.title}
                </h2>
                <p className="text-sm font-medium text-slate-500">Client: {selectedProject.client}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <Activity size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Workload Progress ({selectedProject.workload}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedProject.workload}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-blue-500 rounded-full" 
                  />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400 mb-4">
                  <Tags size={14} />
                  <h4 className="text-[11px] font-black uppercase tracking-widest">Tech Stack</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.tags.map(tag => (
                    <div key={tag} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 shadow-sm">
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-white">
               <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
                 Manage Project
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
