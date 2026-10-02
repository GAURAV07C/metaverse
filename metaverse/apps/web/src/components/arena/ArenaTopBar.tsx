import { CalendarDays, Footprints, Hammer, Share2, Sparkles, Users, Wifi } from 'lucide-react';
import type { OtherUser } from './types';

interface ArenaTopBarProps {
  spaceName: string;
  connected: boolean;
  copied: boolean;
  canEditSpace: boolean;
  otherUsers: OtherUser[];
  followedUser?: OtherUser | null;
  currentMapZone?: { name?: string; type?: string } | null;
  onOpenOfficeMenu: () => void;
  onCopyInvite: () => void;
  onEditMap: () => void;
  onOpenUsers: () => void;
  onStopFollowing: () => void;
  onOpenMeetingMode: () => void;
}

export function ArenaTopBar({
  spaceName,
  connected,
  copied,
  canEditSpace,
  otherUsers,
  followedUser,
  currentMapZone,
  onOpenOfficeMenu,
  onCopyInvite,
  onEditMap,
  onOpenUsers,
  onStopFollowing,
  onOpenMeetingMode,
}: ArenaTopBarProps) {
  return (
    <>
      <section className="arena-top-left" aria-label="Space header">
        <button className="space-title-pill" onClick={onOpenOfficeMenu} title="Open space menu">
          <span className="space-title-logo"><Sparkles size={16} /></span>
          <span><b>{spaceName}</b><small>{connected ? 'Live office' : 'Connecting...'}</small></span>
        </button>
        <button className="arena-mini-action" onClick={onCopyInvite} title="Invite people">
          <Share2 size={16} />{copied ? 'Copied' : 'Invite'}
        </button>
        {canEditSpace && (
          <button className="arena-mini-action" onClick={onEditMap} title="Open Studio">
            <Hammer size={16} />Edit map
          </button>
        )}
      </section>

      <section className="arena-top-right" aria-label="Presence and events">
        <button className="arena-status-chip" onClick={onOpenUsers}>
          <Users size={16} />{otherUsers.length + 1} online
        </button>
        {followedUser && (
          <button className="arena-status-chip follow-chip" onClick={onStopFollowing} title={`Stop following ${followedUser.username}`}>
            <Footprints size={16} />Following {followedUser.username}
          </button>
        )}
        {currentMapZone && (
          <button className="arena-status-chip zone-chip" title={`Current zone: ${currentMapZone.name || currentMapZone.type}`}>
            <Sparkles size={16} />{currentMapZone.name || currentMapZone.type}
          </button>
        )}
        <button className="arena-status-chip" onClick={onOpenMeetingMode}>
          <CalendarDays size={16} />Meeting mode
        </button>
        <button className={`arena-status-chip ${connected ? 'online' : ''}`}>
          <Wifi size={16} />{connected ? 'Connected' : 'Reconnecting'}
        </button>
      </section>
    </>
  );
}
