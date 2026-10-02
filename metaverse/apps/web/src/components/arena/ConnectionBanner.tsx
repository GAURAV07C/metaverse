import { Wifi } from 'lucide-react';

interface ConnectionBannerProps {
  connected: boolean;
  isBrowserOnline: boolean;
  enabled: boolean;
}

export function ConnectionBanner({ connected, isBrowserOnline, enabled }: ConnectionBannerProps) {
  if (!enabled || (connected && isBrowserOnline)) return null;

  return (
    <div className={`arena-connection-banner ${!isBrowserOnline ? 'offline' : ''}`} role="status" aria-live="polite">
      <Wifi size={17} />
      <div>
        <strong>{isBrowserOnline ? 'Reconnecting to office' : 'You are offline'}</strong>
        <span>
          {isBrowserOnline
            ? 'Movement, chat, and room media will resume automatically.'
            : 'Check your internet connection. Map view stays available locally.'}
        </span>
      </div>
    </div>
  );
}
