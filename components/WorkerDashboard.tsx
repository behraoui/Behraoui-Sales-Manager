import React, { useState } from 'react';
import { Project, Sale, SaleItem, ItemStatus, User, TaskType } from '../types';
import { Card, StatusBadge, ServiceBadge, Button } from './UIComponents';
import { translations } from '../translations';
import { CheckCircle2, Circle, Clock, Loader2, CheckCircle, ChevronDown, ChevronUp, FileText, Download, FileAudio, Image as ImageIcon } from 'lucide-react';

interface WorkerDashboardProps {
  currentUser: User;
  projects: Project[];
  onUpdateTaskStatus: (projectId: string, saleId: string, itemIndex: number, newStatus: ItemStatus) => void;
  lang: 'en' | 'ar';
}

const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ currentUser, projects, onUpdateTaskStatus, lang }) => {
  const t = translations[lang];
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Flatten and filter sales assigned to this worker
  const myTasks = projects.flatMap(p => 
    p.clients
      .filter(c => c.assignedWorkerIds?.includes(currentUser.id))
      .map(c => ({ ...c, projectName: p.name, projectId: p.id }))
  );

  const toggleExpand = (id: string) => {
    setExpandedSaleId(prev => prev === id ? null : id);
  };

  const cycleStatus = (projectId: string, saleId: string, index: number, currentStatus: ItemStatus) => {
    const statuses: ItemStatus[] = ['Pending', 'In Progress', 'Delivered'];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    onUpdateTaskStatus(projectId, saleId, index, statuses[nextIndex]);
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
        case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'Delivered': return 'bg-green-50 text-green-700 border-green-200';
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
    <div className="animate-fade-in p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{t.teamManagement.myTasks}</h1>
        <p className="text-slate-500 text-sm">{t.welcomeBack}, {currentUser.name}</p>
      </div>

      {myTasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
           <p className="text-slate-400">{t.teamManagement.noTasks}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myTasks.map(sale => (
            <Card key={sale.id} className="overflow-hidden border border-slate-200 transition-all">
              {/* Header */}
              <div 
                className="p-5 flex items-start justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpand(sale.id)}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-slate-800">{sale.clientName}</h3>
                    <ServiceBadge type={sale.serviceType} lang={lang} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                      {sale.projectName} • {new Date(sale.leadDate).toLocaleDateString()}
                      {sale.phoneNumber && <span className="mx-2">• {sale.phoneNumber}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                   <StatusBadge status={sale.status} lang={lang} />
                   {expandedSaleId === sale.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedSaleId === sale.id && (
                <div className="bg-slate-50 border-t border-slate-100 p-5 space-y-6 animate-fade-in">
                  
                  {/* General Instructions */}
                  {sale.teamInstructions && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                             <FileText size={14} /> {t.teamManagement.instructions}
                          </h4>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{sale.teamInstructions}</p>
                      </div>
                  )}

                  {/* Tasks / Items */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.itemsBreakdown}</h4>
                    <div className="space-y-4">
                        {sale.items.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-slate-800">{item.name || 'Untitled Task'}</span>
                                            {getTaskTypeBadge(item.type)}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); cycleStatus(sale.projectId, sale.id, idx, item.status); }}
                                        className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all hover:opacity-80 ${getItemStatusColor(item.status)}`}
                                    >
                                        {getItemStatusIcon(item.status)}
                                        <span className="text-xs font-bold">{t.itemStatuses[item.status]}</span>
                                    </button>
                                </div>

                                {/* Script / Description */}
                                {item.description && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 whitespace-pre-wrap font-mono">
                                        {item.description}
                                    </div>
                                )}

                                {/* Attachments */}
                                {item.attachments && item.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-1">
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
  );
};

export default WorkerDashboard;