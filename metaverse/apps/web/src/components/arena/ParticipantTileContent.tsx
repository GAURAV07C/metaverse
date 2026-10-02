import { MicOff, VideoOff } from 'lucide-react';
import type { CSSProperties } from 'react';
import { AvatarView } from './AvatarView';
import { StreamPlayer } from './StreamPlayer';
import type { MediaParticipant } from './mediaTypes';

interface ParticipantTileContentProps {
  participant: MediaParticipant;
  activeSpeakerId: string | null;
  audioLevel?: number;
  micOn: boolean;
  camOn: boolean;
  large?: boolean;
}

export function ParticipantTileContent({
  participant,
  activeSpeakerId,
  audioLevel = 0,
  micOn,
  camOn,
  large = false,
}: ParticipantTileContentProps) {
  return (
    <>
      <StreamPlayer
        stream={participant.stream}
        muted={participant.id === 'me'}
        className={large ? 'meeting-video-large' : undefined}
        fallback={
          <div className={large ? 'meeting-avatar-large' : undefined}>
            <AvatarView avatarUrl={participant.avatarUrl} name={participant.name} />
          </div>
        }
      />
      <span className="vid-label">{participant.name}</span>
      {activeSpeakerId === participant.id && (
        <span
          className="active-speaker-badge"
          style={{ '--speaker-level': Math.min(1, audioLevel * 9).toFixed(2) } as CSSProperties}
        >
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
}
