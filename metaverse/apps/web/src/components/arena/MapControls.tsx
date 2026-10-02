import { Map as MapIcon, MinusCircle, Navigation, PlusCircle } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOverview: () => void;
  onLocateUser: () => void;
}

export function MapControls({ onZoomIn, onZoomOut, onOverview, onLocateUser }: MapControlsProps) {
  return (
    <div className="map-controls">
      <button className="map-ctrl-btn" onClick={onZoomIn} title="Zoom in">
        <PlusCircle size={20} />
      </button>
      <button className="map-ctrl-btn" onClick={onZoomOut} title="Zoom out">
        <MinusCircle size={20} />
      </button>
      <button className="map-ctrl-btn" onClick={onOverview} title="Layout overview">
        <MapIcon size={20} />
      </button>
      <button className="map-ctrl-btn" onClick={onLocateUser} title="Locate me">
        <Navigation size={20} />
      </button>
    </div>
  );
}
