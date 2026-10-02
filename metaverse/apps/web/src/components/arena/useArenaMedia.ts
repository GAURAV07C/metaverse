import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { MediasoupClient } from '../../utils/mediasoupClient';
import { readDevicePreferences } from './arenaStorage';
import type { ArenaToast } from './useArenaToasts';

type PushToast = (toast: Omit<ArenaToast, 'id'> & { category?: 'joins' | 'chat' | 'roomInvites' | 'system' }) => void;

interface UseArenaMediaInput {
  msRef: React.MutableRefObject<MediasoupClient | null>;
  mediaReady: boolean;
  setMediaReady: (ready: boolean) => void;
  myUserId?: string | null;
  pushToast: PushToast;
}

export function useArenaMedia({
  msRef,
  mediaReady,
  setMediaReady,
  myUserId,
  pushToast,
}: UseArenaMediaInput) {
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const stoppingScreenShareRef = useRef(false);

  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [screenStreams, setScreenStreams] = useState<Record<string, MediaStream>>({});
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pendingInitialMedia, setPendingInitialMedia] = useState<{ mic: boolean; cam: boolean } | null>(null);

  const replaceLocalMediaTrack = useCallback(async (kind: 'audio' | 'video', deviceId?: string) => {
    if (!msRef.current) throw new Error('Media server is not ready');

    const type = kind === 'audio' ? 'audio' : 'camera';
    const constraints: MediaStreamConstraints = kind === 'audio'
      ? { audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
      : { video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 640, max: 960 }, height: { ideal: 360, max: 540 }, frameRate: { ideal: 20, max: 24 } } };

    const stream = await Promise.race([
      navigator.mediaDevices.getUserMedia(constraints),
      new Promise<MediaStream>((_, reject) => window.setTimeout(() => reject(new Error(`${kind} permission timed out`)), 15000)),
    ]);
    const track = kind === 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
    if (!track) throw new Error(`${kind} track unavailable`);

    const localStream = localStreamRef.current || new MediaStream();
    const existingTracks = kind === 'audio' ? localStream.getAudioTracks() : localStream.getVideoTracks();
    await msRef.current.replaceProducerTrack(type, track, myUserId || 'me', { type });

    existingTracks.forEach(existing => {
      existing.onended = null;
      localStream.removeTrack(existing);
      existing.stop();
    });

    localStream.addTrack(track);
    localStreamRef.current = localStream;
    setStreams(prev => ({ ...prev, me: localStream }));

    track.onended = () => {
      localStream.removeTrack(track);
      if (kind === 'audio') {
        void msRef.current?.stopProduce('audio');
        setMicOn(false);
      } else {
        void msRef.current?.stopProduce('camera');
        setCamOn(false);
      }
      setStreams(prev => ({ ...prev, me: localStream }));
    };
  }, [msRef, myUserId]);

  const stopMicrophone = useCallback(async () => {
    await msRef.current?.stopProduce('audio');
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.onended = null;
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });
      setStreams(prev => ({ ...prev, me: localStreamRef.current! }));
    }
    setMicOn(false);
  }, [msRef]);

  const startMicrophone = useCallback(async () => {
    if (!msRef.current || !mediaReady) {
      pushToast({ title: 'Media is still connecting', detail: 'Try microphone again in a moment.', kind: 'warning', category: 'system' });
      return;
    }
    try {
      const { audioInputId } = readDevicePreferences();
      await replaceLocalMediaTrack('audio', audioInputId);
      setMicOn(true);
    } catch (error) {
      console.error('Microphone failed', error);
      await stopMicrophone();
      pushToast({ title: 'Microphone unavailable', detail: 'Check browser permission and selected input device.', kind: 'warning', category: 'system' });
    }
  }, [mediaReady, pushToast, replaceLocalMediaTrack, stopMicrophone, msRef]);

  const stopCamera = useCallback(async () => {
    await msRef.current?.stopProduce('camera');
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.onended = null;
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });
      setStreams(prev => ({ ...prev, me: localStreamRef.current! }));
    }
    setCamOn(false);
  }, [msRef]);

  const startCamera = useCallback(async () => {
    if (!msRef.current || !mediaReady) {
      pushToast({ title: 'Media is still connecting', detail: 'Try camera again in a moment.', kind: 'warning', category: 'system' });
      return;
    }
    try {
      const { videoInputId } = readDevicePreferences();
      await replaceLocalMediaTrack('video', videoInputId);
      setCamOn(true);
    } catch (error) {
      console.error('Camera failed', error);
      await stopCamera();
      pushToast({ title: 'Camera unavailable', detail: 'Check browser permission and selected camera.', kind: 'warning', category: 'system' });
    }
  }, [mediaReady, pushToast, replaceLocalMediaTrack, stopCamera, msRef]);

  const stopScreenShare = useCallback(async () => {
    if (stoppingScreenShareRef.current) return false;
    stoppingScreenShareRef.current = true;
    await msRef.current?.stopProduce('screen');
    await msRef.current?.stopProduce('screen-audio');
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    setScreenStreams(prev => {
      const next = { ...prev };
      delete next.me;
      return next;
    });
    setIsScreenSharing(false);
    window.setTimeout(() => {
      stoppingScreenShareRef.current = false;
    }, 0);
    return true;
  }, [msRef]);

  const handleScreenShare = useCallback(async () => {
    if (!msRef.current || !mediaReady) {
      pushToast({ title: 'Media is still connecting', detail: 'Try screen share again in a moment.', kind: 'warning', category: 'system' });
      return;
    }

    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (!videoTrack) return;

      await msRef.current.produce(videoTrack, myUserId || 'me', { type: 'screen' });
      if (audioTrack) {
        try {
          await msRef.current.produce(audioTrack, myUserId || 'me', { type: 'screen-audio', source: 'screen' });
        } catch (audioError) {
          console.warn('Screen audio share failed; continuing with screen video only', audioError);
          audioTrack.stop();
          stream.removeTrack(audioTrack);
        }
      }

      stream.getTracks().forEach(track => {
        track.onended = async () => {
          await stopScreenShare();
        };
      });
      screenStreamRef.current = stream;
      setScreenStreams(prev => ({ ...prev, me: stream }));
      setIsScreenSharing(true);
    } catch (error) {
      console.error('Screen share failed', error);
      setIsScreenSharing(false);
    }
  }, [isScreenSharing, mediaReady, msRef, myUserId, pushToast, stopScreenShare]);

  const handleMicChange = useCallback((value: boolean) => {
    if (value) void startMicrophone();
    else void stopMicrophone();
  }, [startMicrophone, stopMicrophone]);

  const handleCamChange = useCallback((value: boolean) => {
    if (value) void startCamera();
    else void stopCamera();
  }, [startCamera, stopCamera]);

  const handleDevicePreferenceChange = useCallback(async (key: 'audioInputId' | 'videoInputId' | 'audioOutputId', value: string) => {
    if (key === 'audioInputId' && micOn) {
      await replaceLocalMediaTrack('audio', value || undefined);
      return;
    }
    if (key === 'videoInputId' && camOn) {
      await replaceLocalMediaTrack('video', value || undefined);
    }
  }, [camOn, micOn, replaceLocalMediaTrack]);

  useEffect(() => {
    if (!mediaReady || !pendingInitialMedia) return;
    const requested = pendingInitialMedia;
    setPendingInitialMedia(null);
    if (requested.mic) void startMicrophone();
    if (requested.cam) void startCamera();
  }, [mediaReady, pendingInitialMedia, startCamera, startMicrophone]);

  const cleanupMedia = useCallback(() => {
    setMediaReady(false);
    localStreamRef.current?.getTracks().forEach(track => {
      track.onended = null;
      track.stop();
    });
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    setMicOn(false);
    setCamOn(false);
    setIsScreenSharing(false);
    setStreams({});
    setScreenStreams({});
  }, [setMediaReady]);

  return {
    streams,
    setStreams,
    screenStreams,
    setScreenStreams,
    micOn,
    camOn,
    isScreenSharing,
    pendingInitialMedia,
    setPendingInitialMedia,
    handleMicChange,
    handleCamChange,
    handleScreenShare,
    handleDevicePreferenceChange,
    stopMicrophone,
    stopCamera,
    stopScreenShare,
    cleanupMedia,
  };
}
