
import React, { useState, useEffect, useRef } from 'react';
import { Sale, SaleStatus, ServiceType, SaleItem, Reminder, ItemStatus, User, TaskType, Attachment } from '../types';
import { Button, Input, Select } from './UIComponents';
import { translations } from '../translations';
import { generateCreativeScript } from '../services/geminiService';
import { X, Layers, CheckCircle2, Circle, Trash2, PlusCircle, Clock, Loader2, CheckCircle, Users, Sparkles, Upload, FileAudio, FileText, Image as ImageIcon, AlertTriangle, Calculator, FileCheck, Info, DollarSign, UserCheck } from 'lucide-react';

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

  // Pricing State
  const [basePrice, setBasePrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  const [formData, setFormData] = useState<Partial<Sale>>({
    serviceType: ServiceType.VideoAds,
    status: SaleStatus.Lead,
    price: 0,
    quantity: 1,
    items: [{ name: '', isPaid: false, status: 'Pending', type: TaskType.General, description: '', attachments: [], deliverables: [] }],
    clientName: '',
    phoneNumber: '',
    leadDate: new Date().toISOString().split('T')[0],
    reminders: [],
    assignedWorkerIds: [],
    teamInstructions: '',
    hasClientModifications: false,
    isReturningCustomer: false
  });

  useEffect(() => {
    if (initialData) {
      setBasePrice(initialData.price); // Assume stored price is the base if editing (or user can adjust)
      setDiscount(0); // Reset discount on edit to avoid double applying
      setFormData({
        ...initialData,
        items: initialData.items.map(i => ({ 
            ...i, 
            status: i.status || 'Pending',
            type: i.type || TaskType.General,
            description: i.description || '',
            attachments: i.attachments || [],
            deliverables: i.deliverables || []
        })),
        leadDate: initialData.leadDate.split('T')[0],
        sentDate: initialData.sentDate ? initialData.sentDate.split('T')[0] : '',
        assignedWorkerIds: initialData.assignedWorkerIds || [],
        teamInstructions: initialData.teamInstructions || '',
        hasClientModifications: initialData.hasClientModifications || false,
        isReturningCustomer: initialData.isReturningCustomer || false
      });
    } else {
      setBasePrice(0);
      setDiscount(0);
      setFormData({
        serviceType: ServiceType.VideoAds,
        status: SaleStatus.Lead,
        price: 0,
        quantity: 1,
        items: [{ name: '', isPaid: false, status: 'Pending', type: TaskType.General, description: '', attachments: [], deliverables: [] }],
        clientName: '',
        phoneNumber: '',
        leadDate: new Date().toISOString().split('T')[0],
        reminders: [],
        assignedWorkerIds: [],
        teamInstructions: '',
        hasClientModifications: false,
        isReturningCustomer: false
      });
    }
  }, [initialData, isOpen]);

  // Update formData.price whenever basePrice or discount changes
  useEffect(() => {
    const finalUnitPrice = basePrice * (1 - discount / 100);
    setFormData(prev => ({ ...prev, price: finalUnitPrice }));
  }, [basePrice, discount]);

  const handleQuantityChange = (newQty: number) => {
    const qty = Math.max(1, newQty);
    setFormData(prev => {
      const items = [...(prev.items || [])];
      if (qty > items.length) {
          for(let i=items.length; i<qty; i++) {
              items.push({ name: '', isPaid: false, status: 'Pending', type: TaskType.General, description: '', attachments: [], deliverables: [] });
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
    const statuses: ItemStatus[] = ['Pending', 'In Progress', 'Delivered', 'Needs Revision'];
    setFormData(prev => {
      const items = [...(prev.items || [])];
      const currentStatus = items[index].status || 'Pending';
      const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
      const nextStatus = statuses[nextIndex];
      
      // If switching to "Needs Revision", prompt for reason
      if (nextStatus === 'Needs Revision') {
          const reason = prompt(t.tasks.enterRejectionReason);
          if (reason) {
              items[index] = { ...items[index], status: nextStatus, rejectionNote: reason };
          } else {
              return prev; // Cancel change if no reason given
          }
      } else {
          items[index] = { ...items[index], status: nextStatus };
      }
      
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
      processFile(index, file);
      e.target.value = ''; // Reset input
  };

  // Logic to process a file (from upload or paste) and add to attachments
  const processFile = (index: number, file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          // Generate a name for pasted files if missing
          const fileName = file.name || `Pasted_File_${new Date().getTime()}.${file.type.split('/')[1] || 'png'}`;
          
          const newAttachment: Attachment = {
              name: fileName,
              type: file.type.includes('audio') ? 'audio' : file.type.includes('pdf') ? 'pdf' : file.type.includes('video') ? 'video' : file.type.includes('image') ? 'image' : 'other',
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
  };

  const handlePaste = (index: number, e: React.ClipboardEvent) => {
      // Check if clipboard contains files
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          e.preventDefault(); // Prevent default paste behavior if it's a file
          Array.from(e.clipboardData.files).forEach(file => {
              processFile(index, file as File);
          });
      }
      // If it's text, let it paste normally into the focused field
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

  const addReminder = () => setFormData(prev => ({ 
      ...prev, 
      reminders: [
          ...(prev.reminders || []), 
          { 
              id: crypto.randomUUID(), 
              date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
              note: '', 
              isCompleted: false 
          }
      ] 
  }));
  
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

  const toggleAllItemsPaymentStatus = () => {
      setFormData(prev => {
          const items = [...(prev.items || [])];
          const allPaid = items.length > 0 && items.every(i => i.isPaid);
          const newStatus = !allPaid;
          
          const updatedItems = items.map(i => ({ ...i, isPaid: newStatus }));
          return { ...prev, items: updatedItems };
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
      price: Number(formData.price), // This is the calculated Final Unit Price
      quantity: Number(formData.quantity) || 1,
      items: formData.items || [],
      leadDate: formData.leadDate || new Date().toISOString(),
      sentDate: formData.sentDate || undefined,
      reminders: formData.reminders || [],
      assignedWorkerIds: formData.assignedWorkerIds || [],
      teamInstructions: formData.teamInstructions || '',
      hasClientModifications: formData.hasClientModifications,
      isReturningCustomer: formData.isReturningCustomer
    });
    onClose();
  };

  const getItemStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case 'In Progress': return <Loader2 size={16} className="animate-spin-slow" />;
      case 'Delivered': return <CheckCircle size={16} />;
      case 'Needs Revision': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getItemStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'Delivered': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'Needs Revision': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100';
    }
  };

  // Helper to ensure valid datetime-local value
  const getSafeDateValue = (dateStr: string) => {
      if (!dateStr) return '';
      // If legacy YYYY-MM-DD, append time
      if (dateStr.length === 10) return `${dateStr}T09:00`;
      return dateStr;
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
                
                {/* Modification Toggle */}
                <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all hover:bg-slate-50 bg-white border-slate-200">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.hasClientModifications ? 'bg-orange-500 border-orange-500' : 'bg-white border-slate-300'}`}>
                            {formData.hasClientModifications && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={formData.hasClientModifications} 
                            onChange={(e) => setFormData({...formData, hasClientModifications: e.target.checked})} 
                        />
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 select-none">
                            <AlertTriangle size={16} className={formData.hasClientModifications ? 'text-orange-500' : 'text-slate-400'} />
                            {t.markAsModification}
                        </div>
                    </label>
                </div>

                {/* Returning Customer Toggle */}
                <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all hover:bg-slate-50 bg-white border-slate-200">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isReturningCustomer ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}`}>
                            {formData.isReturningCustomer && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={formData.isReturningCustomer} 
                            onChange={(e) => setFormData({...formData, isReturningCustomer: e.target.checked})} 
                        />
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 select-none">
                            <UserCheck size={16} className={formData.isReturningCustomer ? 'text-blue-500' : 'text-slate-400'} />
                            {t.markAsReturning}
                        </div>
                    </label>
                </div>
             </div>
             
             {/* Project Scope & Pricing Calculator */}
             <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.projectScope}</h3>
                <Select label={t.serviceType} value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as ServiceType })} options={Object.values(ServiceType).map(v => ({ label: t.services[v], value: v }))} />
                <Select label={t.status} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as SaleStatus })} options={Object.values(SaleStatus).map(v => ({ label: t.statuses[v], value: v }))} />
                
                {/* Dynamic Pricing Block */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                   <div className="flex items-center gap-2 text-xs font-bold text-primary-600 uppercase mb-1">
                      <Calculator size={14} /> Pricing Calculator
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <Input label={t.unitPrice} type="number" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} required />
                      <Input label={t.quantity} type="number" value={formData.quantity} onChange={(e) => handleQuantityChange(Number(e.target.value))} required />
                   </div>
                   <div className="grid grid-cols-2 gap-3 items-center">
                      <Input label="Discount (%)" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} min={0} max={100} />
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col items-end justify-center shadow-sm h-[74px]">
                          <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Amount</span>
                          <span className="text-xl font-bold text-emerald-600 truncate w-full text-right">
                              {(Number(formData.price) * Number(formData.quantity)).toLocaleString()} <span className="text-xs font-normal text-slate-400">{t.mad}</span>
                          </span>
                      </div>
                   </div>
                   <div className="text-[10px] text-center text-slate-400 font-medium">
                       Final Unit Price: {Number(formData.price).toFixed(2)} {t.mad}
                   </div>
                </div>
             </div>
          </div>
          
          <div className="h-px bg-slate-100 w-full" />

          {/* Tasks & Items - Enhanced */}
          <div>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.itemsBreakdown}</h3>
               {formData.items && formData.items.length > 0 && (
                   <button 
                       type="button" 
                       onClick={toggleAllItemsPaymentStatus}
                       className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                   >
                       {formData.items.every(i => i.isPaid) ? (
                           <>
                               <Circle size={14} />
                               {t.markAsUnpaid}
                           </>
                       ) : (
                           <>
                               <CheckCircle2 size={14} />
                               {t.markAsPaid}
                           </>
                       )}
                   </button>
               )}
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
                                onPaste={(e) => handlePaste(i, e)}
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
                                onPaste={(e) => handlePaste(i, e)}
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
                                     <input type="file" className="hidden" accept="audio/*,application/pdf,image/*,video/*" onChange={(e) => handleFileUpload(i, e)} />
                                 </label>
                             </div>
                        </div>

                        {/* Deliverables View for Admin */}
                        {item.deliverables && item.deliverables.length > 0 && (
                            <div className="mb-4 bg-green-50 p-3 rounded-xl border border-green-100">
                                <label className="block text-xs font-bold text-green-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                    <FileCheck size={14} /> {t.tasks.deliverables}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {item.deliverables.map((del, dIdx) => (
                                        <a 
                                            key={dIdx} 
                                            href={del.data} 
                                            download={del.name} 
                                            className="flex items-center gap-2 bg-white border border-green-200 px-3 py-1.5 rounded-lg text-xs hover:bg-green-50 transition-colors text-green-700 font-medium"
                                        >
                                            <FileCheck size={14} />
                                            <span className="truncate max-w-[150px]">{del.name}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Rejection Note View */}
                        {item.status === 'Needs Revision' && item.rejectionNote && (
                            <div className="mb-4 bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2">
                                <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-red-700 uppercase mb-1">{t.tasks.rejectionReason}</p>
                                    <p className="text-sm text-red-600">{item.rejectionNote}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 items-center justify-between border-t border-slate-50 pt-3">
                            <div className="flex gap-2">
                                {/* Status Toggle (With Cycle Logic including Revision) */}
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

          {/* Team Assignment Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{t.teamManagement.assignTo}</h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex flex-wrap gap-2 mb-4">
                    {workers.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">{t.teamManagement.noWorkers}</p>
                    ) : (
                        workers.map(worker => (
                            <button
                                key={worker.id}
                                type="button"
                                onClick={() => toggleWorker(worker.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    formData.assignedWorkerIds?.includes(worker.id)
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold relative ${
                                    formData.assignedWorkerIds?.includes(worker.id) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {worker.name.charAt(0)}
                                    {/* Worker Availability Dot */}
                                    <div className={`absolute top-0 right-0 w-2 h-2 rounded-full border border-white ${worker.workerStatus === 'busy' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                </div>
                                {worker.name}
                                {formData.assignedWorkerIds?.includes(worker.id) && <CheckCircle2 size={14} />}
                            </button>
                        ))
                    )}
                </div>
                
                <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{t.teamManagement.instructions}</label>
                     <textarea 
                        className="w-full rounded-xl border-slate-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm border p-3 outline-none min-h-[80px]"
                        placeholder={t.teamManagement.instructionsPlaceholder}
                        value={formData.teamInstructions || ''}
                        onChange={(e) => setFormData({...formData, teamInstructions: e.target.value})}
                     />
                </div>
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
                  <input 
                      type="datetime-local" 
                      value={getSafeDateValue(r.date)} 
                      onChange={(e) => updateReminder(r.id, { date: e.target.value })} 
                      className="text-xs outline-none bg-transparent font-medium text-slate-600"
                  />
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