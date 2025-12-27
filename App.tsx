import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sale, SaleStatus, Project } from './types';
import { StatusBadge, ServiceBadge, Button, Card, PaymentStatusBadge, Input } from './components/UIComponents';
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
  ShieldAlert,
  FolderKanban,
  Calendar,
  ChevronLeft,
  FolderPlus,
  ArrowRight
} from 'lucide-react';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('nexus_auth') === 'true';
  });

  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    return (localStorage.getItem('nexus_lang') as 'en' | 'ar') || 'en';
  });

  const t = translations[language];

  // Projects State
  const [projects, setProjects] = useState<Project[]>(() => {
    const savedProjects = localStorage.getItem('nexus_projects');
    if (savedProjects) {
      try {
        return JSON.parse(savedProjects);
      } catch (e) { return []; }
    }
    
    // Migration: If no projects but 'nexus_sales' exists, create a Legacy Project
    const oldSales = localStorage.getItem('nexus_sales');
    if (oldSales) {
      try {
        const legacyClients = JSON.parse(oldSales);
        if (Array.isArray(legacyClients) && legacyClients.length > 0) {
          const legacyProject: Project = {
            id: 'legacy-project',
            name: 'Legacy Clients',
            createdAt: new Date().toISOString(),
            clients: legacyClients.map((s: any) => ({
                ...s,
                items: (s.items || []).map((i: any) => ({ ...i, status: i.status || 'Pending' }))
            }))
          };
          return [legacyProject];
        }
      } catch (e) {}
    }
    return [];
  });

  // Active Project (if null, show dashboard)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotSale, setCopilotSale] = useState<Sale | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('nexus_projects', JSON.stringify(projects));
  }, [projects]);

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

  // Auth Handlers
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

  // Data Handlers
  const handleExport = () => {
    const dataStr = JSON.stringify(projects, null, 2);
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
        const importedData = JSON.parse(content);
        if (Array.isArray(importedData)) {
            // Basic validation check
            if (importedData.length > 0 && !importedData[0].clients && importedData[0].price) {
                 alert(language === 'ar' ? 'يبدو أن هذا ملف نسخ احتياطي قديم (تنسيق V1). يرجى الاتصال بالدعم.' : 'This appears to be a legacy backup file (V1 format). Please contact support for migration.');
                 return;
            }
            if (window.confirm(language === 'ar' ? 'هل أنت متأكد؟ سيؤدي هذا إلى استبدال بياناتك الحالية.' : 'Are you sure? This will replace your current data.')) {
                setProjects(importedData);
            }
        }
      } catch (err) {
        alert(language === 'ar' ? 'ملف غير صالح' : 'Invalid file format');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Create Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newProject: Project = {
        id: crypto.randomUUID(),
        name: newProjectName,
        createdAt: new Date().toISOString(),
        clients: []
    };
    setProjects(prev => [newProject, ...prev]);
    setNewProjectName('');
    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (window.confirm(t.confirmDeleteProject)) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (activeProjectId === projectId) setActiveProjectId(null);
    }
  };

  // Stats Logic (Aggregated)
  const globalStats = useMemo(() => {
    let totalRevenue = 0;
    let potentialRevenue = 0;
    let activeClients = 0;
    let leads = 0;
    let scammers = 0;

    projects.forEach(project => {
        project.clients.forEach(client => {
            const isPaid = (client.items || []).every(i => i.isPaid);
             
            // Revenue Calculation
            (client.items || []).forEach(item => {
                if(item.isPaid) totalRevenue += client.price;
                else if (client.status !== SaleStatus.ClosedLost && client.status !== SaleStatus.Scammer) potentialRevenue += client.price;
            });

            if (client.status === SaleStatus.InProgress) activeClients++;
            if (client.status === SaleStatus.Lead) leads++;
            if (client.status === SaleStatus.Scammer) scammers++;
        });
    });

    return { totalRevenue, potentialRevenue, activeClients, leads, scammers };
  }, [projects]);

  const activeReminders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const allReminders: any[] = [];
    
    projects.forEach(project => {
        project.clients.forEach(client => {
            (client.reminders || []).forEach(rem => {
                if (!rem.isCompleted) {
                    let type = rem.date === todayStr ? 'today' : rem.date < todayStr ? 'overdue' : 'upcoming';
                    allReminders.push({ 
                        saleId: client.id, 
                        projectId: project.id,
                        clientName: client.clientName, 
                        projectName: project.name,
                        reminder: rem, 
                        type 
                    });
                }
            });
        });
    });
    return allReminders.sort((a, b) => a.reminder.date.localeCompare(b.reminder.date));
  }, [projects]);

  // View Logic
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  const filteredClients = useMemo(() => {
    if (!activeProject) return [];
    
    return activeProject.clients.filter(client => {
      const matchesSearch = (client.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      
      const paidCount = (client.items || []).filter(i => i.isPaid).length;
      const totalCount = (client.items || []).length;
      let matchesPayment = paymentFilter === 'All' || 
        (paymentFilter === 'Fully Paid' && paidCount === totalCount && totalCount > 0) ||
        (paymentFilter === 'Partially Paid' && paidCount > 0 && paidCount < totalCount) ||
        (paymentFilter === 'Unpaid' && paidCount === 0);
      
      let matchesDate = true;
      if (startDate) matchesDate = matchesDate && client.leadDate >= startDate;
      if (endDate) matchesDate = matchesDate && client.leadDate <= endDate;

      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    }).sort((a, b) => new Date(b.leadDate).getTime() - new Date(a.leadDate).getTime());
  }, [activeProject, searchTerm, statusFilter, paymentFilter, startDate, endDate]);

  const filteredProjects = useMemo(() => {
      if (activeProjectId) return []; // Not searching projects when inside one
      return projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [projects, searchTerm, activeProjectId]);

  // CRUD for Clients
  const handleSaveClient = (client: Sale) => {
    if (!activeProjectId) return;
    
    setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;
        
        const clientExists = p.clients.find(c => c.id === client.id);
        let updatedClients;
        if (clientExists) {
            updatedClients = p.clients.map(c => c.id === client.id ? client : c);
        } else {
            updatedClients = [client, ...p.clients];
        }
        return { ...p, clients: updatedClients };
    }));
    setEditingSale(null);
  };

  const handleDeleteClient = (id: string, name: string) => {
    if (window.confirm(language === 'ar' ? `هل أنت متأكد من حذف العميل "${name}"؟` : `Are you sure you want to remove client "${name}"?`)) {
      setProjects(prev => prev.map(p => {
          if (p.id !== activeProjectId) return p;
          return { ...p, clients: p.clients.filter(c => c.id !== id) };
      }));
      setIsFormOpen(false);
      return true;
    }
    return false;
  };

  // --- Render Helpers ---
  const renderProjectCard = (project: Project) => {
    const revenue = project.clients.reduce((acc, c) => {
        const paidItems = c.items.filter(i => i.isPaid).length;
        return acc + (c.price * paidItems);
    }, 0);
    
    const clientCount = project.clients.length;

    return (
        <div 
            key={project.id} 
            onClick={() => { setActiveProjectId(project.id); setSearchTerm(''); }}
            className="group bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-lg hover:border-primary-200 transition-all relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FolderKanban size={24} />
                </div>
                <button 
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                >
                    <Trash2 size={16} />
                </button>
            </div>
            
            <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{project.name}</h3>
            <p className="text-xs text-slate-400 mb-4">{new Date(project.createdAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'en-US')}</p>
            
            <div className="flex items-center justify-between text-sm border-t border-slate-50 pt-3">
                <div className="flex items-center gap-1.5 text-slate-600">
                    <Users size={14} />
                    <span>{clientCount}</span>
                </div>
                <div className="font-bold text-emerald-600">
                    {revenue.toLocaleString()} <span className="text-[10px] font-normal">{t.mad}</span>
                </div>
            </div>
        </div>
    );
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} lang={language} />;
  }

  return (
    <div className={`min-h-screen flex bg-slate-50 text-slate-800 font-sans relative overflow-x-hidden ${language === 'ar' ? 'font-arabic' : ''}`}>
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar */}
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
          <button onClick={() => { setActiveProjectId(null); setIsSidebarOpen(false); }} className={`flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl font-medium mb-1 transition-colors ${!activeProjectId ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <LayoutDashboard size={20} />
            <span>{t.dashboard}</span>
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
            <p className="text-2xl font-bold tracking-tight">{globalStats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-slate-400">{t.mad}</span></p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isCopilotOpen ? (language === 'ar' ? 'ml-80' : 'mr-80') : ''} w-full p-4 md:p-8 overflow-y-auto h-screen`}>
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-white rounded-lg border border-slate-200"><Menu size={24} /></button>
            <div>
                {activeProjectId ? (
                    <div className="flex items-center gap-2">
                         <button onClick={() => { setActiveProjectId(null); setSearchTerm(''); }} className="text-slate-400 hover:text-primary-600 transition-colors">
                             <ChevronLeft className={language === 'ar' ? 'rotate-180' : ''} />
                         </button>
                         <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{activeProject?.name}</h1>
                            <p className="text-slate-500 text-sm">{activeProject?.clients.length} {t.totalClients}</p>
                         </div>
                    </div>
                ) : (
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.dashboard}</h1>
                        <p className="text-slate-500 text-sm">{language === 'ar' ? 'إدارة المشاريع الرقمية والإيرادات الخاصة بك.' : 'Manage your digital projects and revenue.'}</p>
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             {/* Notification Bell */}
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
                    activeReminders.map(({ saleId, projectId, clientName, projectName, reminder, type }) => (
                      <button key={reminder.id} onClick={() => { setActiveProjectId(projectId); const p = projects.find(x => x.id === projectId); const c = p?.clients.find(x => x.id === saleId); if(c) { setEditingSale(c); setIsFormOpen(true); setIsNotificationOpen(false); }}} className="w-full text-start p-4 hover:bg-slate-50 border-b border-slate-50 flex gap-3">
                        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${type === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {type === 'overdue' ? <AlertCircle size={16} /> : <Clock size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-slate-800 text-xs truncate">{clientName}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100">{reminder.date}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mb-0.5">{projectName}</p>
                          <p className="text-slate-500 text-xs line-clamp-2">{reminder.note}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Assistant Button (Visible on Mobile) */}
            <button onClick={() => setIsCopilotOpen(!isCopilotOpen)} className="md:hidden p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
                <Bot size={20} className="text-slate-600" />
            </button>

            {/* Create Action Button */}
            {activeProjectId ? (
                <Button onClick={() => { setEditingSale(null); setIsFormOpen(true); }} className="shadow-lg shadow-primary-500/20 flex-1 md:flex-none">
                <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t.newClient}
                </Button>
            ) : (
                <Button onClick={() => setIsProjectModalOpen(true)} className="shadow-lg shadow-primary-500/20 flex-1 md:flex-none">
                <FolderPlus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t.createProject}
                </Button>
            )}
          </div>
        </header>

        {/* --- DASHBOARD VIEW (NO ACTIVE PROJECT) --- */}
        {!activeProjectId && (
            <div className="animate-fade-in">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: t.revenue, value: globalStats.totalRevenue, icon: <DollarSign />, color: 'green' },
                    { label: t.pipeline, value: globalStats.potentialRevenue, icon: <TrendingUp />, color: 'blue' },
                    { label: t.active, value: globalStats.activeClients, icon: <LayoutDashboard />, color: 'purple' },
                    { label: t.scammers, value: globalStats.scammers, icon: <ShieldAlert />, color: 'red' }
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

                {/* Projects Grid Search */}
                <div className="relative mb-6">
                    <Search className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} size={20} />
                    <input 
                        type="text" 
                        placeholder={t.searchProjects} 
                        className={`w-full ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-100 outline-none transition-all shadow-sm`} 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>

                {/* Projects Grid */}
                {filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProjects.map(renderProjectCard)}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <FolderKanban className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">{t.noProjectsFound}</h3>
                        <Button variant="ghost" className="mt-2" onClick={() => setIsProjectModalOpen(true)}>{t.createProject}</Button>
                    </div>
                )}
            </div>
        )}

        {/* --- PROJECT DETAIL VIEW --- */}
        {activeProjectId && (
            <div className="animate-fade-in space-y-6">
                 {/* Filtering Bar */}
                <Card className="p-4 border border-slate-200">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full lg:w-1/3">
                        <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={16} />
                        <input type="text" placeholder={t.searchPlaceholder} className={`w-full ${language === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm transition-all`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        
                        <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <div className="flex items-center px-2 text-slate-400"><Calendar size={16} /></div>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none w-32" placeholder={t.startDate} />
                            <span className="text-slate-300">-</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none w-32" placeholder={t.endDate} />
                        </div>

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
                </Card>

                <Card className="overflow-hidden border border-slate-200">
                    <div className="overflow-x-auto">
                    <table className="w-full text-start border-collapse">
                        <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-100">
                            <th className="px-6 py-4">{t.client}</th>
                            <th className="px-6 py-4">{t.leadDate}</th>
                            <th className="px-6 py-4">{t.status}</th>
                            <th className="px-6 py-4">{t.scope}</th>
                            <th className="px-6 py-4">{t.paymentStatus}</th>
                            <th className={`px-6 py-4 text-${language === 'ar' ? 'left' : 'right'}`}>{t.actions}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                        {filteredClients.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">{t.noProjectsFound}</td>
                            </tr>
                        ) : filteredClients.map((client) => {
                            const paidCount = (client.items || []).filter(i => i.isPaid).length;
                            const totalCount = (client.items || []).length;
                            return (
                            <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                <div className="font-bold text-slate-800 text-sm">{client.clientName}</div>
                                <div className="text-xs text-slate-500">{client.phoneNumber}</div>
                                </td>
                                <td className="px-6 py-4">
                                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{client.leadDate}</span>
                                </td>
                                <td className="px-6 py-4"><StatusBadge status={client.status} lang={language} /></td>
                                <td className="px-6 py-4"><ServiceBadge type={client.serviceType} lang={language} /></td>
                                <td className="px-6 py-4">
                                <PaymentStatusBadge paidCount={paidCount} totalCount={totalCount} lang={language} />
                                <div className="mt-2 text-xs text-slate-500">
                                    {(client.price * paidCount).toLocaleString()} / {(client.price * totalCount).toLocaleString()} {t.mad}
                                </div>
                                </td>
                                <td className={`px-6 py-4 text-${language === 'ar' ? 'left' : 'right'}`}>
                                <div className={`flex items-center ${language === 'ar' ? 'justify-start' : 'justify-end'} space-x-1 rtl:space-x-reverse`}>
                                    <button onClick={() => { setCopilotSale(client); setIsCopilotOpen(true); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"><Bot size={16} /></button>
                                    <button onClick={() => { setEditingSale(client); setIsFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><MoreVertical size={16} /></button>
                                    <button onClick={() => handleDeleteClient(client.id, client.clientName)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                </div>
                                </td>
                            </tr>
                            );
                        })}
                        </tbody>
                    </table>
                    </div>
                </Card>
            </div>
        )}
      </main>

      {/* Forms and Modals */}
      <SalesForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingSale(null); }} 
        initialData={editingSale} 
        onSave={handleSaveClient} 
        onDelete={handleDeleteClient} 
        lang={language} 
      />

      {isCopilotOpen && (
        <Copilot 
          selectedSale={copilotSale} 
          allSales={activeProject ? activeProject.clients : []} 
          onClose={() => setIsCopilotOpen(false)} 
          lang={language} 
        />
      )}

      {/* Project Creation Modal */}
      {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">{t.createProject}</h3>
                  <form onSubmit={handleCreateProject}>
                    <Input 
                        label={t.projectName} 
                        value={newProjectName} 
                        onChange={e => setNewProjectName(e.target.value)} 
                        placeholder="..." 
                        autoFocus 
                        className="mb-6"
                    />
                    <div className="flex gap-3 justify-end">
                        <Button type="button" variant="ghost" onClick={() => setIsProjectModalOpen(false)}>{t.cancel}</Button>
                        <Button type="submit">{t.createProject}</Button>
                    </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;