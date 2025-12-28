import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage } from '../types';
import { translations } from '../translations';
import { Send, X, MessageCircle, User as UserIcon } from 'lucide-react';

interface ChatSystemProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  onSendMessage: (receiverId: string, text: string) => void;
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
}

const ChatSystem: React.FC<ChatSystemProps> = ({ currentUser, users, messages, onSendMessage, isOpen, onClose, lang }) => {
  const t = translations[lang];
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter users to chat with
  const chatUsers = currentUser.role === 'admin' 
    ? users.filter(u => u.id !== currentUser.id) // Admin sees everyone
    : users.filter(u => u.role === 'admin'); // Workers only see admins

  // Auto-select first available user if none selected
  useEffect(() => {
    if (!selectedUser && chatUsers.length > 0) {
      setSelectedUser(chatUsers[0]);
    }
  }, [chatUsers, selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUser, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    onSendMessage(selectedUser.id, newMessage);
    setNewMessage('');
  };

  // Filter messages for current conversation
  const currentMessages = messages.filter(m => 
    (m.senderId === currentUser.id && m.receiverId === selectedUser?.id) ||
    (m.senderId === selectedUser?.id && m.receiverId === currentUser.id)
  );

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 ${lang === 'ar' ? 'left-4' : 'right-4'} w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-slide-in`}>
      {/* Header */}
      <div className="bg-primary-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} />
          <h3 className="font-bold">{t.teamManagement.chat}</h3>
        </div>
        <button onClick={onClose} className="hover:bg-primary-700 p-1 rounded-full"><X size={18} /></button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* User List (Sidebar for Desktop, Top bar for Mobile if needed, kept simple here) */}
        {currentUser.role === 'admin' && (
           <div className={`w-16 md:w-20 bg-slate-50 border-${lang === 'ar' ? 'l' : 'r'} border-slate-200 overflow-y-auto flex flex-col items-center py-2 gap-2`}>
             {chatUsers.map(u => (
               <button 
                 key={u.id}
                 onClick={() => setSelectedUser(u)}
                 className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${selectedUser?.id === u.id ? 'border-primary-500 bg-primary-100 text-primary-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
                 title={u.name}
               >
                 {u.name.charAt(0).toUpperCase()}
               </button>
             ))}
           </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedUser && (
             <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                    {selectedUser.name.charAt(0)}
                </div>
                <span className="font-bold text-sm text-slate-800">{selectedUser.name}</span>
             </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
             {currentMessages.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-slate-300 text-xs">No messages yet</div>
             ) : (
                 currentMessages.map(m => {
                    const isMe = m.senderId === currentUser.id;
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                <p>{m.text}</p>
                                <p className={`text-[9px] mt-1 text-${isMe ? 'primary-200' : 'slate-400'} text-end`}>
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                 })
             )}
             <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex gap-2">
            <input 
                type="text" 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t.teamManagement.typeMessage}
                className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors">
                <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatSystem;