import { Hammer, LogOut, Map as MapIcon, MessageSquare, MoreVertical, Search, Settings, CircleDot } from 'lucide-react';

interface SpaceRailProps {
  spaceName: string;
  showUsers: boolean;
  activeTab: 'users' | 'chat';
  canEditSpace: boolean;
  unreadChatCount: number;
  onOpenOfficeMenu: () => void;
  onSearchPeople: () => void;
  onToggleSidebar: (tab: 'users' | 'chat') => void;
  onEditOffice: () => void;
  onLeaveSpace: () => void;
  onOpenSettings: () => void;
}

export function SpaceRail({
  spaceName,
  showUsers,
  activeTab,
  canEditSpace,
  unreadChatCount,
  onOpenOfficeMenu,
  onSearchPeople,
  onToggleSidebar,
  onEditOffice,
  onLeaveSpace,
  onOpenSettings,
}: SpaceRailProps) {
  return (
    <nav className="space-rail" aria-label="Office navigation">
      <button className="rail-brand" title={spaceName} aria-label="Office menu" onClick={onOpenOfficeMenu}><CircleDot size={25} /></button>
      <button className="rail-button" title="Search people" aria-label="Search people" onClick={onSearchPeople}><Search size={23} /></button>
      <span className="rail-divider" />
      <button className={`rail-button ${showUsers && activeTab === 'users' ? 'selected' : ''}`} title="People and map" aria-label="People and map" aria-expanded={showUsers && activeTab === 'users'} onClick={() => onToggleSidebar('users')}><MapIcon size={23} /></button>
      <button className="rail-button" title={canEditSpace ? 'Edit the office' : 'Only the owner can edit this office'} aria-label="Edit the office" disabled={!canEditSpace} onClick={onEditOffice}><Hammer size={21} /></button>
      <button className={`rail-button ${showUsers && activeTab === 'chat' ? 'selected' : ''}`} title="Chat" aria-label="Chat" aria-expanded={showUsers && activeTab === 'chat'} onClick={() => onToggleSidebar('chat')}><MessageSquare size={21} />{unreadChatCount > 0 && <span className="rail-badge">{Math.min(unreadChatCount, 9)}</span>}</button>
      <button className="rail-button" title="More" aria-label="More" onClick={onOpenOfficeMenu}><MoreVertical size={21} /></button>
      <div className="rail-bottom">
        <button className="rail-button rail-leave" title="Leave space" aria-label="Leave space" onClick={onLeaveSpace}><LogOut size={21} /></button>
        <button className="rail-button" title="Settings" aria-label="Settings" onClick={onOpenSettings}><Settings size={23} /></button>
      </div>
    </nav>
  );
}
