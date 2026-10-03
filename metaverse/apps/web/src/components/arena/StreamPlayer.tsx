import React, { useEffect, useRef, useState } from 'react';

interface StreamPlayerProps {
  stream?: MediaStream;
  muted?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
}

const hasLiveVideoTrack = (stream?: MediaStream) =>
  Boolean(stream?.getVideoTracks().some(track => track.readyState === 'live' && track.enabled));

export const StreamPlayer = React.memo(function StreamPlayer({
  stream,
  muted = false,
  className,
  style,
  fallback,
}: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasVideo, setHasVideo] = useState(() => hasLiveVideoTrack(stream));

  useEffect(() => {
    const updateVideoState = () => setHasVideo(hasLiveVideoTrack(stream));
    updateVideoState();
    if (!stream) return;

    const tracks = stream.getTracks();
    stream.addEventListener('addtrack', updateVideoState);
    stream.addEventListener('removetrack', updateVideoState);
    tracks.forEach(track => {
      track.addEventListener('ended', updateVideoState);
      track.addEventListener('mute', updateVideoState);
      track.addEventListener('unmute', updateVideoState);
    });

    return () => {
      stream.removeEventListener('addtrack', updateVideoState);
      stream.removeEventListener('removetrack', updateVideoState);
      tracks.forEach(track => {
        track.removeEventListener('ended', updateVideoState);
        track.removeEventListener('mute', updateVideoState);
        track.removeEventListener('unmute', updateVideoState);
      });
    };
  }, [stream]);

  useEffect(() => {
    const videoNode = videoRef.current;
    const audioNode = audioRef.current;

    if (videoNode && videoNode.srcObject !== stream) videoNode.srcObject = stream || null;
    if (audioNode && audioNode.srcObject !== stream) audioNode.srcObject = stream || null;

    return () => {
      if (videoNode && videoNode.srcObject === stream) videoNode.srcObject = null;
      if (audioNode && audioNode.srcObject === stream) audioNode.srcObject = null;
    };
  }, [stream, hasVideo]);

  if (!stream) return <>{fallback}</>;

  if (hasVideo) {
    return <video ref={videoRef} autoPlay playsInline muted={muted} className={className} style={style} />;
  }

  return (
    <>
      {!muted && <audio ref={audioRef} autoPlay playsInline />}
      {fallback}
    </>
  );
});
