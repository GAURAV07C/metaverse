import { useRef, useState, useCallback, useEffect } from 'react';
import type { Prefab } from './types';
import type { SpaceElement } from '../arena/ElementsPanel';
import { StudioElement } from './StudioElement';
import { StudioArea } from './StudioArea';
import type { AreaType } from './types';
import { RoomConfigModal } from './RoomConfigModal';
import { StudioEditLockBanner } from './StudioEditLockBanner';
import { StudioZoomControls } from './StudioZoomControls';

interface Props {
  tool: string;
  availableElements: Prefab[];
  elements: SpaceElement[];
  setElements: React.Dispatch<React.SetStateAction<SpaceElement[]>>;
  areas?: AreaType[];
  setAreas?: React.Dispatch<React.SetStateAction<AreaType[]>>;
  mapImage: string;
  dimensions: { w: number; h: number };
  selectedElId: string | null;
  setSelectedElId: (id: string | null) => void;
  setStatus: (s: string) => void;
  onExit: () => void;
}

const TILE = 32;

export function StudioCanvas({ tool, availableElements, elements, setElements, areas = [], setAreas, dimensions, selectedElId, setSelectedElId, setStatus, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  // Zoom
  const [zoom, setZoom] = useState(1);
  const hasFitContent = useRef(false);

  // Drag preview state
  const [dragHoverPos, setDragHoverPos] = useState<{ x: number, y: number, occupied: boolean } | null>(null);

  // Element drag (repositioning placed elements)
  const [draggingElId, setDraggingElId] = useState<string | null>(null);
  const [draggingAreaId, setDraggingAreaId] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // Area drawing state
  const [drawingArea, setDrawingArea] = useState<{ startX: number, startY: number, curX: number, curY: number } | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [showWalkability, setShowWalkability] = useState(false);

  // --- Screen coords to grid ---
  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const sx = (clientX - rect.left - pan.x) / zoom;
    const sy = (clientY - rect.top - pan.y) / zoom;
    return { x: Math.round(sx / TILE), y: Math.round(sy / TILE) };
  }, [pan, zoom]);

  // --- Check collision ---
  const isOccupied = useCallback((gx: number, gy: number, gw: number = 1, gh: number = 1, ignoreId?: string) => {
    return elements.some(el => {
      if (el.id === ignoreId) return false;
      const w = el.element.width || 1;
      const h = el.element.height || 1;
      // Two rectangles overlap if:
      return gx < el.x + w && gx + gw > el.x && gy < el.y + h && gy + gh > el.y;
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

  const [pendingRoom, setPendingRoom] = useState<{ x: number, y: number, prefab: Prefab } | null>(null);
  const [roomConfig, setRoomConfig] = useState({ people: 4, floor: '#f3f4f6', wall: '#64748b', tint: '' });

  useEffect(() => {
    if (hasFitContent.current || !containerRef.current) return;
    if (elements.length === 0 && areas.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach((el) => {
      const w = el.element.width || 1;
      const h = el.element.height || 1;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + w);
      maxY = Math.max(maxY, el.y + h);
    });

    areas.forEach((area) => {
      minX = Math.min(minX, area.x);
      minY = Math.min(minY, area.y);
      maxX = Math.max(maxX, area.x + area.w);
      maxY = Math.max(maxY, area.y + area.h);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;

    const rect = containerRef.current.getBoundingClientRect();
    const contentW = Math.max(1, (maxX - minX) * TILE);
    const contentH = Math.max(1, (maxY - minY) * TILE);
    const nextZoom = Math.max(0.35, Math.min(1.25, Math.min((rect.width * 0.82) / contentW, (rect.height * 0.82) / contentH)));
    const contentCenterX = ((minX + maxX) / 2) * TILE;
    const contentCenterY = ((minY + maxY) / 2) * TILE;

    setZoom(nextZoom);
    setPan({
      x: rect.width / 2 - contentCenterX * nextZoom,
      y: rect.height / 2 - contentCenterY * nextZoom,
    });
    hasFitContent.current = true;
  }, [elements, areas]);

  // --- Place from sidebar drop ---
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragHoverPos(null);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const card: Prefab = JSON.parse(raw);
      const { x, y } = screenToGrid(e.clientX, e.clientY);

      const w = parseInt(card.size.split(' x ')[0]) || 1;
      const h = parseInt(card.size.split(' x ')[1]) || 1;

      if (isOccupied(x, y, w, h)) {
        setStatus(`You can't have elements colliding with each other.`);
        return;
      }

      if (card.templateElements || card.templateAreas) {
        const newEls: SpaceElement[] = [];
        const newArs: AreaType[] = [];
        const timestamp = Date.now();

        if (card.templateElements) {
          card.templateElements.forEach((tel, idx) => {
            const childPrefab = availableElements.find(p => p.kind === tel.elementId);
            if (childPrefab) {
              newEls.push({
                id: `template-${timestamp}-el-${idx}`,
                x: x + tel.x,
                y: y + tel.y,
                element: {
                  id: childPrefab.kind,
                  width: parseInt(childPrefab.size.split(' x ')[0]) || 1,
                  height: parseInt(childPrefab.size.split(' x ')[1]) || 1,
                  imageUrl: childPrefab.thumb || '',
                  static: true,
                  name: childPrefab.title,
                  category: childPrefab.area,
                }
              });
            }
          });
        }

        if (card.templateAreas && setAreas) {
          card.templateAreas.forEach((ta, idx) => {
            newArs.push({
              ...ta,
              id: `template-${timestamp}-area-${idx}`,
              x: x + ta.x,
              y: y + ta.y
            });
          });
          setAreas(prev => [...prev, ...newArs]);
        }

        setElements(prev => [...prev, ...newEls]);
        setStatus(`${card.title} placed successfully!`);
        return;
      }

      if (card.area === 'Rooms') {
        setPendingRoom({ x, y, prefab: card });
        return;
      }

      const newEls: SpaceElement[] = [];
      const baseId = `draft-${Date.now()}`;

      // Base element (Room / Floor area)
      newEls.push({
        id: baseId,
        x, y,
        element: {
          id: card.kind,
          width: parseInt(card.size.split(' x ')[0]) || 2,
          height: parseInt(card.size.split(' x ')[1]) || 2,
          imageUrl: card.thumb || '',
          static: true,
          name: card.title,
          category: card.area,
          floor: card.items ? '#f3f4f6' : null,
        },
      });

      // Child elements
      if (card.items) {
        card.items.forEach((item, idx) => {
          const childPrefab = availableElements.find(p => p.kind === item.kind);
          if (childPrefab) {
            newEls.push({
              id: `${baseId}-child-${idx}`,
              x: x + item.dx,
              y: y + item.dy,
              element: {
                id: childPrefab.kind,
                width: parseInt(childPrefab.size.split(' x ')[0]) || 1,
                height: parseInt(childPrefab.size.split(' x ')[1]) || 1,
                imageUrl: childPrefab.thumb || '',
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

  const handleGenerateRoom = () => {
    if (!pendingRoom) return;
    
    const { x, y, prefab } = pendingRoom;
    const newEls: SpaceElement[] = [];
    const newAreas: AreaType[] = [];
    const baseId = `room-${Date.now()}`;
    
    // Calculate dynamic size based on people
    let width = parseInt(prefab.size.split(' x ')[0]) || 4;
    let height = parseInt(prefab.size.split(' x ')[1]) || 4;
    
    // Scale room size up if there are more people
    if (roomConfig.people > 4) {
      width += Math.floor((roomConfig.people - 4) / 2);
      height += Math.floor((roomConfig.people - 4) / 2);
    }
    
    newAreas.push({
      id: `room-area-${Date.now()}`,
      name: `${prefab.title} (${roomConfig.people} pax)`,
      type: 'room',
      floor: roomConfig.floor || '#ffffff',
      color: roomConfig.wall || '#9ca3af',
      texture: 'solid',
      x,
      y,
      w: width,
      h: height
    });
    // Pick some default table and chair for the room
    const tables = availableElements.filter(e => e.area === 'Tables');
    const chairs = availableElements.filter(e => e.area === 'Seating');
    
    const defaultTable = tables[0] || null;
    const defaultChair = chairs[0] || null;
    
    if (defaultTable && defaultChair) {
      // Place a table in the center
      const tableW = parseInt(defaultTable.size.split(' x ')[0]) || 1;
      const tableH = parseInt(defaultTable.size.split(' x ')[1]) || 1;
      const tableX = x + Math.floor((width - tableW) / 2);
      const tableY = y + Math.floor((height - tableH) / 2);
      
      newEls.push({
        id: `${baseId}-table`,
        x: tableX,
        y: tableY,
        element: {
          id: defaultTable.kind, width: tableW, height: tableH, imageUrl: defaultTable.thumb || '', static: true, name: defaultTable.title, category: defaultTable.area
        }
      });
      
      // Place chairs around the table based on people count
      for (let i = 0; i < roomConfig.people; i++) {
        // Simple logic to distribute chairs around table
        let cx = tableX;
        let cy = tableY;
        if (i % 4 === 0) { cx -= 1; cy += i/4; }
        else if (i % 4 === 1) { cx += tableW; cy += Math.floor(i/4); }
        else if (i % 4 === 2) { cx += Math.floor(i/4); cy -= 1; }
        else { cx += Math.floor(i/4); cy += tableH; }
        
        newEls.push({
          id: `${baseId}-chair-${i}`,
          x: cx, y: cy,
          element: {
            id: defaultChair.kind, width: 1, height: 1, imageUrl: defaultChair.thumb || '', static: true, name: defaultChair.title, category: defaultChair.area
          }
        });

        newAreas.push({
          id: `${baseId}-spot-${i}`,
          name: `Spot ${i + 1}`,
          type: 'seat',
          floor: 'rgba(249, 115, 22, 0.3)',
          color: '#f97316',
          texture: 'solid',
          x: cx,
          y: cy,
          w: 1,
          h: 1
        });
      }
    }
    
    setElements(prev => [...prev, ...newEls]);
    if (setAreas) setAreas(prev => [...prev, ...newAreas]);
    setSelectedElId(null);
    setStatus(`${prefab.title} generated as an audio room! Add spots inside it for seating.`);
    setPendingRoom(null);
  };

  const handleDragOver = (e: React.DragEvent) => {  
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'copy'; 
    const { x, y } = screenToGrid(e.clientX, e.clientY);
    
    // Check if dragging from sidebar
    const card = (window as any).__draggedPrefab as Prefab;
    if (card) {
      const w = parseInt(card.size.split(' x ')[0]) || 1;
      const h = parseInt(card.size.split(' x ')[1]) || 1;
      const occupied = isOccupied(x, y, w, h); 
      setDragHoverPos({ x, y, occupied });
    }
  };

  const handleDragLeave = () => {
    setDragHoverPos(null);
  };

  // --- Pointer down ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (draggingElId) return;

    if (e.button === 1 || e.button === 2 || (e.button === 0 && tool === 'hand')) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (e.button === 0 && (tool === 'area' || tool === 'room' || tool === 'seat' || tool === 'spawn' || tool === 'portal' || tool === 'spotlight')) {
      const { x, y } = screenToGrid(e.clientX, e.clientY);
      setDrawingArea({ startX: x, startY: y, curX: x, curY: y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({ x: panStart.current.px + e.clientX - panStart.current.x, y: panStart.current.py + e.clientY - panStart.current.y });
    } else if (drawingArea) {
      const { x, y } = screenToGrid(e.clientX, e.clientY);
      setDrawingArea(prev => prev ? { ...prev, curX: x, curY: y } : null);
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    if (drawingArea) {
      const minX = Math.min(drawingArea.startX, drawingArea.curX);
      const minY = Math.min(drawingArea.startY, drawingArea.curY);
      const maxX = Math.max(drawingArea.startX, drawingArea.curX);
      const maxY = Math.max(drawingArea.startY, drawingArea.curY);
      
      const w = Math.max(1, maxX - minX);
      const h = Math.max(1, maxY - minY);

      if (tool === 'area' && setAreas) {
        const newArea: AreaType = {
          id: `area-${Date.now()}`,
          name: 'New Area',
          type: 'public',
          floor: '#f3f4f6',
          color: 'rgba(59, 130, 246, 0.4)',
          x: minX,
          y: minY,
          w,
          h
        };

        setAreas(prev => [...prev, newArea]);
        setSelectedAreaId(newArea.id);
        setSelectedElId(null);
        setStatus("Area created! Give it a name.");
      } else if (tool === 'room' && setAreas) {
        const newRoomArea: AreaType = {
          id: `room-area-${Date.now()}`,
          name: 'New Room',
          type: 'room',
          floor: '#ffffff',
          color: '#9ca3af', // Gray color to signify walls
          texture: 'solid',
          x: minX,
          y: minY,
          w,
          h
        };
        setAreas(prev => [...prev, newRoomArea]);
        setSelectedAreaId(newRoomArea.id);
        setSelectedElId(null);
        setStatus("Room created! Add spots inside it for seats.");
      } else if (tool === 'seat' && setAreas) {
        const newSeatArea: AreaType = {
          id: `seat-area-${Date.now()}`,
          name: 'Spot',
          type: 'seat',
          floor: 'rgba(249, 115, 22, 0.3)',
          color: '#f97316',
          texture: 'solid',
          x: minX,
          y: minY,
          w,
          h
        };
        setAreas(prev => [...prev, newSeatArea]);
        setSelectedAreaId(newSeatArea.id);
        setSelectedElId(null);
        setStatus("Room spot created!");
      } else if ((tool === 'spawn' || tool === 'portal' || tool === 'spotlight') && setAreas) {
        const effectMeta = {
          spawn: { name: 'Spawn Point', floor: 'rgba(34, 197, 94, 0.28)', color: '#22c55e', status: 'Spawn point created!' },
          portal: { name: 'Portal', floor: 'rgba(168, 85, 247, 0.28)', color: '#a855f7', status: 'Portal created! Add another portal to connect them.' },
          spotlight: { name: 'Spotlight', floor: 'rgba(250, 204, 21, 0.28)', color: '#facc15', status: 'Spotlight area created!' },
        }[tool as 'spawn' | 'portal' | 'spotlight'];
        const newEffectArea: AreaType = {
          id: `${tool}-area-${Date.now()}`,
          name: effectMeta.name,
          type: tool as 'spawn' | 'portal' | 'spotlight',
          floor: effectMeta.floor,
          color: effectMeta.color,
          texture: 'solid',
          x: minX,
          y: minY,
          w,
          h
        };
        setAreas(prev => [...prev, newEffectArea]);
        setSelectedAreaId(newEffectArea.id);
        setSelectedElId(null);
        setStatus(effectMeta.status);
      }
      
      setDrawingArea(null);
    }
  };

  // --- Element drag (reposition) ---
  const dragGroup = useRef<{ id: string, sx: number, sy: number }[]>([]);

  const startElDrag = (elId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const el = elements.find(e => e.id === elId);
    if (!el) return;
    
    setDraggingElId(elId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    
    if (el.element.category === 'Rooms') {
      const roomRight = el.x + (el.element.width || 1);
      const roomBottom = el.y + (el.element.height || 1);
      const insideEls = elements.filter(other => {
         const cx = other.x + (other.element.width || 1)/2;
         const cy = other.y + (other.element.height || 1)/2;
         return cx >= el.x && cx <= roomRight && cy >= el.y && cy <= roomBottom;
      });
      dragGroup.current = insideEls.map(x => ({ id: x.id, sx: x.x, sy: x.y }));
    } else {
      dragGroup.current = [{ id: el.id, sx: el.x, sy: el.y }];
    }
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const startAreaDrag = (areaId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    
    setDraggingAreaId(areaId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    
    const areaRight = area.x + area.w;
    const areaBottom = area.y + area.h;
    
    const insideEls = elements.filter(other => {
       const cx = other.x + (other.element.width || 1)/2;
       const cy = other.y + (other.element.height || 1)/2;
       return cx >= area.x && cx <= areaRight && cy >= area.y && cy <= areaBottom;
    });
    
    // Find smaller areas inside this area
    const insideAreas = areas.filter(other => {
       if (other.id === area.id) return false;
       return other.x >= area.x && other.x + other.w <= areaRight && other.y >= area.y && other.y + other.h <= areaBottom;
    });
    
    dragGroup.current = [
      { id: area.id, sx: area.x, sy: area.y },
      ...insideEls.map(x => ({ id: x.id, sx: x.x, sy: x.y })),
      ...insideAreas.map(x => ({ id: x.id, sx: x.x, sy: x.y }))
    ];
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const rotateArea = (areaId: string) => {
    const parentArea = areas.find(a => a.id === areaId);
    if (!parentArea) return;

    const cx = parentArea.x + parentArea.w / 2;
    const cy = parentArea.y + parentArea.h / 2;

    const areaRight = parentArea.x + parentArea.w;
    const areaBottom = parentArea.y + parentArea.h;

    // Rotate the parent area itself
    const newParentW = parentArea.h;
    const newParentH = parentArea.w;
    const newParentX = cx - newParentW / 2;
    const newParentY = cy - newParentH / 2;

    if (setAreas) {
      setAreas(prev => prev.map(a => {
        if (a.id === areaId) {
          return { ...a, x: newParentX, y: newParentY, w: newParentW, h: newParentH };
        }
        
        // Check if this is a nested area
        if (a.x >= parentArea.x && a.x + a.w <= areaRight && a.y >= parentArea.y && a.y + a.h <= areaBottom) {
          const acx = a.x + a.w / 2;
          const acy = a.y + a.h / 2;
          const rx = acx - cx;
          const ry = acy - cy;
          // Rotate 90 deg clockwise
          const new_acx = cx - ry;
          const new_acy = cy + rx;
          const new_w = a.h;
          const new_h = a.w;
          return { ...a, x: new_acx - new_w / 2, y: new_acy - new_h / 2, w: new_w, h: new_h };
        }
        
        return a;
      }));
    }

    // Rotate elements inside
    setElements(prev => prev.map(el => {
      const ew = el.element.width || 1;
      const eh = el.element.height || 1;
      const ecx = el.x + ew / 2;
      const ecy = el.y + eh / 2;
      
      // Check if inside
      if (ecx >= parentArea.x && ecx <= areaRight && ecy >= parentArea.y && ecy <= areaBottom) {
        const rx = ecx - cx;
        const ry = ecy - cy;
        const new_ecx = cx - ry;
        const new_ecy = cy + rx;
        const new_x = new_ecx - ew / 2;
        const new_y = new_ecy - eh / 2;
        return { ...el, x: new_x, y: new_y, rotation: ((el.rotation || 0) + 90) % 360 };
      }
      return el;
    }));
  };

  const duplicateArea = (areaId: string) => {
    const parentArea = areas.find(a => a.id === areaId);
    if (!parentArea) return;

    const areaRight = parentArea.x + parentArea.w;
    const areaBottom = parentArea.y + parentArea.h;

    // Offset for the new copy
    const OFFSET_X = parentArea.w + 1;
    const OFFSET_Y = 0;

    // Find nested areas
    const insideAreas = areas.filter(a => 
      a.id !== areaId && 
      a.x >= parentArea.x && a.x + a.w <= areaRight && 
      a.y >= parentArea.y && a.y + a.h <= areaBottom
    );

    // Find nested elements
    const insideEls = elements.filter(el => {
      const ew = el.element.width || 1;
      const eh = el.element.height || 1;
      const ecx = el.x + ew / 2;
      const ecy = el.y + eh / 2;
      return ecx >= parentArea.x && ecx <= areaRight && ecy >= parentArea.y && ecy <= areaBottom;
    });

    const newAreas: AreaType[] = [];
    
    // Copy parent area
    const newParentId = `area-${Date.now()}`;
    newAreas.push({
      ...parentArea,
      id: newParentId,
      x: parentArea.x + OFFSET_X,
      y: parentArea.y + OFFSET_Y
    });

    // Copy nested areas
    insideAreas.forEach((a, i) => {
      newAreas.push({
        ...a,
        id: `area-child-${Date.now()}-${i}`,
        x: a.x + OFFSET_X,
        y: a.y + OFFSET_Y
      });
    });

    // Copy nested elements
    const newElements: SpaceElement[] = insideEls.map((el, i) => ({
      ...el,
      id: `el-child-${Date.now()}-${i}`,
      x: el.x + OFFSET_X,
      y: el.y + OFFSET_Y
    }));

    if (setAreas) setAreas(prev => [...prev, ...newAreas]);
    setElements(prev => [...prev, ...newElements]);
    
    setSelectedAreaId(newParentId);
    setSelectedElId(null);
    setStatus("Area and its contents duplicated!");
  };

  const multiplyArea = (areaId: string, config: { type: 'grid'|'circular', count: number, cols: number, gap: number, radius: number }) => {
    const parentArea = areas.find(a => a.id === areaId);
    if (!parentArea) return;

    const areaRight = parentArea.x + parentArea.w;
    const areaBottom = parentArea.y + parentArea.h;

    // Find nested areas & elements
    const insideAreas = areas.filter(a => a.id !== areaId && a.x >= parentArea.x && a.x + a.w <= areaRight && a.y >= parentArea.y && a.y + a.h <= areaBottom);
    const insideEls = elements.filter(el => {
      const ew = el.element.width || 1;
      const eh = el.element.height || 1;
      const ecx = el.x + ew / 2;
      const ecy = el.y + eh / 2;
      return ecx >= parentArea.x && ecx <= areaRight && ecy >= parentArea.y && ecy <= areaBottom;
    });

    const newAreas: AreaType[] = [];
    const newElements: SpaceElement[] = [];

    for (let i = 1; i < config.count; i++) {
      let offsetX = 0;
      let offsetY = 0;

      if (config.type === 'grid') {
        const row = Math.floor(i / config.cols);
        const col = i % config.cols;
        offsetX = col * (parentArea.w + config.gap);
        offsetY = row * (parentArea.h + config.gap);
      } else {
        // Circular
        const angle = (i * (2 * Math.PI)) / config.count;
        offsetX = config.radius * Math.cos(angle);
        offsetY = config.radius * Math.sin(angle);
      }

      const copyId = `area-clone-${Date.now()}-${i}`;
      
      // Copy parent
      newAreas.push({
        ...parentArea,
        id: copyId,
        x: parentArea.x + Math.round(offsetX),
        y: parentArea.y + Math.round(offsetY)
      });

      // Copy children
      insideAreas.forEach((a, j) => {
        newAreas.push({ ...a, id: `${copyId}-child-${j}`, x: a.x + Math.round(offsetX), y: a.y + Math.round(offsetY) });
      });

      insideEls.forEach((el, j) => {
        newElements.push({ ...el, id: `${copyId}-el-${j}`, x: el.x + Math.round(offsetX), y: el.y + Math.round(offsetY) });
      });
    }

    if (setAreas) setAreas(prev => [...prev, ...newAreas]);
    setElements(prev => [...prev, ...newElements]);
    setStatus(`Generated ${config.count - 1} copies!`);
  };

  const moveEl = (e: React.PointerEvent) => {
    if (!draggingElId && !draggingAreaId) return;
    if (dragGroup.current.length === 0) return;
    const dx = (e.clientX - dragStart.current.x) / zoom;
    const dy = (e.clientY - dragStart.current.y) / zoom;
    const diffX = Math.round(dx / TILE);
    const diffY = Math.round(dy / TILE);
    
    setElements(prev => prev.map(el => {
      const gItem = dragGroup.current.find(g => g.id === el.id);
      if (gItem) {
        return { ...el, x: gItem.sx + diffX, y: gItem.sy + diffY };
      }
      return el;
    }));

    if (draggingAreaId && setAreas) {
      setAreas(prev => prev.map(a => {
        const gItem = dragGroup.current.find(g => g.id === a.id);
        if (gItem) return { ...a, x: gItem.sx + diffX, y: gItem.sy + diffY };
        return a;
      }));
    }
  };

  const endElDrag = () => {
    if (draggingElId) {
      const primary = elements.find(e => e.id === draggingElId);
      if (primary && isOccupied(primary.x, primary.y, primary.element.width || 1, primary.element.height || 1, primary.id)) {
        // Snap ALL back if primary is blocked
        setElements(prev => prev.map(e => {
          const gItem = dragGroup.current.find(g => g.id === e.id);
          if (gItem) return { ...e, x: gItem.sx, y: gItem.sy };
          return e;
        }));
        setStatus("Can't place here — space is occupied!");
      }
      setDraggingElId(null);
      dragGroup.current = [];
    } else if (draggingAreaId) {
      // Allow areas to overlap (no strict collision check for areas)
      setDraggingAreaId(null);
      dragGroup.current = [];
    }
  };

  // --- Canvas click (deselect) ---
  const handleCanvasClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-element-id]')) return;
    if (target.closest('[data-area-id]')) return;
    
    // Deselect elements
    setSelectedElId(null);
    
    // If we are clicking on empty space (not a resize handle or toolbar), deselect area
    if (tool !== 'area' || !target.closest('input')) {
      // Very basic click outside to deselect
      // but wait, StudioArea has pointerDown to select itself, 
      // so if we click canvas, we just deselect both.
      setSelectedAreaId(null);
    }
  };

  const visibleElements = elements.filter(
    el => !String(el.element.category ?? '').toLowerCase().includes('floor') && (el.element.imageUrl || el.element.category === 'Rooms')
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

        {/* Render Areas */}
        {[...areas].sort((a, b) => (b.w * b.h) - (a.w * a.h)).map(area => (
          <StudioArea
            key={area.id}
            area={area}
            allAreas={areas}
            dimensions={dimensions}
            isSelected={selectedAreaId === area.id}
            onSelect={() => {
              setSelectedAreaId(area.id);
              setSelectedElId(null);
            }}
            onDragStart={(e) => startAreaDrag(area.id, e)}
            onRotate={() => rotateArea(area.id)}
            onDuplicate={() => duplicateArea(area.id)}
            onMultiply={(config) => multiplyArea(area.id, config)}
            onChange={(updated) => {
              if (setAreas) {
                setAreas(prev => prev.map(a => {
                  if (a.id === area.id) return updated;
                  if (updated.type === 'spawn' && updated.isDefaultSpawn && a.type === 'spawn') {
                    return { ...a, isDefaultSpawn: false };
                  }
                  return a;
                }));
              }
            }}
            onDelete={() => {
              const areaRight = area.x + area.w;
              const areaBottom = area.y + area.h;

              if (setAreas) {
                setAreas(prev => prev.filter(a => {
                  if (a.id === area.id) return false;
                  const isInside = a.x >= area.x && a.x + a.w <= areaRight && a.y >= area.y && a.y + a.h <= areaBottom;
                  return !isInside;
                }));
              }

              setElements(prev => prev.filter(el => {
                const ew = el.element.width || 1;
                const eh = el.element.height || 1;
                const ecx = el.x + ew / 2;
                const ecy = el.y + eh / 2;
                const isInside = ecx >= area.x && ecx <= areaRight && ecy >= area.y && ecy <= areaBottom;
                return !isInside;
              }));

              setSelectedAreaId(null);
            }}
            zoom={zoom}
          />
        ))}

        {/* Drawing Area Preview */}
        {drawingArea && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(drawingArea.startX, drawingArea.curX) * TILE,
              top: Math.min(drawingArea.startY, drawingArea.curY) * TILE,
              width: Math.max(1, Math.max(drawingArea.startX, drawingArea.curX) - Math.min(drawingArea.startX, drawingArea.curX)) * TILE,
              height: Math.max(1, Math.max(drawingArea.startY, drawingArea.curY) - Math.min(drawingArea.startY, drawingArea.curY)) * TILE,
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              border: '2px dashed #fff',
              pointerEvents: 'none',
              zIndex: 99
            }}
          />
        )}

        {/* Elements */}
        {visibleElements.map(el => (
          <StudioElement
            key={el.id}
            el={el}
            isSelected={selectedElId === el.id}
            tool={tool}
            TILE={TILE}
            onDelete={() => {
              setElements(prev => prev.filter(x => x.id !== el.id));
              setSelectedElId(null);
              setStatus('Deleted');
            }}
            onUpdate={(updatedEl) => setElements(prev => prev.map(x => x.id === el.id ? updatedEl : x))}
            onElementPointerDown={(e) => {
              e.stopPropagation();
              
              // Drill-down logic: If element is in a Small Area, select the Small Area first!
              const ecx = el.x + (el.element.width || 1)/2;
              const ecy = el.y + (el.element.height || 1)/2;
              
              const containingAreas = areas.filter(a => 
                ecx >= a.x && ecx <= a.x + a.w &&
                ecy >= a.y && ecy <= a.y + a.h
              );
              
              if (containingAreas.length > 0) {
                // Get the SMALLEST containing area
                containingAreas.sort((a, b) => (a.w * a.h) - (b.w * b.h));
                const closestParent = containingAreas[0];
                
                // If the closest parent is NOT already selected, select it FIRST!
                if (selectedAreaId !== closestParent.id && selectedElId !== el.id) {
                  setSelectedAreaId(closestParent.id);
                  setSelectedElId(null);
                  startAreaDrag(closestParent.id, e);
                  return; // Don't select the element!
                }
              }

              // Otherwise (parent is already selected, or no parent), select the element
              setSelectedElId(el.id);
              setSelectedAreaId(null);
              startElDrag(el.id, e);
            }}
          />
        ))}

        {/* Walkability Overlay */}
        {showWalkability && elements.map(el => {
          if (!el.element.static) return null;
          const cat = String(el.element.category).toLowerCase();
          const name = String(el.element.name).toLowerCase();
          const id = String(el.element.id).toLowerCase();
          if (cat.includes('room') || cat.includes('floor')) return null;
          if (cat.includes('seating') || name.includes('chair') || name.includes('sofa') || name.includes('couch') || name.includes('bench') || name.includes('stool') || name.includes('seat') || id.includes('chair')) return null;
          
          return (
            <div key={`walk-${el.id}`} style={{
              position: 'absolute',
              left: el.x * TILE,
              top: el.y * TILE,
              width: (el.element.width || 1) * TILE,
              height: (el.element.height || 1) * TILE,
              backgroundColor: 'rgba(239, 68, 68, 0.5)',
              border: '1px solid rgba(239, 68, 68, 0.8)',
              pointerEvents: 'none',
              zIndex: 90
            }} />
          )
        })}
      </div>

      <StudioZoomControls
        zoom={zoom}
        showWalkability={showWalkability}
        onZoomIn={() => setZoom(z => Math.min(3, z + 0.2))}
        onZoomReset={() => setZoom(1)}
        onZoomOut={() => setZoom(z => Math.max(0.2, z - 0.2))}
        onToggleWalkability={() => setShowWalkability(value => !value)}
      />

      <StudioEditLockBanner onExit={onExit} />

      <RoomConfigModal
        pendingRoom={pendingRoom}
        roomConfig={roomConfig}
        onConfigChange={setRoomConfig}
        onCancel={() => setPendingRoom(null)}
        onGenerate={handleGenerateRoom}
      />
    </main>
  );
}
