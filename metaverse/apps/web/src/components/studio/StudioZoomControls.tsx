import { Footprints, ZoomIn, ZoomOut } from 'lucide-react';

interface StudioZoomControlsProps {
  zoom: number;
  showWalkability: boolean;
  onZoomIn: () => void;
  onZoomReset: () => void;
  onZoomOut: () => void;
  onToggleWalkability: () => void;
}

export function StudioZoomControls({
  zoom,
  showWalkability,
  onZoomIn,
  onZoomReset,
  onZoomOut,
  onToggleWalkability,
}: StudioZoomControlsProps) {
  return (
    <div className="studio-zoom-controls">
      <button onClick={onZoomIn} title="Zoom in">
        <ZoomIn size={16} />
      </button>
      <button className="zoom-value" onClick={onZoomReset} title="Reset zoom">
        {Math.round(zoom * 100)}%
      </button>
      <button onClick={onZoomOut} title="Zoom out">
        <ZoomOut size={16} />
      </button>
      <button
        className={showWalkability ? 'active' : ''}
        onClick={onToggleWalkability}
        title="Toggle impassable overlay"
      >
        <Footprints size={16} />
      </button>
    </div>
  );
}
