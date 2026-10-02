import type React from 'react';
import type { WsClient } from '../../utils/ws';
import type { ArenaToast } from './useArenaToasts';
import type { ChatScope, InviteHistoryItem, ModerationHistoryItem, OtherUser, RoomInvite } from './types';

type PushToast = (toast: Omit<ArenaToast, 'id'> & { category?: 'joins' | 'chat' | 'roomInvites' | 'system' }) => void;
type ModerationAction = 'mute-audio' | 'stop-video' | 'stop-screen';
type ChatMessage = { username: string; message: string; time: string; scope?: string };

interface UseArenaCommsInput {
  myStoredUsername?: string | null;
  canEditSpace: boolean;
  chatInput: string;
  chatScope: ChatScope;
  currentRoom: any;
  otherUsers: OtherUser[];
  proximityUsers: string[];
  wsRef: React.MutableRefObject<WsClient | null>;
  setActiveTab: (tab: 'users' | 'chat') => void;
  setShowUsers: (show: boolean) => void;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  setChatScope: React.Dispatch<React.SetStateAction<ChatScope>>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setRoomInvites: React.Dispatch<React.SetStateAction<RoomInvite[]>>;
  setUnreadChatCount: React.Dispatch<React.SetStateAction<number>>;
  setReactions: React.Dispatch<React.SetStateAction<Record<string, { emoji: string; expiresAt: number }>>>;
  pushToast: PushToast;
  buildRoomUrl: (roomId: string) => string;
  joinRoom: (roomId: string) => void;
  closeBuild: () => void;
  recordInviteHistory: (item: Omit<InviteHistoryItem, 'updatedAt'>) => void;
  recordModerationHistory: (item: Omit<ModerationHistoryItem, 'id' | 'createdAt'> & { id?: string }) => void;
}

export function useArenaComms({
  myStoredUsername,
  canEditSpace,
  chatInput,
  chatScope,
  currentRoom,
  otherUsers,
  proximityUsers,
  wsRef,
  setActiveTab,
  setShowUsers,
  setChatInput,
  setChatScope,
  setMessages,
  setRoomInvites,
  setUnreadChatCount,
  setReactions,
  pushToast,
  buildRoomUrl,
  joinRoom,
  closeBuild,
  recordInviteHistory,
  recordModerationHistory,
}: UseArenaCommsInput) {
  const handleSendChat = (e: React.FormEvent, requestedScope?: Exclude<ChatScope, 'invites'>) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const scope = requestedScope || (chatScope === 'invites' ? 'everyone' : chatScope);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetMatch = chatInput.match(/^@([^\s]+)\s+/);
    const targetUsername = scope === 'dm' ? targetMatch?.[1] : undefined;
    const targetUserId = targetUsername
      ? otherUsers.find(u => u.username.toLowerCase() === targetUsername.toLowerCase())?.userId
      : undefined;

    setMessages((prev) => [...prev, { username: myStoredUsername || 'You', message: chatInput, time, scope }]);
    wsRef.current?.sendChat(chatInput, { scope, targetUsername, targetUserId });
    setChatInput('');
  };

  const inviteUserToCurrentRoom = (user: OtherUser) => {
    if (!currentRoom) {
      pushToast({
        title: 'Join a room first',
        detail: 'Room invite is available after you enter a room.',
        kind: 'warning',
        category: 'system',
      });
      return;
    }

    const roomName = currentRoom.name || 'this room';
    wsRef.current?.sendRoomInvite(user.userId, { id: currentRoom.id, name: roomName, url: buildRoomUrl(currentRoom.id) });
    recordInviteHistory({
      id: `${currentRoom.id}-${user.userId}-${Date.now()}`,
      direction: 'outgoing',
      status: 'sent',
      toUsername: user.username,
      roomId: currentRoom.id,
      roomName,
      createdAt: Date.now(),
    });
    setUnreadChatCount(0);
    pushToast({
      title: 'Room invite sent',
      detail: `${user.username} can join ${roomName} from the invite toast.`,
      kind: 'success',
      category: 'roomInvites',
    });
  };

  const acceptRoomInvite = (invite: RoomInvite) => {
    setRoomInvites(prev => prev.filter(item => item.id !== invite.id));
    if (invite.fromUserId) {
      wsRef.current?.respondToRoomInvite({
        inviteId: invite.inviteId,
        targetUserId: invite.fromUserId,
        roomId: invite.roomId,
        roomName: invite.roomName,
        response: 'accepted',
      });
    }
    recordInviteHistory({
      id: invite.inviteId || invite.id,
      direction: 'incoming',
      status: 'accepted',
      fromUsername: invite.fromUsername,
      roomId: invite.roomId,
      roomName: invite.roomName,
      createdAt: Date.now(),
    });
    joinRoom(invite.roomId);
    pushToast({
      title: `Joining ${invite.roomName}`,
      detail: `Invite from ${invite.fromUsername} accepted.`,
      kind: 'success',
      category: 'roomInvites',
    });
  };

  const declineRoomInvite = (invite: RoomInvite) => {
    setRoomInvites(prev => prev.filter(item => item.id !== invite.id));
    if (invite.fromUserId) {
      wsRef.current?.respondToRoomInvite({
        inviteId: invite.inviteId,
        targetUserId: invite.fromUserId,
        roomId: invite.roomId,
        roomName: invite.roomName,
        response: 'declined',
      });
    }
    recordInviteHistory({
      id: invite.inviteId || invite.id,
      direction: 'incoming',
      status: 'declined',
      fromUsername: invite.fromUsername,
      roomId: invite.roomId,
      roomName: invite.roomName,
      createdAt: Date.now(),
    });
    pushToast({ title: 'Invite declined', detail: `${invite.roomName} invite dismissed.`, category: 'roomInvites' });
  };

  const messageUser = (username: string) => {
    setActiveTab('chat');
    setShowUsers(true);
    setChatScope('dm');
    setChatInput(`@${username} `);
    closeBuild();
  };

  const requestModerationAction = (targetUserId: string, action: ModerationAction) => {
    if (!canEditSpace || targetUserId === 'me') return;
    wsRef.current?.sendModerationRequest(targetUserId, action);
    const targetName = otherUsers.find(user => user.userId === targetUserId)?.username || 'participant';
    recordModerationHistory({
      action,
      targetUserId,
      targetUsername: targetName,
      status: 'sent',
    });
    pushToast({
      title: 'Host action sent',
      detail: `${action.replace('-', ' ')} requested for ${targetName}.`,
      kind: 'info',
      category: 'system',
    });
  };

  const requestModerationAll = (action: ModerationAction) => {
    if (!canEditSpace) return;
    const targets = otherUsers.filter(user => proximityUsers.includes(user.userId));
    if (targets.length === 0) {
      pushToast({
        title: 'No meeting participants',
        detail: 'There are no remote users in your current audio/video group.',
        kind: 'warning',
        category: 'system',
      });
      return;
    }

    targets.forEach(user => {
      wsRef.current?.sendModerationRequest(user.userId, action);
      recordModerationHistory({
        action,
        targetUserId: user.userId,
        targetUsername: user.username,
        status: 'sent',
      });
    });
    pushToast({
      title: 'Bulk host action sent',
      detail: `${action.replace('-', ' ')} requested for ${targets.length} participant${targets.length === 1 ? '' : 's'}.`,
      kind: 'info',
      category: 'system',
    });
  };

  const handleReaction = (emoji: string) => {
    setReactions(prev => ({
      ...prev,
      me: { emoji, expiresAt: Date.now() + 2400 },
    }));
    window.setTimeout(() => {
      setReactions(prev => {
        const existing = prev.me;
        if (!existing || existing.expiresAt > Date.now()) return prev;
        const next = { ...prev };
        delete next.me;
        return next;
      });
    }, 2600);
    wsRef.current?.sendReaction(emoji);
  };

  return {
    handleSendChat,
    inviteUserToCurrentRoom,
    acceptRoomInvite,
    declineRoomInvite,
    messageUser,
    requestModerationAction,
    requestModerationAll,
    handleReaction,
  };
}
