import { useEffect, useState } from 'react';
import { Bell, Calendar, Check, MessageSquare, Monitor, Shield, Sparkles, UserCog, Video, Volume2, X } from 'lucide-react';
import { api } from '../../utils/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  myStoredUsername: string | null;
  myAvatarUrl?: string;
  micOn?: boolean;
  camOn?: boolean;
  setMicOn?: (value: boolean) => void;
  setCamOn?: (value: boolean) => void;
  onDevicePreferenceChange?: (key: keyof DevicePrefs, value: string) => Promise<void> | void;
  notificationPreferences?: NotificationPrefs;
  onNotificationPreferenceChange?: (key: keyof NotificationPrefs, value: boolean) => Promise<void> | void;
  spaceId?: string;
  currentUserRole?: string;
  canManageMembers?: boolean;
}

type DevicePrefs = {
  audioInputId?: string;
  videoInputId?: string;
  audioOutputId?: string;
};

const DEVICE_PREF_KEY = 'metaverse_device_preferences';
const NOTIFICATION_PREF_KEY = 'metaverse_notification_preferences';

type NotificationPrefs = {
  joins: boolean;
  chat: boolean;
  roomInvites: boolean;
  sounds: boolean;
  reconnecting: boolean;
  respectFocus: boolean;
};

type OfficeMember = {
  id: string;
  userId: string;
  username: string;
  avatar?: string | null;
  role: 'Owner' | 'Admin' | 'Builder' | 'Member' | 'Guest';
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  joins: true,
  chat: true,
  roomInvites: true,
  sounds: true,
  reconnecting: true,
  respectFocus: true,
};

const tabs = [
  ['General', UserCog], ['Calendar', Calendar], ['Audio', Volume2], ['Video', Video], ['Meetings', Monitor], ['Notifications', Bell], ['Integrations', Sparkles], ['Performance', Monitor],
  ['Manage members', UserCog], ['Manage guests', UserCog], ['Conversations', Volume2], ['Chat', MessageSquare], ['Security', Shield], ['Smart Objects', Sparkles],
] as const;

const toggles: Record<string, string[]> = {
  Audio: ['Reduce background noise', 'Adjust mic volume automatically', 'Reduce echo', 'Mute automatically', 'Auto-listen to nearby conversations', 'Enable footstep sounds', 'Enable applause sounds'],
  Video: ['Use HD video', 'Touch up appearance (Beta)', 'Blur background by default'],
  Conversations: ['Enable ambient audio/video', 'Auto-lock desks', 'Enable announcements', 'Enable megaphone'],
  Chat: ['Enable channels', 'Allow chat in meetings', 'Send nearby in map view', 'Allow direct messages'],
  Security: ['Allow membership with company email', 'Allow Gather support access', 'Members can invite members'],
  'Smart Objects': ['Enable Smart Objects', 'Allow custom object events', 'Show object event history'],
};

const readDevicePrefs = (): DevicePrefs => {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_PREF_KEY) || '{}');
  } catch {
    return {};
  }
};

const readNotificationPrefs = (): NotificationPrefs => {
  try {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(localStorage.getItem(NOTIFICATION_PREF_KEY) || '{}') };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
};

const editableRoles = ['Admin', 'Builder', 'Member', 'Guest'] as const;

export const SettingsModal = ({ isOpen, onClose, myStoredUsername, micOn, camOn, setMicOn, setCamOn, onDevicePreferenceChange, notificationPreferences, onNotificationPreferenceChange, spaceId, currentUserRole = 'Guest', canManageMembers = false }: SettingsModalProps) => {
  const [tab, setTab] = useState('General');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [devicePrefs, setDevicePrefs] = useState<DevicePrefs>(() => readDevicePrefs());
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() => readNotificationPrefs());
  const [deviceMsg, setDeviceMsg] = useState('Device choices are saved for this browser.');
  const [members, setMembers] = useState<OfficeMember[]>([]);
  const [memberMsg, setMemberMsg] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberUsername, setMemberUsername] = useState('');
  const [memberRole, setMemberRole] = useState<typeof editableRoles[number]>('Member');

  useEffect(() => {
    if (!isOpen || !navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices()
      .then(setDevices)
      .catch(() => setDeviceMsg('Device list is unavailable until browser permission is granted.'));
  }, [isOpen]);

  useEffect(() => {
    if (notificationPreferences) setNotificationPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...notificationPreferences });
  }, [notificationPreferences]);

  const refreshMembers = async () => {
    if (!spaceId || !canManageMembers) return;
    setMemberLoading(true);
    setMemberMsg('');
    try {
      const res = await api.get(`/office/${spaceId}/members`);
      setMembers(res.data.members || []);
    } catch {
      setMemberMsg('Could not load members.');
    } finally {
      setMemberLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tab === 'Manage members') refreshMembers();
  }, [isOpen, tab, spaceId, canManageMembers]);

  const saveDevicePref = async (key: keyof DevicePrefs, value: string) => {
    const next = { ...devicePrefs, [key]: value || undefined };
    setDevicePrefs(next);
    localStorage.setItem(DEVICE_PREF_KEY, JSON.stringify(next));
    const isLiveInput = (key === 'audioInputId' && micOn) || (key === 'videoInputId' && camOn);
    if (!isLiveInput || !onDevicePreferenceChange) {
      setDeviceMsg('Saved. The next time you turn media on, this device will be used.');
      return;
    }
    setDeviceMsg('Switching active device...');
    try {
      await onDevicePreferenceChange(key, value);
      setDeviceMsg('Switched active device.');
    } catch (error) {
      setDeviceMsg('Could not switch active device. Check browser permissions.');
    }
  };

  const saveNotificationPref = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('metaverse-notification-preferences-updated'));
    await onNotificationPreferenceChange?.(key, value);
  };

  const addMember = async () => {
    if (!spaceId || !memberUsername.trim()) return;
    setMemberMsg('Adding member...');
    try {
      const res = await api.post(`/office/${spaceId}/members`, { username: memberUsername.trim(), role: memberRole });
      const nextMember = res.data.member as OfficeMember;
      setMembers(prev => [nextMember, ...prev.filter(member => member.userId !== nextMember.userId)]);
      setMemberUsername('');
      setMemberMsg('Member saved.');
    } catch (error: any) {
      setMemberMsg(error?.response?.data?.message || 'Could not add member.');
    }
  };

  const updateMemberRole = async (member: OfficeMember, role: typeof editableRoles[number]) => {
    if (!spaceId || member.role === 'Owner') return;
    setMembers(prev => prev.map(item => item.userId === member.userId ? { ...item, role } : item));
    setMemberMsg('Updating role...');
    try {
      const res = await api.put(`/office/${spaceId}/members/${member.userId}`, { role });
      const nextMember = res.data.member as OfficeMember;
      setMembers(prev => prev.map(item => item.userId === member.userId ? nextMember : item));
      setMemberMsg('Role updated.');
    } catch (error: any) {
      setMemberMsg(error?.response?.data?.message || 'Could not update role.');
      refreshMembers();
    }
  };

  const removeMember = async (member: OfficeMember) => {
    if (!spaceId || member.role === 'Owner') return;
    setMemberMsg('Removing member...');
    try {
      await api.delete(`/office/${spaceId}/members/${member.userId}`);
      setMembers(prev => prev.filter(item => item.userId !== member.userId));
      setMemberMsg('Member removed.');
    } catch (error: any) {
      setMemberMsg(error?.response?.data?.message || 'Could not remove member.');
    }
  };

  if (!isOpen) return null;

  const items = toggles[tab] ?? [];
  const audioInputs = devices.filter(device => device.kind === 'audioinput');
  const videoInputs = devices.filter(device => device.kind === 'videoinput');
  const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

  return (
    <div className="settings-backdrop">
      <section className="gather-settings">
        <aside>
          <h2>Settings</h2>
          <p>Preferences</p>
          {tabs.slice(0, 8).map(([name, Icon]) => (
            <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}><Icon size={16} />{name}</button>
          ))}
          <p>Office</p>
          {tabs.slice(8).map(([name, Icon]) => (
            <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}><Icon size={16} />{name}</button>
          ))}
        </aside>

        <main>
          <button className="settings-close" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
          <h1>{tab}</h1>

          {tab === 'General' && (
            <div className="settings-stack">
              <label>Display name<input readOnly value={myStoredUsername ?? 'Guest'} /></label>
              <label htmlFor="settings-language">Display language<select id="settings-language" name="settingsLanguage" defaultValue="English"><option>English</option><option>Hindi</option></select></label>
              <label htmlFor="settings-color-mode">Color mode<select id="settings-color-mode" name="settingsColorMode" defaultValue="Light"><option>Light</option><option>Dark</option></select></label>
            </div>
          )}

          {tab === 'Audio' && (
            <div className="settings-stack">
              <label htmlFor="settings-audio-input">Microphone
                <select id="settings-audio-input" name="settingsAudioInput" value={devicePrefs.audioInputId || ''} onChange={e => saveDevicePref('audioInputId', e.target.value)}>
                  <option value="">System default microphone</option>
                  {audioInputs.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
                </select>
              </label>
              <label htmlFor="settings-audio-output">Speaker
                <select id="settings-audio-output" name="settingsAudioOutput" value={devicePrefs.audioOutputId || ''} onChange={e => saveDevicePref('audioOutputId', e.target.value)}>
                  <option value="">System default speaker</option>
                  {audioOutputs.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Speaker ${index + 1}`}</option>)}
                </select>
              </label>
              <label className="settings-toggle" htmlFor="settings-mic-enabled"><span>Microphone is {micOn ? 'on' : 'off'}</span><input id="settings-mic-enabled" name="settingsMicEnabled" type="checkbox" checked={!!micOn} onChange={e => setMicOn?.(e.target.checked)} /></label>
              <p className="settings-hint">{deviceMsg}</p>
            </div>
          )}

          {tab === 'Video' && (
            <div className="settings-stack">
              <label htmlFor="settings-video-input">Camera
                <select id="settings-video-input" name="settingsVideoInput" value={devicePrefs.videoInputId || ''} onChange={e => saveDevicePref('videoInputId', e.target.value)}>
                  <option value="">System default camera</option>
                  {videoInputs.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
                </select>
              </label>
              <label className="settings-toggle" htmlFor="settings-cam-enabled"><span>Camera is {camOn ? 'on' : 'off'}</span><input id="settings-cam-enabled" name="settingsCamEnabled" type="checkbox" checked={!!camOn} onChange={e => setCamOn?.(e.target.checked)} /></label>
              <p className="settings-hint">{deviceMsg}</p>
            </div>
          )}

          {tab === 'Notifications' && (
            <div className="settings-stack">
              <label className="settings-toggle" htmlFor="settings-notify-joins"><span>Join and leave toasts</span><input id="settings-notify-joins" name="settingsNotifyJoins" type="checkbox" checked={notificationPrefs.joins} onChange={e => saveNotificationPref('joins', e.target.checked)} /></label>
              <label className="settings-toggle" htmlFor="settings-notify-chat"><span>Chat and DM toasts</span><input id="settings-notify-chat" name="settingsNotifyChat" type="checkbox" checked={notificationPrefs.chat} onChange={e => saveNotificationPref('chat', e.target.checked)} /></label>
              <label className="settings-toggle" htmlFor="settings-notify-invites"><span>Room invite popups</span><input id="settings-notify-invites" name="settingsNotifyInvites" type="checkbox" checked={notificationPrefs.roomInvites} onChange={e => saveNotificationPref('roomInvites', e.target.checked)} /></label>
              <label className="settings-toggle" htmlFor="settings-notify-sounds"><span>Invite ring sound</span><input id="settings-notify-sounds" name="settingsNotifySounds" type="checkbox" checked={notificationPrefs.sounds} onChange={e => saveNotificationPref('sounds', e.target.checked)} /></label>
              <label className="settings-toggle" htmlFor="settings-notify-reconnect"><span>Reconnect and offline banner</span><input id="settings-notify-reconnect" name="settingsNotifyReconnect" type="checkbox" checked={notificationPrefs.reconnecting} onChange={e => saveNotificationPref('reconnecting', e.target.checked)} /></label>
              <label className="settings-toggle" htmlFor="settings-notify-focus"><span>Respect busy and focus status</span><input id="settings-notify-focus" name="settingsNotifyFocus" type="checkbox" checked={notificationPrefs.respectFocus} onChange={e => saveNotificationPref('respectFocus', e.target.checked)} /></label>
              <p className="settings-hint">Saved for this space and applied immediately to room invites, chat, join alerts, and reconnect UI.</p>
            </div>
          )}

          {tab === 'Manage members' && (
            <div className="settings-member-manager">
              {!canManageMembers ? (
                <div className="settings-empty"><Shield size={22} /><b>Role: {currentUserRole}</b><span>Only owners and admins can manage members.</span></div>
              ) : (
                <>
                  <div className="settings-member-add">
                    <input value={memberUsername} onChange={e => setMemberUsername(e.target.value)} placeholder="Username" />
                    <select value={memberRole} onChange={e => setMemberRole(e.target.value as typeof editableRoles[number])}>
                      {editableRoles.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <button onClick={addMember} disabled={!memberUsername.trim()}>Add</button>
                  </div>
                  <div className="settings-table">
                    <div><b>Member</b><span>Role</span><span>Action</span></div>
                    {memberLoading && <div><b>Loading...</b><span>Role</span><span /></div>}
                    {!memberLoading && members.map(member => (
                      <div key={member.userId}>
                        <b>{member.username || 'Unknown'}</b>
                        <span>
                          {member.role === 'Owner' ? 'Owner' : (
                            <select value={member.role} onChange={e => updateMemberRole(member, e.target.value as typeof editableRoles[number])}>
                              {editableRoles.map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                          )}
                        </span>
                        <span>{member.role === 'Owner' ? 'Locked' : <button onClick={() => removeMember(member)}>Remove</button>}</span>
                      </div>
                    ))}
                  </div>
                  {memberMsg && <p className="settings-hint">{memberMsg}</p>}
                </>
              )}
            </div>
          )}

          {tab === 'Manage guests' && <div className="settings-empty"><b>No guests</b><span>Guest passes will appear here.</span></div>}

          {items.length > 0 && tab !== 'Audio' && tab !== 'Video' && tab !== 'Notifications' && (
            <div className="settings-stack">{items.map(item => <label className="settings-toggle" key={item}><span>{item}</span><input type="checkbox" defaultChecked /></label>)}</div>
          )}

          {!items.length && tab !== 'General' && tab !== 'Notifications' && tab !== 'Manage members' && tab !== 'Manage guests' && (
            <div className="settings-empty"><Check size={22} /><b>{tab} is ready</b><span>Production settings can be wired from the Office API.</span></div>
          )}

          <footer><button onClick={onClose}>Cancel</button><button onClick={onClose}>Save changes</button></footer>
        </main>
      </section>
    </div>
  );
};
