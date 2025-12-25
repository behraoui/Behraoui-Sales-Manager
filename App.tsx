import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sale, SaleStatus } from './types';
import { StatusBadge, ServiceBadge, Button, Card, PaymentStatusBadge } from './components/UIComponents';
import SalesForm from './components/SalesForm';
import Copilot from './components/Copilot';
import LoginPage from './components/LoginPage';
import { translations } from './translations';
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
  Download,
  Upload,
  Trash2,
  Bell,
  AlertCircle,
  Clock,
  Languages,
  LogOut,
  ShieldAlert
} from 'lucide-react';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('nexus_auth') === 'true';
  });

  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    return (localStorage.getItem('nexus_lang') as 'en' | 'ar') || 'en';
  });

  const t = translations[language];

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('nexus_sales');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({ 
          ...s, 
          items: (s.items || []).map((i: any) => ({ ...i, status: i.status || 'Pending' })), 
          quantity: s.quantity || (s.items?.length || 1), 
          reminders: s.reminders || [] 
        }));
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('nexus_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('nexus_lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('nexus_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد أنك تريد تسجيل الخروج؟' : 'Are you sure you want to logout?')) {
      localStorage.removeItem('nexus_auth');
      setIsAuthenticated(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(sales, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `nexus-backup-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedSales = JSON.parse(content);
        if (Array.isArray(importedSales)) {
          if (window.confirm(language === 'ar' ? 'هل أنت متأكد؟ سيؤدي هذا إلى استبدال بياناتك الحالية.' : 'Are you sure? This will replace your current data.')) {
            // Ensure imported data also has the new status field
            const migratedSales = importedSales.map((s: any) => ({
              ...s,
              items: (s.items || []).map((i: any) => ({ ...i, status: i.status || 'Pending' }))
            }));
            setSales(migratedSales);
          }
        }
      } catch (err) {
        alert(language === 'ar' ? 'ملف غير صالح' : 'Invalid file format');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeReminders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const allReminders: any[] = [];
    sales.forEach(sale => {
      (sale.reminders || []).forEach(rem => {
        if (!rem.isCompleted) {
          let type = rem.date === todayStr ? 'today' : rem.date < todayStr ? 'overdue' : 'upcoming';
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
        if (item.isPaid) totalRevenue += (Number(sale.price) || 0);
        else if (sale.status !== SaleStatus.ClosedLost && sale.status !== SaleStatus.Scammer) potentialRevenue += (Number(sale.price) || 0);
      });
    });
    return { 
      totalRevenue, 
      potentialRevenue, 
      activeProjects: sales.filter(s => s.status === SaleStatus.InProgress).length, 
      leads: sales.filter(s => s.status === SaleStatus.Lead).length,
      scammers: sales.filter(s => s.status === SaleStatus.Scammer).length
    };
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = (sale.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || sale.status === statusFilter;
      const paidCount = (sale.items || []).filter(i => i.isPaid).length;
      const totalCount = (sale.items || []).length;
      let matchesPayment = paymentFilter === 'All' || 
        (paymentFilter === 'Fully Paid' && paidCount === totalCount && totalCount > 0) ||
        (paymentFilter === 'Partially Paid' && paidCount > 0 && paidCount < totalCount) ||
        (paymentFilter === 'Unpaid' && paidCount === 0);
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [sales, searchTerm, statusFilter, paymentFilter]);

  const handleSaveSale = (sale: Sale) => {
    setSales(prev => {
      const exists = prev.find(s => s.id === sale.id);
      return exists ? prev.map(s => s.id === sale.id ? sale : s) : [sale, ...prev];
    });
    setEditingSale(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(language === 'ar' ? `هل أنت متأكد من حذف مشروع "${name}"؟` : `Are you sure you want to remove the project for "${name}"?`)) {
      setSales(prev => prev.filter(s => s.id !== id));
      setIsFormOpen(false);
      return true;
    }
    return false;
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} lang={language} />;
  }

  return (
    <div className={`min-h-screen flex bg-slate-50 text-slate-800 font-sans relative overflow-x-hidden ${language === 'ar' ? 'font-arabic' : ''}`}>
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
      
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`
        fixed inset-y-0 ${language === 'ar' ? 'right-0' : 'left-0'} z-30 w-72 bg-white text-slate-600 transform transition-transform duration-300 ease-in-out border-${language === 'ar' ? 'l' : 'r'} border-slate-200
        ${isSidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')} 
        md:translate-x-0 md:static md:h-screen md:sticky md:top-0
      `}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-3 rtl:space-x-reverse text-slate-900 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span>Nexus</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button className="flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl bg-primary-50 text-primary-700 font-medium">
            <LayoutDashboard size={20} />
            <span>{t.dashboard}</span>
          </button>
          <button onClick={() => setIsCopilotOpen(!isCopilotOpen)} className="flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
            <Bot size={20} />
            <span>{t.aiAssistant}</span>
          </button>
          
          <div className="pt-6 mt-4 border-t border-slate-100">
            <p className="px-4 text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t.backupData}</p>
            <button onClick={handleExport} className="flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
              <Download size={20} />
              <span>{t.backupData}</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
              <Upload size={20} />
              <span>{t.restoreData}</span>
            </button>
            <button onClick={() => setLanguage(l => l === 'en' ? 'ar' : 'en')} className="flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
              <Languages size={20} />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>
          </div>

          <div className="pt-2 mt-4 border-t border-slate-100">
             <button onClick={handleLogout} className="flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl hover:bg-red-50 transition-all text-slate-500 hover:text-red-600">
              <LogOut size={20} />
              <span>{t.logout}</span>
            </button>
          </div>
        </nav>
        <div className="p-6 border-t border-slate-100">
          <div className="rounded-xl p-4 bg-slate-900 text-white">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{t.totalCollected}</p>
            <p className="text-2xl font-bold tracking-tight">{stats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-slate-400">{t.mad}</span></p>
          </div>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${isCopilotOpen ? (language === 'ar' ? 'ml-80' : 'mr-80') : ''} w-full p-4 md:p-8 overflow-y-auto h-screen`}>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-white rounded-lg border border-slate-200"><Menu size={24} /></button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.dashboard}</h1>
              <p className="text-slate-500 text-sm">{language === 'ar' ? 'إدارة المشاريع الرقمية والإيرادات الخاصة بك.' : 'Manage your digital projects and revenue.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 relative">
                <Bell size={20} className={activeReminders.length > 0 ? 'text-slate-700' : 'text-slate-400'} />
                {activeReminders.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{activeReminders.length}</span>}
              </button>
              {isNotificationOpen && (
                <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-fade-in`}>
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">{t.remindersAlerts}</h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {activeReminders.length === 0 ? <div className="p-8 text-center text-slate-400 text-xs">لا توجد تذكيرات</div> : 
                    activeReminders.map(({ saleId, clientName, reminder, type }) => (
                      <button key={reminder.id} onClick={() => { const s = sales.find(x => x.id === saleId); if(s) { setEditingSale(s); setIsFormOpen(true); setIsNotificationOpen(false); }}} className="w-full text-start p-4 hover:bg-slate-50 border-b border-slate-50 flex gap-3">
                        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${type === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {type === 'overdue' ? <AlertCircle size={16} /> : <Clock size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-slate-800 text-xs truncate">{clientName}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100">{reminder.date}</span>
                          </div>
                          <p className="text-slate-500 text-xs line-clamp-2">{reminder.note}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button onClick={() => { setEditingSale(null); setIsFormOpen(true); }} className="shadow-lg shadow-primary-500/20 flex-1 md:flex-none">
              <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              {t.newProject}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: t.revenue, value: stats.totalRevenue, icon: <DollarSign />, color: 'green' },
            { label: t.pipeline, value: stats.potentialRevenue, icon: <TrendingUp />, color: 'blue' },
            { label: t.active, value: stats.activeProjects, icon: <LayoutDashboard />, color: 'purple' },
            { label: t.scammers, value: stats.scammers, icon: <ShieldAlert />, color: 'red' }
          ].map((item, i) => (
            <Card key={i} className="p-5 border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-1">{item.value.toLocaleString()} {i === 0 ? t.mad : ''}</h3>
                </div>
                <div className={`p-2 bg-${item.color}-50 rounded-lg text-${item.color}-600`}>{item.icon}</div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden border border-slate-200">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
            <div className="relative w-full sm:w-72">
              <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={16} />
              <input type="text" placeholder={t.searchPlaceholder} className={`w-full ${language === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm transition-all`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">{t.allStatuses}</option>
                {Object.values(SaleStatus).map(s => <option key={s} value={s}>{t.statuses[s]}</option>)}
              </select>
              <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                <option value="All">{t.allPayments}</option>
                <option value="Fully Paid">{t.fullyPaid}</option>
                <option value="Partially Paid">{t.partiallyPaid}</option>
                <option value="Unpaid">{t.unpaid}</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">{t.client}</th>
                  <th className="px-6 py-4">{t.status}</th>
                  <th className="px-6 py-4">{t.scope}</th>
                  <th className="px-6 py-4">{t.paymentStatus}</th>
                  <th className={`px-6 py-4 text-${language === 'ar' ? 'left' : 'right'}`}>{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSales.map((sale) => {
                  const paidCount = (sale.items || []).filter(i => i.isPaid).length;
                  const totalCount = (sale.items || []).length;
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{sale.clientName}</div>
                        <div className="text-xs text-slate-500">{sale.phoneNumber}</div>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={sale.status} lang={language} /></td>
                      <td className="px-6 py-4"><ServiceBadge type={sale.serviceType} lang={language} /></td>
                      <td className="px-6 py-4">
                        <PaymentStatusBadge paidCount={paidCount} totalCount={totalCount} lang={language} />
                        <div className="mt-2 text-xs text-slate-500">
                          {(sale.price * paidCount).toLocaleString()} / {(sale.price * totalCount).toLocaleString()} {t.mad}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-${language === 'ar' ? 'left' : 'right'}`}>
                        <div className={`flex items-center ${language === 'ar' ? 'justify-start' : 'justify-end'} space-x-1 rtl:space-x-reverse`}>
                          <button onClick={() => { setCopilotSale(sale); setIsCopilotOpen(true); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"><Bot size={16} /></button>
                          <button onClick={() => { setEditingSale(sale); setIsFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><MoreVertical size={16} /></button>
                          <button onClick={() => handleDelete(sale.id, sale.clientName)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <SalesForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingSale(null); }} initialData={editingSale} onSave={handleSaveSale} onDelete={handleDelete} lang={language} />
      {isCopilotOpen && <Copilot selectedSale={copilotSale} allSales={sales} onClose={() => setIsCopilotOpen(false)} lang={language} />}
    </div>
  );
};

export default App;