import { X } from 'lucide-react';
import { AvatarView } from './AvatarView';
import { StreamPlayer } from './StreamPlayer';
import type { FullScreenTile } from './mediaTypes';

interface FullScreenMediaModalProps {
  tile: FullScreenTile;
  onClose: () => void;
}

export function FullScreenMediaModal({ tile, onClose }: FullScreenMediaModalProps) {
  return (
    <div className="full-video-backdrop">
      <header>
        <strong>{tile.name}</strong>
        <button onClick={onClose} title="Close full screen"><X size={20} /></button>
      </header>
      <main>
        <StreamPlayer
          stream={tile.stream}
          muted={tile.id === 'me'}
          className={tile.isScreen ? 'screen' : ''}
          fallback={
            <div className="full-video-avatar">
              <AvatarView avatarUrl={tile.avatarUrl} name={tile.name} />
              <span>{tile.name}</span>
            </div>
          }
        />
      </main>
    </div>
  );
}
