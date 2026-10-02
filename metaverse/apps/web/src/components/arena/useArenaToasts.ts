import { useCallback, useState } from 'react';
import type React from 'react';
import type { NotificationCategory, NotificationPrefs, PresenceStatus } from './types';

export type ArenaToast = {
  id: string;
  title: string;
  detail?: string;
  kind?: 'info' | 'success' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
};

type ToastInput = Omit<ArenaToast, 'id'> & {
  category?: NotificationCategory;
};

export function useArenaToasts(
  notificationPrefsRef: React.MutableRefObject<NotificationPrefs>,
  presenceStatusRef: React.MutableRefObject<PresenceStatus>,
) {
  const [toasts, setToasts] = useState<ArenaToast[]>([]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(item => item.id !== toastId));
  }, []);

  const pushToast = useCallback((toast: ToastInput) => {
    const prefs = notificationPrefsRef.current;
    const status = presenceStatusRef.current;

    if (toast.category === 'joins' && !prefs.joins) return;
    if (toast.category === 'chat' && !prefs.chat) return;
    if (toast.category === 'roomInvites' && !prefs.roomInvites) return;
    if (toast.category === 'system' && toast.title.toLowerCase().includes('reconnecting') && !prefs.reconnecting) return;
    if (prefs.respectFocus && (status === 'focus' || status === 'busy') && toast.kind !== 'warning' && toast.category !== 'system') return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => dismissToast(id), 4200);
  }, [dismissToast, notificationPrefsRef, presenceStatusRef]);

  return { toasts, pushToast, dismissToast };
}
