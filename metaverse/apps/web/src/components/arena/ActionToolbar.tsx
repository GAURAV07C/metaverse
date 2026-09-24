import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Smile, MonitorUp, Hammer, LogOut } from 'lucide-react';

interface ActionToolbarProps {
  myStoredUsername: string | null;
  onLeaveSpace: () => void;
  micOn?: boolean;
  setMicOn?: (val: boolean) => void;
  camOn?: boolean;
  setCamOn?: (val: boolean) => void;
  isScreenSharing?: boolean;
  handleScreenShare?: () => void;
  showPanel: boolean;
  onToggleBuild: () => void;
  onOpenSettings: () => void;
  onChooseEmoji: (emoji: string) => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  myStoredUsername, onLeaveSpace, micOn, setMicOn, camOn, setCamOn,
  isScreenSharing, handleScreenShare,
  showPanel, onToggleBuild, onOpenSettings, onChooseEmoji,
}) => {
  const [showEmoji, setShowEmoji] = useState(false);
  return (
    <nav className="action-toolbar" aria-label="Space controls">
      <div className="toolbar-group" aria-label="Audio and video">
        <button className="action-profile-btn" onClick={onOpenSettings} title={`${myStoredUsername || 'You'} · Settings`} aria-label="Your profile and settings">
          {(myStoredUsername || 'You').charAt(0).toUpperCase()}
        </button>
        <button className={`action-icon-btn ${micOn ? 'active' : 'media-off'}`} disabled={!setMicOn} onClick={() => setMicOn?.(!micOn)} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'} aria-pressed={!!micOn} title={!setMicOn ? 'Microphone unavailable in this space' : micOn ? 'Mute microphone' : 'Unmute microphone'}>
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button className={`action-icon-btn ${camOn ? 'active' : 'media-off'}`} disabled={!setCamOn} onClick={() => setCamOn?.(!camOn)} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'} aria-pressed={!!camOn} title={!setCamOn ? 'Camera unavailable in this space' : camOn ? 'Turn camera off' : 'Turn camera on'}>
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
      </div>
      <span className="toolbar-divider" />
      <div className="toolbar-group" aria-label="Space actions">
        <button className={`action-icon-btn ${isScreenSharing ? 'active' : ''}`} disabled={!handleScreenShare} onClick={handleScreenShare} title={handleScreenShare ? 'Share screen' : 'Screen sharing unavailable in this space'} aria-label="Share screen" aria-pressed={!!isScreenSharing}><MonitorUp size={20} /></button>
        <div className="emoji-control">
          <button className={`action-icon-btn ${showEmoji ? 'active' : ''}`} onClick={() => setShowEmoji(!showEmoji)} title="Add emoji to chat" aria-label="Add emoji to chat" aria-expanded={showEmoji} aria-controls="emoji-picker"><Smile size={20} /></button>
          {showEmoji && <div id="emoji-picker" className="emoji-picker" aria-label="Choose emoji" onKeyDown={e => { if (e.key === 'Escape') { setShowEmoji(false); e.stopPropagation(); } }}>
            {['👋', '🎉', '❤️', '😂', '👍', '☕'].map(emoji => <button key={emoji} aria-label={`Add ${emoji} to chat`} onClick={() => { onChooseEmoji(emoji); setShowEmoji(false); }}>{emoji}</button>)}
          </div>}
        </div>
        <button className={`action-icon-btn ${showPanel ? 'active' : ''}`} onClick={onToggleBuild} title="Build" aria-label="Build" aria-expanded={showPanel}><Hammer size={20} /></button>
      </div>
      <span className="toolbar-divider" />
      <button className="action-leave-btn" onClick={onLeaveSpace} title="Leave space" aria-label="Leave space"><LogOut size={20} /></button>
    </nav>
  );
};
