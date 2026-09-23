import React, { useState } from 'react';
import { X, Volume2, Video, User, Bell, Sliders, Monitor, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  myStoredUsername: string | null;
  myAvatarUrl: string | undefined;
  micOn: boolean;
  camOn: boolean;
  setMicOn: (val: boolean) => void;
  setCamOn: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  myStoredUsername,
  myAvatarUrl,
  micOn,
  camOn,
  setMicOn,
  setCamOn,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'audioVideo' | 'appearance' | 'notifications' | 'performance'>('audioVideo');
  const [status, setStatus] = useState<'available' | 'busy' | 'away'>('available');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [spatialAudio, setSpatialAudio] = useState(true);
  const [hdVideo, setHdVideo] = useState(true);
  const [audioLevel, setAudioLevel] = useState(70);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fade-in" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="settings-modal" style={{
        width: '750px',
        maxHeight: '85vh',
        background: '#151728',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        overflow: 'hidden',
        color: '#e2e8f0'
      }}>
        {/* Settings Navigation Sidebar */}
        <div style={{
          width: '210px',
          background: '#0d0f1b',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '1.2rem 0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <h3 style={{ fontSize: '0.9rem', color: '#94a3b8', padding: '0 0.8rem 0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Settings
          </h3>

          <button 
            className={`settings-tab-btn ${activeTab === 'audioVideo' ? 'active' : ''}`}
            onClick={() => setActiveTab('audioVideo')}
            style={tabBtnStyle(activeTab === 'audioVideo')}
          >
            <Video size={16} /> Audio & Video
          </button>

          <button 
            className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
            style={tabBtnStyle(activeTab === 'general')}
          >
            <Sliders size={16} /> General
          </button>

          <button 
            className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
            style={tabBtnStyle(activeTab === 'appearance')}
          >
            <User size={16} /> Appearance
          </button>

          <button 
            className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
            style={tabBtnStyle(activeTab === 'notifications')}
          >
            <Bell size={16} /> Notifications
          </button>

          <button 
            className={`settings-tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
            style={tabBtnStyle(activeTab === 'performance')}
          >
            <Monitor size={16} /> Performance
          </button>
        </div>

        {/* Settings Content Area */}
        <div style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto', position: 'relative' }}>
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.2rem',
              right: '1.2rem',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>

          {/* Audio & Video Tab */}
          {activeTab === 'audioVideo' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.2rem' }}>Audio & Video</h2>
              
              {/* Camera Preview Box */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Camera Preview</label>
                <div style={{
                  width: '100%',
                  height: '180px',
                  background: '#090a10',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {camOn ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#2dce89' }}>
                      <Video size={36} />
                      <span style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: '#e2e8f0' }}>Integrated Camera Active</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
                      <Video size={36} />
                      <span style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>Camera turned off</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mic visualizer */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Microphone Test</label>
                  <span style={{ fontSize: '0.85rem', color: '#2dce89' }}>Good Level</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', height: '12px', background: '#090a10', padding: '2px', borderRadius: '6px' }}>
                  {[...Array(20)].map((_, i) => (
                    <div key={i} style={{
                      flex: 1,
                      borderRadius: '2px',
                      background: i < (audioLevel / 5) ? (i > 15 ? '#f5365c' : '#2dce89') : 'rgba(255,255,255,0.08)'
                    }} />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={toggleRowStyle}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Noise Suppression</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Filters background keyboard clicks & fan noise</div>
                  </div>
                  <input type="checkbox" checked={noiseSuppression} onChange={(e) => setNoiseSuppression(e.target.checked)} style={{ cursor: 'pointer', width: 18, height: 18 }} />
                </div>

                <div style={toggleRowStyle}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Spatial Audio</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Simulates direction of voices based on character position</div>
                  </div>
                  <input type="checkbox" checked={spatialAudio} onChange={(e) => setSpatialAudio(e.target.checked)} style={{ cursor: 'pointer', width: 18, height: 18 }} />
                </div>
              </div>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.2rem' }}>General Settings</h2>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.4rem' }}>Display Name</label>
                <input type="text" value={myStoredUsername || 'Guest'} readOnly className="input" style={{ width: '100%', background: '#090a10', color: 'white' }} />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.4rem' }}>Status</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['available', 'busy', 'away'] as const).map((st) => (
                    <button key={st} onClick={() => setStatus(st)} style={{
                      flex: 1, padding: '0.6rem', borderRadius: '8px', border: status === st ? '2px solid #7c5cbf' : '1px solid rgba(255,255,255,0.1)',
                      background: status === st ? 'rgba(124,92,191,0.2)' : '#090a10', color: 'white', textTransform: 'capitalize', cursor: 'pointer'
                    }}>
                      {st === 'available' ? '🟢 Available' : st === 'busy' ? '🔴 Busy' : '🟡 Away'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.2rem' }}>Appearance</h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>Choose your avatar character skin:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {['🧑‍💼', '👩‍💻', '👨‍🎨', '🕵️‍♂️', '🥷', '🧙‍♂️', '🧛', '🤖'].map((emoji, idx) => (
                  <div key={idx} style={{
                    background: '#090a10',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease'
                  }}>
                    {emoji}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.2rem' }}>Notifications</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={toggleRowStyle}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Proximity Chime</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Play sound when someone enters your audio circle</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                </div>
                <div style={toggleRowStyle}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Direct Chat Alerts</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Show toast when someone sends a direct message</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.2rem' }}>Performance</h2>
              <div style={toggleRowStyle}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Hardware Canvas Acceleration</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Use GPU for smooth character rendering</div>
                </div>
                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
              </div>
            </div>
          )}

          {/* Footer Save */}
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
            <button onClick={onClose} style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button onClick={onClose} style={{ padding: '0.5rem 1.4rem', borderRadius: '8px', background: '#7c5cbf', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const tabBtnStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  padding: '0.6rem 0.8rem',
  borderRadius: '8px',
  background: isActive ? 'rgba(124,92,191,0.25)' : 'transparent',
  color: isActive ? '#a78bfa' : '#94a3b8',
  border: 'none',
  fontSize: '0.85rem',
  fontWeight: isActive ? 600 : 500,
  cursor: 'pointer',
  textAlign: 'left'
});

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.8rem 1rem',
  background: '#090a10',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.06)'
};
