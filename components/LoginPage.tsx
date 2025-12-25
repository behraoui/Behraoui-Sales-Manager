import React, { useState } from 'react';
import { Button, Input } from './UIComponents';
import { translations } from '../translations';
import { TrendingUp, Lock, User, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  lang: 'en' | 'ar';
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, lang }) => {
  const t = translations[lang];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded credentials
    if (username.toLowerCase() === 'admin' && password === 'nexus2025') {
      onLogin();
    } else {
      setError(true);
      setPassword(''); // Clear password on error
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50 p-4 ${lang === 'ar' ? 'font-arabic' : 'font-sans'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 mb-4">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.welcomeBack}</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">{t.enterCredentials}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm animate-fade-in">
              <AlertCircle size={16} />
              <span>{t.invalidCredentials}</span>
            </div>
          )}

          <div className="relative">
            <div className={`absolute top-10 ${lang === 'ar' ? 'right-3' : 'left-3'} text-slate-400`}>
              <User size={18} />
            </div>
            <Input 
              label={t.username} 
              value={username} 
              onChange={(e) => { setUsername(e.target.value); setError(false); }} 
              className={lang === 'ar' ? 'pr-10' : 'pl-10'}
              placeholder="admin"
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
              onChange={(e) => { setPassword(e.target.value); setError(false); }} 
              className={lang === 'ar' ? 'pr-10' : 'pl-10'}
              required 
            />
          </div>

          <Button type="submit" className="w-full py-3 mt-2 shadow-lg shadow-primary-500/20">
            {t.loginButton}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium">Nexus Sales Manager &copy; 2025</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
