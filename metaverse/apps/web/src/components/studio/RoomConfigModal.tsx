import type React from 'react';
import type { Prefab } from './types';

type RoomConfig = {
  people: number;
  floor: string;
  wall: string;
  tint: string;
};

interface RoomConfigModalProps {
  pendingRoom: { x: number; y: number; prefab: Prefab } | null;
  roomConfig: RoomConfig;
  onConfigChange: React.Dispatch<React.SetStateAction<RoomConfig>>;
  onCancel: () => void;
  onGenerate: () => void;
}

const FLOOR_COLORS = ['#ffffff', '#f3f4f6', '#d1d5db', '#fef3c7', '#fde68a', '#ffedd5', '#fed7aa', '#ccfbf1', '#a7f3d0'];
const TINT_COLORS = ['', '#ffffff', '#e0f2fe', '#d1d5db', '#fbcfe8', '#bfdbfe', '#86efac', '#fef08a', '#fed7aa', '#fca5a5'];
const WALL_COLORS = ['#64748b', '#334155', '#78350f', '#92400e', '#b45309', '#1e3a8a', '#1e40af', '#3730a3', '#4c1d95'];

export function RoomConfigModal({
  pendingRoom,
  roomConfig,
  onConfigChange,
  onCancel,
  onGenerate,
}: RoomConfigModalProps) {
  if (!pendingRoom) return null;

  return (
    <div className="room-config-backdrop">
      <div className="room-config-modal">
        <h2>Configure {pendingRoom.prefab.title}</h2>

        <label className="room-config-field">
          <span>Capacity</span>
          <input
            type="number"
            min={1}
            max={20}
            value={roomConfig.people}
            onChange={event => onConfigChange(prev => ({ ...prev, people: parseInt(event.target.value) || 1 }))}
          />
        </label>

        <ColorSwatches
          label="Floor Color"
          colors={FLOOR_COLORS}
          value={roomConfig.floor}
          onChange={floor => onConfigChange(prev => ({ ...prev, floor }))}
        />

        <ColorSwatches
          label="Tint Color"
          colors={TINT_COLORS}
          value={roomConfig.tint}
          allowEmpty
          onChange={tint => onConfigChange(prev => ({ ...prev, tint }))}
        />

        <ColorSwatches
          label="Wall Color"
          colors={WALL_COLORS}
          value={roomConfig.wall}
          onChange={wall => onConfigChange(prev => ({ ...prev, wall }))}
        />

        <div className="room-config-actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" onClick={onGenerate}>Generate Room</button>
        </div>
      </div>
    </div>
  );
}

function ColorSwatches({
  label,
  colors,
  value,
  allowEmpty = false,
  onChange,
}: {
  label: string;
  colors: string[];
  value: string;
  allowEmpty?: boolean;
  onChange: (color: string) => void;
}) {
  return (
    <div className="room-config-field">
      <span>{label}</span>
      <div className="room-config-swatches">
        {colors.map(color => (
          <button
            key={color || 'none'}
            className={value === color ? 'selected' : ''}
            onClick={() => onChange(color)}
            style={{ background: color || '#f9fafb' }}
            title={color || 'No tint'}
          >
            {allowEmpty && !color ? 'x' : null}
          </button>
        ))}
      </div>
    </div>
  );
}
