import { Bell, Crosshair, DoorOpen, Footprints, MessageSquare, X } from 'lucide-react';
import { CanvasAvatarPreview } from '../CanvasAvatarPreview';
import type { OtherUser } from './types';

interface SelectedUserCardProps {
  user: OtherUser | null;
  roomName?: string | null;
  currentRoomAvailable: boolean;
  followingUserId: string | null;
  onClose: () => void;
  onMessage: (username: string) => void;
  onFollow: (userId: string) => void;
  onLocate: (x: number, y: number) => void;
  onInviteRoom: (user: OtherUser) => void;
  onRing: (user: OtherUser) => void;
}

export function SelectedUserCard({
  user,
  roomName,
  currentRoomAvailable,
  followingUserId,
  onClose,
  onMessage,
  onFollow,
  onLocate,
  onInviteRoom,
  onRing,
}: SelectedUserCardProps) {
  if (!user) return null;

  return (
    <aside className="map-user-card" aria-label={`${user.username} profile`}>
      <button className="map-user-close" onClick={onClose} title="Close profile" aria-label="Close profile">
        <X size={15} />
      </button>
      <div className="map-user-avatar">
        {user.avatarUrl?.startsWith('class:')
          ? <CanvasAvatarPreview imageUrl={user.avatarUrl} name={user.username} size={42} />
          : user.avatarUrl
            ? <img src={user.avatarUrl} alt="" />
            : user.username.charAt(0).toUpperCase()}
        <span className={`presence-dot ${user.status || 'available'}`} />
      </div>
      <div className="map-user-info">
        <strong>{user.username}</strong>
        <span>{user.status || 'available'} · {roomName ? `In ${roomName}` : `(${user.x}, ${user.y})`}</span>
      </div>
      <div className="map-user-actions">
        <button onClick={() => onMessage(user.username)}><MessageSquare size={15} />Message</button>
        <button onClick={() => onFollow(user.userId)}><Footprints size={15} />{followingUserId === user.userId ? 'Unfollow' : 'Follow'}</button>
        <button onClick={() => onLocate(user.x, user.y)}><Crosshair size={15} />Locate</button>
        <button disabled={!currentRoomAvailable} onClick={() => onInviteRoom(user)}><DoorOpen size={15} />Invite room</button>
        <button onClick={() => onRing(user)}><Bell size={15} />Ring</button>
      </div>
    </aside>
  );
}
