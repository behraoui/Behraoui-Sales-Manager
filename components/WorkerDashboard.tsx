
import React, { useState, useEffect, useMemo } from 'react';
import { Project, Sale, SaleItem, ItemStatus, User, TaskType, Attachment, WorkerStatus } from '../types';
import { Card, StatusBadge, ServiceBadge, Button } from './UIComponents';
import { translations } from '../translations';
import { api } from '../services/api';
import { 
    CheckCircle2, 
    Circle, 
    Clock, 
    Loader2, 
    CheckCircle, 
    ChevronDown, 
    ChevronUp, 
    FileText, 
    Download, 
    FileAudio, 
    Image as ImageIcon,
    Play,
    Pause,
    RotateCcw,
    MessageCircle,
    ListTodo,
    PieChart,
    User as UserIcon,
    Calendar,
    Briefcase,
    AlertTriangle,
    FileCheck,
    Upload,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface WorkerDashboardProps {
  currentUser: User;
  projects: Project[];
  onUpdateTaskStatus: (projectId: string, saleId: string, itemIndex: number, newStatus: ItemStatus) => void;
  lang: 'en' | 'ar';
  onOpenChat: () => void;
}

const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ currentUser, projects, onUpdateTaskStatus, lang, onOpenChat }) => {
  const t = translations[lang];
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  // Fixed: explicitly use WorkerStatus type to allow 'offline' value from currentUser
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>(currentUser.workerStatus || 'available');

  // --- WORKER STATUS LOGIC ---
  const toggleWorkerStatus = async () => {
      // If currently available, switch to busy. Otherwise (busy or offline), switch to available.
      const newStatus: WorkerStatus = workerStatus === 'available' ? 'busy' : 'available';
      setWorkerStatus(newStatus);
      await api.updateUser({ ...currentUser, workerStatus: newStatus });
  };

  // --- ANALYTICS LOGIC ---
  const myTasks = useMemo(() => {
    return projects.flatMap(p => 
        p.clients
          .filter(c => c.assignedWorkerIds?.includes(currentUser.id))
          .map(c => ({ ...c, projectName: p.name, projectId: p.id }))
      );
  }, [projects, currentUser.id]);

  const stats = useMemo(() => {
    let totalItems = 0;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    myTasks.forEach(sale => {
        sale.items.forEach(item => {
            totalItems++;
            if (item.status === 'Delivered') completed++;
            else if (item.status === 'In Progress') inProgress++;
            else pending++;
        });
    });

    const completionRate = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
    
    return { totalItems, completed, inProgress, pending, completionRate };
  }, [myTasks]);

  const chartData = [
      { name: 'Completed', value: stats.completed, color: '#10b981' },
      { name: 'In Progress', value: stats.inProgress, color: '#3b82f6' },
      { name: 'Pending', value: stats.pending, color: '#e2e8f0' }
  ];

  // --- FOCUS TIMER LOGIC ---
  const [timerTime, setTimerTime] = useState(25 * 60); // 25 minutes in seconds
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timerTime > 0) {
        interval = setInterval(() => {
            setTimerTime((prevTime) => prevTime - 1);
        }, 1000);
    } else if (timerTime === 0) {
        setIsTimerActive(false);
        // Switch mode automatically
        if (timerMode === 'work') {
            setTimerMode('break');
            setTimerTime(5 * 60);
            alert(lang === 'ar' ? 'انتهى وقت العمل! خذ استراحة.' : 'Work time over! Take a break.');
        } else {
            setTimerMode('work');
            setTimerTime(25 * 60);
            alert(lang === 'ar' ? 'انتهت الاستراحة! لنعد للعمل.' : 'Break over! Back to work.');
        }
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerTime, timerMode, lang]);

  const toggleTimer = () => setIsTimerActive(!isTimerActive);
  
  const resetTimer = () => {
      setIsTimerActive(false);
      setTimerTime(timerMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  // --- HELPERS ---
  const toggleExpand = (id: string) => {
    setExpandedSaleId(prev => prev === id ? null : id);
  };

  const cycleStatus = (projectId: string, saleId: string, index: number, currentStatus: ItemStatus) => {
    const statuses: ItemStatus[] = ['Pending', 'In Progress', 'Delivered'];
    
    // Prevent cycling to 'Delivered' if no deliverables uploaded (optional rule, implemented as alert for now)
    // Note: 'Needs Revision' is only set by Admin, worker cycles back to 'In Progress' to fix
    
    let nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    
    // If currently 'Needs Revision', worker likely wants to go to 'In Progress' or 'Delivered'
    if (currentStatus === 'Needs Revision') {
        nextIndex = statuses.indexOf('In Progress');
    }

    onUpdateTaskStatus(projectId, saleId, index, statuses[nextIndex]);
  };

  const handleDeliverableUpload = async (projectId: string, saleId: string, itemIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          const fileName = file.name;
          
          const newDeliverable: Attachment = {
              name: fileName,
              type: file.type.includes('audio') ? 'audio' : file.type.includes('pdf') ? 'pdf' : file.type.includes('video') ? 'video' : file.type.includes('image') ? 'image' : 'other',
              data: base64
          };

          // We need to fetch the specific sale to update it. 
          // Since we don't have a direct 'updateSaleItem' prop that handles attachments in parent, 
          // we should ideally update the whole sale via API and trigger a refresh.
          // For this implementation, we will perform a direct API update to 'sale_items' then trigger callback.
          // Note: In a real app, 'onUpdateTaskStatus' might be 'onUpdateTask' to handle entire object.
          
          // Construct the update. We need to get the current items first.
          const project = projects.find(p => p.id === projectId);
          const sale = project?.clients.find(c => c.id === saleId);
          if (sale) {
              const updatedItems = [...sale.items];
              const currentDeliverables = updatedItems[itemIndex].deliverables || [];
              updatedItems[itemIndex] = {
                  ...updatedItems[itemIndex],
                  deliverables: [...currentDeliverables, newDeliverable],
                  status: 'Delivered' // Auto-set to Delivered on upload
              };
              
              // Optimistic UI update via the prop (trick: status update triggers re-render if parent handles it)
              // We really should have a proper update method. 
              // We'll manually call API here for the file, then calling onUpdateTaskStatus to refresh UI status.
              
              const newSale = { ...sale, items: updatedItems };
              await api.saveSale(projectId, newSale);
              
              // Trigger UI refresh
              onUpdateTaskStatus(projectId, saleId, itemIndex, 'Delivered');
              alert(t.tasks.deliverablesUploaded);
          }
      };
      reader.readAsDataURL(file);
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
        case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'Delivered': return 'bg-green-50 text-green-700 border-green-200';
        case 'Needs Revision': return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
        default: return 'bg-slate-50 text-slate-500 border-slate-200';
      }
    };

    const getTaskTypeBadge = (type?: TaskType) => {
        const typeStr = type || TaskType.General;
        const label = t.taskTypes[typeStr] || typeStr;
        let colorClass = 'bg-slate-100 text-slate-600';

        if (typeStr === TaskType.ScriptWriting) colorClass = 'bg-purple-50 text-purple-700 border-purple-100';
        else if (typeStr === TaskType.UGCMale || typeStr === TaskType.UGCFemale) colorClass = 'bg-pink-50 text-pink-700 border-pink-100';
        else if (typeStr === TaskType.VoiceOver) colorClass = 'bg-orange-50 text-orange-700 border-orange-100';
        else if (typeStr === TaskType.VideoEditing) colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-100';

        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>{label}</span>;
    };

  return (
    <div className="animate-fade-in p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-gradient-to-br from-primary-50 to-transparent rounded-full -mr-16 -mt-16 opacity-50 pointer-events-none"></div>
        
        <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 border-white shadow-lg overflow-hidden flex items-center justify-center bg-slate-100">
                {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <UserIcon size={32} className="text-slate-400" />
                )}
            </div>
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{t.welcomeBack}, {currentUser.name}!</h1>
                <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                    <Briefcase size={14} />
                    <span>{t.teamManagement.role}: {currentUser.role}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </p>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 relative z-10 w-full md:w-auto items-center">
             {/* Availability Toggle */}
             <button 
                onClick={toggleWorkerStatus}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
                    workerStatus === 'available' 
                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' 
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
             >
                 {workerStatus === 'available' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                 {workerStatus === 'available' ? t.teamManagement.available : t.teamManagement.busy}
             </button>

             <Button onClick={onOpenChat} className="shadow-lg shadow-primary-500/20 flex-1 md:flex-none">
                <MessageCircle size={18} className={lang === 'ar' ? 'ml-2' : 'mr-2'} />
                {t.workerDashboard.contactAdmin}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Analytics Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
             <Card className="p-5 flex flex-col justify-between border-b-4 border-b-primary-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.workerDashboard.totalTasks}</p>
                    <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                        <ListTodo size={18} />
                    </div>
                </div>
                <div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.totalItems}</h3>
                    <p className="text-xs text-slate-400 mt-1">{t.workerDashboard.taskStats}</p>
                </div>
             </Card>

             <Card className="p-5 flex flex-col justify-between border-b-4 border-b-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.workerDashboard.inProgress}</p>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Loader2 size={18} className="animate-spin-slow" />
                    </div>
                </div>
                <div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.inProgress}</h3>
                    <p className="text-xs text-slate-400 mt-1">{t.workerDashboard.inProgress}</p>
                </div>
             </Card>

             <Card className="p-5 flex flex-col justify-between border-b-4 border-b-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.workerDashboard.completionRate}</p>
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <PieChart size={18} />
                    </div>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="text-3xl font-bold text-emerald-600">{stats.completionRate}%</h3>
                        <p className="text-xs text-slate-400 mt-1">{stats.completed} {t.workerDashboard.completed}</p>
                    </div>
                    <div className="w-12 h-12">
                         <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie data={chartData} innerRadius={15} outerRadius={22} dataKey="value" startAngle={90} endAngle={-270}>
                                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                </Pie>
                            </RePieChart>
                         </ResponsiveContainer>
                    </div>
                </div>
             </Card>
          </div>

          {/* Focus Timer */}
          <Card className={`p-6 flex flex-col items-center justify-center text-center transition-all duration-300 border-2 shadow-lg ${timerMode === 'work' ? 'border-primary-100 bg-white' : 'border-emerald-100 bg-emerald-50'}`}>
               <div className={`mb-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${timerMode === 'work' ? 'bg-primary-50 text-primary-600' : 'bg-emerald-100 text-emerald-600'}`}>
                   <Clock size={14} /> {timerMode === 'work' ? t.workerDashboard.workMode : t.workerDashboard.breakMode}
               </div>
               
               <div className="text-6xl font-mono font-bold text-slate-800 mb-6 tabular-nums tracking-tighter">
                   {formatTime(timerTime)}
               </div>

               <div className="flex gap-3 w-full">
                   <button 
                      onClick={toggleTimer} 
                      className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md active:scale-95 ${
                          isTimerActive 
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                          : timerMode === 'work' 
                             ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-500/30' 
                             : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30'
                      }`}
                   >
                       {isTimerActive ? <Pause size={20} /> : <Play size={20} />}
                       {isTimerActive ? t.workerDashboard.pause : t.workerDashboard.start}
                   </button>
                   <button onClick={resetTimer} className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm">
                       <RotateCcw size={20} />
                   </button>
               </div>
               <p className="text-[10px] text-slate-400 mt-4 font-medium uppercase tracking-widest opacity-70">
                   {timerMode === 'work' ? 'Stay Focused' : 'Recharge'}
               </p>
          </Card>
      </div>

      {/* Task List */}
      <div>
        <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-slate-800">{t.workerDashboard.taskStats}</h2>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{myTasks.length}</span>
        </div>
        
        {myTasks.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <ListTodo size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{t.teamManagement.noTasks}</h3>
                <p className="text-slate-400 text-sm mt-1">Check back later or contact your admin.</p>
            </div>
        ) : (
            <div className="space-y-4">
            {myTasks.map(sale => (
                <Card key={sale.id} className="overflow-hidden border border-slate-200 transition-all hover:border-primary-200 hover:shadow-md">
                {/* Header */}
                <div 
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors gap-4"
                    onClick={() => toggleExpand(sale.id)}
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-slate-800">{sale.clientName}</h3>
                            <ServiceBadge type={sale.serviceType} lang={lang} />
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                                <Briefcase size={12} /> {sale.projectName}
                            </span>
                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                                <Calendar size={12} /> {new Date(sale.leadDate).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <StatusBadge status={sale.status} lang={lang} />
                        <div className={`p-1.5 rounded-full transition-transform duration-300 ${expandedSaleId === sale.id ? 'bg-primary-100 text-primary-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                            <ChevronDown size={20} />
                        </div>
                    </div>
                </div>

                {/* Expanded Details */}
                {expandedSaleId === sale.id && (
                    <div className="bg-slate-50/80 border-t border-slate-100 p-5 space-y-6 animate-fade-in">
                    
                    {/* General Instructions */}
                    {sale.teamInstructions && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-16 bg-blue-100 rounded-full -mr-10 -mt-10 opacity-30 pointer-events-none"></div>
                            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <FileText size={14} /> {t.teamManagement.instructions}
                            </h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed relative z-10">{sale.teamInstructions}</p>
                        </div>
                    )}

                    {/* Tasks / Items */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.itemsBreakdown}</h4>
                        <div className="space-y-4">
                            {sale.items.map((item, idx) => (
                                <div key={idx} className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col gap-4 relative group transition-colors ${item.status === 'Needs Revision' ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-200 hover:border-primary-100'}`}>
                                    <div className="absolute top-4 right-4 text-xs font-bold text-slate-200 group-hover:text-primary-100 transition-colors text-6xl opacity-20 pointer-events-none">
                                        #{idx + 1}
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 relative z-10">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-base font-bold text-slate-800">{item.name || 'Untitled Task'}</span>
                                                {getTaskTypeBadge(item.type)}
                                            </div>
                                            
                                            {/* NEEDS REVISION WARNING */}
                                            {item.status === 'Needs Revision' && (
                                                <div className="mb-3 bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl flex items-start gap-3">
                                                    <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-bold uppercase mb-1">{t.tasks.rejectionReason}</p>
                                                        <p className="text-sm">{item.rejectionNote || 'No reason provided.'}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Reference Attachments */}
                                            {item.attachments && item.attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {item.attachments.map((att, attIdx) => (
                                                        <a 
                                                            key={attIdx}
                                                            href={att.data}
                                                            download={att.name}
                                                            className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs hover:bg-slate-100 transition-colors text-slate-600"
                                                        >
                                                            {att.type === 'audio' ? <FileAudio size={14} className="text-purple-500" /> : att.type === 'pdf' ? <FileText size={14} className="text-red-500" /> : <ImageIcon size={14} className="text-blue-500" />}
                                                            <span className="truncate max-w-[150px]">{att.name}</span>
                                                            <Download size={12} className="text-slate-400" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-2">
                                            {/* Action Buttons */}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); cycleStatus(sale.projectId, sale.id, idx, item.status); }}
                                                className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm ${getItemStatusColor(item.status)}`}
                                            >
                                                {getItemStatusIcon(item.status)}
                                                <span className="text-sm font-bold">{t.itemStatuses[item.status]}</span>
                                            </button>

                                            {/* Upload Deliverable Button */}
                                            <label className="cursor-pointer flex items-center gap-2 bg-white border border-green-200 text-green-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-50 transition-colors shadow-sm">
                                                <Upload size={14} />
                                                {t.tasks.uploadDeliverable}
                                                <input type="file" className="hidden" accept="audio/*,application/pdf,image/*,video/*" onChange={(e) => handleDeliverableUpload(sale.projectId, sale.id, idx, e)} />
                                            </label>

                                            {/* Show uploaded deliverables */}
                                            {item.deliverables && item.deliverables.length > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md">
                                                    <FileCheck size={12} /> {item.deliverables.length} {t.tasks.deliverablesUploaded}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Script / Description */}
                                    {item.description && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 whitespace-pre-wrap font-mono leading-relaxed relative z-10">
                                            {item.description}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    </div>
                )}
                </Card>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default WorkerDashboard;
