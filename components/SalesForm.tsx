import React, { useState, useEffect } from 'react';
import { Sale, SaleStatus, ServiceType, SaleItem } from '../types';
import { Button, Input, Select } from './UIComponents';
import { X, Layers, CheckCircle2, Circle } from 'lucide-react';

interface SalesFormProps {
  initialData?: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: Sale) => void;
}

const SalesForm: React.FC<SalesFormProps> = ({ initialData, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Sale>>({
    serviceType: ServiceType.VideoAds,
    status: SaleStatus.Lead,
    price: 0,
    quantity: 1,
    items: [{ name: '', isPaid: false }],
    clientName: '',
    phoneNumber: '',
    leadDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (initialData) {
      // Migration logic for editing old records if they exist without the new structure
      let items: SaleItem[] = initialData.items || [];
      if (items.length === 0) {
        // Fallback for migration from old data structure
        const count = initialData.quantity || 1;
        // @ts-ignore - handling legacy isPaid
        const isPaidLegacy = initialData.isPaid || false; 
        // @ts-ignore - handling legacy itemNames
        const names = initialData.itemNames || [];
        
        for (let i = 0; i < count; i++) {
          items.push({
            name: names[i] || '',
            isPaid: isPaidLegacy
          });
        }
      }

      setFormData({
        ...initialData,
        items: items,
        quantity: initialData.quantity || items.length || 1,
        leadDate: initialData.leadDate.split('T')[0],
        sentDate: initialData.sentDate ? initialData.sentDate.split('T')[0] : '',
      });
    } else {
      // Reset form for new entry
      setFormData({
        serviceType: ServiceType.VideoAds,
        status: SaleStatus.Lead,
        price: 0,
        quantity: 1,
        items: [{ name: '', isPaid: false }],
        clientName: '',
        phoneNumber: '',
        leadDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [initialData, isOpen]);

  // Handle quantity change to resize items array
  const handleQuantityChange = (newQty: number) => {
    const qty = Math.max(1, newQty);
    setFormData(prev => {
      const currentItems = prev.items || [];
      const newItems = [...currentItems];
      
      if (qty > currentItems.length) {
        // Add new items
        for (let i = currentItems.length; i < qty; i++) {
          newItems.push({ name: '', isPaid: false });
        }
      } else if (qty < currentItems.length) {
        // Remove items from the end
        newItems.length = qty;
      }
      
      return { ...prev, quantity: qty, items: newItems };
    });
  };

  const handleItemChange = (index: number, field: keyof SaleItem, value: any) => {
    setFormData(prev => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || formData.price === undefined) return;

    const sale: Sale = {
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
    };
    onSave(sale);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-fade-in border border-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="bg-primary-50 p-2 rounded-lg text-primary-600">
              <Layers size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {initialData ? 'Edit Project' : 'New Project'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Client Info Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Client Details</h3>
            <Input
              label="Client Name"
              id="clientName"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              required
              placeholder="e.g. Acme Corp"
              className="bg-white border-slate-200"
            />
            
            <Input
              label="Phone Number"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+212 6..."
              className="bg-white border-slate-200"
            />
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Project Details Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Project Scope</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Service Type"
                id="serviceType"
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as ServiceType })}
                options={Object.values(ServiceType).map(t => ({ label: t, value: t }))}
                className="bg-white border-slate-200"
              />
              <Select
                label="Status"
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as SaleStatus })}
                options={Object.values(SaleStatus).map(s => ({ label: s, value: s }))}
                className="bg-white border-slate-200"
              />
            </div>

            {/* Pricing and Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Unit Price (MAD)"
                id="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
                className="bg-white"
              />
              <Input
                label="Quantity"
                id="quantity"
                type="number"
                min="1"
                max="50"
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(Number(e.target.value))}
                required
                className="bg-white"
              />
            </div>

            {/* Dynamic Item Names with Payment Checkbox */}
            {formData.items && formData.items.length > 0 && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Items Breakdown</span>
                    <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200">
                      Total: {(Number(formData.price) * Number(formData.quantity)).toLocaleString()} MAD
                    </span>
                 </div>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                   {formData.items.map((item, index) => (
                     <div key={index} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                       <span className="text-xs font-medium text-slate-400 w-6">#{index + 1}</span>
                       <div className="flex-1">
                          <Input 
                              placeholder={`Item Name #${index + 1}`}
                              value={item.name}
                              onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                              className="text-sm py-1.5"
                          />
                       </div>
                       <button
                          type="button"
                          onClick={() => handleItemChange(index, 'isPaid', !item.isPaid)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            item.isPaid 
                              ? 'bg-green-50 border-green-200 text-green-700' 
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                          title={item.isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                       >
                         {item.isPaid ? <CheckCircle2 size={18} className="fill-current" /> : <Circle size={18} />}
                         <span className="text-xs font-medium">{item.isPaid ? 'Paid' : 'Due'}</span>
                       </button>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lead Date"
              id="leadDate"
              type="date"
              value={formData.leadDate}
              onChange={(e) => setFormData({ ...formData, leadDate: e.target.value })}
              required
              className="bg-white border-slate-200"
            />
            <Input
              label="Sent/Delivered"
              id="sentDate"
              type="date"
              value={formData.sentDate}
              onChange={(e) => setFormData({ ...formData, sentDate: e.target.value })}
              className="bg-white border-slate-200"
            />
          </div>
        </form>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="shadow-lg shadow-primary-500/20">Save Project</Button>
        </div>
      </div>
    </div>
  );
};

export default SalesForm;