import React, { useEffect, useRef, useState } from 'react';
import { Users, MessageSquare, Crosshair, Send, Search, PanelLeftClose, Link2, Check, ChevronDown } from 'lucide-react';
import type { OtherUser } from '../Arena';

interface SidebarProps {
  spaceName: string;
  showUsers: boolean;
  onToggleSidebar: () => void;
  activeTab: 'users' | 'chat';
  setActiveTab: (val: 'users' | 'chat') => void;
  otherUsers: OtherUser[];
  myStoredUsername: string | null;
  myAvatarUrl: string | undefined;
  handleNavigateToUser: (x: number, y: number) => void;
  handleCopyInvite: () => void;
  copied: boolean;
  connected: boolean;
  messages: { username: string; message: string; time: string }[];
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSendChat: (e: React.FormEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  spaceName, showUsers, onToggleSidebar, activeTab, otherUsers,
  myStoredUsername, myAvatarUrl, handleNavigateToUser, handleCopyInvite,
  copied, connected, messages, chatInput, setChatInput, handleSendChat,
}) => {
  const [search, setSearch] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { if (showUsers && activeTab === 'chat') chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length, showUsers, activeTab]);
  if (!showUsers) return null;
  const people = otherUsers.filter((u, index, all) => u.username !== myStoredUsername && all.findIndex(person => person.userId === u.userId) === index);
  const matches = (name: string) => name.toLowerCase().includes(search.trim().toLowerCase());
  const filtered = people.filter(u => matches(u.username));
  const myName = myStoredUsername || 'You';
  return (
    <aside className="space-sidebar" aria-label={activeTab === 'users' ? 'Participants' : 'Chat'}>
      <header className="space-panel-header"><h2>{activeTab === 'users' ? spaceName : 'Chat'}</h2><button className="action-icon-btn" onClick={onToggleSidebar} aria-label="Close sidebar" title="Close sidebar"><PanelLeftClose size={16} /></button></header>
      {activeTab === 'users' ? <>
        <label className="people-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people" aria-label="Search people" /></label>
        <div className="people-list">
          <p className="people-section-title">Online ({people.length + 1}) <ChevronDown size={13} /></p>
          {matches(myName) && <div className="person-row"><div className="person-avatar">{myAvatarUrl ? <img src={myAvatarUrl} alt="" /> : myName.charAt(0).toUpperCase()}</div><div className="person-info"><strong>{myName} <small>(you)</small></strong><span>{connected ? 'Active' : 'Connecting…'}</span></div><span className={`presence-dot ${connected ? '' : 'offline'}`} /></div>}
          {filtered.map(u => <div key={u.userId} className="person-row"><div className="person-avatar">{u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : u.username.charAt(0).toUpperCase()}</div><div className="person-info"><strong>{u.username}</strong><span>Active</span></div><button className="action-icon-btn person-locate" onClick={() => handleNavigateToUser(u.x, u.y)} title={`Locate ${u.username}`} aria-label={`Locate ${u.username}`}><Crosshair size={16} /></button></div>)}
          {search && !filtered.length && !matches(myName) && <div className="panel-empty"><Search size={24} /><p>No people found</p><span>Try a different name.</span></div>}
          {!search && !people.length && <div className="panel-empty"><Users size={28} /><p>Better together</p><span>Invite your team to join you here.</span></div>}
        </div>
        <footer className="space-panel-footer"><button className="space-invite" onClick={handleCopyInvite}>{copied ? <Check size={16} /> : <Link2 size={16} />}{copied ? 'Invite link copied' : 'Invite people'}</button></footer>
      </> : <>
        <div className="space-chat-messages" role="log" aria-label="Space messages" aria-live="polite">
          {!messages.length && <div className="panel-empty"><MessageSquare size={28} /><p>Start a conversation</p><span>Messages are shared with this space.</span></div>}
          {messages.map((m, i) => <article className="space-message" key={i}><header><strong>{m.username}</strong><time>{m.time}</time></header><p>{m.message}</p></article>)}
          <div ref={chatEnd} />
        </div>
        <form className="space-chat-form" onSubmit={handleSendChat}><input autoFocus value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={connected ? 'Message everyone…' : 'Connecting…'} aria-label="Message everyone" /><button type="submit" disabled={!connected || !chatInput.trim()} className="action-icon-btn" aria-label="Send message" title="Send message"><Send size={18} /></button></form>
      </>}
    </aside>
  );
};
