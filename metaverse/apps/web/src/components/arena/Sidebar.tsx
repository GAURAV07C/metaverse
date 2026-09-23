import React from 'react';
import { Users, MessageSquare, Crosshair, Send, Search, Map as MapIcon, Bell, Gift, Settings, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import type { OtherUser } from '../Arena';

interface SidebarProps {
  showUsers: boolean;
  onToggleSidebar?: () => void;
  activeTab: 'users' | 'chat';
  setActiveTab: (val: 'users' | 'chat') => void;
  otherUsers: OtherUser[];
  myStoredUsername: string | null;
  myAvatarUrl: string | undefined;
  myPos: { x: number; y: number };
  handleNavigateToUser: (x: number, y: number) => void;
  handleCopyInvite: () => void;
  copied: boolean;
  messages: { username: string; message: string; time: string }[];
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSendChat: (e: React.FormEvent) => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  showUsers, onToggleSidebar, activeTab, setActiveTab,
  otherUsers, myStoredUsername, myAvatarUrl, myPos,
  handleNavigateToUser, handleCopyInvite, copied,
  messages, chatInput, setChatInput, handleSendChat,
  onOpenSettings
}) => {
  return (
    <div className={`sidebar-container ${!showUsers ? 'collapsed' : ''}`}>
      <div className="sidebar-dock">
        <div className="dock-top">
          {/* Hamburger Menu Toggle Button */}
          <button 
            className={`dock-btn ${showUsers ? 'active' : ''}`} 
            title={showUsers ? 'Hide Menu (Click to collapse)' : 'Show Menu (Click to expand)'} 
            onClick={onToggleSidebar}
          >
            <Menu size={20} />
          </button>
          <button className="dock-btn" title="Search (Ctrl+K)"><Search size={20} /></button>
          <button className="dock-btn" title="Map & Directory"><MapIcon size={20} /></button>
          <button className="dock-btn" title="Inbox & Activity"><Bell size={20} /></button>
          <button className="dock-btn" title="Gifts"><Gift size={20} /></button>
        </div>
        <div className="dock-bottom">
          <button className="dock-btn" title="Settings" onClick={onOpenSettings}><Settings size={20} /></button>
        </div>
      </div>
      
      <aside className="players-sidebar">
        <div className="players-sidebar-header" style={{ padding: 0, display: 'flex', alignItems: 'center', position: 'relative' }}>
          <button 
            style={{ flex: 1, padding: '0.9rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}
            onClick={() => setActiveTab('users')}
          >
            <Users size={14} /> Participants
          </button>
          <button 
            style={{ flex: 1, padding: '0.9rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'chat' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={14} /> Chat
          </button>

          {/* Hamburger / Chevron Toggle Hide Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={showUsers ? "Collapse Sidebar Menu" : "Expand Sidebar Menu"}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#94a3b8',
                padding: '0.4rem',
                marginRight: '0.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <Menu size={16} />
            </button>
          )}
        </div>

      <div className="players-list" style={{ display: activeTab === 'users' ? 'block' : 'none' }}>
        {/* Me */}
        <div className="player-entry player-me">
          {myAvatarUrl ? (
            <img src={myAvatarUrl} alt="" className="player-avatar-img" />
          ) : (
            <div className="player-avatar-dot" style={{ background: '#7c5cbf' }}>🧑</div>
          )}
          <div className="player-info">
            <p className="player-name">{myStoredUsername ?? 'You'} <span className="player-you-tag">YOU</span></p>
            <p className="player-pos">({myPos.x}, {myPos.y})</p>
          </div>
          <span className="online-dot" />
        </div>

        {/* Other users (deduplicated) */}
        {otherUsers
          .filter(u => u.username !== myStoredUsername)
          .map((u, i) => {
          const colors = ['#6366f1', '#ec4899', '#fb6340', '#2dce89', '#9b7ed8', '#11cdef'];
          const color = colors[i % colors.length];
          return (
            <div key={u.userId} className="player-entry animate-fade-in">
              {u.avatarUrl ? (
                <img src={u.avatarUrl} alt="" className="player-avatar-img" style={{ borderColor: color }} />
              ) : (
                <div className="player-avatar-dot" style={{ background: color }}>👤</div>
              )}
              <div className="player-info">
                <p className="player-name">{u.username}</p>
                <p className="player-pos">({u.x}, {u.y})</p>
              </div>
              <button
                className="player-locate-btn"
                onClick={() => handleNavigateToUser(u.x, u.y)}
                title={`Navigate to ${u.username}`}
              >
                <Crosshair size={12} />
              </button>
              <span className="online-dot" />
            </div>
          );
        })}

        {otherUsers.filter(u => u.username !== myStoredUsername).length === 0 && (
          <div className="players-empty">
            <span style={{ fontSize: '1.4rem' }}>🏜️</span>
            <p>You're alone!</p>
            <button
              className="btn"
              style={{ fontSize: '0.7rem', padding: '0.3rem 0.7rem', marginTop: '0.3rem' }}
              onClick={handleCopyInvite}
            >
              {copied ? '✓ Copied!' : '🔗 Invite'}
            </button>
          </div>
        )}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {messages.length === 0 ? (
              <div className="players-empty">
                <p style={{marginTop: '2rem'}}>No messages yet!</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>{m.username}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.time}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>{m.message}</span>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendChat} style={{ padding: '0.8rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.4rem' }}>
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type to room..." 
              style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', color: 'white', fontSize: '0.8rem' }}
            />
            <button type="submit" className="btn-icon" style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
      </aside>
    </div>
  );
};
