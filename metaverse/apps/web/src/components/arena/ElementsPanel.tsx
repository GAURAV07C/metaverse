import React, { useState } from 'react';
import { X, Plus, Trash2, Eye, EyeOff, Maximize2, Layers } from 'lucide-react';

export interface SpaceElement {
  id: string;
  x: number;
  y: number;
  element: { id: string; imageUrl: string; width: number; height: number; static: boolean; name?: string | null; category?: string | null; color?: string | null; floor?: string | null; wall?: string | null };
}

export interface AvailableElement {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
  name?: string;
  category?: string;
  color?: string;
  floor?: string;
  wall?: string;
}

export interface RoomPrefab {
  id: string;
  name: string;
  category: string;
  description: string;
  items: { elementId: string; offsetX: number; offsetY: number }[];
}

export const ROOM_PREFABS: RoomPrefab[] = [
  {
    id: 'prefab-conference',
    name: 'Conference Room Pod',
    category: 'Meeting',
    description: '1 Meeting Table + 6 Ergonomic Chairs + Whiteboard',
    items: [
      { elementId: 'el-table', offsetX: 1, offsetY: 1 },
      { elementId: 'el-chair', offsetX: 1, offsetY: 0 },
      { elementId: 'el-chair', offsetX: 2, offsetY: 0 },
      { elementId: 'el-chair', offsetX: 3, offsetY: 0 },
      { elementId: 'el-chair', offsetX: 1, offsetY: 3 },
      { elementId: 'el-chair', offsetX: 2, offsetY: 3 },
      { elementId: 'el-chair', offsetX: 3, offsetY: 3 },
      { elementId: 'el-board', offsetX: 1, offsetY: 4 },
    ]
  },
  {
    id: 'prefab-workstation',
    name: 'Dual Workstation Pod',
    category: 'Workstation',
    description: '2 Executive Desks + 2 Chairs + 2 Laptops + 2 Plants',
    items: [
      { elementId: 'el-desk', offsetX: 0, offsetY: 0 },
      { elementId: 'el-chair', offsetX: 0, offsetY: 1 },
      { elementId: 'el-laptop', offsetX: 1, offsetY: 0 },
      { elementId: 'el-desk', offsetX: 3, offsetY: 0 },
      { elementId: 'el-chair', offsetX: 3, offsetY: 1 },
      { elementId: 'el-plant', offsetX: 5, offsetY: 0 },
    ]
  },
  {
    id: 'prefab-lounge',
    name: 'Lounge Breakroom Suite',
    category: 'Lounge',
    description: '2 Lounge Sofas + 2 Potted Plants + 1 Whiteboard',
    items: [
      { elementId: 'el-sofa', offsetX: 0, offsetY: 0 },
      { elementId: 'el-sofa', offsetX: 3, offsetY: 0 },
      { elementId: 'el-plant', offsetX: 0, offsetY: 2 },
      { elementId: 'el-plant', offsetX: 4, offsetY: 2 },
      { elementId: 'el-board', offsetX: 1, offsetY: 3 },
    ]
  }
];

interface ElementsPanelProps {
  showPanel: boolean;
  setShowPanel: (val: boolean) => void;
  panelMsg: string;
  addingElement: string | null;
  setAddingElement: (val: string | null) => void;
  builderMode: 'pointer' | 'brush' | 'eraser';
  setBuilderMode: (val: 'pointer' | 'brush' | 'eraser') => void;
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
  hiddenElementIds?: string[];
  toggleHideElement?: (id: string) => void;
  handleUpdateDimensions?: (w: number, h: number) => void;
  handleStampPrefab?: (prefab: RoomPrefab, startX: number, startY: number) => void;
}

export const ElementsPanel: React.FC<ElementsPanelProps> = ({
  showPanel,
  setShowPanel,
  panelMsg,
  addingElement,
  setAddingElement,
  builderMode,
  setBuilderMode,
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
  hiddenElementIds = [],
  toggleHideElement,
  handleUpdateDimensions,
  handleStampPrefab,
}) => {
  const [customW, setCustomW] = useState(dimensions.w.toString());
  const [customH, setCustomH] = useState(dimensions.h.toString());
  const [builderTab, setBuilderTab] = useState<'single' | 'prefabs'>('single');
  const [selectedPrefab, setSelectedPrefab] = useState<RoomPrefab | null>(null);

  if (!showPanel) return null;

  return (
    <aside className="elements-panel glass animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Layers size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Map & Builder</h3>
        </div>
        <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => setShowPanel(false)}>
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

      {/* ── Map Area Expander Controls ── */}
      <div style={{ marginBottom: '1.25rem', padding: '0.65rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="field-label" style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Maximize2 size={12} style={{ color: '#60a5fa' }} /> Expand Map Bounds ({dimensions.w}×{dimensions.h})
        </p>
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem' }}>
          {[
            { label: '48×27', w: 48, h: 27 },
            { label: '64×36', w: 64, h: 36 },
            { label: '80×45', w: 80, h: 45 }
          ].map(preset => (
            <button
              key={preset.label}
              style={{
                flex: 1,
                padding: '0.3rem 0.2rem',
                fontSize: '0.7rem',
                borderRadius: '6px',
                border: dimensions.w === preset.w && dimensions.h === preset.h ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                background: dimensions.w === preset.w && dimensions.h === preset.h ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: 'white',
                cursor: 'pointer'
              }}
              onClick={() => {
                setCustomW(preset.w.toString());
                setCustomH(preset.h.toString());
                handleUpdateDimensions?.(preset.w, preset.h);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input className="input" style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem' }} type="number" placeholder="W" value={customW} onChange={e => setCustomW(e.target.value)} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>×</span>
          <input className="input" style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem' }} type="number" placeholder="H" value={customH} onChange={e => setCustomH(e.target.value)} />
          <button
            className="btn"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
            onClick={() => handleUpdateDimensions?.(parseInt(customW) || dimensions.w, parseInt(customH) || dimensions.h)}
          >
            Apply
          </button>
        </div>
      </div>

      {/* ── Sub-tabs: Single Items vs Room Prefabs ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px' }}>
        <button
          style={{
            flex: 1,
            padding: '0.35rem 0.4rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            border: 'none',
            background: builderTab === 'single' ? 'var(--accent)' : 'transparent',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onClick={() => setBuilderTab('single')}
        >
          Single Items
        </button>
        <button
          style={{
            flex: 1,
            padding: '0.35rem 0.4rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            border: 'none',
            background: builderTab === 'prefabs' ? 'var(--accent)' : 'transparent',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onClick={() => setBuilderTab('prefabs')}
        >
          Room Prefabs ✨
        </button>
      </div>

      {/* ── Single Items Tab ── */}
      {builderTab === 'single' && (
        <div style={{ marginBottom: '1.25rem' }}>

          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
            <button
              className={`btn-icon ${builderMode === 'pointer' ? 'active' : ''}`}
              style={{ flex: 1, background: builderMode === 'pointer' ? 'var(--accent)' : 'transparent', color: 'white', border: 'none', padding: '0.4rem' }}
              onClick={() => setBuilderMode('pointer')}
              title="Pointer Mode (Select & Move)"
            >
              Pointer
            </button>
            <button
              className={`btn-icon ${builderMode === 'brush' ? 'active' : ''}`}
              style={{ flex: 1, background: builderMode === 'brush' ? 'var(--accent)' : 'transparent', color: 'white', border: 'none', padding: '0.4rem' }}
              onClick={() => setBuilderMode('brush')}
              title="Brush Mode (Click & Drag to Paint)"
            >
              Brush
            </button>
            <button
              className={`btn-icon ${builderMode === 'eraser' ? 'active' : ''}`}
              style={{ flex: 1, background: builderMode === 'eraser' ? '#ef4444' : 'transparent', color: 'white', border: 'none', padding: '0.4rem' }}
              onClick={() => setBuilderMode('eraser')}
              title="Eraser Mode (Click to Delete)"
            >
              Eraser
            </button>
          </div>

          <p className="field-label" style={{ marginBottom: '0.5rem' }}>
            <Plus size={12} style={{ display: 'inline' }} /> Available Elements
          </p>
          {!addingElement && builderMode !== 'eraser' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {Array.from(new Set(availableElements.map(el => el.category || 'Other'))).map(category => (
                <div key={category}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: 600 }}>{category}</p>
                  <div className="panel-element-grid">
                    {availableElements.filter(el => (el.category || 'Other') === category).map(el => (
                      <button
                        key={el.id}
                        className="panel-el-btn"
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('elementId', el.id);
                          setAddingElement(el.id);
                        }}
                        onClick={() => setAddingElement(el.id)}
                        title={`${el.name || el.id} (${el.width}×${el.height})`}
                      >
                        <img src={el.imageUrl} alt="" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {availableElements.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No elements available</p>
              )}
            </div>
          ) : builderMode === 'eraser' ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click on any element in the canvas to erase it.</p>
          ) : (
            <div className="panel-add-form">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Place at tile coordinates:
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
      )}

      {/* ── Room Templates / Prefabs Tab ── */}
      {builderTab === 'prefabs' && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="field-label" style={{ marginBottom: '0.5rem' }}>
            Pre-built Room Prefabs ({ROOM_PREFABS.length})
          </p>
          {!selectedPrefab ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ROOM_PREFABS.map(p => (
                <div
                  key={p.id}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onClick={() => setSelectedPrefab(p)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#60a5fa' }}>{p.name}</span>
                    <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>{p.category}</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{p.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel-add-form">
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa', marginBottom: '0.3rem' }}>
                Stamp {selectedPrefab.name} at:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="input" style={{ flex: 1 }} type="number" placeholder="Start X" value={addX} onChange={e => setAddX(e.target.value)} min={0} max={dimensions.w - 1} />
                <input className="input" style={{ flex: 1 }} type="number" placeholder="Start Y" value={addY} onChange={e => setAddY(e.target.value)} min={0} max={dimensions.h - 1} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }} onClick={() => setSelectedPrefab(null)}>Back</button>
                <button
                  className="btn"
                  style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }}
                  onClick={() => handleStampPrefab?.(selectedPrefab, parseInt(addX) || 0, parseInt(addY) || 0)}
                  disabled={panelLoading}
                >
                  {panelLoading ? <span className="spinner" /> : 'Import Room'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Existing Elements & Eye Hide/Show Toggles ── */}
      <div>
        <p className="field-label" style={{ marginBottom: '0.5rem' }}>
          In This Space ({elements.length})
        </p>
        <div className="panel-space-elements">
          {elements.map(el => {
            const isHidden = hiddenElementIds.includes(el.id);
            return (
              <div key={el.id} className="panel-space-el" style={{ opacity: isHidden ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img
                    src={el.element.imageUrl}
                    alt=""
                    style={{ width: 22, height: 22, objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    ({el.x},{el.y})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button
                    className="panel-del-btn"
                    onClick={() => toggleHideElement?.(el.id)}
                    title={isHidden ? "Show on canvas" : "Hide from canvas"}
                    style={{ color: isHidden ? '#f59e0b' : '#3b82f6' }}
                  >
                    {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    className="panel-del-btn"
                    onClick={() => handleRemoveElement(el.id)}
                    title="Remove element"
                    disabled={panelLoading}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
          {elements.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Empty space</p>
          )}
        </div>
      </div>
    </aside>
  );
};
