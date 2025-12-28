import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Button, Input, Select, Card } from './UIComponents';
import { translations } from '../translations';
import { Trash2, UserPlus, Shield, User as UserIcon } from 'lucide-react';

interface TeamManagerProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onDeleteUser: (id: string) => void;
  lang: 'en' | 'ar';
}

const TeamManager: React.FC<TeamManagerProps> = ({ users, onAddUser, onDeleteUser, lang }) => {
  const t = translations[lang];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'worker' as UserRole });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    onAddUser(newUser);
    setIsModalOpen(false);
    setNewUser({ name: '', username: '', password: '', role: 'worker' });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{t.teamManagement.title}</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <UserPlus size={18} className={lang === 'ar' ? 'ml-2' : 'mr-2'} />
          {t.teamManagement.addWorker}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <Card key={user.id} className="p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                  {user.role === 'admin' ? <Shield size={20} /> : <UserIcon size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{user.name}</h3>
                  <p className="text-xs text-slate-400">@{user.username}</p>
                </div>
              </div>
              {user.username !== 'admin' && (
                <button 
                  onClick={() => { if(window.confirm(t.teamManagement.confirmDelete)) onDeleteUser(user.id); }}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
              <span className={`px-2 py-1 rounded-md uppercase font-bold tracking-wider ${user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                {user.role}
              </span>
              <span className="text-slate-400">{new Date(user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'en-US')}</span>
            </div>
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
             <h3 className="text-lg font-bold text-slate-800 mb-4">{t.teamManagement.createUser}</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
                <Input label={t.teamManagement.name} value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                <Input label={t.username} value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                <Input label={t.password} type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                <Select 
                    label={t.teamManagement.role} 
                    options={[{label: 'Admin', value: 'admin'}, {label: 'Worker', value: 'worker'}]}
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                />
                <div className="flex gap-3 justify-end pt-2">
                   <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
                   <Button type="submit">{t.save}</Button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;