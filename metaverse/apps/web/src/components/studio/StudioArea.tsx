import { useState, useRef, useEffect } from 'react';
import { Trash } from 'lucide-react';
import type { AreaType } from './types';

interface Props {
  area: AreaType;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updated: AreaType) => void;
  onDelete: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  zoom: number;
}

const TILE = 32;

export function StudioArea({ area, isSelected, onSelect, onChange, onDelete, onDragStart, zoom }: Props) {
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, sx: 0, sy: 0 });

  const handleResizeStart = (e: React.PointerEvent, corner: string) => {
    e.stopPropagation();
    setIsResizing(corner);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: area.w,
      h: area.h,
      sx: area.x,
      sy: area.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const dx = Math.round((e.clientX - resizeStart.current.x) / zoom / TILE);
    const dy = Math.round((e.clientY - resizeStart.current.y) / zoom / TILE);

    let newW = resizeStart.current.w;
    let newH = resizeStart.current.h;
    let newX = resizeStart.current.sx;
    let newY = resizeStart.current.sy;

    if (isResizing.includes('e')) newW = Math.max(1, resizeStart.current.w + dx);
    if (isResizing.includes('s')) newH = Math.max(1, resizeStart.current.h + dy);
    if (isResizing.includes('w')) {
      newW = Math.max(1, resizeStart.current.w - dx);
      if (newW > 1 || dx < 0) newX = resizeStart.current.sx + dx;
    }
    if (isResizing.includes('n')) {
      newH = Math.max(1, resizeStart.current.h - dy);
      if (newH > 1 || dy < 0) newY = resizeStart.current.sy + dy;
    }

    onChange({ ...area, w: newW, h: newH, x: newX, y: newY });
  };

  const handleResizeEnd = () => {
    setIsResizing(null);
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: area.x * TILE,
    top: area.y * TILE,
    width: area.w * TILE,
    height: area.h * TILE,
    backgroundColor: area.floor || 'rgba(243, 244, 246, 0.4)',
    border: isSelected ? `2px solid ${area.color || '#3b82f6'}` : `2px dashed ${area.color || 'rgba(59, 130, 246, 0.5)'}`,
    cursor: 'pointer',
    pointerEvents: 'all',
    boxSizing: 'border-box',
    zIndex: isSelected ? 10 : 1,
  };

  const handleStyle = (pos: string): React.CSSProperties => {
    const s: React.CSSProperties = {
      position: 'absolute',
      width: 10, height: 10,
      background: '#fff',
      border: '1px solid #333',
      cursor: `${pos}-resize`,
      zIndex: 20,
    };
    if (pos.includes('n')) s.top = -5;
    if (pos.includes('s')) s.bottom = -5;
    if (pos.includes('w')) s.left = -5;
    if (pos.includes('e')) s.right = -5;
    if (pos === 'n' || pos === 's') s.left = '50%';
    if (pos === 'e' || pos === 'w') s.top = '50%';
    return s;
  };

  return (
    <div
      style={style}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        onDragStart(e);
      }}
      data-area-id={area.id}
    >
      {/* Floor Texture Overlay */}
      {area.texture === 'grid' && (
        <div style={{ 
          width: '100%', height: '100%', opacity: 0.15,
          backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
          backgroundSize: `${TILE/2}px ${TILE/2}px`, pointerEvents: 'none', borderRadius: '2px'
        }} />
      )}
      {area.texture === 'checker' && (
        <div style={{ 
          width: '100%', height: '100%', opacity: 0.1,
          backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)`,
          backgroundSize: `${TILE}px ${TILE}px`, backgroundPosition: `0 0, ${TILE/2}px ${TILE/2}px`, pointerEvents: 'none', borderRadius: '2px'
        }} />
      )}
      {area.texture === 'lines' && (
        <div style={{ 
          width: '100%', height: '100%', opacity: 0.15,
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 12px)`,
          pointerEvents: 'none', borderRadius: '2px'
        }} />
      )}

      {isSelected && (
        <>
          {/* Handles */}
          {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(pos => (
            <div
              key={pos}
              style={handleStyle(pos)}
              onPointerDown={(e) => handleResizeStart(e, pos)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
          ))}

          {/* Toolbar */}
          <div style={{
            position: 'absolute', top: -45, left: 0,
            background: '#222', padding: '6px 12px', borderRadius: 8,
            display: 'flex', gap: 12, alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '1px solid #444',
            whiteSpace: 'nowrap',
            color: '#eee',
            fontSize: 12,
            zIndex: 100
          }}>
            <input
              type="text"
              value={area.name}
              onChange={e => onChange({ ...area, name: e.target.value })}
              onPointerDown={e => e.stopPropagation()}
              onKeyDown={e => e.stopPropagation()}
              placeholder="Area name"
              style={{
                background: 'rgba(0,0,0,0.3)', border: '1px solid #444',
                color: '#fff', padding: '4px 8px', borderRadius: 4, width: 120
              }}
            />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Type</span>
                <select 
                  value={area.texture || 'solid'} 
                  onChange={e => onChange({ ...area, texture: e.target.value as any })}
                  onPointerDown={e => e.stopPropagation()}
                  style={{
                    background: 'rgba(0,0,0,0.3)', border: '1px solid #444',
                    color: '#fff', padding: '2px 4px', borderRadius: 4, cursor: 'pointer', outline: 'none'
                  }}
                >
                  <option value="solid">Solid</option>
                  <option value="grid">Grid Tiles</option>
                  <option value="checker">Checkerboard</option>
                  <option value="lines">Stripes</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Floor</span>
                <input 
                  type="color" 
                  value={area.floor || '#f3f4f6'} 
                  onChange={e => onChange({ ...area, floor: e.target.value })}
                  onPointerDown={e => e.stopPropagation()}
                  style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Color</span>
                <input 
                  type="color" 
                  value={area.color || '#3b82f6'} 
                  onChange={e => onChange({ ...area, color: e.target.value })}
                  onPointerDown={e => e.stopPropagation()}
                  style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                />
              </div>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              onPointerDown={e => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: 4 }}
            >
              <Trash size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
