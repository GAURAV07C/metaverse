import { MicOff, VideoOff } from 'lucide-react';
import { AvatarView } from './AvatarView';
import { StreamPlayer } from './StreamPlayer';
import type { FullScreenTile, MediaParticipant } from './mediaTypes';

interface ProximityVideoStripProps {
  participants: MediaParticipant[];
  currentZone?: { id: string; name?: string } | null;
  micOn: boolean;
  camOn: boolean;
  onOpenTile: (tile: FullScreenTile) => void;
}

export function ProximityVideoStrip({
  participants,
  currentZone,
  micOn,
  camOn,
  onOpenTile,
}: ProximityVideoStripProps) {
  return (
    <div className="proximity-videos-container">
      {participants.map(participant => (
        <button
          key={participant.id}
          className={`video-bubble ${participant.isMe ? 'me' : 'animate-float-in'} ${currentZone ? 'in-private-zone' : ''}`}
          onClick={() => onOpenTile(participant)}
        >
          <StreamPlayer
            stream={participant.stream}
            muted={participant.id === 'me'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: participant.id === 'me' ? 'scaleX(-1)' : undefined,
            }}
            fallback={<AvatarView avatarUrl={participant.avatarUrl} name={participant.name} />}
          />
          <span className="vid-label">{participant.name}</span>
          {participant.id === 'me' && (
            <div className="vid-status-icons">
              {!micOn && <div className="vid-status-icon"><MicOff size={10} /></div>}
              {!camOn && <div className="vid-status-icon"><VideoOff size={10} /></div>}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
