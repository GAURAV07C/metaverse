import { Bell, DoorOpen, X } from 'lucide-react';
import type { RoomInvite } from './types';

type ToastItem = {
  id: string;
  title: string;
  detail?: string;
  kind?: 'info' | 'success' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
};

interface ArenaNotificationsProps {
  roomInvites: RoomInvite[];
  inviteTick: number;
  toasts: ToastItem[];
  onAcceptInvite: (invite: RoomInvite) => void;
  onDeclineInvite: (invite: RoomInvite) => void;
  onDismissToast: (toastId: string) => void;
}

export function ArenaNotifications({
  roomInvites,
  inviteTick,
  toasts,
  onAcceptInvite,
  onDeclineInvite,
  onDismissToast,
}: ArenaNotificationsProps) {
  return (
    <>
      {roomInvites.length > 0 && (
        <div className="room-invite-stack" aria-live="assertive" aria-label="Room invitations">
          {roomInvites.map(invite => {
            const remaining = Math.max(0, Math.ceil((invite.expiresAt - Date.now() + inviteTick * 0) / 1000));
            return (
              <article key={invite.id} className="room-invite-card">
                <div className="room-invite-icon"><DoorOpen size={18} /></div>
                <div className="room-invite-copy">
                  <strong>{invite.fromUsername} invited you</strong>
                  <span>Join {invite.roomName} · expires in {remaining}s</span>
                </div>
                <div className="room-invite-actions">
                  <button className="accept" onClick={() => onAcceptInvite(invite)}>Accept</button>
                  <button onClick={() => onDeclineInvite(invite)}>Decline</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {toasts.length > 0 && (
        <div className="arena-toast-stack" aria-live="polite" aria-label="Space notifications">
          {toasts.map(toast => (
            <article key={toast.id} className={`arena-toast ${toast.kind || 'info'}`}>
              <Bell size={16} />
              <div>
                <strong>{toast.title}</strong>
                {toast.detail && <span>{toast.detail}</span>}
              </div>
              {toast.actionLabel && toast.onAction && <button className="toast-action" onClick={() => { toast.onAction?.(); onDismissToast(toast.id); }}>{toast.actionLabel}</button>}
              <button onClick={() => onDismissToast(toast.id)} aria-label="Dismiss notification" title="Dismiss"><X size={14} /></button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
