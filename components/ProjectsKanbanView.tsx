'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, Project, ProjectStatus } from '@/store/useGameStore';
import { AlignLeft, Clock, X, Tags, Activity } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export const ProjectsKanbanView: React.FC = () => {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);

  const { projects, updateProjectStatus } = useGameStore();

  const parentProjects = projects.filter(p => !p.parent_id);
  const backlog = parentProjects.filter((p) => p.status === 'backlog');
  const inProgress = parentProjects.filter((p) => p.status === 'in-progress');
  const done = parentProjects.filter((p) => p.status === 'done');

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    updateProjectStatus(result.draggableId, result.destination.droppableId as ProjectStatus);
  };

  if (!isMounted) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
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
        <KanbanColumn title="Backlog" status="backlog" projects={backlog} color="bg-[#95a3e8]" text="text-[#00258c]" />
        <KanbanColumn title="In Progress" status="in-progress" projects={inProgress} color="bg-[#d4e3fe]" text="text-[#00258c]" />
        <KanbanColumn title="Done" status="done" projects={done} color="bg-[#c6b1ec]" text="text-[#00258c]" />
      </div>
      
      <ProjectSlideOver />
      </div>
    </DragDropContext>
  );
};

interface KanbanColumnProps {
  title: string;
  status: ProjectStatus;
  projects: Project[];
  color: string;
  text: string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, status, projects, color, text }) => {
  return (
    <Droppable droppableId={status}>
      {(provided) => (
        <div 
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="flex-1 min-w-[320px] neu-inset rounded-[32px] p-5 flex flex-col"
        >
          <div className="flex items-center justify-between mb-5 px-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-3.5 h-3.5 rounded-full ${color} shadow-sm`} />
              <h3 className={`text-[12px] font-black uppercase tracking-[0.15em] ${text}`}>{title}</h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400 bg-white px-2.5 py-0.5 rounded-full shadow-sm border border-slate-100">
              {projects.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {projects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
};

const ProjectCard: React.FC<{ project: Project; index: number }> = ({ project, index }) => {
  const { setSelectedProject, projects } = useGameStore();
  const childStages = projects.filter(p => p.parent_id === project.id);
  const completedStages = childStages.filter(p => p.status === 'done');

  return (
    <Draggable draggableId={project.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
        >
          <motion.div
            onClick={() => setSelectedProject(project)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -3 }}
            className="neu-btn p-5 rounded-3xl cursor-grab active:cursor-grabbing flex flex-col gap-3 transition-all"
          >
            <div className="flex flex-wrap gap-1.5 mb-1 items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
              {childStages.length > 0 && (
                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 mt-[-2px] py-0.5 border border-slate-100 rounded">
                  {completedStages.length}/{childStages.length} Etapas
                </span>
              )}
            </div>

            <div>
              <h4 className="text-[14px] font-bold text-slate-900 leading-tight">{project.title}</h4>
              <p className="text-[11px] font-medium text-slate-500 mt-1">{project.client_name || 'Projeto Interno'}</p>
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
        </div>
      )}
    </Draggable>
  );
};

const ProjectSlideOver: React.FC = () => {
  const { selectedProject, setSelectedProject, projects, expenses, createExpense, deleteExpense, markProjectAsDone, setOmniInputOpen } = useGameStore();
  const [activeTab, setActiveTab] = React.useState<'general' | 'financials'>('general');
  const [expenseForm, setExpenseForm] = React.useState({ description: '', amount: '' });

  if (!selectedProject) return null;

  const childStages = projects.filter(p => p.parent_id === selectedProject.id);
  const projectExpenses = expenses.filter(e => e.project_id === selectedProject.id);
  const totalExpenses = projectExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const profit = selectedProject.revenue - totalExpenses;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return;
    await createExpense({
      project_id: selectedProject.id,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      date: new Date().toISOString().split('T')[0]
    });
    setExpenseForm({ description: '', amount: '' });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="project-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSelectedProject(null)}
        className="fixed inset-0 z-[70] bg-[#0F172A]/10 backdrop-blur-md"
      />

      <motion.div
        key="project-modal"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed right-0 top-2 md:top-6 bottom-2 md:bottom-6 w-full sm:w-[550px] max-w-full neu-raised shadow-[-20px_0_40px_rgba(0,0,0,0.1)] z-[71] flex flex-col rounded-l-[2rem] border-y-2 border-l-2 border-white/60"
      >
        <div className="flex items-center justify-between px-8 py-6 shrink-0 border-b border-slate-200/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500">
                {selectedProject.status}
              </span>
              {selectedProject.parent_id && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border-violet-200 bg-violet-50 text-violet-600">
                  Etapa
                </span>
              )}
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">
              {selectedProject.title}
            </h3>
            <p className="text-[12px] font-semibold text-slate-500 mt-1">{selectedProject.client_name || 'Sem Cliente Vinculado'}</p>
          </div>
          <button
            onClick={() => setSelectedProject(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 bg-white border border-slate-200 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex px-8 gap-6 border-b border-slate-100 shrink-0">
          <button 
            onClick={() => setActiveTab('general')}
            className={`py-4 text-[13px] font-bold tracking-wide uppercase transition-all border-b-2 ${activeTab === 'general' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Visão Geral e Etapas
          </button>
          {!selectedProject.parent_id && (
            <button 
              onClick={() => setActiveTab('financials')}
              className={`py-4 text-[13px] font-bold tracking-wide uppercase transition-all border-b-2 ${activeTab === 'financials' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Planejamento Financeiro
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-transparent relative">
          {activeTab === 'general' && (
             <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="neu-flat p-5 rounded-[2rem] flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Activity size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Progresso do Workload ({selectedProject.workload}%)</span>
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

                  <div className="neu-flat p-5 rounded-[2rem]">
                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                      <Tags size={14} />
                      <h4 className="text-[10px] font-bold uppercase tracking-widest">Stack e Tags</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.tags.length === 0 && <span className="text-xs text-slate-400">Sem tags.</span>}
                      {selectedProject.tags.map(tag => (
                        <div key={tag} className="px-3 py-1 bg-slate-50 text-slate-600 rounded text-[11px] font-bold border border-slate-100 shadow-sm">
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {!selectedProject.parent_id && (
                  <div className="neu-flat rounded-[2rem] overflow-hidden flex flex-col p-2">
                    <div className="px-5 py-4 border-b-2 border-white/60 flex items-center justify-between mb-2">
                      <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-600">Etapas Filhas e Sub-Projetos</h4>
                      <button onClick={() => { setSelectedProject(null); setOmniInputOpen(true, 'project'); }} className="text-[11px] font-black tracking-widest uppercase text-violet-600 hover:text-white bg-violet-100 hover:bg-violet-600 px-3 py-1.5 rounded-full transition-colors shadow-sm">
                        + Nova Etapa
                      </button>
                    </div>
                    <div className="space-y-2 px-2 pb-2">
                      {childStages.length === 0 ? (
                        <p className="text-[11px] font-semibold text-slate-400 py-6 text-center">Nenhuma etapa vinculada. Crie uma pelo Omni-Input (Cmd+K).</p>
                      ) : childStages.map(stage => (
                        <div key={stage.id} className="flex justify-between items-center p-4 hover:bg-white/40 neu-flat rounded-2xl transition-all cursor-pointer" onClick={() => setSelectedProject(stage)}>
                          <div className="flex items-center gap-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${stage.status === 'done' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                            <span className="text-[14px] font-bold text-slate-700">{stage.title}</span>
                          </div>
                          <span className="text-[11px] font-black tracking-widest uppercase text-slate-400">Workload: {stage.workload}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          )}

          {activeTab === 'financials' && (
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="neu-flat p-6 rounded-[2rem] flex flex-col gap-2 items-start justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Receita Bruta</span>
                  <span className="text-2xl font-black text-slate-800">R$ {selectedProject.revenue.toLocaleString()}</span>
                </div>
                <div className="neu-flat p-6 rounded-[2rem] flex flex-col gap-2 items-start justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Despesas Totais</span>
                  <span className="text-2xl font-black text-rose-500">R$ {totalExpenses.toLocaleString()}</span>
                </div>
                <div className="p-6 rounded-[2rem] shadow-md shadow-emerald-500/20 bg-emerald-500 flex flex-col gap-2 items-start justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Lucro Líquido Real</span>
                  <span className="text-2xl font-black text-white">R$ {profit.toLocaleString()}</span>
                </div>
              </div>

              <div className="neu-flat rounded-[2rem] overflow-hidden flex flex-col p-2">
                <div className="px-5 py-4 border-b-2 border-white/60 flex items-center justify-between mb-4">
                  <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-600">Registro de Custo da Operação</h4>
                </div>
                
                <form onSubmit={handleAddExpense} className="flex gap-3 px-4 pb-4">
                  <input 
                    type="text" 
                    placeholder="Descrição do custo (ex: API, Servidor)" 
                    className="flex-1 text-[13px] font-bold px-4 py-3 neu-inset rounded-xl outline-none placeholder:text-slate-400" 
                    value={expenseForm.description}
                    onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  />
                  <input 
                    type="number" 
                    placeholder="Valor R$" 
                    className="w-36 text-[13px] font-black px-4 py-3 neu-inset rounded-xl outline-none placeholder:text-slate-400" 
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                  />
                  <button type="submit" className="px-6 py-3 neu-btn rounded-xl text-xs font-black uppercase tracking-widest hover:text-[#06b6d4] transition-all">
                    Adicionar
                  </button>
                </form>

                <div className="px-4 pb-4 overflow-y-auto max-h-[200px] flex flex-col gap-2">
                  {projectExpenses.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">Nenhuma despesa registrada neste projeto.</p>
                  ) : projectExpenses.map(expense => (
                    <div key={expense.id} className="flex justify-between items-center px-5 py-4 neu-flat rounded-2xl hover:bg-white/30 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-black text-slate-800">{expense.description}</span>
                        <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-[14px] font-black tracking-tight text-rose-500">- R$ {expense.amount.toLocaleString()}</span>
                        <button onClick={() => deleteExpense(expense.id)} className="w-8 h-8 flex items-center justify-center neu-btn rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-transparent shrink-0 flex gap-4">
          {selectedProject.status !== 'done' && (
            <button onClick={() => markProjectAsDone(selectedProject.id)} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-50 rounded-[2rem] text-[13px] font-black tracking-[0.2em] uppercase transition-all shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] active:scale-[0.98]">
              Finalizar Projeto
            </button>
          )}
          {selectedProject.status === 'done' && (
            <div className="flex-1 py-3.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-[13px] font-black tracking-wide uppercase text-center flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              Projeto Finalizado
              {selectedProject.actual_deadline && ` em ${new Date(selectedProject.actual_deadline).toLocaleDateString()}`}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
