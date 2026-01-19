
import React, { useState } from 'react';
import { Button, Input } from './UIComponents';
import { translations } from '../translations';
import { TrendingUp, Lock, User, AlertCircle, Info, UserPlus } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
  onSignup: (user: Omit<UserType, 'id' | 'createdAt'>) => void;
  users: UserType[];
  lang: 'en' | 'ar';
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSignup, users, lang }) => {
  const t = translations[lang];
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignup) {
        // Signup Logic
        if (!name || !username || !password) return;
        
        // Check if username already exists
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            setError(t.userExists);
            return;
        }

        onSignup({
            name,
            username,
            password,
            role: 'worker' // Default role for self-signup
        });
    } else {
        // Login Logic
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        
        if (user) {
          onLogin(user);
        } else {
          setError(t.invalidCredentials);
          setPassword('');
        }
    }
  };

  const toggleMode = () => {
      setIsSignup(!isSignup);
      setError('');
      setUsername('');
      setPassword('');
      setName('');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50 p-4 ${lang === 'ar' ? 'font-arabic' : 'font-sans'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 w-full max-w-md animate-fade-in transition-all">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 mb-4">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{isSignup ? t.createAccount : t.welcomeBack}</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">{t.enterCredentials}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm animate-fade-in">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {isSignup && (
              <div className="relative animate-fade-in">
                <div className={`absolute top-10 ${lang === 'ar' ? 'right-3' : 'left-3'} text-slate-400`}>
                  <UserPlus size={18} />
                </div>
                <Input 
                  label={t.name} 
                  value={name} 
                  onChange={(e) => { setName(e.target.value); setError(''); }} 
                  className={lang === 'ar' ? 'pr-10' : 'pl-10'}
                  placeholder="John Doe"
                  required={isSignup}
                />
              </div>
          )}

          <div className="relative">
            <div className={`absolute top-10 ${lang === 'ar' ? 'right-3' : 'left-3'} text-slate-400`}>
              <User size={18} />
            </div>
            <Input 
              label={t.username} 
              value={username} 
              onChange={(e) => { setUsername(e.target.value); setError(''); }} 
              className={lang === 'ar' ? 'pr-10' : 'pl-10'}
              placeholder={isSignup ? "username123" : "admin / worker"}
              required 
            />
          </div>

          <div className="relative">
            <div className={`absolute top-10 ${lang === 'ar' ? 'right-3' : 'left-3'} text-slate-400`}>
              <Lock size={18} />
            </div>
            <Input 
              label={t.password} 
              type="password" 
              value={password} 
              onChange={(e) => { setPassword(e.target.value); setError(''); }} 
              className={lang === 'ar' ? 'pr-10' : 'pl-10'}
              required 
            />
          </div>

          <Button type="submit" className="w-full py-3 mt-2 shadow-lg shadow-primary-500/20">
            {isSignup ? t.signUp : t.loginButton}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-50 text-center">
           <button onClick={toggleMode} className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
               {isSignup ? t.alreadyHaveAccount : t.dontHaveAccount} <span className="underline">{isSignup ? t.loginButton : t.signUp}</span>
           </button>
           
           {!isSignup && (
             <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                 <Info size={14} />
                 <p className="text-xs">{t.contactAdmin}</p>
             </div>
           )}
          <p className="text-xs text-slate-300 font-medium mt-4">Nexus Sales Manager &copy; 2025</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
