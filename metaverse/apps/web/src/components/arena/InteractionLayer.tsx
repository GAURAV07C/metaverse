import React from 'react';
import { ExternalLink, MonitorUp, X } from 'lucide-react';

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
  const title = activeInteraction?.state?.title || activeInteraction?.name || `Interactive ${activeInteraction?.type || 'Object'}`;
  const url = activeInteraction?.url || activeInteraction?.state?.url;
  const description = activeInteraction?.state?.description;
  const embedTypes = ['EMBED', 'VIDEO', 'GAME'];

  return (
    <>
      {/* ── Interaction Prompt ── */}
      {promptInteraction && !activeInteraction && (
        <div className="interaction-prompt">
          Press <kbd>X</kbd> to interact with {promptInteraction.name || 'object'}
        </div>
      )}

      {/* ── Active Interaction Modal ── */}
      {activeInteraction && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, pointerEvents: 'auto' }}>
          <div className="interaction-modal">
            <div className="interaction-modal-header">
              <div>
                <h3>{title}</h3>
                <span>{activeInteraction.type}</span>
              </div>
              <button onClick={() => setActiveInteraction(null)}><X size={20}/></button>
            </div>
            {activeInteraction.type === 'WHITEBOARD' ? (
              <iframe src="https://excalidraw.com/" className="interaction-frame" title="Whiteboard" />
            ) : activeInteraction.type === 'SCREENSHARE' ? (
              <div className="interaction-empty">
                <MonitorUp size={42} />
                <b>Screen share object</b>
                <span>Use the bottom toolbar share button to present inside this space.</span>
              </div>
            ) : url && embedTypes.includes(activeInteraction.type) ? (
              <iframe src={url} className="interaction-frame" title={title} />
            ) : url ? (
              <div className="interaction-empty">
                <ExternalLink size={42} />
                <b>{title}</b>
                <span>{description || url}</span>
                <button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>Open link</button>
              </div>
            ) : (
              <div className="interaction-empty">
                <b>{title}</b>
                <span>{description || 'This object is interactive. Configure its URL/state in Studio to launch an app here.'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
