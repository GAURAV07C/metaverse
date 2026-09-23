import React from 'react';
import { Mic, MicOff, Video, VideoOff, Smile, Map as MapIcon, Settings, MonitorUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionToolbarProps {
  myStoredUsername: string | null;
  micOn: boolean;
  setMicOn: (val: boolean) => void;
  camOn: boolean;
  setCamOn: (val: boolean) => void;
  isScreenSharing: boolean;
  handleScreenShare: () => void;
  showMinimap: boolean;
  setShowMinimap: (val: boolean) => void;
  viewMode: 'map' | 'grid';
  setViewMode: (val: 'map' | 'grid') => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  myStoredUsername,
  micOn, setMicOn,
  camOn, setCamOn,
  isScreenSharing, handleScreenShare,
  showMinimap, setShowMinimap,
  viewMode, setViewMode
}) => {
  const navigate = useNavigate();

  return (
    <div className="action-toolbar">
      {/* Profile avatar */}
      <div className="action-profile-btn" title={myStoredUsername || 'You'}>
        {myStoredUsername ? myStoredUsername.charAt(0).toUpperCase() : 'U'}
      </div>
      <span className="action-profile-name">{myStoredUsername || 'You'}</span>

      <div className="toolbar-divider" />

      {/* Mic toggle */}
      <button
        className={`action-icon-btn ${micOn ? 'mic-on' : 'mic-off'}`}
        onClick={() => setMicOn(!micOn)}
        title={micOn ? 'Mute' : 'Unmute'}
      >
        {micOn ? <Mic size={18} /> : <MicOff size={18} />}
      </button>

      {/* Camera toggle */}
      <button
        className={`action-icon-btn ${camOn ? 'cam-on' : 'cam-off'}`}
        onClick={() => setCamOn(!camOn)}
        title={camOn ? 'Turn off camera' : 'Turn on camera'}
      >
        {camOn ? <Video size={18} /> : <VideoOff size={18} />}
      </button>

      <div className="toolbar-divider" />

      {/* Screen Share */}
      <button 
        className={`action-icon-btn ${isScreenSharing ? 'active' : ''}`} 
        onClick={handleScreenShare}
        title="Share Screen"
      >
        <MonitorUp size={18} />
      </button>

      {/* Emoji */}
      <button className="action-icon-btn" title="React with Emoji">
        <Smile size={18} />
      </button>

      {/* Minimap toggle */}
      <button
        className={`action-icon-btn ${showMinimap ? 'active' : ''}`}
        onClick={() => setShowMinimap(!showMinimap)}
        title="Toggle Minimap"
      >
        <MapIcon size={18} />
      </button>

      {/* Grid View toggle */}
      <button
        className={`action-icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
        onClick={() => setViewMode(viewMode === 'map' ? 'grid' : 'map')}
        title="Toggle Grid View"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
      </button>

      {/* Settings */}
      <button className="action-icon-btn" title="Settings">
        <Settings size={18} />
      </button>

      <div className="toolbar-divider" />

      {/* Leave */}
      <button className="action-leave-btn" onClick={() => navigate('/dashboard')} title="Leave Space">
        Leave
      </button>
    </div>
  );
};
