import React, { useState } from 'react';
import { Sale } from '../types';
import { generateEmailDraft, analyzeSalesData } from '../services/geminiService';
import { Button } from './UIComponents';
import { Sparkles, Loader2, Send, MessageSquare } from 'lucide-react';

interface CopilotProps {
  selectedSale?: Sale;
  allSales: Sale[];
  onClose?: () => void;
}

const Copilot: React.FC<CopilotProps> = ({ selectedSale, allSales, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [mode, setMode] = useState<'draft' | 'chat'>(selectedSale ? 'draft' : 'chat');
  const [chatQuery, setChatQuery] = useState('');

  const handleGenerateDraft = async (type: 'follow_up' | 'payment_reminder' | 'delivery') => {
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
    const answer = await analyzeSalesData(allSales, chatQuery);
    setResult(answer);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 w-80 fixed right-0 top-0 bottom-0 shadow-xl z-40">
      <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
        <div className="flex items-center space-x-2 text-primary-700">
          <Sparkles size={20} />
          <h2 className="font-semibold">Gemini Assistant</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mode === 'draft' && selectedSale ? (
          <div className="space-y-4">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-bold mb-2">Draft Email For</p>
              <p className="font-medium text-slate-800">{selectedSale.clientName}</p>
              <p className="text-sm text-slate-600">{selectedSale.serviceType}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleGenerateDraft('follow_up')}>
                Draft Follow-up
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleGenerateDraft('payment_reminder')}>
                Draft Payment Reminder
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleGenerateDraft('delivery')}>
                Draft Delivery Note
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-indigo-50 p-3 rounded-lg text-sm text-indigo-800">
              Ask questions about your sales data. e.g., "What is my total revenue?", "How many paid Landing Page projects?"
            </div>
            <form onSubmit={handleChat} className="flex gap-2">
              <input
                type="text"
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Ask Gemini..."
                className="flex-1 text-sm border-slate-300 rounded-md border p-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <Button type="submit" size="sm" disabled={loading}>
                <Send size={16} />
              </Button>
            </form>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8 text-primary-600">
            <Loader2 className="animate-spin mr-2" />
            <span className="text-sm font-medium">Gemini is thinking...</span>
          </div>
        )}

        {result && !loading && (
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase">AI Response</span>
              <button 
                onClick={() => navigator.clipboard.writeText(result)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Copy
              </button>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {result}
            </p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-slate-200 bg-white flex justify-around">
        <button 
          onClick={() => { setMode('chat'); setResult(''); }}
          className={`flex flex-col items-center space-y-1 text-xs font-medium ${mode === 'chat' ? 'text-primary-600' : 'text-slate-400'}`}
        >
          <MessageSquare size={18} />
          <span>Chat Insights</span>
        </button>
        {selectedSale && (
          <button 
             onClick={() => { setMode('draft'); setResult(''); }}
             className={`flex flex-col items-center space-y-1 text-xs font-medium ${mode === 'draft' ? 'text-primary-600' : 'text-slate-400'}`}
          >
            <Sparkles size={18} />
            <span>Email Drafter</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Copilot;
