import React from 'react';
import { MicOff, VideoOff, Lock, LogOut } from 'lucide-react';
import type { OtherUser } from '../Arena';

interface VideoOverlayProps {
  proximityUsers: string[];
  otherUsers: OtherUser[];
  streams: Record<string, MediaStream>;
  screenStreams: Record<string, MediaStream>;
  myStoredUsername: string | null;
  myAvatarUrl: string | undefined;
  micOn: boolean;
  camOn: boolean;
  viewMode?: 'map' | 'grid';
  currentZone?: { id: string; name?: string } | null;
  onLeaveZone?: () => void;
}

export const VideoOverlay: React.FC<VideoOverlayProps> = ({
  proximityUsers,
  otherUsers,
  streams,
  screenStreams,
  myStoredUsername,
  myAvatarUrl,
  micOn,
  camOn,
  viewMode = 'map',
  currentZone,
  onLeaveZone
}) => {
  return (
    <>
      {/* ── Private Area Active Header Banner ── */}
      {currentZone && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(13, 30, 20, 0.92)',
          border: '1px solid rgba(45, 206, 137, 0.6)',
          boxShadow: '0 8px 25px rgba(45, 206, 137, 0.25)',
          backdropFilter: 'blur(10px)',
          borderRadius: '30px',
          padding: '0.4rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          color: '#2dce89',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Lock size={14} style={{ color: '#2dce89' }} />
            <span style={{ color: '#ffffff' }}>
              Private Room: <strong style={{ color: '#2dce89' }}>{currentZone.name || 'Meeting Area'}</strong>
            </span>
          </div>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
          <span style={{ color: '#a3e635', fontSize: '0.75rem' }}>
            🔒 {proximityUsers.length + 1} Connected (Audio/Video Locked)
          </span>
          {onLeaveZone && (
            <button
              onClick={onLeaveZone}
              style={{
                background: 'rgba(245, 54, 92, 0.2)',
                border: '1px solid rgba(245, 54, 92, 0.5)',
                color: '#ff6b81',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginLeft: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <LogOut size={12} /> Leave
            </button>
          )}
        </div>
      )}

      {/* ── Proximity Video Bubbles ── */}
      <div className={`proximity-videos-container ${viewMode === 'grid' ? 'grid-view-mode' : ''}`}>
        {/* Me */}
        <div className={`video-bubble me ${currentZone ? 'in-private-zone' : ''}`} style={{
          border: currentZone ? '2px solid #2dce89' : undefined,
          boxShadow: currentZone ? '0 0 15px rgba(45, 206, 137, 0.5)' : undefined
        }}>
          {streams['me'] ? (
            <video 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              ref={(node) => { if (node) node.srcObject = streams['me']; }}
            />
          ) : (
            <>
              {myAvatarUrl ? <img src={myAvatarUrl} alt="" className="vid-placeholder-img" /> : <div className="vid-placeholder">🧑</div>}
            </>
          )}
          <span className="vid-label">{myStoredUsername || 'You'}</span>
          <div className="vid-status-icons">
            {!micOn && <div className="vid-status-icon"><MicOff size={10} /></div>}
            {!camOn && <div className="vid-status-icon"><VideoOff size={10} /></div>}
          </div>
        </div>

        {/* Proximity Users */}
        {proximityUsers.map(uid => {
          const userObj = otherUsers.find(u => u.userId === uid);
          const name = userObj?.username || 'Unknown';
          const avatar = userObj?.avatarUrl;
          const stream = streams[uid];

          return (
            <div key={uid} className="video-bubble animate-float-in" style={{
              border: currentZone ? '2px solid #2dce89' : undefined,
              boxShadow: currentZone ? '0 0 15px rgba(45, 206, 137, 0.5)' : undefined
            }}>
              {stream ? (
                <video 
                  autoPlay 
                  playsInline 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  ref={(node) => { if (node) node.srcObject = stream; }}
                />
              ) : (
                <>
                  {avatar ? <img src={avatar} alt="" className="vid-placeholder-img" /> : <div className="vid-placeholder" style={{background: '#333'}}>👤</div>}
                </>
              )}
              <span className="vid-label">{name}</span>
            </div>
          );
        })}
      </div>

      {/* ── Screen Shares Overlay ── */}
      <div style={{ position: 'absolute', top: '180px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1rem', zIndex: 90, pointerEvents: 'none' }}>
        {Object.entries(screenStreams).map(([id, stream]) => (
          <div key={id} style={{ width: '600px', height: '337px', background: 'black', borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--accent)', pointerEvents: 'auto' }}>
            <video 
              autoPlay 
              playsInline 
              muted={id === 'me'}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              ref={(node) => { if (node) node.srcObject = stream; }}
            />
          </div>
        ))}
      </div>
    </>
  );
};
