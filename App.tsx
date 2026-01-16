import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sale, SaleStatus, Project, ServiceType, User, UserRole, ItemStatus, Reminder, GlobalNotification, ChatMessage } from './types';
import { StatusBadge, ServiceBadge, Button, Card, PaymentStatusBadge, Input, Select, ModificationBadge } from './components/UIComponents';
import SalesForm from './components/SalesForm';
import Copilot from './components/Copilot';
import LoginPage from './components/LoginPage';
import TeamManager from './components/TeamManager';
import WorkerDashboard from './components/WorkerDashboard';
import ChatSystem from './components/ChatSystem';
import { loadData, saveData } from './services/persistence';
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
  UserCog,
  Check,
  Loader2,
  WifiOff,
  Phone,
  Wallet,
  PieChart as PieChartIcon,
  Percent
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#0ea5e9', '#ec4899', '#f97316', '#10b981', '#6366f1'];

type TimeRange = 'all' | 'today' | 'yesterday' | 'last7Days' | 'thisMonth' | 'lastMonth' | 'custom';
type View = 'dashboard' | 'analytics' | 'team';

// Helper for random avatar colors
const getAvatarColor = (name: string) => {
    const colors = [
        'from-red-400 to-red-600',
        'from-orange-400 to-orange-600',
        'from-amber-400 to-amber-600',
        'from-green-400 to-green-600',
        'from-emerald-400 to-emerald-600',
        'from-teal-400 to-teal-600',
        'from-cyan-400 to-cyan-600',
        'from-sky-400 to-sky-600',
        'from-blue-400 to-blue-600',
        'from-indigo-400 to-indigo-600',
        'from-violet-400 to-violet-600',
        'from-purple-400 to-purple-600',
        'from-fuchsia-400 to-fuchsia-600',
        'from-pink-400 to-pink-600',
        'from-rose-400 to-rose-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const App = () => {
  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    return (localStorage.getItem('nexus_lang') as 'en' | 'ar') || 'en';
  });

  const t = translations[language];

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<GlobalNotification[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Initialize Data
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      
      // Load saved user session
      const savedUser = localStorage.getItem('nexus_current_user');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));

      // Try loading from Cloud DB, fall back to LocalStorage
      const cloudData = await loadData();
      
      if (cloudData) {
        // Cloud Data Available
        setProjects(cloudData.projects || []);
        setUsers(cloudData.users && cloudData.users.length > 0 ? cloudData.users : getDefaultAdmin());
        setGlobalNotifications(cloudData.notifications || []);
        setChatMessages(cloudData.messages || []);
      } else {
        // Offline / Local Mode
        setIsOffline(true);
        setProjects(JSON.parse(localStorage.getItem('nexus_projects') || '[]'));
        
        const savedUsers = JSON.parse(localStorage.getItem('nexus_users') || '[]');
        setUsers(savedUsers.length > 0 ? savedUsers : getDefaultAdmin());
        
        setGlobalNotifications(JSON.parse(localStorage.getItem('nexus_notifications') || '[]'));
        setChatMessages(JSON.parse(localStorage.getItem('nexus_messages') || '[]'));
      }
      
      setIsLoading(false);
    };

    initData();
  }, []);

  const getDefaultAdmin = (): User[] => [{
      id: 'admin-1',
      username: 'admin',
      password: 'nexus2025',
      name: 'Administrator',
      role: 'admin',
      createdAt: new Date().toISOString()
  }];

  const [isChatOpen, setIsChatOpen] = useState(false);

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
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCost, setNewProjectCost] = useState<number>(0);

  // Project Rename State
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotSale, setCopilotSale] = useState<Sale | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  // New Notification UI State
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedWorkerForNotification, setSelectedWorkerForNotification] = useState<string>('');

  const notificationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence Effects (Save on Change)
  useEffect(() => {
    if (!isLoading) saveData('projects', projects);
  }, [projects, isLoading]);

  useEffect(() => {
    if (!isLoading) saveData('users', users);
  }, [users, isLoading]);

  useEffect(() => {
    if (!isLoading) saveData('notifications', globalNotifications);
  }, [globalNotifications, isLoading]);

  useEffect(() => {
    if (!isLoading) saveData('messages', chatMessages);
  }, [chatMessages, isLoading]);

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
    const dataStr = JSON.stringify({ projects, users, globalNotifications, chatMessages }, null, 2);
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
                if (importedData.globalNotifications) setGlobalNotifications(importedData.globalNotifications);
                if (importedData.chatMessages) setChatMessages(importedData.chatMessages);
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
        clients: [],
        cost: newProjectCost
    };
    setProjects(prev => [newProject, ...prev]);
    setNewProjectName('');
    setNewProjectCost(0);
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

  // --- NOTIFICATION & CHAT LOGIC ---

  const handleSendNotification = (targetUserId: string, message: string) => {
      const newNotification: GlobalNotification = {
          id: crypto.randomUUID(),
          targetUserId,
          fromUserName: currentUser?.name || 'Admin',
          message,
          date: new Date().toISOString(),
          isRead: false,
          type: 'alert'
      };
      setGlobalNotifications(prev => [newNotification, ...prev]);
      alert(t.teamManagement.notificationSent);
      setNotificationMessage('');
      setSelectedWorkerForNotification('');
  };

  const handleSendMessage = (receiverId: string, text: string) => {
      const newMessage: ChatMessage = {
          id: crypto.randomUUID(),
          senderId: currentUser!.id,
          receiverId,
          text,
          timestamp: new Date().toISOString(),
          read: false
      };
      setChatMessages(prev => [...prev, newMessage]);
  };

  const handleMarkChatRead = (senderId: string) => {
      setChatMessages(prev => prev.map(m => 
          (m.senderId === senderId && m.receiverId === currentUser?.id && !m.read)
          ? { ...m, read: true }
          : m
      ));
  };

  const handleMarkAsRead = (type: 'project' | 'global', id: string, projectId?: string, saleId?: string) => {
    if (type === 'global') {
        setGlobalNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } else if (type === 'project' && projectId && saleId) {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                clients: p.clients.map(c => {
                    if (c.id !== saleId) return c;
                    return {
                        ...c,
                        reminders: c.reminders?.map(r => r.id === id ? { ...r, isCompleted: true } : r)
                    };
                })
            };
        }));
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

  // Combined Active Reminders (Project Reminders + Global Notifications)
  const activeReminders = useMemo(() => {
    const now = new Date();
    const allReminders: any[] = [];
    
    // 1. Project Reminders
    if (currentUser?.role === 'admin') {
        projects.forEach(project => {
            project.clients.forEach(client => {
                (client.reminders || []).forEach(rem => {
                    if (!rem.isCompleted) {
                        const remDate = new Date(rem.date);
                        if(!isNaN(remDate.getTime())) {
                            let type = 'upcoming';
                            if (remDate < now) type = 'overdue';
                            else if (remDate.toDateString() === now.toDateString()) type = 'today';
                            
                            allReminders.push({ 
                                id: rem.id,
                                source: 'project',
                                saleId: client.id, 
                                projectId: project.id, 
                                clientName: client.clientName, 
                                projectName: project.name, 
                                note: rem.note,
                                date: rem.date,
                                type 
                            });
                        }
                    }
                });
            });
        });
    }

    // 2. Global Notifications
    globalNotifications.forEach(notif => {
        if (!notif.isRead && (notif.targetUserId === 'all' || notif.targetUserId === currentUser?.id)) {
            allReminders.push({
                id: notif.id,
                source: 'global',
                clientName: notif.fromUserName, // Sender Name as Client Name for list
                projectName: 'Notification',
                note: notif.message,
                date: notif.date,
                type: notif.type
            });
        }
    });

    // Sort by date (oldest first)
    return allReminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [projects, globalNotifications, currentUser]);

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
      
      return matchesSearch && matchesStatus && matchesPayment;
    });

    // Sorting Logic
    return result.sort((a, b) => {
      // Priority: Client Modification
      if (a.hasClientModifications && !b.hasClientModifications) return -1;
      if (!a.hasClientModifications && b.hasClientModifications) return 1;

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
  }, [activeProject, searchTerm, statusFilter, paymentFilter, sortOrder]);

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
            // Edit existing: Preserve sequenceNumber
            updatedClients = p.clients.map(c => c.id === client.id ? { ...client, sequenceNumber: c.sequenceNumber } : c);
        } else {
            // New client: Assign next sequenceNumber
            const maxSeq = p.clients.reduce((max, c) => Math.max(max, c.sequenceNumber || 0), 0);
            const newClient = { ...client, sequenceNumber: maxSeq + 1 };
            updatedClients = [newClient, ...p.clients];
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
    // Total Value of all items in all clients (Potential Revenue)
    const totalPotentialRevenue = project.clients.reduce((acc, c) => acc + (c.price * c.items.length), 0);
    
    // Expenses (Cost)
    const expenses = project.cost || 0;

    // ROI Calculation: ((Total Potential Revenue - Expenses) / Expenses) * 100
    // If Expenses are 0, ROI is theoretically infinite, but we'll show 0 or handle it gracefully.
    const potentialProfit = totalPotentialRevenue - expenses;
    const roi = expenses > 0 ? ((potentialProfit / expenses) * 100).toFixed(0) : '∞';

    const clientCount = project.clients.length;

    return (
        <div 
            key={project.id} 
            onClick={() => { setActiveProjectId(project.id); setSearchTerm(''); }}
            className="group bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-lg hover:border-primary-200 transition-all relative overflow-hidden flex flex-col justify-between"
        >
            <div>
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
            </div>
            
            <div className="space-y-3">
                {/* ROI & Profit Badges */}
                <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1`}>
                        <TrendingUp size={10} /> {roi === '∞' ? '∞' : `${roi}%`} ROI
                    </span>
                    <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                        +{potentialProfit.toLocaleString()}
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-1.5 text-slate-600">
                        <Users size={14} />
                        <span>{clientCount}</span>
                    </div>
                    <div className="font-bold text-slate-700 flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-normal uppercase">{t.potentialProfit}</span>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // Calculate stats for Active Project Detail View
  const projectStats = useMemo(() => {
      if (!activeProject) return null;
      
      const totalPotentialRevenue = activeProject.clients.reduce((acc, c) => acc + (c.price * c.items.length), 0);
      const collectedRevenue = activeProject.clients.reduce((acc, c) => {
          const paidItems = c.items.filter(i => i.isPaid).length;
          return acc + (c.price * paidItems);
      }, 0);

      const expenses = activeProject.cost || 0;
      const netProfit = collectedRevenue - expenses;
      const potentialProfit = totalPotentialRevenue - expenses;
      const roi = expenses > 0 ? ((potentialProfit / expenses) * 100).toFixed(1) : '∞';

      return { totalPotentialRevenue, collectedRevenue, expenses, netProfit, potentialProfit, roi };
  }, [activeProject]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">{t.welcomeBack}...</p>
      </div>
    );
  }

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
                <div className="flex items-center gap-4">
                    {isOffline && (
                      <div title="Offline Mode">
                        <WifiOff className="text-red-500 w-5 h-5" />
                      </div>
                    )}
                    <button onClick={() => setIsChatOpen(true)} className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                        <MessageCircle size={20} />
                        {chatMessages.filter(m => m.receiverId === currentUser.id && !m.read).length > 0 && 
                          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        }
                    </button>
                    {/* Notification Bell for Workers */}
                    <div className="relative" ref={notificationRef}>
                        <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative">
                            <Bell size={20} />
                            {activeReminders.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                        </button>
                        {isNotificationOpen && (
                            <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden`}>
                                <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-sm">{t.remindersAlerts}</div>
                                <div className="max-h-80 overflow-y-auto">
                                    {activeReminders.length === 0 ? <div className="p-4 text-center text-slate-400 text-xs">{t.noNotifications}</div> :
                                        activeReminders.map(r => (
                                            <div key={r.id} className="p-4 border-b border-slate-50 flex justify-between items-start hover:bg-slate-50">
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold">{r.clientName}</p>
                                                    <p className="text-xs text-slate-600 mt-1">{r.note}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(r.date).toLocaleString()}</p>
                                                </div>
                                                <button onClick={() => handleMarkAsRead('global', r.id)} className="text-primary-600 hover:bg-primary-50 p-1 rounded">
                                                    <Check size={16} />
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-red-600">
                        <LogOut size={18} />
                    </Button>
                </div>
            </nav>
            <WorkerDashboard 
                currentUser={currentUser} 
                projects={projects} 
                onUpdateTaskStatus={handleWorkerUpdateStatus} 
                lang={language}
            />
            <ChatSystem 
                currentUser={currentUser} 
                users={users} 
                messages={chatMessages} 
                onSendMessage={handleSendMessage} 
                onMarkRead={handleMarkChatRead}
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)} 
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
             {/* Offline Indicator */}
             {isOffline && (
               <div title="Offline Mode" className="hidden md:block">
                 <WifiOff className="text-red-500 w-5 h-5" />
               </div>
             )}

             {/* Chat Button */}
             <button onClick={() => setIsChatOpen(true)} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 relative">
                <MessageCircle size={20} className="text-slate-600" />
                {chatMessages.filter(m => m.receiverId === currentUser?.id && !m.read).length > 0 && 
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                      {chatMessages.filter(m => m.receiverId === currentUser?.id && !m.read).length}
                  </span>
                }
             </button>

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
                    {activeReminders.length > 0 && (
                        <button className="text-xs text-primary-600 hover:underline">{t.markRead}</button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {activeReminders.length === 0 ? <div className="p-8 text-center text-slate-400 text-xs">{t.noNotifications}</div> : 
                    activeReminders.map((rem: any) => (
                      <div key={rem.id} className="w-full text-start p-4 hover:bg-slate-50 border-b border-slate-50 flex gap-3 group relative">
                        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${rem.type === 'overdue' || rem.type === 'alert' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {rem.type === 'overdue' || rem.type === 'alert' ? <AlertCircle size={16} /> : <Clock size={16} />}
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => {
                             if(rem.source === 'project') {
                                 setActiveProjectId(rem.projectId); 
                                 const p = projects.find(x => x.id === rem.projectId); 
                                 const c = p?.clients.find(x => x.id === rem.saleId); 
                                 if(c) { setEditingSale(c); setIsFormOpen(true); setIsNotificationOpen(false); }
                             }
                        }}>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-slate-800 text-xs truncate">{rem.clientName}</span>
                            <span className="text-[10px] text-slate-400">
                                {new Date(rem.date).toLocaleString(language === 'ar' ? 'ar-MA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mb-0.5">{rem.projectName}</p>
                          <p className="text-slate-500 text-xs line-clamp-2">{rem.note}</p>
                        </div>
                        
                        {/* Mark as Read Button (Always visible on hover or mobile) */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(rem.source, rem.id, rem.projectId, rem.saleId); }}
                            className="absolute bottom-2 right-2 p-1.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-green-600 hover:border-green-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                            title={t.markRead}
                        >
                            <Check size={14} />
                        </button>
                      </div>
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
            <div className="space-y-6">
                <TeamManager 
                    users={users} 
                    onAddUser={handleAddUser} 
                    onDeleteUser={handleDeleteUser} 
                    lang={language} 
                />
                
                {/* Send Notification Card */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Bell size={20} className="text-primary-600" />
                        {t.teamManagement.sendNotification}
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-1/3">
                             <Select 
                                label={t.teamManagement.assignTo}
                                options={[
                                    { label: 'All Workers', value: 'all' },
                                    ...users.filter(u => u.role === 'worker').map(u => ({ label: u.name, value: u.id }))
                                ]}
                                value={selectedWorkerForNotification}
                                onChange={(e) => setSelectedWorkerForNotification(e.target.value)}
                             />
                        </div>
                        <div className="w-full md:flex-1">
                             <Input 
                                label={t.teamManagement.notificationMessage}
                                value={notificationMessage}
                                onChange={(e) => setNotificationMessage(e.target.value)}
                                placeholder="..."
                             />
                        </div>
                        <Button onClick={() => handleSendNotification(selectedWorkerForNotification, notificationMessage)} disabled={!notificationMessage || !selectedWorkerForNotification}>
                            {t.teamManagement.sendNotification}
                        </Button>
                    </div>
                </Card>
            </div>
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

        {/* --- PROJECT DETAIL VIEW (ACTIVE PROJECT) --- */}
        {currentView === 'dashboard' && activeProjectId && (
          <div className="animate-fade-in bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             
             {/* Financial Overview Section */}
             {projectStats && (
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Wallet size={12} /> {t.projectRevenue}</p>
                            <p className="text-lg font-bold text-slate-800">{projectStats.collectedRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">{t.mad}</span></p>
                            <p className="text-[10px] text-slate-400 mt-1">Potential: {projectStats.totalPotentialRevenue.toLocaleString()} {t.mad}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><PieChartIcon size={12} /> {t.expenses}</p>
                             <p className="text-lg font-bold text-slate-800">{projectStats.expenses.toLocaleString()} <span className="text-xs font-normal text-slate-400">{t.mad}</span></p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={12} /> {t.netProfit}</p>
                             <p className={`text-lg font-bold ${projectStats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {projectStats.netProfit >= 0 ? '+' : ''}{projectStats.netProfit.toLocaleString()} <span className="text-xs font-normal text-slate-400">{t.mad}</span>
                             </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Percent size={12} /> {t.roi}</p>
                             <p className={`text-lg font-bold ${projectStats.roi !== '∞' && Number(projectStats.roi) >= 0 ? 'text-purple-600' : 'text-slate-600'}`}>
                                {projectStats.roi === '∞' ? '∞' : `${projectStats.roi}%`}
                             </p>
                        </div>
                    </div>
                </div>
             )}

             {/* Toolbar */}
             <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                 {/* Filters */}
                 <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} size={18} />
                        <input 
                            type="text" 
                            placeholder={t.searchPlaceholder} 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className={`w-full ${language === 'ar' ? 'pr-10' : 'pl-10'} py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary-500`}
                        />
                    </div>
                    
                    <select 
                        className="py-2 px-3 rounded-lg border border-slate-200 text-sm outline-none bg-white cursor-pointer hover:border-slate-300"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">{t.allStatuses}</option>
                        {Object.values(SaleStatus).map(s => <option key={s} value={s}>{t.statuses[s]}</option>)}
                    </select>

                    <select 
                        className="py-2 px-3 rounded-lg border border-slate-200 text-sm outline-none bg-white cursor-pointer hover:border-slate-300"
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                    >
                        <option value="All">{t.allPayments}</option>
                        <option value="Fully Paid">{t.fullyPaid}</option>
                        <option value="Partially Paid">{t.partiallyPaid}</option>
                        <option value="Unpaid">{t.unpaid}</option>
                    </select>
                    
                    <button 
                        onClick={() => setSortOrder(prev => prev === 'dateDesc' ? 'paymentStatus' : 'dateDesc')}
                        className="p-2 border border-slate-200 rounded-lg bg-white text-slate-500 hover:text-primary-600"
                        title={t.sortBy}
                    >
                        <ArrowUpDown size={18} />
                    </button>
                 </div>
             </div>

             {/* Creative Table */}
             <div className="overflow-auto px-4 pb-4" style={{ maxHeight: '1650px' }}>
                <table className="w-full border-separate border-spacing-y-3">
                    <thead>
                        <tr className="text-sm text-slate-400">
                            <th className={`font-medium py-2 px-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>#</th>
                            <th className={`font-medium py-2 px-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.client}</th>
                            <th className={`font-medium py-2 px-4 hidden md:table-cell ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.serviceType}</th>
                            <th className={`font-medium py-2 px-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.status}</th>
                            <th className={`font-medium py-2 px-4 hidden md:table-cell ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.paymentStatus}</th>
                            <th className={`font-medium py-2 px-4 hidden lg:table-cell ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.leadDate}</th>
                            <th className={`font-medium py-2 px-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.map((client, index) => {
                             const paidItems = client.items.filter(i => i.isPaid).length;
                             const totalItems = client.items.length;
                             const progress = totalItems > 0 ? (paidItems / totalItems) * 100 : 0;
                             
                             return (
                                <tr 
                                  key={client.id} 
                                  className="bg-white hover:bg-slate-50 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl group relative transform hover:-translate-y-0.5"
                                >
                                    {/* Sequence & Modification Badge */}
                                    <td className={`py-4 px-4 ${language === 'ar' ? 'rounded-r-xl border-r' : 'rounded-l-xl border-l'} align-middle border-y border-slate-100 group-hover:border-primary-100`}>
                                       <div className="flex flex-col items-start gap-1">
                                         <span className="font-mono text-xs text-slate-400">#{client.sequenceNumber || index + 1}</span>
                                         {client.hasClientModifications && <ModificationBadge lang={language} />}
                                       </div>
                                    </td>

                                    {/* Client Info with Avatar */}
                                    <td className="py-4 px-4 align-middle border-y border-slate-100 group-hover:border-primary-100">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm bg-gradient-to-br ${getAvatarColor(client.clientName)}`}>
                                          {client.clientName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <div className="font-bold text-slate-800 text-sm">{client.clientName}</div>
                                          <div className="text-xs text-slate-400 flex items-center gap-1">
                                            <Phone size={10} /> {client.phoneNumber}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Service Type */}
                                    <td className="py-4 px-4 align-middle border-y border-slate-100 group-hover:border-primary-100 hidden md:table-cell">
                                       <ServiceBadge type={client.serviceType} lang={language} />
                                    </td>

                                    {/* Status */}
                                    <td className="py-4 px-4 align-middle border-y border-slate-100 group-hover:border-primary-100">
                                       <StatusBadge status={client.status} lang={language} />
                                    </td>

                                    {/* Payment Progress Bar */}
                                    <td className="py-4 px-4 align-middle border-y border-slate-100 group-hover:border-primary-100 hidden md:table-cell min-w-[140px]">
                                       <div className="flex flex-col gap-1.5">
                                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                             <span className={progress === 100 ? 'text-emerald-600' : 'text-slate-500'}>
                                                {progress === 100 ? t.fullyPaid : `${Math.round(progress)}%`}
                                             </span>
                                             <span className="text-slate-400">
                                                {(client.price * paidItems).toLocaleString()} / {(client.price * totalItems).toLocaleString()}
                                             </span>
                                          </div>
                                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                             <div 
                                                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-amber-400' : 'bg-slate-200'}`} 
                                                style={{ width: `${progress}%` }}
                                             />
                                          </div>
                                       </div>
                                    </td>

                                    {/* Date */}
                                    <td className="py-4 px-4 align-middle border-y border-slate-100 group-hover:border-primary-100 hidden lg:table-cell">
                                       <div className="text-sm text-slate-500 flex items-center gap-1.5">
                                          <Calendar size={14} className="text-slate-300" />
                                          {new Date(client.leadDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'en-US')}
                                       </div>
                                    </td>

                                    {/* Actions */}
                                    <td className={`py-4 px-4 ${language === 'ar' ? 'rounded-l-xl border-l text-left' : 'rounded-r-xl border-r text-right'} align-middle border-y border-slate-100 group-hover:border-primary-100`}>
                                        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform ${language === 'ar' ? '-translate-x-2' : 'translate-x-2'} group-hover:translate-x-0 justify-end`}>
                                            <button onClick={(e) => {e.stopPropagation(); setCopilotSale(client); setIsCopilotOpen(true);}} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-purple-600 hover:border-purple-200 rounded-xl shadow-sm hover:shadow-md transition-all" title={t.aiAssistant}>
                                                <Bot size={16} />
                                            </button>
                                            <button onClick={(e) => {e.stopPropagation(); handleWhatsApp(client.phoneNumber);}} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-green-600 hover:border-green-200 rounded-xl shadow-sm hover:shadow-md transition-all" title={t.whatsapp}>
                                                <MessageCircle size={16} />
                                            </button>
                                            <button onClick={(e) => {e.stopPropagation(); setEditingSale(client); setIsFormOpen(true);}} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all" title={t.editProject}>
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
                
                {filteredClients.length === 0 && (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 mt-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Search size={24} className="opacity-50" />
                        </div>
                        <p className="font-medium">No clients found matching your search.</p>
                        <p className="text-sm mt-1">Try adjusting your filters or create a new client.</p>
                    </div>
                )}
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
                    <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-3.5 text-slate-400`} size={20} />
                    <input 
                        type="text" 
                        placeholder={t.searchProjects} 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className={`w-full ${language === 'ar' ? 'pr-10' : 'pl-10'} p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-100 transition-all`}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.length === 0 ? (
                         <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                            <FolderKanban size={48} className="mx-auto mb-4 opacity-50" />
                            <p>{t.noProjectsFound}</p>
                            <Button variant="ghost" onClick={() => setIsProjectModalOpen(true)} className="mt-2 text-primary-600">
                                {t.createProject}
                            </Button>
                        </div>
                    ) : (
                        filteredProjects.map(project => renderProjectCard(project))
                    )}
                </div>
            </div>
        )}

      </main>

      {/* Project Creation Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
             <h3 className="text-lg font-bold text-slate-800 mb-4">{t.createProject}</h3>
             <form onSubmit={handleCreateProject} className="space-y-4">
                <Input 
                    label={t.projectName} 
                    value={newProjectName} 
                    onChange={(e) => setNewProjectName(e.target.value)} 
                    placeholder="New Project Name"
                    autoFocus
                    required 
                />
                <Input 
                    label={t.projectCost} 
                    type="number"
                    value={newProjectCost} 
                    onChange={(e) => setNewProjectCost(Number(e.target.value))} 
                    placeholder="0.00"
                />
                <div className="flex gap-3 justify-end pt-2">
                   <Button type="button" variant="ghost" onClick={() => setIsProjectModalOpen(false)}>{t.cancel}</Button>
                   <Button type="submit">{t.createProject}</Button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* Sales Form Modal */}
      <SalesForm 
        initialData={editingSale} 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingSale(null); }} 
        onSave={handleSaveClient} 
        onDelete={handleDeleteClient}
        lang={language}
        users={users}
      />

      {/* Copilot Sidebar */}
      {isCopilotOpen && (
          <Copilot 
            selectedSale={copilotSale} 
            allSales={projects.flatMap(p => p.clients)} 
            onClose={() => setIsCopilotOpen(false)} 
            lang={language} 
          />
      )}
    </div>
  );
};

export default App;