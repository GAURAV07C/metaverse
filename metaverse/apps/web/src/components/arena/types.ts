export interface OtherUser {
  userId: string;
  username: string;
  x: number;
  y: number;
  avatarUrl?: string;
  status?: 'available' | 'busy' | 'focus' | 'away';
}

export interface RoomSessionMember {
  userId?: string;
  username?: string;
  avatarUrl?: string;
  status?: 'available' | 'busy' | 'focus' | 'away';
}

export interface RoomSession {
  roomId: string;
  name?: string;
  members: RoomSessionMember[];
}

export type GroupLead = {
  userId: string;
  username?: string;
  startedAt: string;
} | null;

export interface RoomInvite {
  id: string;
  inviteId?: string;
  fromUserId?: string;
  fromUsername: string;
  roomId: string;
  roomName: string;
  expiresAt: number;
}

export interface InviteHistoryItem {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: 'received' | 'sent' | 'accepted' | 'declined' | 'expired';
  fromUsername?: string;
  toUsername?: string;
  roomId: string;
  roomName: string;
  createdAt: number;
  updatedAt: number;
}

export interface ModerationHistoryItem {
  id: string;
  action: 'mute-audio' | 'stop-video' | 'stop-screen';
  targetUserId?: string;
  targetUsername: string;
  status: 'sent' | 'applied' | 'failed';
  createdAt: number;
}

export type ChatScope = 'everyone' | 'nearby' | 'dm' | 'room' | 'invites';

export type NotificationCategory = 'joins' | 'chat' | 'roomInvites' | 'system';

export type NotificationPrefs = {
  joins: boolean;
  chat: boolean;
  roomInvites: boolean;
  sounds: boolean;
  reconnecting: boolean;
  respectFocus: boolean;
};

export type PresenceStatus = 'available' | 'busy' | 'focus' | 'away';
