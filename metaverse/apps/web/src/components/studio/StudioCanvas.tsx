import { useRef, useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { Prefab } from './prefabs';
import { prefabs } from './prefabs';
import type { SpaceElement } from '../arena/ElementsPanel';
import { StudioElement } from './StudioElement';

interface Props {
  tool: string;
  elements: SpaceElement[];
  setElements: React.Dispatch<React.SetStateAction<SpaceElement[]>>;
  mapImage: string;
  dimensions: { w: number; h: number };
  selectedElId: string | null;
  setSelectedElId: (id: string | null) => void;
  setStatus: (s: string) => void;
  onExit: () => void;
}

const TILE = 32;

export function StudioCanvas({ tool, elements, setElements, mapImage, dimensions, selectedElId, setSelectedElId, setStatus, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  // Zoom
  const [zoom, setZoom] = useState(1);

  // Drag preview state
  const [dragHoverPos, setDragHoverPos] = useState<{ x: number, y: number, occupied: boolean } | null>(null);

  // Element drag (repositioning placed elements)
  const [draggingElId, setDraggingElId] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });

  // --- Screen coords to grid ---
  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const sx = (clientX - rect.left - pan.x) / zoom;
    const sy = (clientY - rect.top - pan.y) / zoom;
    return { x: Math.round(sx / TILE), y: Math.round(sy / TILE) };
  }, [pan, zoom]);

  // --- Check collision ---
  const isOccupied = useCallback((gx: number, gy: number, ignoreId?: string) => {
    return elements.some(el => {
      if (el.id === ignoreId) return false;
      const w = el.element.width || 1;
      const h = el.element.height || 1;
      return gx >= el.x && gx < el.x + w && gy >= el.y && gy < el.y + h;
    });
  }, [elements]);

  // --- Native Wheel Event (Prevents Browser Zoom) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // If not holding Ctrl, PAN the map
      if (!e.ctrlKey) {
        setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        return;
      }

      // If holding Ctrl, ZOOM the map (prevent browser zoom!)
      e.preventDefault(); 
      
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prevZoom => {
        const newZoom = Math.max(0.2, Math.min(3, prevZoom * zoomFactor));
        if (newZoom !== prevZoom) {
          const logicalX = (mouseX - pan.x) / prevZoom;
          const logicalY = (mouseY - pan.y) / prevZoom;
          setPan({
            x: mouseX - logicalX * newZoom,
            y: mouseY - logicalY * newZoom
          });
        }
        return newZoom;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [pan.x, pan.y]);

  // --- Place from sidebar drop ---
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragHoverPos(null);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const card: Prefab = JSON.parse(raw);
      const { x, y } = screenToGrid(e.clientX, e.clientY);

      if (isOccupied(x, y)) {
        setStatus(`You can't have areas colliding with each other.`);
        return;
      }

      const newEls: SpaceElement[] = [];
      const baseId = `draft-${Date.now()}`;

      // Base element (Room / Floor area)
      newEls.push({
        id: baseId,
        x, y,
        element: {
          id: 'draft',
          width: parseInt(card.size.split(' x ')[0]) || 2,
          height: parseInt(card.size.split(' x ')[1]) || 2,
          imageUrl: card.thumb || '/elements/chair.svg',
          static: true,
          name: card.title,
          category: card.area,
          floor: card.items ? '#f3f4f6' : null, // Add a generic light floor color to composite areas by default
        },
      });

      // Child elements
      if (card.items) {
        card.items.forEach((item, idx) => {
          const childPrefab = prefabs.find(p => p.kind === item.kind);
          if (childPrefab) {
            newEls.push({
              id: `${baseId}-child-${idx}`,
              x: x + item.dx,
              y: y + item.dy,
              element: {
                id: `draft-child-${idx}`,
                width: parseInt(childPrefab.size.split(' x ')[0]) || 1,
                height: parseInt(childPrefab.size.split(' x ')[1]) || 1,
                imageUrl: childPrefab.thumb || '/elements/chair.svg',
                static: true,
                name: childPrefab.title,
                category: childPrefab.area,
              },
            });
          }
        });
      }

      setElements(prev => [...prev, ...newEls]);
      setSelectedElId(baseId);
      setStatus(`${card.title} placed! Select it to edit.`);
    } catch { /* ignore */ }
  };

  const handleDragOver = (e: React.DragEvent) => { 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'copy'; 
    const { x, y } = screenToGrid(e.clientX, e.clientY);
    
    // Check if dragging from sidebar
    const card = (window as any).__draggedPrefab as Prefab;
    if (card) {
      const occupied = isOccupied(x, y); 
      setDragHoverPos({ x, y, occupied });
    }
  };

  const handleDragLeave = () => {
    setDragHoverPos(null);
  };

  // --- Pan (middle-click, right-click, or hand tool) ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (draggingElId) return;
    if (e.button === 1 || e.button === 2 || (e.button === 0 && tool === 'hand')) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({ x: panStart.current.px + e.clientX - panStart.current.x, y: panStart.current.py + e.clientY - panStart.current.y });
    }
  };

  const handlePointerUp = () => setIsPanning(false);

  // --- Element drag (reposition) ---
  const startElDrag = (elId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const el = elements.find(e => e.id === elId);
    if (!el) return;
    setDraggingElId(elId);
    dragStart.current = { x: e.clientX, y: e.clientY, elX: el.x, elY: el.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveEl = (e: React.PointerEvent) => {
    if (!draggingElId) return;
    const dx = (e.clientX - dragStart.current.x) / zoom;
    const dy = (e.clientY - dragStart.current.y) / zoom;
    const newX = dragStart.current.elX + Math.round(dx / TILE);
    const newY = dragStart.current.elY + Math.round(dy / TILE);
    setElements(prev => prev.map(el => el.id === draggingElId ? { ...el, x: newX, y: newY } : el));
  };

  const endElDrag = () => {
    if (draggingElId) {
      const el = elements.find(e => e.id === draggingElId);
      if (el && isOccupied(el.x, el.y, el.id)) {
        // Snap back
        setElements(prev => prev.map(e => e.id === draggingElId ? { ...e, x: dragStart.current.elX, y: dragStart.current.elY } : e));
        setStatus("Can't place here — space is occupied!");
      }
      setDraggingElId(null);
    }
  };

  // --- Canvas click (deselect) ---
  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-element-id]')) return;
    setSelectedElId(null);
  };

  const visibleElements = elements.filter(
    el => !String(el.element.category ?? '').toLowerCase().includes('floor') && el.element.imageUrl
  );

  const mapW = dimensions.w * TILE;
  const mapH = dimensions.h * TILE;

  return (
    <main
      ref={containerRef}
      style={{ position: 'relative', overflow: 'hidden', background: '#dcf0e2', cursor: isPanning ? 'grabbing' : 'default' }}
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => { handlePointerMove(e); moveEl(e); }}
      onPointerUp={() => { handlePointerUp(); endElDrag(); }}
      onContextMenu={e => e.preventDefault()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Pannable + Zoomable world */}
      <div
        style={{
          position: 'absolute', left: pan.x, top: pan.y,
          width: mapW, height: mapH,
          transform: `scale(${zoom})`, transformOrigin: '0 0',
        }}
        onClick={handleCanvasClick}
      >
        {/* Map image */}
        {mapImage && (
          <img src={mapImage} alt="Map" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated', pointerEvents: 'none' }} />
        )}

        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.06,
          backgroundImage: `linear-gradient(rgba(0,0,0,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.4) 1px, transparent 1px)`,
          backgroundSize: `${TILE}px ${TILE}px`,
        }} />

        {/* Drag Preview Overlay */}
        {dragHoverPos && (window as any).__draggedPrefab && (() => {
          const card = (window as any).__draggedPrefab as Prefab;
          const width = parseInt(card.size.split(' x ')[0]) || 2;
          const height = parseInt(card.size.split(' x ')[1]) || 2;
          return (
            <div style={{
              position: 'absolute',
              left: dragHoverPos.x * TILE,
              top: dragHoverPos.y * TILE,
              width: width * TILE,
              height: height * TILE,
              backgroundColor: dragHoverPos.occupied ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)',
              border: `2px solid ${dragHoverPos.occupied ? '#ef4444' : '#3b82f6'}`,
              zIndex: 50,
              pointerEvents: 'none',
              borderRadius: 4
            }} />
          );
        })()}

        {/* Elements */}
        {visibleElements.map(el => (
          <StudioElement
            key={el.id}
            el={el}
            isSelected={selectedElId === el.id}
            tool={tool}
            TILE={TILE}
            onSelect={() => setSelectedElId(selectedElId === el.id ? null : el.id)}
            onDelete={() => {
              setElements(prev => prev.filter(x => x.id !== el.id));
              setSelectedElId(null);
              setStatus('Deleted');
            }}
            onUpdate={(updatedEl) => setElements(prev => prev.map(x => x.id === el.id ? updatedEl : x))}
            startElDrag={startElDrag}
          />
        ))}
      </div>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 80, right: 24, display: 'flex', flexDirection: 'column',
        background: '#fff', borderRadius: 8, border: '1px solid #e5e5e5', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden',
      }}>
        <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} style={{ border: 'none', background: 'transparent', padding: '8px 10px', cursor: 'pointer', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
          <ZoomIn size={16} />
        </button>
        <button onClick={() => setZoom(1)} style={{ border: 'none', background: 'transparent', padding: '4px 10px', cursor: 'pointer', color: '#6b7280', fontSize: 10, fontWeight: 700, borderBottom: '1px solid #f3f4f6' }}>
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} style={{ border: 'none', background: 'transparent', padding: '8px 10px', cursor: 'pointer', color: '#374151' }}>
          <ZoomOut size={16} />
        </button>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: '#1f2937', color: '#fff', padding: '10px 20px', borderRadius: 999,
        display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 10, whiteSpace: 'nowrap',
      }}>
        <span style={{ color: '#fbbf24' }}>⚠</span>
        <span>No one else can edit or decorate the office until you exit Studio.</span>
        <button onClick={onExit} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 999, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Got it</button>
      </div>
    </main>
  );
}
