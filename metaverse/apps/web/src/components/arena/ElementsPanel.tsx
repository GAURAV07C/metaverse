import React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export interface SpaceElement {
  id: string;
  x: number;
  y: number;
  element: { id: string; imageUrl: string; width: number; height: number; static: boolean };
}

export interface AvailableElement {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
}

interface ElementsPanelProps {
  showPanel: boolean;
  setShowPanel: (val: boolean) => void;
  panelMsg: string;
  addingElement: string | null;
  setAddingElement: (val: string | null) => void;
  availableElements: AvailableElement[];
  elements: SpaceElement[];
  addX: string;
  setAddX: (val: string) => void;
  addY: string;
  setAddY: (val: string) => void;
  panelLoading: boolean;
  handleAddElement: () => void;
  handleRemoveElement: (id: string) => void;
  dimensions: { w: number; h: number };
}

export const ElementsPanel: React.FC<ElementsPanelProps> = ({
  showPanel,
  setShowPanel,
  panelMsg,
  addingElement,
  setAddingElement,
  availableElements,
  elements,
  addX,
  setAddX,
  addY,
  setAddY,
  panelLoading,
  handleAddElement,
  handleRemoveElement,
  dimensions,
}) => {
  if (!showPanel) return null;

  return (
    <aside className="elements-panel glass animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Elements</h3>
        <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => setShowPanel(false)}>
          <X size={14} />
        </button>
      </div>

      {panelMsg && (
        <div 
          className={panelMsg.includes('!') && !panelMsg.includes('Failed') ? 'success-banner' : 'error-banner'}
          style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}
        >
          {panelMsg}
        </div>
      )}

      {/* Add Element */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p className="field-label" style={{ marginBottom: '0.5rem' }}>
          <Plus size={12} style={{ display: 'inline' }} /> Add Element
        </p>
        {!addingElement ? (
          <div className="panel-element-grid">
            {availableElements.map(el => (
              <button 
                key={el.id} 
                className="panel-el-btn" 
                onClick={() => setAddingElement(el.id)}
                title={`${el.width}×${el.height} — ${el.static ? 'Static' : 'Walkable'}`}
              >
                <img 
                  src={el.imageUrl} 
                  alt="" 
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/32x32/1e293b/94a3b8?text=?'; }} 
                />
              </button>
            ))}
            {availableElements.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No elements available</p>
            )}
          </div>
        ) : (
          <div className="panel-add-form">
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Place at coordinates:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input" style={{ flex: 1 }} type="number" placeholder="X" value={addX} onChange={e => setAddX(e.target.value)} min={0} max={dimensions.w - 1} />
              <input className="input" style={{ flex: 1 }} type="number" placeholder="Y" value={addY} onChange={e => setAddY(e.target.value)} min={0} max={dimensions.h - 1} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }} onClick={() => setAddingElement(null)}>Cancel</button>
              <button className="btn" style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }} onClick={handleAddElement} disabled={panelLoading}>
                {panelLoading ? <span className="spinner" /> : 'Place'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Elements in space */}
      <div>
        <p className="field-label" style={{ marginBottom: '0.5rem' }}>
          In This Space ({elements.length})
        </p>
        <div className="panel-space-elements">
          {elements.map(el => (
            <div key={el.id} className="panel-space-el">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                  src={el.element.imageUrl}
                  alt=""
                  style={{ width: 24, height: 24, objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  ({el.x},{el.y})
                </span>
              </div>
              <button
                className="panel-del-btn"
                onClick={() => handleRemoveElement(el.id)}
                title="Remove element"
                disabled={panelLoading}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {elements.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Empty space</p>
          )}
        </div>
      </div>
    </aside>
  );
};
