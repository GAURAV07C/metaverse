import { Trash2, GripVertical } from 'lucide-react';
import type { SpaceElement } from '../arena/ElementsPanel';
import React, { useState } from 'react';

interface Props {
  el: SpaceElement;
  isSelected: boolean;
  tool: string;
  TILE: number;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updatedEl: SpaceElement) => void;
  startElDrag: (id: string, e: React.PointerEvent) => void;
}

export function StudioElement({ el, isSelected, tool, TILE, onSelect, onDelete, onUpdate, startElDrag }: Props) {
  const [status, setStatus] = useState('');

  return (
    <div
      data-element-id={el.id}
      onClick={e => {
        e.stopPropagation();
        if (tool === 'erase') {
          onDelete();
        } else {
          onSelect();
        }
      }}
      style={{
        position: 'absolute',
        left: el.x * TILE,
        top: el.y * TILE,
        cursor: tool === 'erase' ? 'crosshair' : 'pointer',
        zIndex: el.element.category === 'Rooms' ? 0 : (isSelected ? 40 : 20),
      }}
    >
      {/* ── Header bar (shown on select) ── */}
      {isSelected && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0,
          marginBottom: 6, background: '#1e1e1e', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex',
          alignItems: 'center', zIndex: 20, whiteSpace: 'nowrap',
          color: '#fff', fontSize: 13, fontWeight: 500
        }}>
          
          {/* Name section with Drag handle */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderRight: '1px solid #333', background: '#111', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>
            <div
              onPointerDown={e => startElDrag(el.id, e)}
              style={{ cursor: 'grab', marginRight: 8, color: '#888', display: 'flex', alignItems: 'center' }}
              title="Drag to move"
            >
              <GripVertical size={14} />
            </div>
            <input 
              value={el.element.name || ''} 
              onChange={e => {
                e.stopPropagation();
                onUpdate({ ...el, element: { ...el.element, name: e.target.value } });
              }}
              onPointerDown={e => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', width: 120 }}
              placeholder="Area name"
            />
          </div>

          {/* Color (Tint) Picker - Available for ALL elements */}
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', position: 'relative', padding: '0 12px' }}
            onClick={(e) => { e.stopPropagation(); setStatus(status === 'colorPicker' ? '' : 'colorPicker'); }}
          >
            <span style={{ color: '#aaa', fontSize: 12 }}>Color</span>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: el.element.color || '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #444' }}>
              {!el.element.color && <span style={{ color: '#888', fontSize: 14 }}>×</span>}
            </div>
            {status === 'colorPicker' && (
              <div style={{
                position: 'absolute', top: '100%', left: -50, marginTop: 8, background: '#222', padding: 12, borderRadius: 12,
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 30
              }}>
                {['', '#ffffff', '#e0f2fe', '#d1d5db', '#9ca3af', '#fbcfe8', '#f472b6', '#d8b4fe', '#bfdbfe', '#67e8f9', '#5eead4', '#6ee7b7', '#86efac', '#fef08a', '#fde047', '#ffedd5', '#fed7aa', '#fdba74', '#fca5a5', '#f87171', '#ef4444'].map(c => (
                  <div key={c || 'none'} onClick={(e) => { e.stopPropagation(); onUpdate({ ...el, element: { ...el.element, color: c || null } }); }}
                    style={{ width: 24, height: 24, borderRadius: 12, background: c || '#333', cursor: 'pointer', border: el.element.color === (c || null) ? '2px solid #6366f1' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!c && <span style={{ color: '#888', fontSize: 14 }}>×</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings (only for Rooms/Areas) */}
          {el.element.category === 'Rooms' && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 16 }}>
              {/* Floor Picker */}
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', position: 'relative' }}
                onClick={(e) => { e.stopPropagation(); setStatus(status === 'floorPicker' ? '' : 'floorPicker'); }}
              >
                <span style={{ color: '#aaa', fontSize: 12 }}>Floor</span>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: el.element.floor || '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #444' }}>
                  {!el.element.floor && <span style={{ color: '#888', fontSize: 14 }}>×</span>}
                </div>
                {status === 'floorPicker' && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 8, background: '#222', padding: 12, borderRadius: 12,
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 30
                  }}>
                    {['', '#ffffff', '#f3f4f6', '#d1d5db', '#fef3c7', '#fde68a', '#ffedd5', '#fed7aa', '#ccfbf1', '#a7f3d0'].map(c => (
                      <div key={c || 'none'} onClick={(e) => { e.stopPropagation(); onUpdate({ ...el, element: { ...el.element, floor: c || null } }); }}
                        style={{ width: 24, height: 24, borderRadius: 12, background: c || '#333', cursor: 'pointer', border: el.element.floor === (c || null) ? '2px solid #6366f1' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!c && <span style={{ color: '#888', fontSize: 14 }}>×</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Wall Picker */}
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', position: 'relative' }}
                onClick={(e) => { e.stopPropagation(); setStatus(status === 'wallPicker' ? '' : 'wallPicker'); }}
              >
                <span style={{ color: '#aaa', fontSize: 12 }}>Wall</span>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: el.element.wall || '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #444' }}>
                  {!el.element.wall && <span style={{ color: '#888', fontSize: 14 }}>×</span>}
                </div>
                {status === 'wallPicker' && (
                  <div style={{
                    position: 'absolute', top: '100%', left: -100, marginTop: 8, background: '#222', padding: 12, borderRadius: 12,
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 30
                  }}>
                    {['', '#64748b', '#334155', '#78350f', '#92400e', '#b45309', '#1e3a8a', '#1e40af', '#3730a3', '#4c1d95'].map(c => (
                      <div key={c || 'none'} onClick={(e) => { e.stopPropagation(); onUpdate({ ...el, element: { ...el.element, wall: c || null } }); }}
                        style={{ width: 24, height: 24, borderRadius: 12, background: c || '#333', cursor: 'pointer', border: el.element.wall === (c || null) ? '2px solid #6366f1' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!c && <span style={{ color: '#888', fontSize: 14 }}>×</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Delete */}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'transparent', color: '#ef4444', border: 'none', padding: '8px 12px', borderLeft: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Element image and Color Overlay */}
      <div 
        onPointerDown={e => {
          if (tool !== 'erase') {
            onSelect(); // Auto-select when starting to drag
            startElDrag(el.id, e);
          }
        }}
        style={{ position: 'relative', width: el.element.width * TILE, height: el.element.height * TILE, backgroundColor: el.element.floor || 'transparent', borderRadius: 4, cursor: tool === 'erase' ? 'crosshair' : 'grab' }}
      >
        
        {/* Wall overlay (top border) */}
        {el.element.wall && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, backgroundColor: el.element.wall, zIndex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
        )}

        {/* Base Image (e.g. Trunk) */}
        <img
          src={el.element.imageUrl}
          alt={el.element.name || ''}
          draggable={false}
          style={{
            position: 'absolute', bottom: 0, left: 0,
            width: '100%', height: '100%', objectFit: 'contain',
            imageRendering: 'pixelated',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
            border: isSelected ? '2px solid #6366f1' : '2px solid transparent',
            borderRadius: 4,
            transition: 'border 0.15s',
            zIndex: 2
          }}
        />

        {/* Color Mask Layer (e.g. Leaves) */}
        {el.element.colorMaskUrl && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
            {el.element.color ? (
              <div style={{
                position: 'absolute', bottom: 0, left: 0,
                width: '100%', height: '100%',
                backgroundColor: el.element.color,
                mixBlendMode: 'multiply', opacity: 0.85,
                WebkitMaskImage: `url(${el.element.colorMaskUrl})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'bottom left'
              }} />
            ) : (
              <img 
                src={el.element.colorMaskUrl} 
                draggable={false}
                style={{ 
                  position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated'
                }} 
              />
            )}
          </div>
        )}

        {/* Fallback Single-Image Tint (if no mask URL is provided) */}
        {!el.element.colorMaskUrl && el.element.color && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: '100%', height: '100%',
            backgroundColor: el.element.color,
            mixBlendMode: 'multiply', opacity: 0.85,
            pointerEvents: 'none', zIndex: 3,
            WebkitMaskImage: `url(${el.element.imageUrl})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'bottom left'
          }} />
        )}
      </div>
    </div>
  );
}
