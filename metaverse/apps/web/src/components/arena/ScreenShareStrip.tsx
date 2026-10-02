import { Monitor } from 'lucide-react';
import { StreamPlayer } from './StreamPlayer';
import type { FullScreenTile, ScreenShareTile } from './mediaTypes';

interface ScreenShareStripProps {
  screenShares: ScreenShareTile[];
  onOpenTile: (tile: FullScreenTile) => void;
}

export function ScreenShareStrip({ screenShares, onOpenTile }: ScreenShareStripProps) {
  if (screenShares.length === 0) return null;

  return (
    <div className="screen-share-strip">
      {screenShares.map(screen => (
        <button
          key={screen.id}
          className="screen-share-tile"
          onClick={() => onOpenTile({ ...screen, isScreen: true })}
        >
          <StreamPlayer
            stream={screen.stream}
            muted={screen.id === 'me'}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            fallback={<div className="vid-placeholder"><Monitor size={24} /></div>}
          />
        </button>
      ))}
    </div>
  );
}
