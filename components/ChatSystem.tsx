
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, ChatMessage } from '../types';
import { translations } from '../translations';
import { Send, X, MessageCircle, User as UserIcon, Check, CheckCheck } from 'lucide-react';

interface ChatSystemProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  onSendMessage: (receiverId: string, text: string) => void;
  onMarkRead: (senderId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
}

const ChatSystem: React.FC<ChatSystemProps> = ({ currentUser, users, messages, onSendMessage, onMarkRead, isOpen, onClose, lang }) => {
  const t = translations[lang];
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter users to chat with
  const chatUsers = useMemo(() => {
      if (currentUser.role === 'admin') {
          return users.filter(u => u.id !== currentUser.id); // Admin sees everyone
      } else {
          return users.filter(u => u.role === 'admin'); // Workers only see admins
      }
  }, [users, currentUser]);

  // Auto-select first available user if none selected
  useEffect(() => {
    if (!selectedUser && chatUsers.length > 0) {
      setSelectedUser(chatUsers[0]);
    }
  }, [chatUsers, selectedUser]);

  // Calculate unread counts & Last messages for sidebar
  const conversationStats = useMemo(() => {
      const stats: Record<string, { unread: number, lastMsg: ChatMessage | null }> = {};
      chatUsers.forEach(u => {
          const userMsgs = messages.filter(m => 
              (m.senderId === u.id && m.receiverId === currentUser.id) ||
              (m.senderId === currentUser.id && m.receiverId === u.id)
          ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          const unreadCount = userMsgs.filter(m => m.senderId === u.id && m.receiverId === currentUser.id && !m.read).length;
          
          stats[u.id] = {
              unread: unreadCount,
              lastMsg: userMsgs[0] || null
          };
      });
      return stats;
  }, [messages, currentUser.id, chatUsers]);

  // Mark as read when viewing conversation
  useEffect(() => {
      if (selectedUser && isOpen) {
          const hasUnread = messages.some(m => m.senderId === selectedUser.id && m.receiverId === currentUser.id && !m.read);
          if (hasUnread) {
              onMarkRead(selectedUser.id);
          }
      }
  }, [selectedUser, messages, isOpen, currentUser.id]);

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

  // Should sidebar be shown? Yes if admin OR if worker has multiple admins to talk to
  const showSidebar = chatUsers.length > 1 || currentUser.role === 'admin';

  return (
    <div className={`fixed bottom-4 ${lang === 'ar' ? 'left-4' : 'right-4'} w-80 md:w-96 h-[550px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-slide-in`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 flex justify-between items-center text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
             <MessageCircle size={20} />
          </div>
          <div>
             <h3 className="font-bold text-sm">{t.teamManagement.chat}</h3>
             {selectedUser && (
                 <p className="text-[10px] opacity-80 flex items-center gap-1">
                     <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                     {selectedUser.name}
                 </p>
             )}
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* User List (Sidebar) */}
        {showSidebar && (
           <div className={`w-20 md:w-24 bg-slate-50 border-${lang === 'ar' ? 'l' : 'r'} border-slate-200 overflow-y-auto flex flex-col items-center py-3 gap-3 shadow-inner`}>
             {chatUsers.map(u => {
               const stats = conversationStats[u.id];
               return (
                 <button 
                   key={u.id}
                   onClick={() => setSelectedUser(u)}
                   className={`relative group w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all overflow-hidden ${selectedUser?.id === u.id ? 'border-primary-500 shadow-md ring-2 ring-primary-100' : 'border-slate-200 bg-white hover:border-primary-300'}`}
                   title={u.name}
                 >
                   {u.avatar ? (
                       <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                   ) : (
                       <span className="text-sm font-bold text-slate-500">{u.name.charAt(0).toUpperCase()}</span>
                   )}
                   
                   {/* Unread Badge */}
                   {stats?.unread > 0 && (
                       <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center border-2 border-white transform translate-x-1 -translate-y-1 shadow-sm">
                           {stats.unread}
                       </span>
                   )}
                   
                   {/* Online Indicator (Fake for now, or based on recent msg) */}
                   <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                 </button>
               );
             })}
           </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#f8fafc] relative">
          {/* Watermark/Empty State */}
          {!selectedUser && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 opacity-50 pointer-events-none">
                  <MessageCircle size={64} />
                  <p className="mt-2 text-sm font-medium">Select a conversation</p>
              </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {selectedUser && currentMessages.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                     <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <MessageCircle size={32} className="text-slate-300" />
                     </div>
                     <p className="text-xs">Start a conversation with {selectedUser.name}</p>
                 </div>
             ) : (
                 currentMessages.map((m, idx) => {
                    const isMe = m.senderId === currentUser.id;
                    const showTime = idx === 0 || new Date(m.timestamp).getTime() - new Date(currentMessages[idx-1].timestamp).getTime() > 5 * 60 * 1000;
                    
                    return (
                        <div key={m.id} className="animate-fade-in">
                            {showTime && (
                                <div className="flex justify-center mb-3">
                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                                        {new Date(m.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}
                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                                {!isMe && (
                                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border border-white shadow-sm">
                                        {selectedUser?.avatar ? (
                                            <img src={selectedUser.avatar} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-500">
                                                {selectedUser?.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm relative group ${
                                    isMe 
                                    ? 'bg-primary-600 text-white rounded-br-none' 
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                                }`}>
                                    <p className="leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-primary-100' : 'text-slate-400'}`}>
                                        {isMe && (
                                            <span title={m.read ? 'Read' : 'Sent'}>
                                                {m.read ? <CheckCheck size={12} className="text-blue-200" /> : <Check size={12} />}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                 })
             )}
             <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <input 
                type="text" 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t.teamManagement.typeMessage}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 transition-all placeholder:text-slate-400"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim() || !selectedUser} 
                className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary-200 active:scale-95"
            >
                <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatSystem;
