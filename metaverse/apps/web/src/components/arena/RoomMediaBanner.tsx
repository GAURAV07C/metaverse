import { Lock, LogOut } from 'lucide-react';

interface RoomMediaBannerProps {
  roomName?: string;
  participantCount: number;
  onLeave?: () => void;
}

export function RoomMediaBanner({ roomName, participantCount, onLeave }: RoomMediaBannerProps) {
  return (
    <div className="room-media-banner">
      <div className="room-media-title">
        <Lock size={14} />
        <span>Room: <strong>{roomName || 'Meeting Area'}</strong></span>
      </div>
      <span className="room-media-dot" />
      <span className="room-media-count">{participantCount} in room</span>
      {onLeave && (
        <button className="room-media-leave" onClick={onLeave}>
          <LogOut size={12} /> Leave
        </button>
      )}
    </div>
  );
}
