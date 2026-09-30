import React, { useEffect, useRef, useState } from 'react';
import { Users, MessageSquare, Crosshair, Send, Search, PanelLeftClose, Link2, Check, ChevronDown, Footprints, Radio, DoorOpen } from 'lucide-react';
import type { InviteHistoryItem, OtherUser } from '../Arena';
import { CanvasAvatarPreview } from '../CanvasAvatarPreview';
import type { PrivateZone } from './MapCanvas';

type ChatScope = 'everyone' | 'nearby' | 'dm' | 'room' | 'invites';
type SendableChatScope = Exclude<ChatScope, 'invites'>;

interface SidebarProps {
  spaceName: string;
  showUsers: boolean;
  onToggleSidebar: () => void;
  activeTab: 'users' | 'chat';
  setActiveTab: (val: 'users' | 'chat') => void;
  otherUsers: OtherUser[];
  myStoredUsername: string | null;
  myAvatarUrl: string | undefined;
  handleLocateUser: (x: number, y: number) => void;
  handleFollowUser: (userId: string, x: number, y: number) => void;
  followingUserId?: string | null;
  handleCopyInvite: () => void;
  copied: boolean;
  connected: boolean;
  messages: { username: string; message: string; time: string; scope?: string }[];
  inviteHistory: InviteHistoryItem[];
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSendChat: (e: React.FormEvent, scope?: SendableChatScope) => void;
  chatScope: ChatScope;
  setChatScope: (scope: ChatScope) => void;
  currentRoom?: PrivateZone | null;
  allRooms?: { room: PrivateZone; count: number; spots: number; vacant: number }[];
  activeRooms?: { room: PrivateZone; count: number }[];
  onJoinRoom?: (roomId: string) => void;
  onCopyRoomLink?: (roomId: string) => void;
  copiedRoomId?: string | null;
  onOpenMeetingMode?: () => void;
  myStatus?: 'available' | 'busy' | 'focus' | 'away';
  unreadChatCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  spaceName, showUsers, onToggleSidebar, activeTab, otherUsers,
  myStoredUsername, myAvatarUrl, handleLocateUser, handleFollowUser, followingUserId, handleCopyInvite,
  copied, connected, messages, inviteHistory, chatInput, setChatInput, handleSendChat,
  setActiveTab, chatScope, setChatScope, currentRoom, allRooms = [], activeRooms = [], onJoinRoom, onCopyRoomLink, copiedRoomId, onOpenMeetingMode, myStatus = 'available', unreadChatCount = 0,
}) => {
  const [search, setSearch] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { if (showUsers && activeTab === 'chat') chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length, showUsers, activeTab]);
  if (!showUsers) return null;
  const people = otherUsers.filter((u, index, all) => u.username !== myStoredUsername && all.findIndex(person => person.userId === u.userId) === index);
  const matches = (name: string) => name.toLowerCase().includes(search.trim().toLowerCase());
  const filtered = people.filter(u => matches(u.username));
  const myName = myStoredUsername || 'You';
  const renderAvatar = (avatarUrl: string | undefined, name: string, size = 32) => {
    if (!avatarUrl) return name.charAt(0).toUpperCase();
    if (avatarUrl.startsWith('class:')) return <CanvasAvatarPreview imageUrl={avatarUrl} name={name} size={size} />;
    return <img src={avatarUrl} alt="" />;
  };
  const messagePerson = (name: string) => {
    setActiveTab('chat');
    setChatScope('dm');
    setChatInput(`@${name} `);
  };
  const requestJoinRoom = (roomId: string) => {
    onJoinRoom?.(roomId);
  };
  const formatInviteTime = (value: number) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const inviteStatusLabel = (item: InviteHistoryItem) => {
    if (item.direction === 'outgoing' && item.status === 'sent') return `Sent to ${item.toUsername || 'someone'}`;
    if (item.direction === 'outgoing') return `${item.toUsername || 'Someone'} ${item.status}`;
    if (item.status === 'received') return `From ${item.fromUsername || 'someone'}`;
    return `${item.status} from ${item.fromUsername || 'someone'}`;
  };

  return (
    <aside className="space-sidebar" aria-label={activeTab === 'users' ? 'Participants' : 'Chat'}>
      <header className="space-panel-header"><h2>{activeTab === 'users' ? spaceName : 'Chat'}{activeTab === 'chat' && unreadChatCount > 0 && <span className="panel-title-badge">{unreadChatCount}</span>}</h2><button className="action-icon-btn" onClick={onToggleSidebar} aria-label="Close sidebar" title="Close sidebar"><PanelLeftClose size={16} /></button></header>
      {activeTab === 'users' ? <>
        <label className="people-search" htmlFor="people-search-input"><Search size={16} /><input id="people-search-input" name="peopleSearch" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people" aria-label="Search people" /></label>
        <div className="people-list">
          {currentRoom && (
            <section className="people-panel-section current-area-card">
              <p className="people-section-title">Your current area <ChevronDown size={13} /></p>
              <div className="area-row">
                <Radio size={16} />
                <div><strong>{currentRoom.name || 'Room'}</strong><span>{activeRooms.find(item => item.room.id === currentRoom.id)?.count || 1} connected</span></div>
                <button className="room-link-button" type="button" onClick={() => onCopyRoomLink?.(currentRoom.id)} title="Copy room link" aria-label="Copy room link">{copiedRoomId === currentRoom.id ? <Check size={13} /> : <Link2 size={13} />}</button>
                <button onClick={onOpenMeetingMode}>Join</button>
              </div>
            </section>
          )}

          {activeRooms.length > 0 && (
            <section className="people-panel-section">
              <p className="people-section-title">Active areas <ChevronDown size={13} /></p>
              {activeRooms.map(({ room, count }) => (
                <div className="area-row compact" key={room.id}>
                  <Radio size={14} />
                  <div><strong>{room.name || 'Room'}</strong><span>{count} online</span></div>
                <button className="room-join-button" data-room-id={room.id} type="button" onMouseDown={(e) => { e.preventDefault(); requestJoinRoom(room.id); }} onPointerDown={(e) => { e.preventDefault(); requestJoinRoom(room.id); }} onClick={() => requestJoinRoom(room.id)}>Join</button>
                </div>
              ))}
            </section>
          )}

          {allRooms.length > 0 && (
            <section className="people-panel-section">
              <p className="people-section-title">Rooms <ChevronDown size={13} /></p>
              {allRooms.map(({ room, count, spots, vacant }) => (
                <div className={`area-row compact room-directory-row ${currentRoom?.id === room.id ? 'active' : ''}`} key={room.id}>
                  <DoorOpen size={14} />
                  <div><strong>{room.name || 'Room'}</strong><span>{count} online · {spots ? `${vacant}/${spots} spots` : 'open floor'}</span></div>
                  <button className="room-link-button" type="button" onClick={() => onCopyRoomLink?.(room.id)} title="Copy room link" aria-label={`Copy link for ${room.name || 'Room'}`}>{copiedRoomId === room.id ? <Check size={13} /> : <Link2 size={13} />}</button>
                  <button className="room-join-button" data-room-id={room.id} type="button" disabled={currentRoom?.id === room.id} onMouseDown={(e) => { e.preventDefault(); requestJoinRoom(room.id); }} onPointerDown={(e) => { e.preventDefault(); requestJoinRoom(room.id); }} onClick={() => requestJoinRoom(room.id)}>{currentRoom?.id === room.id ? 'Here' : 'Join'}</button>
                </div>
              ))}
            </section>
          )}

          <p className="people-section-title">Members ({people.length + 1}) <ChevronDown size={13} /></p>
          {matches(myName) && <div className="person-row"><div className="person-avatar">{renderAvatar(myAvatarUrl, myName)}<span className={`presence-dot ${connected ? myStatus : 'offline'}`} /></div><div className="person-info"><strong>{myName} <small>(you)</small></strong><span>{connected ? (currentRoom ? `In ${currentRoom.name || 'room'} · ${myStatus}` : myStatus) : 'Connecting…'}</span></div></div>}
          {filtered.map(u => <div key={u.userId} className="person-row"><div className="person-avatar">{renderAvatar(u.avatarUrl, u.username)}<span className={`presence-dot ${u.status || 'available'}`} /></div><div className="person-info"><strong>{u.username}</strong><span>{u.status || 'available'}</span></div><div className="person-actions"><button className="action-icon-btn person-locate" onClick={() => messagePerson(u.username)} title={`Message ${u.username}`} aria-label={`Message ${u.username}`}><MessageSquare size={15} /></button><button className={`action-icon-btn person-locate ${followingUserId === u.userId ? 'active' : ''}`} onClick={() => handleFollowUser(u.userId, u.x, u.y)} title={followingUserId === u.userId ? `Following ${u.username}` : `Follow ${u.username}`} aria-label={`Follow ${u.username}`}><Footprints size={15} /></button><button className="action-icon-btn person-locate" onClick={() => handleLocateUser(u.x, u.y)} title={`Locate ${u.username}`} aria-label={`Locate ${u.username}`}><Crosshair size={15} /></button></div></div>)}
          {search && !filtered.length && !matches(myName) && <div className="panel-empty"><Search size={24} /><p>No people found</p><span>Try a different name.</span></div>}
          {!search && !people.length && <div className="panel-empty"><Users size={28} /><p>Better together</p><span>Invite your team to join you here.</span></div>}
        </div>
        <footer className="space-panel-footer"><button className="space-invite" onClick={handleCopyInvite}>{copied ? <Check size={16} /> : <Link2 size={16} />}{copied ? 'Invite link copied' : 'Invite people'}</button></footer>
      </> : <>
        <div className="chat-scope-tabs" role="tablist" aria-label="Chat scope">
          <button className={chatScope === 'everyone' ? 'active' : ''} onClick={() => setChatScope('everyone')} type="button">Everyone</button>
          <button className={chatScope === 'nearby' ? 'active' : ''} onClick={() => setChatScope('nearby')} type="button">Nearby</button>
          {currentRoom && <button className={chatScope === 'room' ? 'active' : ''} onClick={() => setChatScope('room')} type="button">Room</button>}
          <button className={chatScope === 'dm' ? 'active' : ''} onClick={() => setChatScope('dm')} type="button">DM</button>
          <button className={chatScope === 'invites' ? 'active' : ''} onClick={() => setChatScope('invites')} type="button">Invites</button>
        </div>
        {chatScope === 'invites' ? (
          <div className="space-chat-messages invite-history-list" role="log" aria-label="Room invite history" aria-live="polite">
            {!inviteHistory.length && <div className="panel-empty"><DoorOpen size={28} /><p>No room invites yet</p><span>Sent and received room invites will stay here.</span></div>}
            {inviteHistory.map(item => (
              <article className={`invite-history-card ${item.status}`} key={item.id}>
                <DoorOpen size={16} />
                <div>
                  <header><strong>{item.roomName}</strong><time>{formatInviteTime(item.updatedAt)}</time></header>
                  <p>{inviteStatusLabel(item)}</p>
                </div>
                {(item.status === 'received' || item.status === 'sent') && <span>{item.direction}</span>}
              </article>
            ))}
          </div>
        ) : (
          <>
            <div className="space-chat-messages" role="log" aria-label="Space messages" aria-live="polite">
              {!messages.length && <div className="panel-empty"><MessageSquare size={28} /><p>Start a conversation</p><span>Messages are shared with this space.</span></div>}
              {messages.map((m, i) => {
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const messageParts = m.message.split(urlRegex);
                
                return (
                  <article className="space-message" key={i}>
                    <header><strong>{m.username}</strong><span>{m.scope || 'everyone'}</span><time>{m.time}</time></header>
                    <p>
                      {messageParts.map((part, index) => 
                        urlRegex.test(part) ? (
                          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="chat-link">
                            {part}
                          </a>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  </article>
                );
              })}
              <div ref={chatEnd} />
            </div>
            <form className="space-chat-form" onSubmit={(e) => handleSendChat(e, chatScope)}>
              <input
                id="space-chat-input"
                name="spaceChatMessage"
                autoFocus
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={connected ? (chatScope === 'nearby' ? 'Message nearby people…' : chatScope === 'room' ? `Message ${currentRoom?.name || 'this room'}…` : chatScope === 'dm' ? 'Type @name message…' : 'Message everyone…') : 'Connecting…'}
                aria-label="Message everyone"
              />
              <button type="submit" disabled={!connected || !chatInput.trim()} className="action-icon-btn" aria-label="Send message" title="Send message"><Send size={18} /></button>
            </form>
          </>
        )}
      </>}
    </aside>
  );
};
