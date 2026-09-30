import React, { useState } from 'react';
import { CircleDot, Grid2X2, HelpCircle, Mic, MicOff, Video, VideoOff, Smile, MonitorUp, Hammer, LogOut } from 'lucide-react';

interface ActionToolbarProps {
  myStoredUsername: string | null;
  onLeaveSpace: () => void;
  micOn?: boolean;
  setMicOn?: (val: boolean) => void;
  camOn?: boolean;
  setCamOn?: (val: boolean) => void;
  isScreenSharing?: boolean;
  handleScreenShare?: () => void;
  canBuild?: boolean;
  showPanel: boolean;
  onToggleBuild: () => void;
  onOpenSettings: () => void;
  onChooseEmoji: (emoji: string) => void;
  meetingMode?: boolean;
  onToggleMeetingMode?: () => void;
  presenceStatus?: 'available' | 'busy' | 'focus' | 'away';
  onStatusChange?: (status: 'available' | 'busy' | 'focus' | 'away') => void;
  onOpenShortcuts?: () => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  myStoredUsername, onLeaveSpace, micOn, setMicOn, camOn, setCamOn,
  isScreenSharing, handleScreenShare,
  canBuild = true,
  showPanel, onToggleBuild, onOpenSettings, onChooseEmoji,
  meetingMode = false, onToggleMeetingMode, presenceStatus = 'available', onStatusChange, onOpenShortcuts,
}) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const statuses: { id: 'available' | 'busy' | 'focus' | 'away'; label: string }[] = [
    { id: 'available', label: 'Available' },
    { id: 'busy', label: 'Busy' },
    { id: 'focus', label: 'Focus' },
    { id: 'away', label: 'Away' },
  ];
  return (
    <nav className="action-toolbar" aria-label="Space controls">
      <div className="toolbar-group" aria-label="Audio and video">
        <button className="action-profile-btn" onClick={onOpenSettings} title={`${myStoredUsername || 'You'} · Settings`} aria-label="Your profile and settings">
          {(myStoredUsername || 'You').charAt(0).toUpperCase()}
        </button>
        <div className="status-control">
          <button className={`action-icon-btn status-${presenceStatus}`} onClick={() => setShowStatus(!showStatus)} title={`Status: ${presenceStatus}`} aria-label="Set status" aria-expanded={showStatus} aria-controls="status-picker">
            <CircleDot size={20} />
          </button>
          {showStatus && <div id="status-picker" className="status-picker" aria-label="Choose status" onKeyDown={e => { if (e.key === 'Escape') { setShowStatus(false); e.stopPropagation(); } }}>
            {statuses.map(status => <button key={status.id} className={`status-choice status-${status.id} ${presenceStatus === status.id ? 'active' : ''}`} onClick={() => { onStatusChange?.(status.id); setShowStatus(false); }} type="button"><CircleDot size={14} />{status.label}</button>)}
          </div>}
        </div>
        <button className={`action-icon-btn ${micOn ? 'active' : 'media-off'}`} disabled={!setMicOn} onClick={() => setMicOn?.(!micOn)} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'} aria-pressed={!!micOn} title={!setMicOn ? 'Microphone unavailable in this space' : micOn ? 'Mute microphone' : 'Unmute microphone'}>
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button className={`action-icon-btn ${camOn ? 'active' : 'media-off'}`} disabled={!setCamOn} onClick={() => setCamOn?.(!camOn)} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'} aria-pressed={!!camOn} title={!setCamOn ? 'Camera unavailable in this space' : camOn ? 'Turn camera off' : 'Turn camera on'}>
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
      </div>
      <span className="toolbar-divider" />
      <div className="toolbar-group" aria-label="Space actions">
        <button className={`action-icon-btn ${meetingMode ? 'active' : ''}`} disabled={!onToggleMeetingMode} onClick={onToggleMeetingMode} title={meetingMode ? 'Back to map' : 'Meeting mode'} aria-label={meetingMode ? 'Back to map' : 'Meeting mode'} aria-pressed={meetingMode}><Grid2X2 size={20} /></button>
        <button className={`action-icon-btn ${isScreenSharing ? 'active' : ''}`} disabled={!handleScreenShare} onClick={handleScreenShare} title={handleScreenShare ? 'Share screen' : 'Screen sharing unavailable in this space'} aria-label="Share screen" aria-pressed={!!isScreenSharing}><MonitorUp size={20} /></button>
        <div className="emoji-control">
          <button className={`action-icon-btn ${showEmoji ? 'active' : ''}`} onClick={() => setShowEmoji(!showEmoji)} title="Send reaction" aria-label="Send reaction" aria-expanded={showEmoji} aria-controls="emoji-picker"><Smile size={20} /></button>
          {showEmoji && <div id="emoji-picker" className="emoji-picker" aria-label="Choose reaction" onKeyDown={e => { if (e.key === 'Escape') { setShowEmoji(false); e.stopPropagation(); } }}>
            {['👋', '🎉', '❤️', '😂', '👍', '☕'].map(emoji => <button key={emoji} aria-label={`Send ${emoji} reaction`} onClick={() => { onChooseEmoji(emoji); setShowEmoji(false); }}>{emoji}</button>)}
          </div>}
        </div>
        <button className={`action-icon-btn ${showPanel ? 'active' : ''}`} disabled={!canBuild} onClick={onToggleBuild} title={canBuild ? 'Build' : 'Only the owner can build'} aria-label="Build" aria-expanded={showPanel}><Hammer size={20} /></button>
        <button className="action-icon-btn" onClick={onOpenShortcuts} title="Keyboard shortcuts" aria-label="Keyboard shortcuts"><HelpCircle size={20} /></button>
      </div>
      <span className="toolbar-divider" />
      <button className="action-leave-btn" onClick={onLeaveSpace} title="Leave space" aria-label="Leave space"><LogOut size={20} /></button>
    </nav>
  );
};
