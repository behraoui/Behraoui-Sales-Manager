
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Sale, SaleStatus, ServiceType, SaleItem, Reminder } from './types';
import { StatusBadge, ServiceBadge, Button, Card, Input, Select } from './components/UIComponents';
import SalesForm from './components/SalesForm';
import Copilot from './components/Copilot';
import { 
  Plus, 
  Search, 
  LayoutDashboard, 
  DollarSign, 
  TrendingUp, 
  Users, 
  MoreVertical,
  Bot,
  Menu,
  X,
  Package,
  Download,
  Upload,
  Trash2,
  Bell,
  Calendar,
  AlertCircle,
  Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App = () => {
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('nexus_sales');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => {
          let items = s.items;
          if (!items || !Array.isArray(items)) {
             items = [];
             const qty = s.quantity || 1;
             const names = s.itemNames || [];
             const isPaidLegacy = s.isPaid || false;
             for(let i=0; i<qty; i++) {
               items.push({ name: String(names[i] || ''), isPaid: !!isPaidLegacy });
             }
          }
          return { ...s, items, quantity: s.quantity || items.length || 1, reminders: s.reminders || [] };
        });
      } catch (e) {
        return [];
      }
    }
    return []; 
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotSale, setCopilotSale] = useState<Sale | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('nexus_sales', JSON.stringify(sales));
  }, [sales]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeReminders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const allReminders: { saleId: string; clientName: string; reminder: Reminder; type: 'overdue' | 'today' | 'upcoming' }[] = [];
    
    sales.forEach(sale => {
      (sale.reminders || []).forEach(rem => {
        if (!rem.isCompleted) {
          let type: 'overdue' | 'today' | 'upcoming' = 'upcoming';
          if (rem.date === todayStr) type = 'today';
          else if (rem.date < todayStr) type = 'overdue';
          
          allReminders.push({ saleId: sale.id, clientName: sale.clientName, reminder: rem, type });
        }
      });
    });

    return allReminders.sort((a, b) => a.reminder.date.localeCompare(b.reminder.date));
  }, [sales]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let potentialRevenue = 0;
    
    sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        if (item.isPaid) {
          totalRevenue += (Number(sale.price) || 0);
        } else if (sale.status !== SaleStatus.ClosedLost) {
          potentialRevenue += (Number(sale.price) || 0);
        }
      });
    });

    const activeProjects = sales.filter(s => s.status === SaleStatus.InProgress).length;
    const leads = sales.filter(s => s.status === SaleStatus.Lead).length;
    
    const serviceTypes = [ServiceType.VideoAds, ServiceType.LandingPage, ServiceType.VoiceOver];
    const revenueByService = serviceTypes.map(type => {
      let val = 0;
      sales.filter(s => s.serviceType === type).forEach(s => {
        const paidItemsCount = (s.items || []).filter(i => i.isPaid).length;
        val += (paidItemsCount * (Number(s.price) || 0));
      });
      return { name: type, value: val };
    });

    return { totalRevenue, potentialRevenue, activeProjects, leads, revenueByService };
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = (sale.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || sale.status === statusFilter;
      
      const paidCount = (sale.items || []).filter(i => i.isPaid).length;
      const totalCount = (sale.items || []).length;
      
      let matchesPayment = true;
      if (paymentFilter === 'Fully Paid') {
        matchesPayment = paidCount === totalCount && totalCount > 0;
      } else if (paymentFilter === 'Partially Paid') {
        matchesPayment = paidCount > 0 && paidCount < totalCount;
      } else if (paymentFilter === 'Unpaid') {
        matchesPayment = paidCount === 0;
      }

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [sales, searchTerm, statusFilter, paymentFilter]);

  const handleSaveSale = useCallback((sale: Sale) => {
    setSales(prev => {
      const exists = prev.find(s => s.id === sale.id);
      if (exists) {
        return prev.map(s => s.id === sale.id ? sale : s);
      }
      return [sale, ...prev];
    });
    setEditingSale(null);
  }, []);

  const handleDelete = useCallback((id: string, name: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove the project for "${name}"?`);
    if (confirmed) {
      setSales(prev => prev.filter(s => s.id !== id));
      setEditingSale(null);
      setIsFormOpen(false);
      return true;
    }
    return false;
  }, []);

  const handleExport = () => {
    const dataStr = JSON.stringify(sales, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_sales_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          if(window.confirm(`Restore ${parsed.length} records?`)) {
              setSales(parsed);
              setIsSidebarOpen(false);
          }
        }
      } catch (error) {
        alert("Error parsing backup file");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const openCopilotForSale = (sale: Sale) => {
    setCopilotSale(sale);
    setIsCopilotOpen(true);
    setIsSidebarOpen(false);
  };

  const toggleCopilot = () => {
    setCopilotSale(undefined);
    setIsCopilotOpen(!isCopilotOpen);
    setIsSidebarOpen(false);
  };

  const goToSale = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      setEditingSale(sale);
      setIsFormOpen(true);
      setIsNotificationOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans relative overflow-x-hidden">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-white text-slate-600 transform transition-transform duration-300 ease-in-out border-r border-slate-200
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:h-screen md:sticky md:top-0
      `}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-slate-900 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span>Nexus</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl bg-primary-50 text-primary-700 font-medium transition-all">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button 
             onClick={toggleCopilot}
             className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800"
          >
            <Bot size={20} />
            <span>AI Assistant</span>
          </button>

          <div className="pt-6 mt-4 border-t border-slate-100">
             <p className="px-4 text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Data Management</p>
             <button 
               onClick={handleExport}
               className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800"
             >
               <Download size={20} />
               <span>Backup Data</span>
             </button>
             <label className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800 cursor-pointer">
               <Upload size={20} />
               <span>Restore Data</span>
               <input type="file" hidden accept=".json" onChange={handleImport} />
             </label>
          </div>
        </nav>
        <div className="p-6 border-t border-slate-100">
          <div className="rounded-xl p-4 bg-slate-900 text-white shadow-xl shadow-slate-900/10">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total Collected</p>
            <p className="text-2xl font-bold tracking-tight">{stats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-slate-400">MAD</span></p>
          </div>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${isCopilotOpen ? 'mr-80' : ''} w-full p-4 md:p-8 overflow-y-auto h-screen`}>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
              <p className="text-slate-500 text-sm">Manage your digital projects and revenue.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all relative ${activeReminders.length > 0 ? 'text-slate-700' : 'text-slate-400'}`}
              >
                <Bell size={20} />
                {activeReminders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {activeReminders.length}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-fade-in origin-top-right">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">Reminders</h4>
                    <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-600">{activeReminders.length} Active</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {activeReminders.length === 0 ? (
                      <div className="p-8 text-center">
                        <Calendar size={32} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-slate-400 text-xs">All caught up! No pending reminders.</p>
                      </div>
                    ) : (
                      activeReminders.map(({ saleId, clientName, reminder, type }) => (
                        <button 
                          key={reminder.id}
                          onClick={() => goToSale(saleId)}
                          className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex gap-3"
                        >
                          <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                            type === 'overdue' ? 'bg-red-50 text-red-600' : 
                            type === 'today' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {type === 'overdue' ? <AlertCircle size={16} /> : <Clock size={16} />}
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-bold text-slate-800 text-xs truncate max-w-[120px]">{clientName}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                type === 'overdue' ? 'bg-red-100 text-red-700' : 
                                type === 'today' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {type === 'overdue' ? 'Overdue' : type === 'today' ? 'Due Today' : reminder.date}
                              </span>
                            </div>
                            <p className="text-slate-500 text-xs line-clamp-2">{reminder.note || 'No specific note'}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button onClick={() => { setEditingSale(null); setIsFormOpen(true); }} className="shadow-lg shadow-primary-500/20 flex-1 md:flex-none">
              <Plus size={18} className="mr-2" />
              New Project
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue</p>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.totalRevenue.toLocaleString()} MAD</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <DollarSign size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline</p>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.potentialRevenue.toLocaleString()} MAD</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <TrendingUp size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active</p>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.activeProjects}</h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <LayoutDashboard size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leads</p>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.leads}</h3>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <Users size={20} />
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                {Object.values(SaleStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="All">All Payments</option>
                <option value="Fully Paid">Fully Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Items Scope</th>
                  <th className="px-6 py-4">Payment Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSales.map((sale) => {
                  const items = sale.items || [];
                  const paidCount = items.filter(i => i.isPaid).length;
                  const totalCount = items.length;
                  const totalAmount = (Number(sale.price) || 0) * totalCount;
                  const paidAmount = (Number(sale.price) || 0) * paidCount;
                  const isFullyPaid = paidCount === totalCount && totalCount > 0;
                  
                  const hasOverdueReminder = (sale.reminders || []).some(r => !r.isCompleted && r.date <= new Date().toISOString().split('T')[0]);
                  
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{String(sale.clientName || 'Unnamed')}</div>
                            <div className="text-xs text-slate-500">{String(sale.phoneNumber || '')}</div>
                          </div>
                          {hasOverdueReminder && (
                            <div className="animate-pulse bg-red-100 text-red-600 p-1 rounded-full" title="Action Required / Overdue Reminder">
                              <AlertCircle size={14} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="px-6 py-4">
                        <ServiceBadge type={sale.serviceType} />
                        <div className="mt-1.5 flex flex-col gap-1">
                          {items.slice(0, 2).map((item, idx) => (
                             <div key={idx} className="flex items-center text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.isPaid ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                {String(item.name || 'Unnamed')}
                             </div>
                          ))}
                          {items.length > 2 && <div className="text-[10px] text-slate-400 ml-1">+{items.length - 2} more</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                           <span className={`text-sm font-bold ${isFullyPaid ? 'text-green-600' : paidCount > 0 ? 'text-orange-600' : 'text-slate-600'}`}>
                             {paidAmount.toLocaleString()} MAD
                           </span>
                           <span className="text-xs text-slate-400">/ {totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div 
                              className={`h-full rounded-full ${isFullyPaid ? 'bg-green-500' : 'bg-orange-400'}`} 
                              style={{ width: `${(paidCount / Math.max(totalCount, 1)) * 100}%` }}
                           ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button 
                            onClick={() => openCopilotForSale(sale)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors" 
                            title="AI Assistant"
                          >
                            <Bot size={16} />
                          </button>
                          <button 
                            onClick={() => { setEditingSale(sale); setIsFormOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            title="Edit Project"
                          >
                            <MoreVertical size={16} />
                          </button>
                           <button 
                            onClick={() => handleDelete(sale.id, sale.clientName)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center">
                        <Search size={32} className="mb-2 opacity-20" />
                        <p>No projects found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <SalesForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingSale(null); }} 
        initialData={editingSale}
        onSave={handleSaveSale}
        onDelete={handleDelete}
      />

      {isCopilotOpen && (
        <Copilot 
          selectedSale={copilotSale} 
          allSales={sales}
          onClose={() => setIsCopilotOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
