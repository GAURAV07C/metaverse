import type { InviteHistoryItem, ModerationHistoryItem, NotificationPrefs } from './types';

export const DEVICE_PREF_KEY = 'metaverse_device_preferences';
export const NOTIFICATION_PREF_KEY = 'metaverse_notification_preferences';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  joins: true,
  chat: true,
  roomInvites: true,
  sounds: true,
  reconnecting: true,
  respectFocus: true,
};

export const readDevicePreferences = () => {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_PREF_KEY) || '{}') as { audioInputId?: string; videoInputId?: string; audioOutputId?: string };
  } catch {
    return {};
  }
};

export const readNotificationPreferences = (): NotificationPrefs => {
  try {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(localStorage.getItem(NOTIFICATION_PREF_KEY) || '{}') };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
};

export const readInviteHistory = (spaceId?: string): InviteHistoryItem[] => {
  if (!spaceId) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(`metaverse_invite_history_${spaceId}`) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
};

export const readModerationHistory = (spaceId?: string): ModerationHistoryItem[] => {
  if (!spaceId) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(`metaverse_moderation_history_${spaceId}`) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 40) : [];
  } catch {
    return [];
  }
};
