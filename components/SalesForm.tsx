import React, { useState, useEffect, useRef } from 'react';
import { Sale, SaleStatus, ServiceType, SaleItem, Reminder, ItemStatus, User, TaskType, Attachment } from '../types';
import { Button, Input, Select } from './UIComponents';
import { translations } from '../translations';
import { generateCreativeScript } from '../services/geminiService';
import { X, Layers, CheckCircle2, Circle, Trash2, PlusCircle, Clock, Loader2, CheckCircle, Users, Sparkles, Upload, FileAudio, FileText, Image as ImageIcon } from 'lucide-react';

interface SalesFormProps {
  initialData?: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: Sale) => void;
  onDelete?: (id: string, name: string) => void;
  lang?: 'en' | 'ar';
  users: User[];
}

const SalesForm: React.FC<SalesFormProps> = ({ initialData, isOpen, onClose, onSave, onDelete, lang = 'en', users }) => {
  const t = translations[lang];
  const workers = users.filter(u => u.role === 'worker');
  const [loadingScriptIndex, setLoadingScriptIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<Sale>>({
    serviceType: ServiceType.VideoAds,
    status: SaleStatus.Lead,
    price: 0,
    quantity: 1,
    items: [{ name: '', isPaid: false, status: 'Pending', type: TaskType.General, description: '', attachments: [] }],
    clientName: '',
    phoneNumber: '',
    leadDate: new Date().toISOString().split('T')[0],
    reminders: [],
    assignedWorkerIds: [],
    teamInstructions: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        items: initialData.items.map(i => ({ 
            ...i, 
            status: i.status || 'Pending',
            type: i.type || TaskType.General,
            description: i.description || '',
            attachments: i.attachments || []
        })),
        leadDate: initialData.leadDate.split('T')[0],
        sentDate: initialData.sentDate ? initialData.sentDate.split('T')[0] : '',
        assignedWorkerIds: initialData.assignedWorkerIds || [],
        teamInstructions: initialData.teamInstructions || ''
      });
    } else {
      setFormData({
        serviceType: ServiceType.VideoAds,
        status: SaleStatus.Lead,
        price: 0,
        quantity: 1,
        items: [{ name: '', isPaid: false, status: 'Pending', type: TaskType.General, description: '', attachments: [] }],
        clientName: '',
        phoneNumber: '',
        leadDate: new Date().toISOString().split('T')[0],
        reminders: [],
        assignedWorkerIds: [],
        teamInstructions: ''
      });
    }
  }, [initialData, isOpen]);

  const handleQuantityChange = (newQty: number) => {
    const qty = Math.max(1, newQty);
    setFormData(prev => {
      const items = [...(prev.items || [])];
      if (qty > items.length) {
          for(let i=items.length; i<qty; i++) {
              items.push({ name: '', isPaid: false, status: 'Pending', type: TaskType.General, description: '', attachments: [] });
          }
      } else if (qty < items.length) {
          items.length = qty;
      }
      return { ...prev, quantity: qty, items };
    });
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    setFormData(prev => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const cycleItemStatus = (index: number) => {
    const statuses: ItemStatus[] = ['Pending', 'In Progress', 'Delivered'];
    setFormData(prev => {
      const items = [...(prev.items || [])];
      const currentStatus = items[index].status || 'Pending';
      const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
      items[index] = { ...items[index], status: statuses[nextIndex] };
      return { ...prev, items };
    });
  };

  const handleGenerateScript = async (index: number) => {
      const item = formData.items?.[index];
      if (!item || !formData.clientName) return;

      setLoadingScriptIndex(index);
      const script = await generateCreativeScript(
          formData.clientName, 
          formData.serviceType || 'General', 
          item.name || 'Task', 
          lang as 'en' | 'ar'
      );
      
      updateItem(index, 'description', script);
      setLoadingScriptIndex(null);
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const newAttachment: Attachment = {
              name: file.name,
              type: file.type.includes('audio') ? 'audio' : file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'other',
              data: base64
          };
          
          setFormData(prev => {
              const items = [...(prev.items || [])];
              items[index] = { 
                  ...items[index], 
                  attachments: [...(items[index].attachments || []), newAttachment] 
              };
              return { ...prev, items };
          });
      };
      reader.readAsDataURL(file);
      // Reset input
      e.target.value = '';
  };

  const removeAttachment = (itemIndex: number, attachIndex: number) => {
      setFormData(prev => {
          const items = [...(prev.items || [])];
          const currentAttachments = [...(items[itemIndex].attachments || [])];
          currentAttachments.splice(attachIndex, 1);
          items[itemIndex] = { ...items[itemIndex], attachments: currentAttachments };
          return { ...prev, items };
      });
  };

  const addReminder = () => setFormData(prev => ({ ...prev, reminders: [...(prev.reminders || []), { id: crypto.randomUUID(), date: new Date().toISOString().split('T')[0], note: '', isCompleted: false }] }));
  const removeReminder = (id: string) => setFormData(prev => ({ ...prev, reminders: (prev.reminders || []).filter(r => r.id !== id) }));
  const updateReminder = (id: string, updates: Partial<Reminder>) => setFormData(prev => ({ ...prev, reminders: (prev.reminders || []).map(r => r.id === id ? { ...r, ...updates } : r) }));

  const toggleWorker = (workerId: string) => {
      setFormData(prev => {
          const current = prev.assignedWorkerIds || [];
          if (current.includes(workerId)) {
              return { ...prev, assignedWorkerIds: current.filter(id => id !== workerId) };
          } else {
              return { ...prev, assignedWorkerIds: [...current, workerId] };
          }
      });
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName) return;
    onSave({
      id: initialData?.id || crypto.randomUUID(),
      clientName: formData.clientName || '',
      phoneNumber: formData.phoneNumber || '',
      serviceType: formData.serviceType as ServiceType,
      status: formData.status as SaleStatus,
      price: Number(formData.price),
      quantity: Number(formData.quantity) || 1,
      items: formData.items || [],
      leadDate: formData.leadDate || new Date().toISOString(),
      sentDate: formData.sentDate || undefined,
      reminders: formData.reminders || [],
      assignedWorkerIds: formData.assignedWorkerIds || [],
      teamInstructions: formData.teamInstructions || ''
    });
    onClose();
  };

  const getItemStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case 'In Progress': return <Loader2 size={16} className="animate-spin-slow" />;
      case 'Delivered': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getItemStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'Delivered': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="bg-primary-50 p-2 rounded-lg text-primary-600"><Layers size={20} /></div>
            <h2 className="text-xl font-bold text-slate-800">{initialData ? t.editProject : t.newProject}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto">
          {/* Client Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.clientDetails}</h3>
                <Input label={t.clientName} value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} required />
                <Input label={t.phoneNumber} value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
             </div>
             <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.projectScope}</h3>
                <Select label={t.serviceType} value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as ServiceType })} options={Object.values(ServiceType).map(v => ({ label: t.services[v], value: v }))} />
                <Select label={t.status} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as SaleStatus })} options={Object.values(SaleStatus).map(v => ({ label: t.statuses[v], value: v }))} />
                <div className="grid grid-cols-2 gap-4">
                    <Input label={t.unitPrice} type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} required />
                    <Input label={t.quantity} type="number" value={formData.quantity} onChange={(e) => handleQuantityChange(Number(e.target.value))} required />
                </div>
             </div>
          </div>
          
          <div className="h-px bg-slate-100 w-full" />

          {/* Tasks & Items - Enhanced */}
          <div>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.itemsBreakdown}</h3>
            </div>
            
            <div className="space-y-6">
                {formData.items?.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-fade-in relative group hover:border-primary-100 transition-colors">
                        <div className="absolute top-2 right-2 text-xs font-bold text-slate-300">#{i + 1}</div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                             <Input 
                                label={t.tasks.taskName}
                                placeholder={t.scope} 
                                value={item.name} 
                                onChange={(e) => updateItem(i, 'name', e.target.value)} 
                             />
                             <Select 
                                label={t.tasks.taskType}
                                options={Object.values(TaskType).map(v => ({ label: t.taskTypes[v], value: v }))}
                                value={item.type}
                                onChange={(e) => updateItem(i, 'type', e.target.value)}
                             />
                        </div>

                        {/* Script / Description Area */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    {item.type === TaskType.ScriptWriting ? t.taskTypes[TaskType.ScriptWriting] : t.teamManagement.instructions}
                                </label>
                                {item.type === TaskType.ScriptWriting && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleGenerateScript(i)}
                                        disabled={loadingScriptIndex === i || !item.name}
                                        className="text-xs font-bold text-primary-600 flex items-center gap-1 hover:text-primary-700 disabled:opacity-50"
                                    >
                                        {loadingScriptIndex === i ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                        {t.tasks.generateScript}
                                    </button>
                                )}
                            </div>
                            <textarea 
                                className="w-full rounded-xl border-slate-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm border p-3 outline-none min-h-[80px]"
                                placeholder={t.tasks.scriptPlaceholder}
                                value={item.description || ''}
                                onChange={(e) => updateItem(i, 'description', e.target.value)}
                            />
                        </div>

                        {/* File Uploads & Attachments */}
                        <div className="mb-4">
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{t.tasks.attachments}</label>
                             <div className="flex flex-wrap gap-2 mb-2">
                                 {item.attachments?.map((att, attIdx) => (
                                     <div key={attIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                                         {att.type === 'audio' ? <FileAudio size={14} className="text-purple-500" /> : att.type === 'pdf' ? <FileText size={14} className="text-red-500" /> : <ImageIcon size={14} className="text-blue-500" />}
                                         <span className="truncate max-w-[100px]">{att.name}</span>
                                         <button type="button" onClick={() => removeAttachment(i, attIdx)} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                                     </div>
                                 ))}
                                 <label className="cursor-pointer flex items-center gap-1 bg-white border border-dashed border-primary-300 text-primary-600 px-3 py-1.5 rounded-lg text-xs hover:bg-primary-50 transition-colors">
                                     <Upload size={14} /> {t.tasks.upload}
                                     <input type="file" className="hidden" accept="audio/*,application/pdf,image/*" onChange={(e) => handleFileUpload(i, e)} />
                                 </label>
                             </div>
                        </div>

                        <div className="flex gap-2 items-center justify-between border-t border-slate-50 pt-3">
                            <div className="flex gap-2">
                                {/* Status Toggle */}
                                <button type="button" onClick={() => cycleItemStatus(i)} className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all justify-center ${getItemStatusColor(item.status)}`}>
                                    {getItemStatusIcon(item.status)}
                                    <span className="text-[10px] font-bold truncate">{t.itemStatuses[item.status]}</span>
                                </button>
                                {/* Payment Toggle */}
                                <button type="button" onClick={() => updateItem(i, 'isPaid', !item.isPaid)} className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all justify-center ${item.isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
                                    {item.isPaid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                    <span className="text-[10px] font-bold">{item.isPaid ? t.paid : t.unpaid}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Team Assignment Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} /> {t.teamManagement.assignTo}
            </h3>
            
            {workers.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                    {workers.map(worker => (
                        <button
                            key={worker.id}
                            type="button"
                            onClick={() => toggleWorker(worker.id)}
                            className={`p-2 rounded-lg border text-sm font-medium transition-all text-start flex items-center justify-between ${
                                formData.assignedWorkerIds?.includes(worker.id) 
                                ? 'bg-primary-50 border-primary-200 text-primary-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span>{worker.name}</span>
                            {formData.assignedWorkerIds?.includes(worker.id) && <CheckCircle size={14} />}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-slate-400 italic">{t.teamManagement.noWorkers}</p>
            )}

            <div className="pt-2">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{t.teamManagement.instructions}</label>
                 <textarea 
                    className="w-full rounded-xl border-slate-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-3 outline-none transition-all min-h-[60px]"
                    placeholder={t.teamManagement.instructionsPlaceholder}
                    value={formData.teamInstructions}
                    onChange={(e) => setFormData({ ...formData, teamInstructions: e.target.value })}
                 />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.remindersAlerts}</h3>
              <button type="button" onClick={addReminder} className="text-primary-600 text-xs font-bold flex items-center gap-1"><PlusCircle size={14} /> {t.addReminder}</button>
            </div>
            <div className="space-y-2">
              {formData.reminders?.map(r => (
                <div key={r.id} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
                  <input type="date" value={r.date} onChange={(e) => updateReminder(r.id, { date: e.target.value })} className="text-xs outline-none" />
                  <input type="text" value={r.note} onChange={(e) => updateReminder(r.id, { note: e.target.value })} className="flex-1 text-xs outline-none" placeholder="..." />
                  <button type="button" onClick={() => removeReminder(r.id)} className="text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label={t.leadDate} type="date" value={formData.leadDate} onChange={(e) => setFormData({ ...formData, leadDate: e.target.value })} />
            <Input label={t.sentDelivered} type="date" value={formData.sentDate} onChange={(e) => setFormData({ ...formData, sentDate: e.target.value })} />
          </div>
        </form>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between">
          {initialData && onDelete ? <Button variant="danger" size="sm" onClick={() => onDelete(initialData.id, initialData.clientName)}>{t.removeProject}</Button> : <div />}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
            <Button onClick={handleSubmit}>{t.saveProject}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesForm;