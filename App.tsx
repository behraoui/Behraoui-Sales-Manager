import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sale, SaleStatus, Project, ServiceType, User, UserRole, ItemStatus, Reminder } from './types';
import { StatusBadge, ServiceBadge, Button, Card, PaymentStatusBadge, Input, Select } from './components/UIComponents';
import SalesForm from './components/SalesForm';
import Copilot from './components/Copilot';
import LoginPage from './components/LoginPage';
import TeamManager from './components/TeamManager';
import WorkerDashboard from './components/WorkerDashboard';
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
  ArrowRight,
  Edit2,
  Save,
  MessageCircle,
  BarChart3,
  FileSpreadsheet,
  ArrowUpDown,
  UserCog
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#0ea5e9', '#ec4899', '#f97316', '#10b981', '#6366f1'];

type TimeRange = 'all' | 'today' | 'yesterday' | 'last7Days' | 'thisMonth' | 'lastMonth' | 'custom';
type View = 'dashboard' | 'analytics' | 'team';

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('nexus_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    return (localStorage.getItem('nexus_lang') as 'en' | 'ar') || 'en';
  });

  const t = translations[language];

  // Users State
  const [users, setUsers] = useState<User[]>(() => {
      const savedUsers = localStorage.getItem('nexus_users');
      if (savedUsers) {
          try {
              return JSON.parse(savedUsers);
          } catch (e) { return []; }
      }
      // Default Admin
      return [{
          id: 'admin-1',
          username: 'admin',
          password: 'nexus2025', // Hardcoded initial password
          name: 'Administrator',
          role: 'admin',
          createdAt: new Date().toISOString()
      }];
  });

  // Projects State
  const [projects, setProjects] = useState<Project[]>(() => {
    const savedProjects = localStorage.getItem('nexus_projects');
    if (savedProjects) {
      try {
        return JSON.parse(savedProjects);
      } catch (e) { return []; }
    }
    return [];
  });

  // Navigation State
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // Active Project (if null, show dashboard grid)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  // Analytics Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<string>('dateDesc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Project Rename State
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

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
    localStorage.setItem('nexus_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
        localStorage.setItem('nexus_current_user', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('nexus_current_user');
    }
  }, [currentUser]);

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

  // Update rename value when active project changes
  useEffect(() => {
    if (activeProject) {
      setRenameValue(activeProject.name);
      setIsRenaming(false);
    }
  }, [activeProjectId, activeProject]);

  // Auth Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد أنك تريد تسجيل الخروج؟' : 'Are you sure you want to logout?')) {
      setCurrentUser(null);
      // Reset view states
      setCurrentView('dashboard');
      setActiveProjectId(null);
    }
  };

  // User Management Handlers
  const handleAddUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
      const newUser: User = {
          ...userData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString()
      };
      setUsers([...users, newUser]);
  };

  const handleDeleteUser = (id: string) => {
      setUsers(users.filter(u => u.id !== id));
  };

  // Data Handlers
  const handleExport = () => {
    const dataStr = JSON.stringify({ projects, users }, null, 2);
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
        
        // Handle V1 (Array of Projects) vs V2 (Object with projects & users)
        if (Array.isArray(importedData)) {
            // Legacy V1
             if (window.confirm(language === 'ar' ? 'هل أنت متأكد؟ سيؤدي هذا إلى استبدال بياناتك الحالية.' : 'Are you sure? This will replace your current data.')) {
                setProjects(importedData);
            }
        } else if (importedData.projects) {
            // V2
             if (window.confirm(language === 'ar' ? 'هل أنت متأكد؟ سيؤدي هذا إلى استبدال بياناتك الحالية.' : 'Are you sure? This will replace your current data.')) {
                setProjects(importedData.projects || []);
                if (importedData.users) setUsers(importedData.users);
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

  const handleRenameProject = () => {
    if (!activeProjectId || !renameValue.trim()) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, name: renameValue } : p));
    setIsRenaming(false);
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (window.confirm(t.confirmDeleteProject)) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (activeProjectId === projectId) setActiveProjectId(null);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const cleanNumber = phone.replace(/[^\d+]/g, ''); // Keep digits and plus sign
    if (cleanNumber) {
        window.open(`https://wa.me/${cleanNumber}`, '_blank');
    }
  };

  // Worker Task Update
  const handleWorkerUpdateStatus = (projectId: string, saleId: string, itemIndex: number, newStatus: ItemStatus) => {
      setProjects(prev => prev.map(p => {
          if (p.id !== projectId) return p;
          return {
              ...p,
              clients: p.clients.map(c => {
                  if (c.id !== saleId) return c;
                  const newItems = [...c.items];
                  const taskName = newItems[itemIndex].name || (language === 'ar' ? 'مهمة' : 'Task');
                  newItems[itemIndex] = { ...newItems[itemIndex], status: newStatus };
                  
                  // Auto-update overall status if all Delivered
                  let newClientStatus = c.status;
                  if (newItems.every(i => i.status === 'Delivered')) newClientStatus = SaleStatus.Delivered;
                  else if (newItems.some(i => i.status === 'In Progress' || i.status === 'Delivered') && c.status === SaleStatus.Lead) newClientStatus = SaleStatus.InProgress;

                  // Create Notification/Reminder
                  const notification: Reminder = {
                      id: crypto.randomUUID(),
                      date: new Date().toISOString(),
                      note: language === 'ar' 
                          ? `${currentUser?.name} قام بتحديث "${taskName}" إلى ${translations.ar.itemStatuses[newStatus]}`
                          : `${currentUser?.name} updated "${taskName}" to ${newStatus}`,
                      isCompleted: false
                  };

                  return { 
                      ...c, 
                      items: newItems, 
                      status: newClientStatus,
                      reminders: [...(c.reminders || []), notification]
                  };
              })
          };
      }));
  };

  // --- ANALYTICS LOGIC ---
  const getDateRange = (range: TimeRange) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today': return { start: today, end: new Date(today.getTime() + 86400000) };
      case 'yesterday': {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        return { start: yest, end: today };
      }
      case 'last7Days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        return { start, end: new Date(now) };
      }
      case 'thisMonth': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now) };
      case 'lastMonth': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start, end };
      }
      case 'custom': {
        return { 
          start: customStart ? new Date(customStart) : new Date(0), 
          end: customEnd ? new Date(customEnd) : new Date() 
        };
      }
      case 'all': return { start: new Date(0), end: new Date() };
      default: return { start: new Date(0), end: new Date() };
    }
  };

  const analyticsData = useMemo(() => {
    const { start, end } = getDateRange(timeRange);
    
    // Flatten all clients
    let allClients: { client: Sale; projectName: string }[] = [];
    projects.forEach(p => {
      p.clients.forEach(c => {
        allClients.push({ client: c, projectName: p.name });
      });
    });

    // Filter by date
    const filtered = allClients.filter(item => {
      const d = new Date(item.client.leadDate);
      return d >= start && d <= end;
    });

    // Calculate Stats
    let totalRevenue = 0;
    let leads = 0;
    let sales = 0;
    
    // For Charts
    const serviceDistribution: Record<string, number> = {};
    const revenueByDate: Record<string, number> = {};

    filtered.forEach(({ client }) => {
      const isPaid = (client.items || []).every(i => i.isPaid);
      const revenue = (client.items || []).filter(i => i.isPaid).length * client.price;
      
      totalRevenue += revenue;
      if (client.status === SaleStatus.Lead) leads++;
      if (client.status === SaleStatus.Delivered || client.status === SaleStatus.InProgress) sales++;

      // Service Dist
      serviceDistribution[client.serviceType] = (serviceDistribution[client.serviceType] || 0) + 1;

      // Revenue Trend
      const dateKey = client.leadDate.split('T')[0];
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + revenue;
    });

    const pieData = Object.entries(serviceDistribution).map(([name, value]) => ({ name: t.services[name as ServiceType] || name, value }));
    const barData = Object.entries(revenueByDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount }));

    return {
      filteredClients: filtered,
      totalRevenue,
      leads,
      sales,
      conversionRate: (sales + leads) > 0 ? ((sales / (sales + leads)) * 100).toFixed(1) : '0',
      pieData,
      barData
    };
  }, [projects, timeRange, customStart, customEnd, language]);

  const handleExportCSV = () => {
    const { filteredClients } = analyticsData;
    if (filteredClients.length === 0) return;

    // Create CSV Header
    const headers = ['Project Name', 'Client Name', 'Phone', 'Service', 'Status', 'Date', 'Total Price (MAD)', 'Paid Amount (MAD)', 'Payment Status'];
    
    // Map Rows
    const rows = filteredClients.map(({ client, projectName }) => {
      const total = client.price * client.items.length;
      const paid = client.items.filter(i => i.isPaid).length * client.price;
      const paymentStatus = paid === total ? 'Paid' : paid === 0 ? 'Unpaid' : 'Partial';
      
      return [
        projectName,
        client.clientName,
        client.phoneNumber,
        t.services[client.serviceType],
        t.statuses[client.status],
        client.leadDate.split('T')[0],
        total,
        paid,
        paymentStatus
      ].map(field => `"${field}"`).join(','); // Quote fields to handle commas
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n'); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `nexus_analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  // Dashboard Stats Logic (Aggregated - Global)
  const globalStats = useMemo(() => {
    let totalRevenue = 0;
    let potentialRevenue = 0;
    let activeClients = 0;
    let leads = 0;
    let scammers = 0;

    projects.forEach(project => {
        project.clients.forEach(client => {
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
    const now = new Date();
    const allReminders: any[] = [];
    
    projects.forEach(project => {
        project.clients.forEach(client => {
            (client.reminders || []).forEach(rem => {
                if (!rem.isCompleted) {
                    const remDate = new Date(rem.date);
                    // Handle valid dates (ignore invalid/incomplete if any)
                    if(!isNaN(remDate.getTime())) {
                        let type = 'upcoming';
                        if (remDate < now) type = 'overdue';
                        else if (remDate.toDateString() === now.toDateString()) type = 'today';
                        
                        // We include all active reminders, sorted by date
                        allReminders.push({ 
                            saleId: client.id, 
                            projectId: project.id, 
                            clientName: client.clientName, 
                            projectName: project.name, 
                            reminder: rem, 
                            type 
                        });
                    }
                }
            });
        });
    });
    // Sort by date (oldest/overdue first)
    return allReminders.sort((a, b) => new Date(a.reminder.date).getTime() - new Date(b.reminder.date).getTime());
  }, [projects]);

  // View Logic (Projects)
  const filteredClients = useMemo(() => {
    if (!activeProject) return [];
    
    const result = activeProject.clients.filter(client => {
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
    });

    // Sorting Logic
    return result.sort((a, b) => {
      if (sortOrder === 'paymentStatus') {
         const getScore = (client: Sale) => {
            const total = client.items.length;
            if (total === 0) return 0;
            const paid = client.items.filter(i => i.isPaid).length;
            if (paid === 0) return 1; // Unpaid (Priority)
            if (paid < total) return 2; // Partial
            return 3; // Fully Paid
         };
         const diff = getScore(a) - getScore(b);
         if (diff !== 0) return diff;
      }
      // Default: Date Descending
      return new Date(b.leadDate).getTime() - new Date(a.leadDate).getTime();
    });
  }, [activeProject, searchTerm, statusFilter, paymentFilter, startDate, endDate, sortOrder]);

  const filteredProjects = useMemo(() => {
      if (activeProjectId) return []; 
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
                {/* Delete Button (Card) */}
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

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} users={users} lang={language} />;
  }

  // --- WORKER VIEW RENDER ---
  if (currentUser.role === 'worker') {
      return (
        <div className={`min-h-screen bg-slate-50 ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
            <nav className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
                        <TrendingUp size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-slate-800">Nexus Worker</span>
                </div>
                <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-red-600">
                    <LogOut size={18} />
                </Button>
            </nav>
            <WorkerDashboard 
                currentUser={currentUser} 
                projects={projects} 
                onUpdateTaskStatus={handleWorkerUpdateStatus} 
                lang={language}
            />
        </div>
      );
  }

  // --- ADMIN VIEW RENDER ---
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
          <button onClick={() => { setCurrentView('dashboard'); setActiveProjectId(null); setIsSidebarOpen(false); }} className={`flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl font-medium mb-1 transition-colors ${currentView === 'dashboard' && !activeProjectId ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <LayoutDashboard size={20} />
            <span>{t.dashboard}</span>
          </button>
          
          <button onClick={() => { setCurrentView('analytics'); setActiveProjectId(null); setIsSidebarOpen(false); }} className={`flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl font-medium mb-1 transition-colors ${currentView === 'analytics' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <BarChart3 size={20} />
            <span>{t.analytics}</span>
          </button>

          <button onClick={() => { setCurrentView('team'); setActiveProjectId(null); setIsSidebarOpen(false); }} className={`flex items-center space-x-3 rtl:space-x-reverse w-full px-4 py-3 rounded-xl font-medium mb-1 transition-colors ${currentView === 'team' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <UserCog size={20} />
            <span>{t.team}</span>
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
             <div className="px-4 py-2 mb-2 flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                     {currentUser.name.charAt(0)}
                 </div>
                 <div className="overflow-hidden">
                     <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                     <p className="text-xs text-slate-400 truncate">@{currentUser.username}</p>
                 </div>
             </div>
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
                         {isRenaming ? (
                             <div className="flex items-center gap-2">
                                 <input 
                                    className="text-2xl font-bold text-slate-900 bg-transparent border-b-2 border-primary-500 focus:outline-none w-64"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameProject(); }}
                                 />
                                 <button onClick={handleRenameProject} className="p-1 text-green-600 bg-green-50 rounded hover:bg-green-100"><Save size={18} /></button>
                                 <button onClick={() => setIsRenaming(false)} className="p-1 text-slate-400 bg-slate-50 rounded hover:bg-slate-100"><X size={18} /></button>
                             </div>
                         ) : (
                             <div>
                                <div className="flex items-center gap-2 group">
                                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{activeProject?.name}</h1>
                                    <button onClick={() => setIsRenaming(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-primary-600">
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                                <p className="text-slate-500 text-sm">{activeProject?.clients.length} {t.totalClients}</p>
                             </div>
                         )}
                    </div>
                ) : (
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {currentView === 'analytics' ? t.analytics : currentView === 'team' ? t.team : t.dashboard}
                        </h1>
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
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${type === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                {new Date(reminder.date).toLocaleString(language === 'ar' ? 'ar-MA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
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
            
            {/* Delete Project Button (Active View) */}
            {activeProjectId && (
                <Button variant="ghost" onClick={(e) => handleDeleteProject(e, activeProjectId)} className="text-red-500 hover:bg-red-50 hover:text-red-600 hidden md:flex">
                    <Trash2 size={18} className={language === 'ar' ? 'ml-2' : 'mr-2'} />
                    {t.deleteProject}
                </Button>
            )}

            {/* Create Action Button (Visible everywhere except Analytics/Team) */}
            {currentView === 'dashboard' && (
                activeProjectId ? (
                    <Button onClick={() => { setEditingSale(null); setIsFormOpen(true); }} className="shadow-lg shadow-primary-500/20 flex-1 md:flex-none">
                    <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t.newClient}
                    </Button>
                ) : (
                    <Button onClick={() => setIsProjectModalOpen(true)} className="shadow-lg shadow-primary-500/20 flex-1 md:flex-none">
                    <FolderPlus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t.createProject}
                    </Button>
                )
            )}
          </div>
        </header>

        {/* --- TEAM MANAGER VIEW --- */}
        {currentView === 'team' && (
            <TeamManager 
                users={users} 
                onAddUser={handleAddUser} 
                onDeleteUser={handleDeleteUser} 
                lang={language} 
            />
        )}

        {/* --- ANALYTICS VIEW --- */}
        {currentView === 'analytics' && (
           <div className="animate-fade-in space-y-6">
              {/* Date Filter & Export Bar */}
              <Card className="p-4 border border-slate-200">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                  <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{t.timeRange}:</span>
                    <div className="flex gap-1">
                      {(['today', 'yesterday', 'last7Days', 'thisMonth', 'all'] as TimeRange[]).map(range => (
                        <button 
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${timeRange === range ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                        >
                          {t.ranges[range]}
                        </button>
                      ))}
                      <button 
                         onClick={() => setTimeRange('custom')}
                         className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${timeRange === 'custom' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                      >
                         {t.ranges.custom}
                      </button>
                    </div>
                  </div>

                  {timeRange === 'custom' && (
                     <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-transparent text-xs outline-none" />
                        <span className="text-slate-300">-</span>
                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-transparent text-xs outline-none" />
                     </div>
                  )}

                  <Button variant="secondary" size="sm" onClick={handleExportCSV} className="w-full lg:w-auto">
                    <FileSpreadsheet size={16} className={language === 'ar' ? 'ml-2' : 'mr-2'} />
                    {t.exportToExcel}
                  </Button>
                </div>
              </Card>

              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border border-slate-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.revenue}</p>
                      <h3 className="text-xl font-bold text-slate-800 mt-1">{analyticsData.totalRevenue.toLocaleString()} {t.mad}</h3>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg text-green-600"><DollarSign size={20} /></div>
                  </div>
                </Card>
                <Card className="p-5 border border-slate-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.active}</p>
                      <h3 className="text-xl font-bold text-slate-800 mt-1">{analyticsData.sales}</h3>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TrendingUp size={20} /></div>
                  </div>
                </Card>
                <Card className="p-5 border border-slate-200">
                   <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.leads}</p>
                      <h3 className="text-xl font-bold text-slate-800 mt-1">{analyticsData.leads}</h3>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Users size={20} /></div>
                  </div>
                </Card>
                 <Card className="p-5 border border-slate-200">
                   <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.conversionRate}</p>
                      <h3 className="text-xl font-bold text-slate-800 mt-1">{analyticsData.conversionRate}%</h3>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><LayoutDashboard size={20} /></div>
                  </div>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 border border-slate-200 min-h-[350px]">
                   <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                     <BarChart3 size={16} className="text-primary-500" />
                     {t.revenueTrend}
                   </h3>
                   <div className="h-[250px] w-full text-xs">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={analyticsData.barData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="date" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f1f5f9' }}
                          />
                          <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </Card>

                <Card className="p-6 border border-slate-200 min-h-[350px]">
                   <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                     <FolderKanban size={16} className="text-primary-500" />
                     {t.servicesDistribution}
                   </h3>
                   <div className="h-[250px] w-full text-xs flex justify-center">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={analyticsData.pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {analyticsData.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                </Card>
              </div>
           </div>
        )}

        {/* --- DASHBOARD VIEW (NO ACTIVE PROJECT) --- */}
        {currentView === 'dashboard' && !activeProjectId && (
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

                        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                            <option value="dateDesc">{t.sortOptions.dateNewest}</option>
                            <option value="paymentStatus">{t.sortOptions.paymentStatus}</option>
                        </select>

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
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="text-xs text-slate-500">{client.phoneNumber}</div>
                                    {client.phoneNumber && (
                                        <button onClick={() => handleWhatsApp(client.phoneNumber)} className="text-green-500 hover:text-green-600 bg-green-50 p-1 rounded-full hover:bg-green-100 transition-colors" title={t.whatsapp}>
                                            <MessageCircle size={12} />
                                        </button>
                                    )}
                                </div>
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
        users={users}
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