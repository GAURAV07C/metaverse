import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, CameraOff, ChevronRight, Mic, MicOff, MonitorDown, Settings, Sparkles } from 'lucide-react';
import { useUserStore } from '../store';
import { api } from '../utils/api';

export function JoinSpace() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const username = useUserStore((s) => s.username);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [name, setName] = useState(username ?? 'Guest');
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [step, setStep] = useState<'devices' | 'welcome'>('devices');
  const [spaceName, setSpaceName] = useState('Office');
  const [deviceMessage, setDeviceMessage] = useState('Camera and microphone are optional. You can join with both off.');

  useEffect(() => {
    if (!spaceId) return;
    api.get(`/space/${spaceId}`).then(res => setSpaceName(res.data.name ?? 'Office')).catch(() => {});
  }, [spaceId]);

  useEffect(() => {
    async function syncDevices() {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (!camEnabled && !micEnabled) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: camEnabled, audio: micEnabled });
        streamRef.current = stream;
        if (videoRef.current && camEnabled) videoRef.current.srcObject = stream;
        setDeviceMessage('Devices connected. You can change them after joining.');
      } catch {
        setCamEnabled(false);
        setMicEnabled(false);
        setDeviceMessage('Browser blocked device access. You can still join without camera or mic.');
      }
    }
    syncDevices();
    return () => streamRef.current?.getTracks().forEach(track => track.stop());
  }, [camEnabled, micEnabled]);

  const handleJoin = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    navigate(`/space/${spaceId || 'default'}`);
  };

  return <div className="join-page">
    <aside className="join-left-panel">
      <div className="join-logo-badge">Gather</div>
      <div className="step-dots"><span className="active" /><span /><span /><span /><span /></div>
      <p>Build a Gather-style office with rooms, desks, invite links and Studio editing.</p>
    </aside>
    <main className="join-main-area">
      <div className="join-card">
        {step === 'devices' ? <>
          <div className="join-video-preview">
            {camEnabled ? <video ref={videoRef} autoPlay muted playsInline /> : <div className="camera-off-state">Your camera is off</div>}
            <div className="join-device-controls">
              <button className={!micEnabled ? 'off' : ''} onClick={() => setMicEnabled(v => !v)}>{micEnabled ? <Mic size={20} /> : <MicOff size={20} />}</button>
              <button className={!camEnabled ? 'off' : ''} onClick={() => setCamEnabled(v => !v)}>{camEnabled ? <Camera size={20} /> : <CameraOff size={20} />}</button>
              <button><Settings size={20} /></button>
            </div>
          </div>
          <div className="join-right-col">
            <div className="ready-badge"><Sparkles size={24} /></div>
            <h1>Ready to join?</h1>
            <p>Check your camera and microphone before entering {spaceName}.</p>
            <button className="primary-next" onClick={() => setStep('welcome')}>Next <ChevronRight size={18} /></button>
          </div>
        </> : <>
          <div className="join-right-col" style={{ gridColumn: '1 / -1', maxWidth: '400px', margin: '0 auto' }}>
            <h1>Welcome to {spaceName}</h1>
            <label className="join-label">Display name
              <input className="join-input" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
            </label>
            <button className="primary-next" disabled={!name.trim()} onClick={handleJoin}>Join office</button>
            <button className="ghost-next" onClick={() => setStep('devices')}>Back to device check</button>
          </div>
        </>}
      </div>
      <div className="device-note-bottom"><MonitorDown size={14} /> {deviceMessage}</div>
    </main>
  </div>;
}
