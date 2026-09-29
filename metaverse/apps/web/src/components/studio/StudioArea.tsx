import { useState, useRef } from 'react';
import { Trash, RefreshCcw, Copy, Layers } from 'lucide-react';
import type { AreaType } from './types';

interface Props {
  area: AreaType;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updated: AreaType) => void;
  onDelete: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onRotate: () => void;
  onDuplicate: () => void;
  onMultiply: (config: { type: 'grid'|'circular', count: number, cols: number, gap: number, radius: number }) => void;
  zoom: number;
}

const TILE = 32;

export function StudioArea({ area, isSelected, onSelect, onChange, onDelete, onDragStart, onRotate, onDuplicate, onMultiply, zoom }: Props) {
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [showMultiply, setShowMultiply] = useState(false);
  const [multiplyConfig, setMultiplyConfig] = useState<{type: 'grid'|'circular', count: number, cols: number, gap: number, radius: number}>({ type: 'grid', count: 5, cols: 5, gap: 1, radius: 5 });
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

  // Calculate z-index: smaller areas get higher z-index so they always stay on top of larger areas
  // 10000 is an arbitrary high number. Subtract area to make small areas higher.
  const baseZIndex = Math.max(1, 10000 - (area.w * area.h));

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
    zIndex: baseZIndex + (isSelected ? 1 : 0),
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
      {area.texture === 'stripes' && (
        <div style={{ 
          width: '100%', height: '100%', opacity: 0.15,
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 12px)`,
          pointerEvents: 'none', borderRadius: '2px'
        }} />
      )}
      {area.texture === 'dots' && (
        <div style={{ 
          width: '100%', height: '100%', opacity: 0.2,
          backgroundImage: `radial-gradient(#000 15%, transparent 16%), radial-gradient(#000 15%, transparent 16%)`,
          backgroundSize: `20px 20px`, backgroundPosition: `0 0, 10px 10px`, pointerEvents: 'none', borderRadius: '2px'
        }} />
      )}
      {area.texture === 'planks' && (
        <div style={{ 
          width: '100%', height: '100%', opacity: 0.15,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='42' height='44' viewBox='0 0 42 44'%3E%3Cg id='Page-1' fill='none' fill-rule='evenodd'%3E%3Cg id='brick-wall' fill='%23000000' fill-opacity='1'%3E%3Cpath d='M0 0h42v44H0V0zm1 1h40v20H1V1zM0 23h20v20H0V23zm22 0h20v20H22V23z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: 'none', borderRadius: '2px'
        }} />
      )}
      {area.texture === 'hex' && (
        <div style={{ 
          width: '100%', height: '100%', opacity: 0.15,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='%23000000' fill-opacity='1' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: 'none', borderRadius: '2px'
        }} />
      )}
      {area.texture === 'zigzag' && (
        <div style={{ 
          width: '100%', height: '100%', opacity: 0.12,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='nonzero'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L40 0h-1.41v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: 'none', borderRadius: '2px'
        }} />
      )}
      {area.texture === 'tiles' && (
        <div style={{ 
          width: '100%', height: '100%', opacity: 0.15,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M0 0h19v19H0V0zm1 1h17v17H1V1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
                  value={area.type || 'public'} 
                  onChange={e => onChange({ ...area, type: e.target.value as any })}
                  onPointerDown={e => e.stopPropagation()}
                  style={{
                    background: 'rgba(0,0,0,0.3)', border: '1px solid #444',
                    color: '#fff', padding: '2px 4px', borderRadius: 4, cursor: 'pointer', outline: 'none'
                  }}
                >
                  <option value="public">Public Area</option>
                  <option value="private">Private Room</option>
                  <option value="seat">Seat Spot</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Texture</span>
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
                  <option value="stripes">Stripes</option>
                  <option value="dots">Dots</option>
                  <option value="planks">Wood Planks</option>
                  <option value="hex">Hexagons</option>
                  <option value="zigzag">Herringbone</option>
                  <option value="tiles">Floor Tiles</option>
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
              onClick={(e) => { e.stopPropagation(); onRotate(); }} 
              onPointerDown={e => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
              title="Rotate Area"
            >
              <RefreshCcw size={14} />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }} 
              onPointerDown={e => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
              title="Duplicate Area"
            >
              <Copy size={14} />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); setShowMultiply(!showMultiply); }} 
              onPointerDown={e => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', color: showMultiply ? '#6366f1' : '#fff', cursor: 'pointer', padding: 4 }}
              title="Multiply / Auto-Arrange"
            >
              <Layers size={14} />
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              onPointerDown={e => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: 4 }}
            >
              <Trash size={14} />
            </button>
          </div>
          {/* Multiply Dropdown */}
          {showMultiply && (
            <div 
              style={{
                position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 12,
                background: '#222', borderRadius: 8, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 60,
                display: 'flex', flexDirection: 'column', gap: 10, width: 220
              }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: 13, fontWeight: 500 }}>
                Auto-Arrange
                <span onClick={() => setShowMultiply(false)} style={{ cursor: 'pointer', color: '#888' }}>×</span>
              </div>
              <select 
                value={multiplyConfig.type} 
                onChange={e => setMultiplyConfig(prev => ({ ...prev, type: e.target.value as 'grid'|'circular' }))}
                style={{ background: '#111', color: '#fff', border: '1px solid #444', padding: 4, borderRadius: 4, outline: 'none' }}
              >
                <option value="grid">Grid (Rows/Cols)</option>
                <option value="circular">Circular (Round)</option>
              </select>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa', fontSize: 12 }}>Total Copies</span>
                <input type="number" value={multiplyConfig.count} onChange={e => setMultiplyConfig(prev => ({...prev, count: parseInt(e.target.value)||1}))} style={{ width: 60, background: '#111', color: '#fff', border: '1px solid #444', padding: 2, borderRadius: 4 }} />
              </div>

              {multiplyConfig.type === 'grid' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa', fontSize: 12 }}>Columns (Per Row)</span>
                    <input type="number" value={multiplyConfig.cols} onChange={e => setMultiplyConfig(prev => ({...prev, cols: parseInt(e.target.value)||1}))} style={{ width: 60, background: '#111', color: '#fff', border: '1px solid #444', padding: 2, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa', fontSize: 12 }}>Gap (Tiles)</span>
                    <input type="number" value={multiplyConfig.gap} onChange={e => setMultiplyConfig(prev => ({...prev, gap: parseInt(e.target.value)||0}))} style={{ width: 60, background: '#111', color: '#fff', border: '1px solid #444', padding: 2, borderRadius: 4 }} />
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#aaa', fontSize: 12 }}>Radius (Distance)</span>
                  <input type="number" value={multiplyConfig.radius} onChange={e => setMultiplyConfig(prev => ({...prev, radius: parseInt(e.target.value)||1}))} style={{ width: 60, background: '#111', color: '#fff', border: '1px solid #444', padding: 2, borderRadius: 4 }} />
                </div>
              )}

              <button 
                onClick={() => { setShowMultiply(false); onMultiply(multiplyConfig); }}
                style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px', borderRadius: 4, cursor: 'pointer', marginTop: 4, fontWeight: 500 }}
              >
                Generate
              </button>
            </div>
          )}

        </>
      )}
    </div>
  );
}
