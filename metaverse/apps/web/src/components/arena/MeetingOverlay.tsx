import { Grid2X2, Hand, Map as MapIcon, Maximize2, MicOff, Monitor, Pin, Shield, VideoOff, LogOut, Rows3, X } from 'lucide-react';
import type { ModerationHistoryItem } from '../Arena';
import { ParticipantTileContent } from './ParticipantTileContent';
import { StreamPlayer } from './StreamPlayer';
import type { FullScreenTile, MediaParticipant, ScreenShareTile } from './mediaTypes';

interface MeetingOverlayProps {
  roomName?: string;
  participants: MediaParticipant[];
  connectedCount: number;
  screenShares: ScreenShareTile[];
  meetingLayout: 'speaker' | 'grid';
  handRaised: boolean;
  hostMenuOpen: boolean;
  canHost: boolean;
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
  activeSpeakerId: string | null;
  activeRemoteSpeakerId: string | null;
  activeRemoteScreenId: string | null;
  pinnedParticipantId: string | null;
  audioLevels: Record<string, number>;
  moderationHistory: ModerationHistoryItem[];
  onLayoutChange: (layout: 'speaker' | 'grid') => void;
  onToggleHand: () => void;
  onToggleHostMenu: () => void;
  onPinParticipant: (participantId: string | null) => void;
  onOpenTile: (tile: FullScreenTile) => void;
  onBackToMap?: () => void;
  onLeaveZone?: () => void;
  onMuteSelf?: () => void;
  onStopScreenShare?: () => void;
  onModerationAction?: (targetUserId: string, action: 'mute-audio' | 'stop-video' | 'stop-screen') => void;
  onModerationAll?: (action: 'mute-audio' | 'stop-video' | 'stop-screen') => void;
}

export function MeetingOverlay({
  roomName,
  participants,
  connectedCount,
  screenShares,
  meetingLayout,
  handRaised,
  hostMenuOpen,
  canHost,
  micOn,
  camOn,
  isScreenSharing,
  activeSpeakerId,
  activeRemoteSpeakerId,
  activeRemoteScreenId,
  pinnedParticipantId,
  audioLevels,
  moderationHistory,
  onLayoutChange,
  onToggleHand,
  onToggleHostMenu,
  onPinParticipant,
  onOpenTile,
  onBackToMap,
  onLeaveZone,
  onMuteSelf,
  onStopScreenShare,
  onModerationAction,
  onModerationAll,
}: MeetingOverlayProps) {
  const primaryScreen = screenShares[0];
  const speakerParticipant =
    participants.find(participant => participant.id === pinnedParticipantId) ||
    participants.find(participant => participant.id === activeSpeakerId) ||
    participants.find(participant => participant.id !== 'me' && participant.stream) ||
    participants[0];

  const renderParticipant = (participant: MediaParticipant, large = false) => (
    <ParticipantTileContent
      participant={participant}
      activeSpeakerId={activeSpeakerId}
      audioLevel={audioLevels[participant.id]}
      micOn={micOn}
      camOn={camOn}
      large={large}
    />
  );

  return (
    <div className="meeting-mode-overlay">
      <div className="meeting-mode-topbar">
        <div>
          <strong>{roomName || 'Meeting'}</strong>
          <span>{connectedCount + 1} participants</span>
        </div>
        <div className="meeting-topbar-actions">
          <button className={meetingLayout === 'speaker' ? 'active' : ''} onClick={() => onLayoutChange('speaker')} title="Speaker layout">
            <Rows3 size={16} /> Speaker
          </button>
          <button className={meetingLayout === 'grid' ? 'active' : ''} onClick={() => onLayoutChange('grid')} title="Grid layout">
            <Grid2X2 size={16} /> Grid
          </button>
          <button className={handRaised ? 'active raised' : ''} onClick={onToggleHand} title={handRaised ? 'Lower hand' : 'Raise hand'}>
            <Hand size={16} /> {handRaised ? 'Raised' : 'Raise'}
          </button>
          {canHost && (
            <div className="meeting-host-control">
              <button className={hostMenuOpen ? 'active' : ''} onClick={onToggleHostMenu} title="Host controls">
                <Shield size={16} /> Host
              </button>
              {hostMenuOpen && (
                <div className="meeting-host-menu">
                  <button disabled={!activeSpeakerId} onClick={() => { onPinParticipant(activeSpeakerId); onToggleHostMenu(); }}>
                    <Pin size={14} /> Spotlight active speaker
                  </button>
                  <button disabled={!pinnedParticipantId} onClick={() => onPinParticipant(null)}>
                    <X size={14} /> Clear spotlight
                  </button>
                  <button disabled={!micOn} onClick={() => { onMuteSelf?.(); onToggleHostMenu(); }}>
                    <MicOff size={14} /> Mute myself
                  </button>
                  <button disabled={!isScreenSharing} onClick={() => { onStopScreenShare?.(); onToggleHostMenu(); }}>
                    <Monitor size={14} /> Stop presenting
                  </button>
                  <button disabled={!activeRemoteSpeakerId} onClick={() => { if (activeRemoteSpeakerId) onModerationAction?.(activeRemoteSpeakerId, 'mute-audio'); onToggleHostMenu(); }}>
                    <MicOff size={14} /> Mute active speaker
                  </button>
                  <button disabled={connectedCount === 0} onClick={() => { onModerationAll?.('mute-audio'); onToggleHostMenu(); }}>
                    <MicOff size={14} /> Mute all remote
                  </button>
                  <button disabled={!activeRemoteSpeakerId} onClick={() => { if (activeRemoteSpeakerId) onModerationAction?.(activeRemoteSpeakerId, 'stop-video'); onToggleHostMenu(); }}>
                    <VideoOff size={14} /> Stop active camera
                  </button>
                  <button disabled={!activeRemoteScreenId} onClick={() => { if (activeRemoteScreenId) onModerationAction?.(activeRemoteScreenId, 'stop-screen'); onToggleHostMenu(); }}>
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
        <button onClick={onBackToMap} title="Back to map">
          <MapIcon size={16} /> Map
        </button>
        {onLeaveZone && (
          <button onClick={onLeaveZone} title="Leave room">
            <LogOut size={16} /> Leave
          </button>
        )}
      </div>

      <div className={`meeting-stage ${primaryScreen ? 'has-screen' : ''} layout-${meetingLayout}`}>
        {primaryScreen && meetingLayout === 'speaker' ? (
          <>
            <button className="meeting-primary-tile screen" onClick={() => onOpenTile({ ...primaryScreen, isScreen: true })}>
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
                <button
                  key={participant.id}
                  className={`meeting-participant-tile ${activeSpeakerId === participant.id ? 'active-speaker' : ''} ${pinnedParticipantId === participant.id ? 'pinned' : ''}`}
                  onClick={() => onOpenTile(participant)}
                >
                  {renderParticipant(participant)}
                  {handRaised && participant.id === 'me' && <span className="raised-hand-badge"><Hand size={12} />Raised</span>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="meeting-grid">
            {(primaryScreen ? screenShares : []).map(screen => (
              <button key={screen.id} className="meeting-participant-tile screen" onClick={() => onOpenTile({ ...screen, isScreen: true })}>
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
              <button
                key={participant.id}
                className={`meeting-participant-tile ${speakerParticipant?.id === participant.id && !primaryScreen ? 'speaker' : ''} ${activeSpeakerId === participant.id ? 'active-speaker' : ''} ${pinnedParticipantId === participant.id ? 'pinned' : ''}`}
                onClick={() => onOpenTile(participant)}
              >
                {renderParticipant(participant, speakerParticipant?.id === participant.id && !primaryScreen)}
                {handRaised && participant.id === 'me' && <span className="raised-hand-badge"><Hand size={12} />Raised</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
