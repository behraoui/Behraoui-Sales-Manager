
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Button, Input, Select, Card } from './UIComponents';
import { translations } from '../translations';
import { Trash2, UserPlus, Shield, User as UserIcon, Edit2, Upload, X } from 'lucide-react';

interface TeamManagerProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  lang: 'en' | 'ar';
}

const TeamManager: React.FC<TeamManagerProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser, lang }) => {
  const t = translations[lang];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [avatar, setAvatar] = useState<string>('');

  // Reset form when modal opens/closes or edit target changes
  useEffect(() => {
    if (editingUser) {
        setName(editingUser.name);
        setUsername(editingUser.username);
        setPassword(editingUser.password);
        setRole(editingUser.role);
        setAvatar(editingUser.avatar || '');
    } else {
        setName('');
        setUsername('');
        setPassword('');
        setRole('worker');
        setAvatar('');
    }
  }, [editingUser, isModalOpen]);

  const handleOpenModal = (user?: User) => {
      setEditingUser(user || null);
      setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setAvatar(base64);
      };
      reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    if (editingUser) {
        // Update
        onUpdateUser({
            ...editingUser,
            name,
            username,
            password,
            role,
            avatar
        });
    } else {
        // Create
        onAddUser({
            name,
            username,
            password,
            role,
            avatar
        });
    }
    setIsModalOpen(false);
    setEditingUser(null);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{t.teamManagement.title}</h2>
        <Button onClick={() => handleOpenModal()}>
          <UserPlus size={18} className={lang === 'ar' ? 'ml-2' : 'mr-2'} />
          {t.teamManagement.addWorker}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <Card key={user.id} className="p-5 flex flex-col justify-between group relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border-2 relative ${user.role === 'admin' ? 'border-purple-100' : 'border-blue-100'} ${!user.avatar && (user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600')}`}>
                   {user.avatar ? (
                       <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                   ) : (
                       user.role === 'admin' ? <Shield size={24} /> : <UserIcon size={24} />
                   )}
                   {/* Status Indicator */}
                   {user.role === 'worker' && (
                       <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${user.workerStatus === 'busy' ? 'bg-red-500' : 'bg-green-500'}`} title={user.workerStatus || 'available'}></div>
                   )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{user.name}</h3>
                  <p className="text-xs text-slate-400">@{user.username}</p>
                </div>
              </div>
              <div className="flex gap-1">
                 <button 
                  onClick={() => handleOpenModal(user)}
                  className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title={t.teamManagement.editWorker}
                >
                  <Edit2 size={16} />
                </button>
                {user.username !== 'admin' && (
                    <button 
                    onClick={() => { if(window.confirm(t.teamManagement.confirmDelete)) onDeleteUser(user.id); }}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title={t.teamManagement.deleteUser}
                    >
                    <Trash2 size={16} />
                    </button>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs relative z-10">
              <span className={`px-2 py-1 rounded-md uppercase font-bold tracking-wider ${user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                {user.role}
              </span>
              <span className="text-slate-400">{new Date(user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'en-US')}</span>
            </div>
            
            {/* Status Text for clarity */}
            {user.role === 'worker' && (
                <div className={`absolute top-0 right-0 px-2 py-1 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider ${user.workerStatus === 'busy' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {user.workerStatus === 'busy' ? t.teamManagement.busy : t.teamManagement.available}
                </div>
            )}
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 relative">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
             <h3 className="text-lg font-bold text-slate-800 mb-4">{editingUser ? t.teamManagement.updateUser : t.teamManagement.createUser}</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center mb-4">
                    <label className="relative w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-slate-50 transition-all overflow-hidden group">
                        {avatar ? (
                            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <Upload size={24} className="text-slate-400 group-hover:text-primary-500" />
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                    <span className="text-xs text-slate-400 mt-2">{t.teamManagement.uploadAvatar}</span>
                </div>

                <Input label={t.teamManagement.name} value={name} onChange={e => setName(e.target.value)} required />
                <Input label={t.username} value={username} onChange={e => setUsername(e.target.value)} required />
                <Input label={t.password} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                <Select 
                    label={t.teamManagement.role} 
                    options={[{label: 'Admin', value: 'admin'}, {label: 'Worker', value: 'worker'}]}
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                />
                <div className="flex gap-3 justify-end pt-2">
                   <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
                   <Button type="submit">{editingUser ? t.update : t.save}</Button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;
