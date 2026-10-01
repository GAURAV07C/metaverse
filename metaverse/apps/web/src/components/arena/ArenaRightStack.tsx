import { Compass } from 'lucide-react';
import type { SpaceElement } from './ElementsPanel';
import { MiniMap } from './MiniMap';
import type { OtherUser } from './types';

interface ArenaRightStackProps {
  dimensions: { w: number; h: number };
  myPos: { x: number; y: number };
  otherUsers: OtherUser[];
  elements: SpaceElement[];
  privateZones: any[];
  currentRoom: any;
  currentSpotlight: any;
  roomSpots: any[];
  onLocateUser: () => void;
  onOpenMeetingMode: () => void;
  onLeaveRoom: () => void;
  isSpotOccupied: (spot: any) => boolean;
  onChooseSpot: (spot: any) => void;
}

export function ArenaRightStack({
  dimensions,
  myPos,
  otherUsers,
  elements,
  privateZones,
  currentRoom,
  currentSpotlight,
  roomSpots,
  onLocateUser,
  onOpenMeetingMode,
  onLeaveRoom,
  isSpotOccupied,
  onChooseSpot,
}: ArenaRightStackProps) {
  return (
    <aside className="arena-right-stack" aria-label="Map widgets">
      <div className="arena-minimap">
        <header><Compass size={15} />Mini map</header>
        <div className="minimap-surface">
          <MiniMap
            dimensions={dimensions}
            myPos={myPos}
            otherUsers={otherUsers}
            elements={elements}
            privateZones={privateZones}
          />
        </div>
        <button onClick={onLocateUser}>Center me</button>
      </div>
      {currentRoom && (
        <div className="arena-help-card room-actions-card">
          <b>{currentRoom.name || 'Room'}</b>
          <button onClick={onOpenMeetingMode}>Meeting mode</button>
          <button className="danger" onClick={onLeaveRoom}>Leave room</button>
        </div>
      )}
      {currentSpotlight && (
        <div className="arena-help-card room-actions-card spotlight-card">
          <b>{currentSpotlight.name || 'Spotlight'}</b>
          <span>Your voice is highlighted in this area.</span>
        </div>
      )}
      <div className="arena-help-card">
        <b>Move</b>
        <span>WASD / arrow keys or click any walkable tile.</span>
      </div>
      {currentRoom && roomSpots.length > 0 && (
        <div className="arena-help-card">
          <b>Choose spot</b>
          <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {roomSpots.map((spot: any, index: number) => {
              const occupied = isSpotOccupied(spot);
              return (
                <button
                  key={spot.id || `${spot.startX}:${spot.startY}`}
                  disabled={occupied}
                  onClick={() => onChooseSpot(spot)}
                  title={occupied ? 'Occupied' : 'Move to this room spot'}
                  style={{
                    minHeight: 28,
                    borderRadius: 6,
                    border: occupied ? '1px solid rgba(148, 163, 184, 0.45)' : '1px solid rgba(34, 197, 94, 0.65)',
                    background: occupied ? 'rgba(15, 23, 42, 0.6)' : 'rgba(34, 197, 94, 0.15)',
                    color: occupied ? '#94a3b8' : '#dcfce7',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: occupied ? 'not-allowed' : 'pointer'
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
