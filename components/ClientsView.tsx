'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, Client } from '@/store/useGameStore';
import { Building2, CircleUser, MoreHorizontal, X, Briefcase, Mail, UserPlus, Camera, Paperclip, Upload, Tag as TagIcon, Trash2, File as FileIcon, Plus } from 'lucide-react';

export const ClientsView: React.FC = () => {
  const { clients, setOmniInputOpen } = useGameStore();

  return (
    <div className="w-full h-full flex flex-col p-10 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
            CRM Central
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Gestão de Clientes
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest neu-inset px-4 py-2 rounded-full flex items-center h-10">
            Total: {clients.length}
          </div>
          <button 
            onClick={() => setOmniInputOpen(true, 'create-client')}
            className="flex items-center gap-2 px-4 h-10 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(124,58,237,0.4)]"
          >
            <UserPlus size={15} />
            Novo Cliente
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
        {clients.map((client, i) => (
          <ClientCard key={client.id} client={client} index={i} />
        ))}
      </div>
      
      <ClientSlideOver />
    </div>
  );
};

const ClientCard: React.FC<{ client: Client; index: number }> = ({ client, index }) => {
  const isLead = client.tag === 'lead';
  const isActive = client.tag === 'active';
  
  const tagColor = isLead 
    ? 'bg-amber-100 text-amber-700 border-amber-200' 
    : isActive 
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
      : 'bg-slate-100 text-slate-500 border-slate-200';

  const { setSelectedClient, projects, expenses } = useGameStore();
  
  const clientProjects = projects.filter(p => p.client_id === client.id);
  const grossRevenue = clientProjects.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const clientProjectIds = clientProjects.map(p => p.id);
  const clientExpenses = expenses.filter(e => clientProjectIds.includes(e.project_id)).reduce((acc, curr) => acc + curr.amount, 0);
  const calculatedLTV = grossRevenue - clientExpenses;

  return (
    <motion.div
      onClick={() => setSelectedClient(client)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="neu-btn p-5 rounded-[2rem] flex flex-col cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-slate-400 overflow-hidden relative">
          {client.avatar_url ? (
            <img src={client.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <CircleUser size={24} strokeWidth={1.5} />
          )}
        </div>
        <button className="text-slate-300 hover:text-slate-500 transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="mb-4 flex-1">
        <h3 className="text-[16px] font-bold text-slate-900 tracking-tight leading-tight">{client.name}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-slate-500">
          <Building2 size={12} />
          <p className="text-[12px] font-medium">{client.company}</p>
        </div>
        {client.tags && client.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {client.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider rounded-md border border-slate-200">
                {tag}
              </span>
            ))}
            {client.tags.length > 3 && (
              <span className="px-2 py-0.5 neu-inset text-slate-400 text-[9px] font-bold rounded-md">
                +{client.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t-2 border-white/60">
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tagColor}`}>
          {client.tag === 'lead' ? 'Lead' : client.tag === 'active' ? 'Ativo' : 'Inativo'}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Receita Acumulada</span>
          <span className="text-[13.5px] font-black text-slate-900 leading-none">
            R$ {calculatedLTV.toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const ClientSlideOver: React.FC = () => {
  const { selectedClient, setSelectedClient, uploadClientAvatar, uploadFile, files, updateClientTags, deleteFile, projects, expenses } = useGameStore();

  const clientProjects = projects.filter(p => p.client_id === selectedClient?.id);
  const grossRevenue = clientProjects.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const clientProjectIds = clientProjects.map(p => p.id);
  const clientExpenses = expenses.filter(e => clientProjectIds.includes(e.project_id)).reduce((acc, curr) => acc + curr.amount, 0);
  const calculatedLTV = grossRevenue - clientExpenses;

  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const [tagInput, setTagInput] = React.useState('');
  
  const [uploadingFile, setUploadingFile] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedClient) return;
    setUploadingAvatar(true);
    await uploadClientAvatar(selectedClient.id, e.target.files[0]);
    
    // Optimistic update of selected client
    setSelectedClient({ ...selectedClient, avatar_url: URL.createObjectURL(e.target.files[0]) });
    setUploadingAvatar(false);
  };

  const handleAddTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && selectedClient) {
      const newTags = [...(selectedClient.tags || []), tagInput.trim().toUpperCase()];
      setTagInput('');
      setSelectedClient({ ...selectedClient, tags: newTags });
      await updateClientTags(selectedClient.id, newTags);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedClient) return;
    const newTags = (selectedClient.tags || []).filter(t => t !== tagToRemove);
    setSelectedClient({ ...selectedClient, tags: newTags });
    await updateClientTags(selectedClient.id, newTags);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedClient) return;
    setUploadingFile(true);
    await uploadFile(selectedClient.id, null, e.target.files[0]); // General client file
    setUploadingFile(false);
  };

  const clientFiles = files.filter(f => f.client_id === selectedClient?.id);

  return (
    <AnimatePresence>
      {selectedClient && (
        <>
          <motion.div
            key="client-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedClient(null)}
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(15,23,42,0.15)', backdropFilter: 'blur(2px)' }}
          />

          <motion.div
            key="client-panel"
            initial={{ opacity: 0, scale: 0.95, y: 10, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: 10, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[71] flex flex-col neu-raised w-[95vw] max-w-lg max-h-[90vh] rounded-[2rem] overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b-2 border-white/60">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-900">
                Client Details
              </h3>
              <button
                onClick={() => setSelectedClient(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Header Profile with Avatar Upload */}
              <div className="neu-flat p-5 rounded-[2rem] flex items-center gap-5">
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl neu-inset flex flex-col items-center justify-center text-slate-400 overflow-hidden relative cursor-pointer group transition-all"
                >
                  {selectedClient.avatar_url ? (
                    <>
                      <img src={selectedClient.avatar_url} alt="Avatar" className="w-full h-full object-cover transition-all group-hover:opacity-40" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={20} className="text-slate-800" />
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-black text-xl text-slate-300 group-hover:hidden">{selectedClient.initials}</span>
                      <Camera size={20} className="hidden group-hover:block text-violet-500" />
                    </>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></span>
                    </div>
                  )}
                </div>
                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />

                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{selectedClient.name}</h2>
                  <p className="text-sm font-medium text-slate-500">{selectedClient.company || 'Sem empresa vinculada'}</p>
                </div>
              </div>

              {/* Status / LTV Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="neu-flat p-5 rounded-[2rem]">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Briefcase size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Receita (LTV)</span>
                  </div>
                  <span className="text-lg font-black text-emerald-600 leading-none block mt-1">R$ {calculatedLTV.toLocaleString()}</span>
                </div>
                
                <div className="neu-flat p-5 rounded-[2rem]">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Mail size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Status Principal</span>
                  </div>
                  <span className="text-[12px] font-black uppercase tracking-wider text-slate-700 block mt-1">{selectedClient.tag === 'lead' ? 'Lead' : selectedClient.tag === 'active' ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>

              {/* Dynamic Tags Manager */}
              <div className="neu-flat p-5 rounded-[2rem]">
                <div className="flex items-center gap-2 mb-4">
                  <TagIcon size={14} className="text-slate-400" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Tags do Cliente</h4>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedClient.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-bold text-slate-700 uppercase tracking-wider group">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {(!selectedClient.tags || selectedClient.tags.length === 0) && (
                    <span className="text-[12px] text-slate-400 italic">Nenhuma tag customizada adicionada.</span>
                  )}
                </div>

                <div className="relative">
                  <input 
                    type="text" 
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Adicionar nova tag (Aperte Enter)"
                    className="w-full neu-inset rounded-full px-4 py-3 text-[12px] font-medium outline-none transition-all placeholder:text-slate-400 text-slate-700 bg-transparent"
                  />
                  <Plus size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Files Manager */}
              <div className="neu-flat p-5 rounded-[2rem] min-h-[250px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Paperclip size={14} className="text-slate-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Arquivos Anexados</h4>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {uploadingFile ? (
                      <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Upload size={12} />
                    )}
                    {uploadingFile ? 'Enviando...' : 'Anexar'}
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                </div>

                <div className="flex-1 overflow-y-auto pr-1 flex flex-col space-y-2 mt-4">
                  {clientFiles.length > 0 ? (
                    clientFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-3 neu-inset rounded-xl group transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-[var(--neu-bg)] shadow-[2px_2px_5px_var(--neu-shadow-dark),-2px_-2px_5px_var(--neu-shadow-light)] flex items-center justify-center text-violet-500 shrink-0">
                            {file.type.includes('image') ? <Camera size={16} /> : <FileIcon size={16} />}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-bold text-slate-800 truncate hover:text-violet-600 transition-colors">
                              {file.name}
                            </a>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</span>
                              {file.project_id && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded">Projeto</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteFile(file.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-6">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                        <Paperclip size={20} className="text-slate-300" />
                      </div>
                      <span className="text-[12px] font-medium text-center">Nenhum arquivo anexado.<br/>Use o botão acima para subir documentos.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
