
import React, { useState, useMemo } from 'react';
import { Project, Goal } from '../types';
import { Card, Button, Input, Select } from './UIComponents';
import { Target, Trophy, Calendar, Trash2, TrendingUp, Plus, X, Rocket, Clock, BarChart3, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { translations } from '../translations';

interface GoalWidgetProps {
  goals: Goal[];
  projects: Project[];
  onCreateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  lang: 'en' | 'ar';
}

const GoalWidget: React.FC<GoalWidgetProps> = ({ goals, projects, onCreateGoal, onDeleteGoal, lang }) => {
  const t = translations[lang];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [newTarget, setNewTarget] = useState<number>(10000);
  const [newType, setNewType] = useState<'weekly' | 'monthly'>('weekly');

  const activeGoal = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Find a goal that encompasses today
    return goals.find(g => {
        const start = new Date(g.startDate);
        const end = new Date(g.endDate);
        return today >= start && today <= end;
    });
  }, [goals]);

  // Added explicit return type Record<string, number> to prevent 'unknown' inference in following hooks
  const dailyBreakdown = useMemo((): Record<string, number> => {
    if (!activeGoal) return {};
    const breakdown: Record<string, number> = {};
    const start = new Date(activeGoal.startDate);
    const end = new Date(activeGoal.endDate);
    end.setHours(23, 59, 59, 999);

    projects.forEach(p => {
        p.clients.forEach(c => {
            const date = new Date(c.leadDate); 
            if (date >= start && date <= end) {
                const dateKey = date.toISOString().split('T')[0];
                const paidItems = c.items.filter(i => i.isPaid).length;
                const revenue = paidItems * c.price;
                breakdown[dateKey] = (breakdown[dateKey] || 0) + revenue;
            }
        });
    });
    return breakdown;
  }, [activeGoal, projects]);

  const progress = useMemo(() => {
    if (!activeGoal) return { achieved: 0, percentage: 0 };
    
    // Fix: Using Object.keys and safe property access to ensure numeric types for the arithmetic addition
    const achieved = Object.keys(dailyBreakdown).reduce((sum: number, key: string) => {
        const val = dailyBreakdown[key];
        return sum + (typeof val === 'number' ? val : 0);
    }, 0);

    const percentage = Math.min(100, Math.round((achieved / activeGoal.targetAmount) * 100));
    return { achieved, percentage };
  }, [activeGoal, dailyBreakdown]);

  const todayKey = new Date().toISOString().split('T')[0];
  const todayRevenue = dailyBreakdown[todayKey] || 0;

  const daysLeft = useMemo(() => {
      if (!activeGoal) return 0;
      const today = new Date();
      const end = new Date(activeGoal.endDate);
      const diff = end.getTime() - today.getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }, [activeGoal]);

  const dailyAvgNeeded = useMemo(() => {
      if (!activeGoal) return 0;
      const remainingAmount = Math.max(0, activeGoal.targetAmount - progress.achieved);
      return daysLeft > 0 ? Math.round(remainingAmount / daysLeft) : 0;
  }, [activeGoal, progress.achieved, daysLeft]);

  // Generate date list for the sparkline/breakdown
  const goalDateRange = useMemo(() => {
      if (!activeGoal) return [];
      const list = [];
      const curr = new Date(activeGoal.startDate);
      const end = new Date(activeGoal.endDate);
      while (curr <= end) {
          list.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
      }
      return list;
  }, [activeGoal]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const today = new Date();
      let startDate = new Date();
      let endDate = new Date();

      if (newType === 'weekly') {
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1);
          startDate = new Date(today.setDate(diff));
          endDate = new Date(today.setDate(diff + 6));
      } else {
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }
      
      startDate.setHours(0,0,0,0);
      endDate.setHours(23,59,59,999);

      const newGoal: Goal = {
          id: crypto.randomUUID(),
          type: newType,
          targetAmount: newTarget,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          createdAt: new Date().toISOString()
      };

      onCreateGoal(newGoal);
      setIsModalOpen(false);
  };

  return (
    <>
      <div className="w-full bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-24 bg-white/10 rounded-full -mr-12 -mt-12 pointer-events-none transition-transform group-hover:scale-110"></div>
        <div className="absolute bottom-0 left-0 p-16 bg-white/5 rounded-full -ml-8 -mb-8 pointer-events-none"></div>

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Trophy size={24} className="text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{t.goals.title}</h3>
                        {activeGoal ? (
                            <p className="text-xs text-indigo-200 flex items-center gap-1">
                                <Calendar size={12} />
                                {activeGoal.type === 'weekly' ? t.goals.weekly : t.goals.monthly}
                            </p>
                        ) : (
                            <p className="text-xs text-indigo-200">{t.goals.noActiveGoal}</p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {activeGoal && (
                        <button 
                            onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white flex items-center gap-1.5 text-xs font-bold"
                            title={t.goals.dailyAnalysis}
                        >
                            <BarChart3 size={16} />
                            <span className="hidden sm:inline">{t.goals.dailyAnalysis}</span>
                            {isAnalysisOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                    {activeGoal ? (
                        <button onClick={() => onDeleteGoal(activeGoal.id)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-indigo-200 hover:text-white" title={t.goals.delete}>
                            <Trash2 size={16} />
                        </button>
                    ) : (
                        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-1">
                            <Plus size={14} /> {t.goals.setGoal}
                        </button>
                    )}
                </div>
            </div>

            {activeGoal ? (
                <div className="space-y-4">
                    <div>
                        <div className="flex items-end justify-between mb-2">
                            <div>
                                <span className="text-4xl font-extrabold tracking-tight">{progress.achieved.toLocaleString()}</span>
                                <span className="text-sm font-medium text-indigo-200 ml-1">/ {activeGoal.targetAmount.toLocaleString()} {t.mad}</span>
                            </div>
                            <div className="text-right">
                                 <div className="text-2xl font-bold">{progress.percentage}%</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-4 w-full bg-black/20 rounded-full overflow-hidden mb-4 backdrop-blur-sm border border-white/10">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out relative shadow-inner ${progress.percentage >= 100 ? 'bg-emerald-400' : 'bg-yellow-400'}`} 
                                style={{ width: `${progress.percentage}%` }}
                            >
                                {progress.percentage >= 100 && (
                                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-sm border border-white/5">
                                <p className="text-[10px] text-indigo-200 uppercase font-bold mb-0.5">{t.goals.todayProgress}</p>
                                <p className="text-lg font-bold flex items-center justify-center gap-1">
                                    <Zap size={14} className="text-yellow-300" />
                                    {todayRevenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-sm border border-white/5">
                                <p className="text-[10px] text-indigo-200 uppercase font-bold mb-0.5">{t.goals.avgNeeded}</p>
                                <p className="text-lg font-bold">{dailyAvgNeeded.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-sm border border-white/5">
                                <p className="text-[10px] text-indigo-200 uppercase font-bold mb-0.5">{t.goals.remaining}</p>
                                <p className="text-lg font-bold">{(activeGoal.targetAmount - progress.achieved).toLocaleString()}</p>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-sm border border-white/5">
                                <p className="text-[10px] text-indigo-200 uppercase font-bold mb-0.5">{t.goals.timeLeft}</p>
                                <p className="text-lg font-bold flex items-center justify-center gap-1">
                                    <Clock size={14} className="text-indigo-300" />
                                    {daysLeft} {t.goals.days}
                                </p>
                            </div>
                        </div>
                    </div>

                    {isAnalysisOpen && (
                        <div className="pt-6 border-t border-white/10 animate-fade-in">
                            <h4 className="text-xs font-bold text-indigo-100 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Zap size={14} /> {t.goals.dailyBreakdown}
                            </h4>
                            
                            <div className="flex items-end justify-between gap-1.5 h-32 mb-4 bg-black/10 rounded-2xl p-4 overflow-x-auto overflow-y-hidden">
                                {goalDateRange.map(date => {
                                    const amount = dailyBreakdown[date] || 0;
                                    const maxHeight = 80; // px
                                    // Scale height based on target average for better visual relevance
                                    const targetAvg = activeGoal.targetAmount / goalDateRange.length;
                                    const height = Math.min(100, (amount / (targetAvg * 2)) * 100);
                                    const isToday = date === todayKey;

                                    return (
                                        <div key={date} className="flex flex-col items-center group flex-1 min-w-[30px]">
                                            <div className="relative w-full flex flex-col items-center">
                                                {/* Tooltip on Hover */}
                                                <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                    {amount.toLocaleString()} {t.mad}
                                                </div>
                                                <div 
                                                    className={`w-full max-w-[12px] rounded-t-sm transition-all duration-500 hover:scale-x-125 ${isToday ? 'bg-yellow-400' : 'bg-indigo-300/40'}`} 
                                                    style={{ height: `${Math.max(4, height)}%` }}
                                                ></div>
                                            </div>
                                            <span className={`text-[8px] mt-1 font-bold ${isToday ? 'text-yellow-400' : 'text-indigo-200/50'}`}>
                                                {new Date(date).getDate()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 text-indigo-200">
                        <Target size={24} />
                    </div>
                    <p className="text-sm text-indigo-100 mb-4 opacity-80 max-w-[200px]">Set a revenue target to track your team's performance and see daily insights.</p>
                </div>
            )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 relative">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
             <div className="flex flex-col items-center mb-6">
                 <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                     <Rocket size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800">{t.goals.create}</h3>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-4">
                <Select 
                    label="Goal Type" 
                    options={[
                        { label: t.goals.weekly, value: 'weekly' },
                        { label: t.goals.monthly, value: 'monthly' }
                    ]}
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                />
                <Input 
                    label={`${t.goals.target} (${t.mad})`}
                    type="number"
                    value={newTarget}
                    onChange={e => setNewTarget(Number(e.target.value))}
                    required
                />
                
                <div className="pt-2">
                   <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                       {t.goals.create}
                   </Button>
                </div>
             </form>
           </div>
        </div>
      )}
    </>
  );
};

export default GoalWidget;
