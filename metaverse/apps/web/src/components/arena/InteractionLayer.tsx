import React from 'react';
import { X } from 'lucide-react';

interface InteractionLayerProps {
  promptInteraction: any;
  activeInteraction: any;
  setActiveInteraction: (val: any) => void;
}

export const InteractionLayer: React.FC<InteractionLayerProps> = ({
  promptInteraction,
  activeInteraction,
  setActiveInteraction
}) => {
  return (
    <>
      {/* ── Interaction Prompt ── */}
      {promptInteraction && !activeInteraction && (
        <div style={{ position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, border: '2px solid var(--accent)', animation: 'floatIn 0.3s' }}>
          Press <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>X</kbd> to interact
        </div>
      )}

      {/* ── Active Interaction Modal ── */}
      {activeInteraction && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, pointerEvents: 'auto' }}>
          <div style={{ width: '80%', height: '80%', background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#f1f1f1', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
              <h3 style={{ margin: 0, color: '#333' }}>Interactive {activeInteraction.type}</h3>
              <button onClick={() => setActiveInteraction(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666' }}><X size={20}/></button>
            </div>
            {activeInteraction.type === 'WHITEBOARD' ? (
              <iframe src="https://excalidraw.com/" style={{ width: '100%', height: '100%', border: 'none' }} title="Whiteboard" />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                <p>Interaction Type: {activeInteraction.type}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
