import { useState } from 'react';
import { Bell, Calendar, Check, MessageSquare, Monitor, Shield, Sparkles, UserCog, Video, Volume2, X } from 'lucide-react';

interface SettingsModalProps { isOpen: boolean; onClose: () => void; myStoredUsername: string | null; myAvatarUrl?: string; micOn?: boolean; camOn?: boolean; setMicOn?: (value: boolean) => void; setCamOn?: (value: boolean) => void; }
const tabs = [
  ['General', UserCog], ['Calendar', Calendar], ['Audio', Volume2], ['Video', Video], ['Meetings', Monitor], ['Notifications', Bell], ['Integrations', Sparkles], ['Performance', Monitor],
  ['Manage members', UserCog], ['Manage guests', UserCog], ['Conversations', Volume2], ['Chat', MessageSquare], ['Security', Shield], ['Smart Objects', Sparkles]
] as const;
const toggles: Record<string, string[]> = {
  Audio: ['Reduce background noise', 'Adjust mic volume automatically', 'Reduce echo', 'Mute automatically', 'Auto-listen to nearby conversations', 'Enable footstep sounds', 'Enable applause sounds'],
  Video: ['Use HD video', 'Touch up appearance (Beta)', 'Blur background by default'],
  Conversations: ['Enable ambient audio/video', 'Auto-lock desks', 'Enable announcements', 'Enable megaphone'],
  Chat: ['Enable channels', 'Allow chat in meetings', 'Send nearby in map view', 'Allow direct messages'],
  Security: ['Allow membership with company email', 'Allow Gather support access', 'Members can invite members'],
  'Smart Objects': ['Enable Smart Objects', 'Allow custom object events', 'Show object event history'],
};
export const SettingsModal = ({ isOpen, onClose, myStoredUsername }: SettingsModalProps) => {
  const [tab, setTab] = useState('General');
  if (!isOpen) return null;
  const items = toggles[tab] ?? [];
  return <div className="settings-backdrop"><section className="gather-settings"><aside><h2>Settings</h2><p>Preferences</p>{tabs.slice(0,8).map(([name, Icon]) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}><Icon size={16} />{name}</button>)}<p>Office</p>{tabs.slice(8).map(([name, Icon]) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}><Icon size={16} />{name}</button>)}</aside><main><button className="settings-close" onClick={onClose}><X size={18} /></button><h1>{tab}</h1>{tab === 'General' && <div className="settings-stack"><label>Display name<input readOnly value={myStoredUsername ?? 'Guest'} /></label><label>Display language<select defaultValue="English"><option>English</option><option>Hindi</option></select></label><label>Color mode<select defaultValue="Light"><option>Light</option><option>Dark</option></select></label></div>}{tab === 'Manage members' && <div className="settings-table"><div><b>Member List</b><span>Role</span><span>Last active</span></div><div><b>{myStoredUsername ?? 'You'}</b><span>Admin</span><span>Today</span></div></div>}{tab === 'Manage guests' && <div className="settings-empty"><b>No guests</b><span>Guest passes will appear here.</span></div>}{items.length > 0 && <div className="settings-stack">{items.map(item => <label className="settings-toggle" key={item}><span>{item}</span><input type="checkbox" defaultChecked /></label>)}</div>}{!items.length && tab !== 'General' && tab !== 'Manage members' && tab !== 'Manage guests' && <div className="settings-empty"><Check size={22} /><b>{tab} is ready</b><span>Production settings can be wired from the Office API.</span></div>}<footer><button onClick={onClose}>Cancel</button><button onClick={onClose}>Save changes</button></footer></main></section></div>;
};
