import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Grid2X2, Hand, Map as MapIcon, Maximize2, MicOff, Monitor, Pin, Shield, VideoOff, Lock, LogOut, Rows3, X } from 'lucide-react';
import type { ModerationHistoryItem, OtherUser } from '../Arena';
import { CanvasAvatarPreview } from '../CanvasAvatarPreview';

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
  onViewModeChange?: (mode: 'map' | 'grid') => void;
  canHost?: boolean;
  isScreenSharing?: boolean;
  onMuteSelf?: () => void;
  onStopScreenShare?: () => void;
  onModerationAction?: (targetUserId: string, action: 'mute-audio' | 'stop-video' | 'stop-screen') => void;
  onModerationAll?: (action: 'mute-audio' | 'stop-video' | 'stop-screen') => void;
  moderationHistory?: ModerationHistoryItem[];
}

const hasLiveVideoTrack = (stream?: MediaStream) =>
  Boolean(stream?.getVideoTracks().some(track => track.readyState === 'live' && track.enabled));

const StreamPlayer: React.FC<{
  stream?: MediaStream;
  muted?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
}> = React.memo(({ stream, muted = false, className, style, fallback }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasVideo, setHasVideo] = useState(() => hasLiveVideoTrack(stream));

  useEffect(() => {
    const updateVideoState = () => setHasVideo(hasLiveVideoTrack(stream));
    updateVideoState();
    if (!stream) return;

    const tracks = stream.getTracks();
    tracks.forEach(track => {
      track.addEventListener('ended', updateVideoState);
      track.addEventListener('mute', updateVideoState);
      track.addEventListener('unmute', updateVideoState);
    });
    return () => {
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
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={className}
        style={style}
      />
    );
  }

  return (
    <>
      {!muted && <audio ref={audioRef} autoPlay playsInline />}
      {fallback}
    </>
  );
});

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
  onLeaveZone,
  onViewModeChange,
  canHost = false,
  isScreenSharing = false,
  onMuteSelf,
  onStopScreenShare,
  onModerationAction,
  onModerationAll,
  moderationHistory = []
}) => {
  const [fullScreenTile, setFullScreenTile] = useState<{ id: string; name: string; stream?: MediaStream; avatarUrl?: string; isScreen?: boolean } | null>(null);
  const [meetingLayout, setMeetingLayout] = useState<'speaker' | 'grid'>('speaker');
  const [handRaised, setHandRaised] = useState(false);
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);

  useEffect(() => {
    if (!fullScreenTile) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullScreenTile(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullScreenTile]);

  const renderAvatar = (avatarUrl: string | undefined, name: string) => {
    if (!avatarUrl) return <div className="vid-placeholder">🧑</div>;
    if (avatarUrl.startsWith('class:')) {
      return <div className="vid-placeholder vid-placeholder-canvas"><CanvasAvatarPreview imageUrl={avatarUrl} name={name} size={48} /></div>;
    }
    return <img src={avatarUrl} alt="" className="vid-placeholder-img" />;
  };

  const connectedUsers = useMemo(() => proximityUsers
    .map(uid => otherUsers.find(u => u.userId === uid))
    .filter((user): user is OtherUser => Boolean(user)), [otherUsers, proximityUsers]);
  const hasGroup = connectedUsers.length > 0;
  const showMeTile = viewMode === 'grid' || camOn || Boolean(streams['me']) || hasGroup;
  const showVideoStrip = viewMode !== 'grid' && (showMeTile || connectedUsers.length > 0);
  const participants = useMemo(() => [
    ...(showMeTile ? [{ id: 'me', name: myStoredUsername || 'You', stream: streams.me, avatarUrl: myAvatarUrl, isMe: true }] : []),
    ...connectedUsers.map(user => ({ id: user.userId, name: user.username || 'User', stream: streams[user.userId], avatarUrl: user.avatarUrl, isMe: false })),
  ], [connectedUsers, myAvatarUrl, myStoredUsername, showMeTile, streams]);
  const screenShares = Object.entries(screenStreams).map(([id, stream]) => ({
    id,
    name: id === 'me' ? 'Your screen' : `${otherUsers.find(user => user.userId === id)?.username || 'Someone'}'s screen`,
    stream,
  }));
  const primaryScreen = screenShares[0];
  const activeRemoteSpeakerId = activeSpeakerId && activeSpeakerId !== 'me' ? activeSpeakerId : null;
  const activeRemoteScreenId = primaryScreen?.id && primaryScreen.id !== 'me' ? primaryScreen.id : null;
  const speakerParticipant =
    participants.find(participant => participant.id === pinnedParticipantId) ||
    participants.find(participant => participant.id === activeSpeakerId) ||
    participants.find(participant => participant.id !== 'me' && participant.stream) ||
    participants[0];

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass || participants.length === 0) return;

    const context = new AudioContextClass();
    const analysers = participants
      .filter(participant => participant.stream?.getAudioTracks().length)
      .map(participant => {
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        const source = context.createMediaStreamSource(participant.stream!);
        source.connect(analyser);
        return { id: participant.id, analyser, data: new Uint8Array(analyser.fftSize) };
      });

    if (analysers.length === 0) {
      setAudioLevels({});
      setActiveSpeakerId(null);
      context.close().catch(() => {});
      return;
    }

    const interval = window.setInterval(() => {
      let loudest = { id: '', level: 0 };
      const nextLevels: Record<string, number> = {};

      analysers.forEach(item => {
        item.analyser.getByteTimeDomainData(item.data);
        let sum = 0;
        for (let i = 0; i < item.data.length; i += 1) {
          const centered = item.data[i] - 128;
          sum += centered * centered;
        }
        const level = Math.sqrt(sum / item.data.length) / 128;
        nextLevels[item.id] = level;
        if (level > loudest.level) loudest = { id: item.id, level };
      });

      setAudioLevels(nextLevels);
      if (loudest.level > 0.035) {
        setActiveSpeakerId(loudest.id);
      }
    }, 450);

    return () => {
      window.clearInterval(interval);
      context.close().catch(() => {});
    };
  }, [participants]);

  useEffect(() => {
    if (pinnedParticipantId && !participants.some(participant => participant.id === pinnedParticipantId)) {
      setPinnedParticipantId(null);
    }
  }, [participants, pinnedParticipantId]);

  const renderParticipantContent = (participant: { id: string; name: string; stream?: MediaStream; avatarUrl?: string; isMe?: boolean }, large = false) => (
    <>
      <StreamPlayer
        stream={participant.stream}
        muted={participant.id === 'me'}
        className={large ? 'meeting-video-large' : undefined}
        fallback={
        <div className={large ? 'meeting-avatar-large' : undefined}>
          {renderAvatar(participant.avatarUrl, participant.name)}
        </div>
        }
      />
      <span className="vid-label">{participant.name}</span>
      {activeSpeakerId === participant.id && (
        <span className="active-speaker-badge" style={{ '--speaker-level': Math.min(1, audioLevels[participant.id] * 9).toFixed(2) } as React.CSSProperties}>
          Speaking
        </span>
      )}
      {participant.id === 'me' && (
        <div className="vid-status-icons">
          {!micOn && <div className="vid-status-icon"><MicOff size={10} /></div>}
          {!camOn && <div className="vid-status-icon"><VideoOff size={10} /></div>}
        </div>
      )}
    </>
  );

  return (
    <>
      {viewMode === 'grid' && (
        <div className="meeting-mode-overlay">
          <div className="meeting-mode-topbar">
            <div>
              <strong>{currentZone?.name || 'Meeting'}</strong>
              <span>{connectedUsers.length + 1} participants</span>
            </div>
            <div className="meeting-topbar-actions">
              <button className={meetingLayout === 'speaker' ? 'active' : ''} onClick={() => setMeetingLayout('speaker')} title="Speaker layout">
                <Rows3 size={16} /> Speaker
              </button>
              <button className={meetingLayout === 'grid' ? 'active' : ''} onClick={() => setMeetingLayout('grid')} title="Grid layout">
                <Grid2X2 size={16} /> Grid
              </button>
              <button className={handRaised ? 'active raised' : ''} onClick={() => setHandRaised(prev => !prev)} title={handRaised ? 'Lower hand' : 'Raise hand'}>
                <Hand size={16} /> {handRaised ? 'Raised' : 'Raise'}
              </button>
              {canHost && (
                <div className="meeting-host-control">
                  <button className={hostMenuOpen ? 'active' : ''} onClick={() => setHostMenuOpen(prev => !prev)} title="Host controls">
                    <Shield size={16} /> Host
                  </button>
                  {hostMenuOpen && (
                    <div className="meeting-host-menu">
                      <button disabled={!activeSpeakerId} onClick={() => { setPinnedParticipantId(activeSpeakerId); setHostMenuOpen(false); }}>
                        <Pin size={14} /> Spotlight active speaker
                      </button>
                      <button disabled={!pinnedParticipantId} onClick={() => setPinnedParticipantId(null)}>
                        <X size={14} /> Clear spotlight
                      </button>
                      <button disabled={!micOn} onClick={() => { onMuteSelf?.(); setHostMenuOpen(false); }}>
                        <MicOff size={14} /> Mute myself
                      </button>
                      <button disabled={!isScreenSharing} onClick={() => { onStopScreenShare?.(); setHostMenuOpen(false); }}>
                        <Monitor size={14} /> Stop presenting
                      </button>
                      <button disabled={!activeRemoteSpeakerId} onClick={() => { if (activeRemoteSpeakerId) onModerationAction?.(activeRemoteSpeakerId, 'mute-audio'); setHostMenuOpen(false); }}>
                        <MicOff size={14} /> Mute active speaker
                      </button>
                      <button disabled={connectedUsers.length === 0} onClick={() => { onModerationAll?.('mute-audio'); setHostMenuOpen(false); }}>
                        <MicOff size={14} /> Mute all remote
                      </button>
                      <button disabled={!activeRemoteSpeakerId} onClick={() => { if (activeRemoteSpeakerId) onModerationAction?.(activeRemoteSpeakerId, 'stop-video'); setHostMenuOpen(false); }}>
                        <VideoOff size={14} /> Stop active camera
                      </button>
                      <button disabled={!activeRemoteScreenId} onClick={() => { if (activeRemoteScreenId) onModerationAction?.(activeRemoteScreenId, 'stop-screen'); setHostMenuOpen(false); }}>
                        <Monitor size={14} /> Stop active screen
                      </button>
                      <div className="meeting-host-history" aria-label="Recent host moderation actions">
                        <strong>Recent actions</strong>
                        {moderationHistory.length === 0 ? (
                          <span>No host actions yet</span>
                        ) : moderationHistory.slice(0, 3).map(item => (
                          <span key={item.id}>{item.targetUsername}: {item.status}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => onViewModeChange?.('map')} title="Back to map">
              <MapIcon size={16} /> Map
            </button>
            {currentZone && onLeaveZone && (
              <button onClick={onLeaveZone} title="Leave room">
                <LogOut size={16} /> Leave
              </button>
            )}
          </div>

          <div className={`meeting-stage ${primaryScreen ? 'has-screen' : ''} layout-${meetingLayout}`}>
            {primaryScreen && meetingLayout === 'speaker' ? (
              <>
                <button className="meeting-primary-tile screen" onClick={() => setFullScreenTile({ id: primaryScreen.id, name: primaryScreen.name, stream: primaryScreen.stream, isScreen: true })}>
                  <StreamPlayer
                    stream={primaryScreen.stream}
                    muted={primaryScreen.id === 'me'}
                    fallback={<div className="vid-placeholder"><Monitor size={24} /></div>}
                  />
                  <span><Monitor size={15} />{primaryScreen.name}</span>
                  <Maximize2 className="meeting-maximize" size={18} />
                </button>
                <div className="meeting-filmstrip">
                  {participants.map(participant => (
                    <button key={participant.id} className={`meeting-participant-tile ${activeSpeakerId === participant.id ? 'active-speaker' : ''} ${pinnedParticipantId === participant.id ? 'pinned' : ''}`} onClick={() => setFullScreenTile({ id: participant.id, name: participant.name, stream: participant.stream, avatarUrl: participant.avatarUrl })}>
                      {renderParticipantContent(participant)}
                      {handRaised && participant.id === 'me' && <span className="raised-hand-badge"><Hand size={12} />Raised</span>}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="meeting-grid">
                {(primaryScreen ? screenShares : []).map(screen => (
                  <button key={screen.id} className="meeting-participant-tile screen" onClick={() => setFullScreenTile({ id: screen.id, name: screen.name, stream: screen.stream, isScreen: true })}>
                    <StreamPlayer
                      stream={screen.stream}
                      muted={screen.id === 'me'}
                      fallback={<div className="vid-placeholder"><Monitor size={22} /></div>}
                    />
                    <span className="vid-label">{screen.name}</span>
                    <Maximize2 className="meeting-maximize" size={16} />
                  </button>
                ))}
                {participants.map(participant => (
                  <button key={participant.id} className={`meeting-participant-tile ${speakerParticipant?.id === participant.id && !primaryScreen ? 'speaker' : ''} ${activeSpeakerId === participant.id ? 'active-speaker' : ''} ${pinnedParticipantId === participant.id ? 'pinned' : ''}`} onClick={() => setFullScreenTile({ id: participant.id, name: participant.name, stream: participant.stream, avatarUrl: participant.avatarUrl })}>
                    {renderParticipantContent(participant, speakerParticipant?.id === participant.id && !primaryScreen)}
                    {handRaised && participant.id === 'me' && <span className="raised-hand-badge"><Hand size={12} />Raised</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Audio room active header banner ── */}
      {currentZone && viewMode === 'map' && (
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
              Room: <strong style={{ color: '#2dce89' }}>{currentZone.name || 'Meeting Area'}</strong>
            </span>
          </div>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
          <span style={{ color: '#a3e635', fontSize: '0.75rem' }}>
            {proximityUsers.length + 1} connected in audio/video group
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
      {showVideoStrip && (
      <div className="proximity-videos-container">
        {/* Me */}
        {showMeTile && <button className={`video-bubble me ${currentZone ? 'in-private-zone' : ''}`} onClick={() => setFullScreenTile({ id: 'me', name: myStoredUsername || 'You', stream: streams.me, avatarUrl: myAvatarUrl })} style={{
          border: currentZone ? '2px solid #2dce89' : undefined,
          boxShadow: currentZone ? '0 0 15px rgba(45, 206, 137, 0.5)' : undefined
        }}>
          <StreamPlayer
            stream={streams.me}
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            fallback={renderAvatar(myAvatarUrl, myStoredUsername || 'You')}
          />
          <span className="vid-label">{myStoredUsername || 'You'}</span>
          <div className="vid-status-icons">
            {!micOn && <div className="vid-status-icon"><MicOff size={10} /></div>}
            {!camOn && <div className="vid-status-icon"><VideoOff size={10} /></div>}
          </div>
        </button>}

        {/* Proximity Users */}
        {connectedUsers.map(userObj => {
          const name = userObj.username || 'User';
          const avatar = userObj.avatarUrl;
          const stream = streams[userObj.userId];

          return (
            <button key={userObj.userId} className="video-bubble animate-float-in" onClick={() => setFullScreenTile({ id: userObj.userId, name, stream, avatarUrl: avatar })} style={{
              border: currentZone ? '2px solid #2dce89' : undefined,
              boxShadow: currentZone ? '0 0 15px rgba(45, 206, 137, 0.5)' : undefined
            }}>
              <StreamPlayer
                stream={stream}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                fallback={renderAvatar(avatar, name)}
              />
              <span className="vid-label">{name}</span>
            </button>
          );
        })}
      </div>
      )}

      {/* ── Screen Shares Overlay ── */}
      {viewMode !== 'grid' && <div style={{ position: 'absolute', top: '180px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1rem', zIndex: 90, pointerEvents: 'none' }}>
        {Object.entries(screenStreams).map(([id, stream]) => (
          <button key={id} className="screen-share-tile" style={{ pointerEvents: 'auto' }} onClick={() => setFullScreenTile({ id, name: id === 'me' ? 'Your screen' : 'Screen share', stream, isScreen: true })}>
            <StreamPlayer
              stream={stream}
              muted={id === 'me'}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              fallback={<div className="vid-placeholder"><Monitor size={24} /></div>}
            />
          </button>
        ))}
      </div>}

      {fullScreenTile && (
        <div className="full-video-backdrop">
          <header>
            <strong>{fullScreenTile.name}</strong>
            <button onClick={() => setFullScreenTile(null)} title="Close full screen"><X size={20} /></button>
          </header>
          <main>
            <StreamPlayer
              stream={fullScreenTile.stream}
              muted={fullScreenTile.id === 'me'}
              className={fullScreenTile.isScreen ? 'screen' : ''}
              fallback={
              <div className="full-video-avatar">
                {renderAvatar(fullScreenTile.avatarUrl, fullScreenTile.name)}
                <span>{fullScreenTile.name}</span>
              </div>
              }
            />
          </main>
        </div>
      )}
    </>
  );
};
