import React, { useEffect, useMemo, useState } from 'react';
import type { ModerationHistoryItem, OtherUser } from '../Arena';
import { FullScreenMediaModal } from './FullScreenMediaModal';
import { MeetingOverlay } from './MeetingOverlay';
import { ProximityVideoStrip } from './ProximityVideoStrip';
import { RoomMediaBanner } from './RoomMediaBanner';
import { ScreenShareStrip } from './ScreenShareStrip';
import type { FullScreenTile, MediaParticipant, ScreenShareTile } from './mediaTypes';

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

const SPEAKING_THRESHOLD = 0.035;
const AUDIO_POLL_MS = 450;

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
  moderationHistory = [],
}) => {
  const [fullScreenTile, setFullScreenTile] = useState<FullScreenTile | null>(null);
  const [meetingLayout, setMeetingLayout] = useState<'speaker' | 'grid'>('speaker');
  const [handRaised, setHandRaised] = useState(false);
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);

  const connectedUsers = useMemo(() => proximityUsers
    .map(uid => otherUsers.find(user => user.userId === uid))
    .filter((user): user is OtherUser => Boolean(user)), [otherUsers, proximityUsers]);

  const hasGroup = connectedUsers.length > 0;
  const showMeTile = viewMode === 'grid' || camOn || Boolean(streams.me) || hasGroup;

  const participants = useMemo<MediaParticipant[]>(() => [
    ...(showMeTile ? [{
      id: 'me',
      name: myStoredUsername || 'You',
      stream: streams.me,
      avatarUrl: myAvatarUrl,
      isMe: true,
    }] : []),
    ...connectedUsers.map(user => ({
      id: user.userId,
      name: user.username || 'User',
      stream: streams[user.userId],
      avatarUrl: user.avatarUrl,
      isMe: false,
    })),
  ], [connectedUsers, myAvatarUrl, myStoredUsername, showMeTile, streams]);

  const screenShares = useMemo<ScreenShareTile[]>(() => Object.entries(screenStreams).map(([id, stream]) => ({
    id,
    name: id === 'me' ? 'Your screen' : `${otherUsers.find(user => user.userId === id)?.username || 'Someone'}'s screen`,
    stream,
  })), [otherUsers, screenStreams]);

  const primaryScreen = screenShares[0];
  const activeRemoteSpeakerId = activeSpeakerId && activeSpeakerId !== 'me' ? activeSpeakerId : null;
  const activeRemoteScreenId = primaryScreen?.id && primaryScreen.id !== 'me' ? primaryScreen.id : null;
  const showVideoStrip = viewMode !== 'grid' && participants.length > 0;
  const prioritizedParticipants = useMemo(() => {
    const priorityOf = (participant: MediaParticipant) => {
      if (participant.id === pinnedParticipantId) return 0;
      if (participant.id === activeSpeakerId) return 1;
      if (participant.stream) return 2;
      if (participant.isMe) return 3;
      return 4;
    };
    return [...participants].sort((a, b) => priorityOf(a) - priorityOf(b));
  }, [activeSpeakerId, participants, pinnedParticipantId]);

  useEffect(() => {
    if (!fullScreenTile) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullScreenTile(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullScreenTile]);

  useEffect(() => {
    if (pinnedParticipantId && !participants.some(participant => participant.id === pinnedParticipantId)) {
      setPinnedParticipantId(null);
    }
  }, [participants, pinnedParticipantId]);

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
      if (loudest.level > SPEAKING_THRESHOLD) setActiveSpeakerId(loudest.id);
    }, AUDIO_POLL_MS);

    return () => {
      window.clearInterval(interval);
      context.close().catch(() => {});
    };
  }, [participants]);

  return (
    <>
      {viewMode === 'grid' && (
        <MeetingOverlay
          roomName={currentZone?.name}
          participants={participants}
          prioritizedParticipants={prioritizedParticipants}
          connectedCount={connectedUsers.length}
          screenShares={screenShares}
          meetingLayout={meetingLayout}
          handRaised={handRaised}
          hostMenuOpen={hostMenuOpen}
          canHost={canHost}
          micOn={micOn}
          camOn={camOn}
          isScreenSharing={isScreenSharing}
          activeSpeakerId={activeSpeakerId}
          activeRemoteSpeakerId={activeRemoteSpeakerId}
          activeRemoteScreenId={activeRemoteScreenId}
          pinnedParticipantId={pinnedParticipantId}
          audioLevels={audioLevels}
          moderationHistory={moderationHistory}
          onLayoutChange={setMeetingLayout}
          onToggleHand={() => setHandRaised(prev => !prev)}
          onToggleHostMenu={() => setHostMenuOpen(prev => !prev)}
          onPinParticipant={participantId => {
            setPinnedParticipantId(participantId);
            setHostMenuOpen(false);
          }}
          onOpenTile={setFullScreenTile}
          onBackToMap={() => onViewModeChange?.('map')}
          onLeaveZone={currentZone ? onLeaveZone : undefined}
          onMuteSelf={onMuteSelf}
          onStopScreenShare={onStopScreenShare}
          onModerationAction={onModerationAction}
          onModerationAll={onModerationAll}
        />
      )}

      {currentZone && viewMode === 'map' && (
        <RoomMediaBanner
          roomName={currentZone.name}
          participantCount={connectedUsers.length + 1}
          onLeave={onLeaveZone}
        />
      )}

      {showVideoStrip && (
        <ProximityVideoStrip
          participants={prioritizedParticipants}
          currentZone={currentZone}
          micOn={micOn}
          camOn={camOn}
          onOpenTile={setFullScreenTile}
        />
      )}

      {viewMode !== 'grid' && (
        <ScreenShareStrip screenShares={screenShares} onOpenTile={setFullScreenTile} />
      )}

      {fullScreenTile && (
        <FullScreenMediaModal tile={fullScreenTile} onClose={() => setFullScreenTile(null)} />
      )}
    </>
  );
};
