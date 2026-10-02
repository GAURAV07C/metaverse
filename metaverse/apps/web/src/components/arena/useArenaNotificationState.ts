import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import { api } from '../../utils/api';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_PREF_KEY,
  readInviteHistory,
  readModerationHistory,
  readNotificationPreferences,
} from './arenaStorage';
import type { ArenaToast } from './useArenaToasts';
import type { InviteHistoryItem, ModerationHistoryItem, NotificationPrefs, PresenceStatus, RoomInvite } from './types';

type PushToast = (toast: Omit<ArenaToast, 'id'> & { category?: 'joins' | 'chat' | 'roomInvites' | 'system' }) => void;

interface UseArenaNotificationStateInput {
  spaceId?: string;
  connected: boolean;
  presenceStatus: PresenceStatus;
  roomInvites: RoomInvite[];
  setRoomInvites: React.Dispatch<React.SetStateAction<RoomInvite[]>>;
  inviteEvents?: any[];
  moderationAudit?: any[];
  notificationPreferences?: Partial<NotificationPrefs> | null;
  notificationPrefsRef: React.MutableRefObject<NotificationPrefs>;
  presenceStatusRef: React.MutableRefObject<PresenceStatus>;
  pushToast: PushToast;
}

export function useArenaNotificationState({
  spaceId,
  connected,
  presenceStatus,
  roomInvites,
  setRoomInvites,
  inviteEvents,
  moderationAudit,
  notificationPreferences,
  notificationPrefsRef,
  presenceStatusRef,
  pushToast,
}: UseArenaNotificationStateInput) {
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() => readNotificationPreferences());
  const [isBrowserOnline, setIsBrowserOnline] = useState(() => navigator.onLine);
  const [inviteHistory, setInviteHistory] = useState<InviteHistoryItem[]>(() => readInviteHistory(spaceId));
  const [moderationHistory, setModerationHistory] = useState<ModerationHistoryItem[]>(() => readModerationHistory(spaceId));
  const [inviteTick, setInviteTick] = useState(0);
  const [wasConnected, setWasConnected] = useState(false);

  useEffect(() => {
    setInviteHistory(readInviteHistory(spaceId));
    setModerationHistory(readModerationHistory(spaceId));
  }, [spaceId]);

  useEffect(() => {
    if (!inviteEvents) return;
    setInviteHistory(inviteEvents.map((event: any) => ({
      id: event.inviteId || event.id,
      direction: event.direction === 'incoming' ? 'incoming' : 'outgoing',
      status: event.status || 'sent',
      fromUsername: event.fromUsername || undefined,
      toUsername: event.toUsername || undefined,
      roomId: event.roomId,
      roomName: event.roomName,
      createdAt: new Date(event.createdAt).getTime(),
      updatedAt: new Date(event.createdAt).getTime(),
    })));
  }, [inviteEvents]);

  useEffect(() => {
    if (!moderationAudit) return;
    setModerationHistory(moderationAudit.map((event: any) => ({
      id: event.id,
      action: event.action,
      targetUserId: event.targetUserId || undefined,
      targetUsername: event.targetUsername || 'Participant',
      status: event.status === 'applied' ? 'applied' : event.status === 'failed' ? 'failed' : 'sent',
      createdAt: new Date(event.createdAt).getTime(),
    })));
  }, [moderationAudit]);

  useEffect(() => {
    if (!spaceId) return;
    localStorage.setItem(`metaverse_invite_history_${spaceId}`, JSON.stringify(inviteHistory.slice(0, 30)));
  }, [inviteHistory, spaceId]);

  useEffect(() => {
    if (!spaceId) return;
    localStorage.setItem(`metaverse_moderation_history_${spaceId}`, JSON.stringify(moderationHistory.slice(0, 40)));
  }, [moderationHistory, spaceId]);

  useEffect(() => {
    notificationPrefsRef.current = notificationPrefs;
  }, [notificationPrefs, notificationPrefsRef]);

  useEffect(() => {
    presenceStatusRef.current = presenceStatus;
  }, [presenceStatus, presenceStatusRef]);

  useEffect(() => {
    const refreshPrefs = () => setNotificationPrefs(readNotificationPreferences());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === NOTIFICATION_PREF_KEY) refreshPrefs();
    };
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('storage', handleStorage);
    window.addEventListener('metaverse-notification-preferences-updated', refreshPrefs);
    window.addEventListener('focus', refreshPrefs);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('metaverse-notification-preferences-updated', refreshPrefs);
      window.removeEventListener('focus', refreshPrefs);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!notificationPreferences) return;
    const next = { ...DEFAULT_NOTIFICATION_PREFS, ...notificationPreferences };
    setNotificationPrefs(next);
    localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(next));
  }, [notificationPreferences]);

  useEffect(() => {
    if (connected) {
      setWasConnected(true);
      return;
    }
    if (!wasConnected || !notificationPrefs.reconnecting) return;
    pushToast({
      title: 'Reconnecting to office',
      detail: 'Trying to restore live movement, chat, and media.',
      kind: 'warning',
      category: 'system',
    });
  }, [connected, notificationPrefs.reconnecting, pushToast, wasConnected]);

  useEffect(() => {
    if (roomInvites.length === 0) return;
    const interval = window.setInterval(() => {
      setInviteTick(tick => tick + 1);
      setRoomInvites(prev => prev.filter(invite => invite.expiresAt > Date.now()));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [roomInvites.length, setRoomInvites]);

  const playInviteRing = useCallback(() => {
    const prefs = notificationPrefsRef.current;
    const status = presenceStatusRef.current;
    if (!prefs.sounds || !prefs.roomInvites) return;
    if (prefs.respectFocus && (status === 'focus' || status === 'busy')) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
      gain.connect(ctx.destination);

      [0, 0.14].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(740, ctx.currentTime + offset);
        osc.connect(gain);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.11);
      });

      window.setTimeout(() => ctx.close().catch(() => {}), 600);
    } catch {
      // Browser autoplay policies can block notification sounds.
    }
  }, [notificationPrefsRef, presenceStatusRef]);

  const recordInviteHistory = useCallback((item: Omit<InviteHistoryItem, 'updatedAt'>) => {
    setInviteHistory(prev => {
      const updated: InviteHistoryItem = { ...item, updatedAt: Date.now() };
      return [updated, ...prev.filter(existing => existing.id !== item.id)].slice(0, 30);
    });
  }, []);

  const recordModerationHistory = useCallback((item: Omit<ModerationHistoryItem, 'id' | 'createdAt'> & { id?: string }) => {
    setModerationHistory(prev => {
      const entry: ModerationHistoryItem = {
        id: item.id || `${item.action}-${item.targetUserId || item.targetUsername}-${Date.now()}`,
        action: item.action,
        targetUserId: item.targetUserId,
        targetUsername: item.targetUsername,
        status: item.status,
        createdAt: Date.now(),
      };
      return [entry, ...prev.filter(existing => existing.id !== entry.id)].slice(0, 40);
    });
  }, []);

  const handleNotificationPreferenceChange = useCallback(async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...notificationPrefsRef.current, [key]: value };
    notificationPrefsRef.current = next;
    setNotificationPrefs(next);
    localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(next));
    if (!spaceId) return;
    try {
      const res = await api.put(`/office/${spaceId}/notification-preferences`, next);
      if (res.data?.preferences) {
        const saved = { ...DEFAULT_NOTIFICATION_PREFS, ...res.data.preferences };
        notificationPrefsRef.current = saved;
        setNotificationPrefs(saved);
        localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(saved));
      }
    } catch {
      pushToast({
        title: 'Notification settings saved locally',
        detail: 'Server sync failed, but this browser will keep the preference.',
        kind: 'warning',
        category: 'system',
      });
    }
  }, [notificationPrefsRef, pushToast, spaceId]);

  return {
    notificationPrefs,
    isBrowserOnline,
    inviteHistory,
    moderationHistory,
    inviteTick,
    playInviteRing,
    recordInviteHistory,
    recordModerationHistory,
    handleNotificationPreferenceChange,
  };
}
