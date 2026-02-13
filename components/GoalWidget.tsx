import React, { useState, useMemo } from 'react';
import { Project, Goal } from '../types';
import { Card, Button, Input, Select } from './UIComponents';
import { Target, Trophy, Calendar, Trash2, TrendingUp, Plus, X, Rocket, Clock } from 'lucide-react';
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

  const progress = useMemo(() => {
    if (!activeGoal) return { achieved: 0, percentage: 0 };
    
    let achieved = 0;
    const start = new Date(activeGoal.startDate);
    const end = new Date(activeGoal.endDate);
    // End date usually 00:00, set to end of day
    end.setHours(23, 59, 59, 999);

    projects.forEach(p => {
        p.clients.forEach(c => {
            const date = new Date(c.leadDate); // Proxy for sale date
            if (date >= start && date <= end) {
                // Revenue is calculated from PAID items only
                const paidItems = c.items.filter(i => i.isPaid).length;
                achieved += paidItems * c.price;
            }
        });
    });

    const percentage = Math.min(100, Math.round((achieved / activeGoal.targetAmount) * 100));
    return { achieved, percentage };
  }, [activeGoal, projects]);

  const daysLeft = useMemo(() => {
      if (!activeGoal) return 0;
      const today = new Date();
      const end = new Date(activeGoal.endDate);
      const diff = end.getTime() - today.getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }, [activeGoal]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const today = new Date();
      let startDate = new Date();
      let endDate = new Date();

      if (newType === 'weekly') {
          // Start: Monday of current week, End: Sunday
          const day = today.getDay(); // 0 is Sunday
          const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
          startDate = new Date(today.setDate(diff));
          endDate = new Date(today.setDate(diff + 6));
      } else {
          // Start: 1st of month, End: Last of month
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }
      
      // Reset time components
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
                                {newType === 'weekly' ? t.goals.weekly : t.goals.monthly}
                            </p>
                        ) : (
                            <p className="text-xs text-indigo-200">{t.goals.noActiveGoal}</p>
                        )}
                    </div>
                </div>
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

            {activeGoal ? (
                <div>
                    <div className="flex items-end justify-between mb-2">
                        <div>
                            <span className="text-3xl font-bold tracking-tight">{progress.achieved.toLocaleString()}</span>
                            <span className="text-sm font-medium text-indigo-200 ml-1">/ {activeGoal.targetAmount.toLocaleString()} {t.mad}</span>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl font-bold">{progress.percentage}%</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden mb-4 backdrop-blur-sm">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out relative ${progress.percentage >= 100 ? 'bg-emerald-400' : 'bg-yellow-400'}`} 
                            style={{ width: `${progress.percentage}%` }}
                        >
                            {progress.percentage >= 100 && (
                                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-medium text-indigo-200">
                        <span>{progress.percentage >= 100 ? t.goals.congrats : t.goals.keepGoing}</span>
                        <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md">
                            <Clock size={12} /> {daysLeft} {t.goals.days} {t.goals.timeLeft}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 text-indigo-200">
                        <Target size={24} />
                    </div>
                    <p className="text-sm text-indigo-100 mb-4 opacity-80 max-w-[200px]">Set a revenue target to track your team's performance.</p>
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