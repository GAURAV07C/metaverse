import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useUserStore } from '../../store';

interface PrejoinScreenProps {
  spaceName: string;
  onJoin: (micOn: boolean, camOn: boolean, devicePrefs: any) => void;
}

export function PrejoinScreen({ spaceName, onJoin }: PrejoinScreenProps) {
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputId, setAudioInputId] = useState<string>('');
  const [videoInputId, setVideoInputId] = useState<string>('');
  const [audioOutputId, setAudioOutputId] = useState<string>('');

  const username = useUserStore(s => s.username);
  const avatarUrl = useUserStore(s => s.avatarUrl);
  
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      setDevices(devs);
      const audioIns = devs.filter(d => d.kind === 'audioinput');
      const videoIns = devs.filter(d => d.kind === 'videoinput');
      const audioOuts = devs.filter(d => d.kind === 'audiooutput');
      
      const savedStr = localStorage.getItem('metaverse_device_preferences');
      let saved = {} as any;
      if (savedStr) {
        try { saved = JSON.parse(savedStr); } catch(e) {}
      }

      setAudioInputId(saved.audioInputId || (audioIns[0]?.deviceId ?? ''));
      setVideoInputId(saved.videoInputId || (videoIns[0]?.deviceId ?? ''));
      setAudioOutputId(saved.audioOutputId || (audioOuts[0]?.deviceId ?? ''));
    });
  }, []);

  useEffect(() => {
    if (camOn) {
      navigator.mediaDevices.getUserMedia({ 
        video: videoInputId ? { deviceId: { exact: videoInputId } } : true,
      }).then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      }).catch(e => {
        console.error(e);
        setCamOn(false);
      });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [camOn, videoInputId]);

  const handleJoin = () => {
    // Save preferences
    localStorage.setItem('metaverse_device_preferences', JSON.stringify({
      audioInputId,
      videoInputId,
      audioOutputId
    }));
    
    // Stop local preview stream to release camera for Mediasoup
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    
    onJoin(micOn, camOn, { audioInputId, videoInputId, audioOutputId });
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white font-sans p-6 z-[100] overflow-y-auto">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center my-auto py-10">
        {/* Left Side: Preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-full aspect-video bg-slate-800 rounded-xl overflow-hidden relative shadow-2xl border border-slate-700">
            {camOn ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <VideoOff size={48} className="mb-4 opacity-50" />
                <p>Camera is off</p>
              </div>
            )}
            
            {/* Controls Overlay */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button 
                onClick={() => setMicOn(!micOn)}
                className={`p-4 rounded-full transition-all ${micOn ? 'bg-slate-700/80 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {micOn ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              <button 
                onClick={() => setCamOn(!camOn)}
                className={`p-4 rounded-full transition-all ${camOn ? 'bg-slate-700/80 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {camOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
            </div>
          </div>
          
          <div className="w-full grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs text-slate-400 mb-1">Microphone</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                  value={audioInputId}
                  onChange={e => setAudioInputId(e.target.value)}
                >
                  {devices.filter(d => d.kind === 'audioinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0,5)}`}</option>
                  ))}
                </select>
             </div>
             <div>
                <label className="block text-xs text-slate-400 mb-1">Camera</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                  value={videoInputId}
                  onChange={e => setVideoInputId(e.target.value)}
                >
                  {devices.filter(d => d.kind === 'videoinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}`}</option>
                  ))}
                </select>
             </div>
          </div>
        </div>

        {/* Right Side: Join Info */}
        <div className="flex flex-col gap-6 p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Ready to join?</h1>
            <p className="text-slate-400">You're entering <span className="font-semibold text-slate-200">{spaceName}</span></p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
             {avatarUrl ? (
               <img src={`/${avatarUrl}`} className="w-12 h-12 object-cover rounded-full" alt="avatar" />
             ) : (
               <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold">
                 {username?.[0]?.toUpperCase() || 'U'}
               </div>
             )}
             <div>
               <p className="text-sm text-slate-400">Joining as</p>
               <p className="font-semibold text-lg">{username}</p>
             </div>
          </div>

          <button 
            onClick={handleJoin}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] text-lg"
          >
            Join Office
          </button>
        </div>
      </div>
    </div>
  );
}
