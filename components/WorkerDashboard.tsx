import React, { useState } from 'react';
import { Project, Sale, SaleItem, ItemStatus, User } from '../types';
import { Card, StatusBadge, ServiceBadge, Button } from './UIComponents';
import { translations } from '../translations';
import { CheckCircle2, Circle, Clock, Loader2, CheckCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';

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
                  <p className="text-xs text-slate-500 font-medium">{sale.projectName} • {new Date(sale.leadDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                   <StatusBadge status={sale.status} lang={lang} />
                   {expandedSaleId === sale.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedSaleId === sale.id && (
                <div className="bg-slate-50 border-t border-slate-100 p-5 space-y-6 animate-fade-in">
                  
                  {/* Instructions */}
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
                    <div className="space-y-2">
                        {sale.items.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                <span className="text-sm font-medium text-slate-700">{item.name || 'Untitled Task'}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); cycleStatus(sale.projectId, sale.id, idx, item.status); }}
                                    className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all hover:opacity-80 w-full sm:w-auto justify-center ${getItemStatusColor(item.status)}`}
                                >
                                    {getItemStatusIcon(item.status)}
                                    <span className="text-xs font-bold">{t.itemStatuses[item.status]}</span>
                                </button>
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