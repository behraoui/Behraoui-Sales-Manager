
import React, { useState } from 'react';
import { Sale } from '../types';
import { generateEmailDraft, analyzeSalesData } from '../services/geminiService';
import { Button } from './UIComponents';
import { translations } from '../translations';
import { Sparkles, Loader2, Send, MessageSquare, Copy, X } from 'lucide-react';

interface CopilotProps {
  selectedSale?: Sale;
  allSales: Sale[];
  onClose?: () => void;
  lang?: 'en' | 'ar';
}

const Copilot: React.FC<CopilotProps> = ({ selectedSale, allSales, onClose, lang = 'en' }) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [mode, setMode] = useState<'draft' | 'chat'>(selectedSale ? 'draft' : 'chat');
  const [chatQuery, setChatQuery] = useState('');

  const handleDraft = async (type: 'follow_up' | 'payment_reminder' | 'delivery') => {
    if (!selectedSale) return;
    setLoading(true);
    const text = await generateEmailDraft(selectedSale, type);
    setResult(text);
    setLoading(false);
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    setLoading(true);
    const answer = await analyzeSalesData(allSales, `${chatQuery} (Please answer in ${lang === 'ar' ? 'Arabic' : 'English'})`);
    setResult(answer);
    setLoading(false);
  };

  return (
    <div className={`fixed ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 w-80 bg-slate-50 border-${lang === 'ar' ? 'r' : 'l'} border-slate-200 shadow-xl z-40 flex flex-col animate-slide-in`}>
      <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary-700">
          <Sparkles size={20} />
          <h2 className="font-semibold">{t.aiAssistant}</h2>
        </div>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mode === 'draft' && selectedSale ? (
          <div className="space-y-4">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.emailDrafter} {t.mad}</p>
              <p className="font-bold text-slate-800 text-sm">{selectedSale.clientName}</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {/* Fixed: using correct prop name 'lang' instead of undefined 'language' */}
              <Button size="sm" variant="secondary" onClick={() => handleDraft('follow_up')}>{lang === 'ar' ? 'متابعة' : 'Draft Follow-up'}</Button>
              <Button size="sm" variant="secondary" onClick={() => handleDraft('payment_reminder')}>{lang === 'ar' ? 'تذكير بالدفع' : 'Draft Payment Reminder'}</Button>
              <Button size="sm" variant="secondary" onClick={() => handleDraft('delivery')}>{lang === 'ar' ? 'إشعار تسليم' : 'Draft Delivery Note'}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleChat} className="flex gap-2">
              <input type="text" value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} placeholder="..." className="flex-1 text-sm border-slate-300 rounded-md border p-2" />
              <Button type="submit" size="sm" disabled={loading}><Send size={16} /></Button>
            </form>
          </div>
        )}

        {loading && <div className="flex items-center justify-center py-8 text-primary-600 gap-2"><Loader2 className="animate-spin" /> <span className="text-sm">{t.geminiThinking}</span></div>}
        {result && !loading && (
          <div className="bg-white p-4 rounded-lg border border-slate-200 animate-fade-in relative group">
            <button onClick={() => navigator.clipboard.writeText(result)} className="absolute top-2 right-2 text-primary-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={14} /></button>
            <p className="text-xs text-slate-500 font-bold mb-2 uppercase">{t.aiResponse}</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result}</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-200 bg-white flex justify-around">
        <button onClick={() => setMode('chat')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${mode === 'chat' ? 'text-primary-600' : 'text-slate-400'}`}>
          <MessageSquare size={18} /> {t.chatInsights}
        </button>
        {selectedSale && (
          <button onClick={() => setMode('draft')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${mode === 'draft' ? 'text-primary-600' : 'text-slate-400'}`}>
            <Sparkles size={18} /> {t.emailDrafter}
          </button>
        )}
      </div>
    </div>
  );
};

export default Copilot;
