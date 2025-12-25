import React, { useState, useEffect } from 'react';
import { Sale, SaleStatus, ServiceType, SaleItem, Reminder } from '../types';
import { Button, Input, Select } from './UIComponents';
import { translations } from '../translations';
import { X, Layers, CheckCircle2, Circle, Trash2, PlusCircle } from 'lucide-react';

interface SalesFormProps {
  initialData?: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: Sale) => void;
  onDelete?: (id: string, name: string) => void;
  lang?: 'en' | 'ar';
}

const SalesForm: React.FC<SalesFormProps> = ({ initialData, isOpen, onClose, onSave, onDelete, lang = 'en' }) => {
  const t = translations[lang];
  const [formData, setFormData] = useState<Partial<Sale>>({
    serviceType: ServiceType.VideoAds,
    status: SaleStatus.Lead,
    price: 0,
    quantity: 1,
    items: [{ name: '', isPaid: false }],
    clientName: '',
    phoneNumber: '',
    leadDate: new Date().toISOString().split('T')[0],
    reminders: [],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        leadDate: initialData.leadDate.split('T')[0],
        sentDate: initialData.sentDate ? initialData.sentDate.split('T')[0] : '',
      });
    } else {
      setFormData({
        serviceType: ServiceType.VideoAds,
        status: SaleStatus.Lead,
        price: 0,
        quantity: 1,
        items: [{ name: '', isPaid: false }],
        clientName: '',
        phoneNumber: '',
        leadDate: new Date().toISOString().split('T')[0],
        reminders: [],
      });
    }
  }, [initialData, isOpen]);

  const handleQuantityChange = (newQty: number) => {
    const qty = Math.max(1, newQty);
    setFormData(prev => {
      const items = [...(prev.items || [])];
      if (qty > items.length) for(let i=items.length; i<qty; i++) items.push({ name: '', isPaid: false });
      else if (qty < items.length) items.length = qty;
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

  const addReminder = () => setFormData(prev => ({ ...prev, reminders: [...(prev.reminders || []), { id: crypto.randomUUID(), date: new Date().toISOString().split('T')[0], note: '', isCompleted: false }] }));
  const removeReminder = (id: string) => setFormData(prev => ({ ...prev, reminders: (prev.reminders || []).filter(r => r.id !== id) }));
  const updateReminder = (id: string, updates: Partial<Reminder>) => setFormData(prev => ({ ...prev, reminders: (prev.reminders || []).map(r => r.id === id ? { ...r, ...updates } : r) }));

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
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-primary-50 p-2 rounded-lg text-primary-600"><Layers size={20} /></div>
            <h2 className="text-xl font-bold text-slate-800">{initialData ? t.editProject : t.newProject}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.clientDetails}</h3>
            <Input label={t.clientName} value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} required />
            <Input label={t.phoneNumber} value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
          </div>
          
          <div className="h-px bg-slate-100 w-full" />

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.projectScope}</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select label={t.serviceType} value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as ServiceType })} options={Object.values(ServiceType).map(v => ({ label: t.services[v], value: v }))} />
              <Select label={t.status} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as SaleStatus })} options={Object.values(SaleStatus).map(v => ({ label: t.statuses[v], value: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label={t.unitPrice} type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} required />
              <Input label={t.quantity} type="number" value={formData.quantity} onChange={(e) => handleQuantityChange(Number(e.target.value))} required />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{t.itemsBreakdown}</p>
              <div className="space-y-2">
                {formData.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder={t.scope} value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)} className="py-1.5" />
                    <button type="button" onClick={() => updateItem(i, 'isPaid', !item.isPaid)} className={`p-2 rounded-lg border flex items-center gap-1.5 ${item.isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-slate-400'}`}>
                      {item.isPaid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      <span className="text-[10px] font-bold">{item.isPaid ? t.completed : t.pending}</span>
                    </button>
                  </div>
                ))}
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