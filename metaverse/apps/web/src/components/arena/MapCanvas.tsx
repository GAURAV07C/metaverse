import React, { useEffect, useRef, useState } from 'react';
import { PlusCircle, MinusCircle, Navigation, Map as MapIcon } from 'lucide-react';
import type { OtherUser } from '../Arena';
import type { SpaceElement } from './ElementsPanel';
import { findPath } from '../../utils/pathfinding';
import { drawDynamicAvatar } from '../../utils/drawAvatar';

const TILE = 28;

export interface PrivateZone {
  id: string;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface MapCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  dimensions: { w: number; h: number };
  myPos: { x: number; y: number };
  otherUsers: OtherUser[];
  elements: SpaceElement[];
  hiddenElementIds?: string[];
  privateZones?: PrivateZone[];
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  myAvatarUrl: string | null;
  autoPath: { x: number; y: number }[];
  setAutoPath: (path: { x: number; y: number }[]) => void;
  handleLocateUser: () => void;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  onDropElement?: (elementId: string, x: number, y: number) => void;
  addingElement?: string | null;
  builderMode?: 'pointer' | 'brush' | 'eraser';
  onRemoveElement?: (id: string) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  canvasRef,
  wrapperRef,
  dimensions,
  myPos,
  otherUsers,
  elements,
  hiddenElementIds = [],
  privateZones = [],
  zoom,
  setZoom,
  myAvatarUrl,
  autoPath,
  setAutoPath,
  handleLocateUser,
  panOffset,
  setPanOffset,
  onDropElement,
  addingElement,
  builderMode = 'pointer',
  onRemoveElement,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentCamRef = useRef<{ camX: number; camY: number; zoom: number }>({ camX: 0, camY: 0, zoom: 1 });
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const userAnimStateRef = useRef<Record<string, { lastX: number; lastY: number; facing: 'down' | 'up' | 'left' | 'right'; step: number; isMoving: boolean }>>({});
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setRenderTrigger(t => t + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasDraggedRef = useRef(false);

  // ── Mouse Drag / Free Camera Pan Map ────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...panOffset };

    if (builderMode === 'brush' || builderMode === 'eraser') {
      applyBuilderAction(e.clientX, e.clientY);
    }
  };

  const applyBuilderAction = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const activeZoom = currentCamRef.current.zoom;
    const worldX = (mouseX / activeZoom) + currentCamRef.current.camX;
    const worldY = (mouseY / activeZoom) + currentCamRef.current.camY;
    const gridX = Math.floor(worldX / TILE);
    const gridY = Math.floor(worldY / TILE);
    if (gridX < 0 || gridY < 0 || gridX >= dimensions.w || gridY >= dimensions.h) return;

    if (builderMode === 'brush' && addingElement) {
      onDropElement?.(addingElement, gridX, gridY);
    } else if (builderMode === 'eraser') {
      // Find element at this position to erase
      const elToErase = elements.find(el => {
        return gridX >= el.x && gridX < el.x + el.element.width &&
               gridY >= el.y && gridY < el.y + el.element.height;
      });
      if (elToErase && onRemoveElement) {
        onRemoveElement(elToErase.id);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current) return;

    if (builderMode === 'brush' || builderMode === 'eraser') {
      applyBuilderAction(e.clientX, e.clientY);
      return;
    }

    const dist = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
    if (dist > 4) {
      hasDraggedRef.current = true;
    }
    const dx = (e.clientX - dragStartRef.current.x) / currentCamRef.current.zoom;
    const dy = (e.clientY - dragStartRef.current.y) / currentCamRef.current.zoom;
    setPanOffset({
      x: initialPanRef.current.x - dx,
      y: initialPanRef.current.y - dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // ── Click-to-move (A* Pathfinding to clicked tile) ──────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const activeZoom = currentCamRef.current.zoom;
    const camX = currentCamRef.current.camX;
    const camY = currentCamRef.current.camY;

    const worldX = (mouseX / activeZoom) + camX;
    const worldY = (mouseY / activeZoom) + camY;

    const gridX = Math.floor(worldX / TILE);
    const gridY = Math.floor(worldY / TILE);

    if (gridX < 0 || gridY < 0 || gridX >= dimensions.w || gridY >= dimensions.h) return;

    if (builderMode === 'brush' || builderMode === 'eraser') {
      return; // Handled by mouseDown/mouseMove
    }

    if (addingElement) {
      onDropElement?.(addingElement, gridX, gridY);
      return;
    }

    const path = findPath(
      myPos,
      { x: gridX, y: gridY },
      dimensions.w,
      dimensions.h,
      (x, y) => {
        const visibleElements = elements.filter(el => !hiddenElementIds.includes(el.id));
        const isStaticEl = visibleElements.some(el => {
          if (el.element.category === 'Rooms' || String(el.element.category).toLowerCase().includes('floor')) return false;
          const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''}`.toLowerCase();
          const isSeat = text.includes('seating') || text.includes('chair') || text.includes('sofa') || text.includes('couch') || text.includes('bench') || text.includes('stool') || text.includes('seat');
          if (isSeat) return false;
          return el.element.static && x >= el.x && x < el.x + el.element.width && y >= el.y && y < el.y + el.element.height;
        });
        if (isStaticEl) return false;
        return true;
      }
    );

    if (path.length > 0) {
      setAutoPath(path);
    }
  };

  // ── Render 2D Canvas Engine ────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const viewW = wrapper.clientWidth;
    const viewH = wrapper.clientHeight;
    canvas.width = viewW;
    canvas.height = viewH;

    const worldW = dimensions.w * TILE;
    const worldH = dimensions.h * TILE;

    // Active zoom factor (allow zoom out down to 0.15 without force-clamping to screen fit)
    const activeZoom = Math.max(0.15, Math.min(3.0, zoom));

    // Camera follows player (centered) + mouse drag panOffset
    const playerPx = myPos.x * TILE + TILE / 2;
    const playerPy = myPos.y * TILE + TILE / 2;

    let camX = playerPx - (viewW / activeZoom) / 2 + panOffset.x;
    let camY = playerPy - (viewH / activeZoom) / 2 + panOffset.y;

    // Handle camera bounds: if map is smaller than screen when zoomed out, center it!
    const visibleWorldW = viewW / activeZoom;
    const visibleWorldH = viewH / activeZoom;

    if (worldW <= visibleWorldW) {
      camX = -(visibleWorldW - worldW) / 2;
    } else {
      camX = Math.max(0, Math.min(camX, worldW - visibleWorldW));
    }

    if (worldH <= visibleWorldH) {
      camY = -(visibleWorldH - worldH) / 2;
    } else {
      camY = Math.max(0, Math.min(camY, worldH - visibleWorldH));
    }

    // Save current camera transform parameters for mouse click calculations
    currentCamRef.current = { camX, camY, zoom: activeZoom };

    ctx.fillStyle = '#d9d1c3';
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.scale(activeZoom, activeZoom);
    ctx.translate(-camX, -camY);

    // Gather-style base office floor to match Studio (dcf0e2)
    ctx.fillStyle = '#dcf0e2';
    ctx.fillRect(0, 0, worldW, worldH);

    // Draw subtle grid pattern
    ctx.fillStyle = '#d1e6d7';
    for (let y = 0; y < worldH; y += TILE) {
      for (let x = 0; x < worldW; x += TILE) {
        if ((x / TILE + y / TILE) % 2 === 0) {
          ctx.fillRect(x, y, TILE, TILE);
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= worldH; y += TILE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(worldW, y); ctx.stroke();
    }
    for (let x = 0; x <= worldW; x += TILE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, worldH); ctx.stroke();
    }

    // Gather Town Diagram style Room carpets, walls, and labels
    privateZones.forEach((z) => {
      const zx = z.startX * TILE;
      const zy = z.startY * TILE;
      const zw = (z.endX - z.startX + 1) * TILE;
      const zh = (z.endY - z.startY + 1) * TILE;
      const isInside = myPos.x >= z.startX && myPos.x <= z.endX && myPos.y >= z.startY && myPos.y <= z.endY;
      
      const isLounge = z.name.toLowerCase().includes('lounge') || z.name.toLowerCase().includes('breakout');
      const isTeam = z.name.toLowerCase().includes('team') || z.name.toLowerCase().includes('engineering');

      const roomFill = isLounge ? '#fdf2f8' : (isTeam ? '#ffffff' : '#eef2ff');
      const roomStroke = isLounge ? '#fbcfe8' : (isTeam ? '#e5e7eb' : '#c7d2fe');
      const borderCol = isInside ? '#6366f1' : roomStroke;

      ctx.save();
      ctx.fillStyle = roomFill;
      ctx.beginPath();
      ctx.roundRect(zx, zy, zw, zh, 8);
      ctx.fill();

      ctx.strokeStyle = borderCol;
      ctx.lineWidth = isInside ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(zx + 1, zy + 1, zw - 2, zh - 2, 7);
      ctx.stroke();

      // Centered Icon Badge / Label Pill
      const isZoomedOut = zoom < 0.75;
      const icon = isLounge ? '🛋️' : (isTeam ? '👥' : '🚪');
      
      if (isTeam) {
        // Team Header Pill
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(zx + zw / 2 - 40, zy + 12, 80, 24, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#374151';
        ctx.font = '600 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`👥 ${z.name || 'Team'}`, zx + zw / 2, zy + 24);

        // Draw Gather Desk Dot Clusters (4 dots)
        ctx.fillStyle = '#d1d5db';
        const cx = zx + zw / 2;
        const cy = zy + zh / 2 + 8;
        [[-20, -12], [20, -12], [-20, 12], [20, 12]].forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dy, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        // Private Office / Lounge Centered Icon Badge
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.roundRect(zx + zw / 2 - 16, zy + zh / 2 - 16, 32, 32, 8);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#4b5563';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, zx + zw / 2, zy + zh / 2);

        // Room title pill
        if (!isZoomedOut) {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
          ctx.beginPath();
          ctx.roundRect(zx + 8, zy + 8, Math.min(zw - 16, z.name.length * 7 + 16), 20, 6);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '600 10px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(z.name, zx + 14, zy + 18);
        }
      }
    });

    // Outer office shell walls removed to match map editor perfectly

    // Elements (filtering out hidden elements)
    const visibleElements = elements.filter(el => !hiddenElementIds.includes(el.id));

    const isFloorElement = (el: SpaceElement) => {
      const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''} ${el.element.imageUrl ?? ''}`.toLowerCase();
      return text.includes('floor') || text.includes('carpet') || text.includes('wood_') || text.includes('tile_') || text.includes('grass');
    };

    // Draw Floors first
    const floors = visibleElements.filter(isFloorElement);
    // Draw Objects & Walls sorted by Y coordinate for depth
    const objects = visibleElements.filter(el => !isFloorElement(el)).sort((a, b) => a.y - b.y);

    const drawElement = (el: SpaceElement, isFloor: boolean) => {
      const px = el.x * TILE;
      const py = el.y * TILE;
      const w = el.element.width * TILE;
      const h = el.element.height * TILE;

      // Draw custom floor background if specified
      if (el.element.floor) {
        ctx.fillStyle = el.element.floor;
        ctx.fillRect(px, py, w, h);
      }

      // Draw custom wall top border if specified
      if (el.element.wall) {
        ctx.fillStyle = el.element.wall;
        ctx.fillRect(px, py, w, Math.min(12, h));
      }

      if (el.element.imageUrl) {
        let img = imageCacheRef.current[el.element.imageUrl];
        if (!img) {
          img = new Image();
          img.src = el.element.imageUrl;
          img.onload = () => setRenderTrigger(t => t + 1);
          imageCacheRef.current[el.element.imageUrl] = img;
        }
        if (img.complete && img.naturalWidth > 0) {
          if (!isFloor) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(px + w / 2, py + h - 4, w / 2 - 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.drawImage(img, px, py, w, h);

          // Apply color tint if specified
          if (el.element.color) {
            ctx.save();
            ctx.fillStyle = el.element.color;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(px, py, w, h);
            ctx.restore();
          }
          return;
        }
      }

      // Fallback for custom objects without images (e.g. dynamic room areas)
      ctx.fillStyle = el.element.color || (el.element.static ? 'rgba(100,116,139,0.5)' : 'rgba(16,185,129,0.3)');
      ctx.strokeStyle = el.element.wall || (el.element.static ? '#475569' : '#10b981');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px + 2, py + 2, w - 4, h - 4, 6);
      ctx.fill();
      ctx.stroke();
      if (el.element.name) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.element.name, px + w / 2, py + h / 2);
      }
    };

    floors.forEach(el => drawElement(el, true));
    objects.forEach(el => drawElement(el, false));

    // Draw destination highlight tile & autoPath trajectory trail
    if (autoPath.length > 0) {
      const dest = autoPath[autoPath.length - 1];
      const destPx = dest.x * TILE;
      const destPy = dest.y * TILE;

      ctx.save();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.fillRect(destPx + 2, destPy + 2, TILE - 4, TILE - 4);

      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 8;
      ctx.strokeRect(destPx + 2, destPy + 2, TILE - 4, TILE - 4);
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(destPx + TILE / 2, destPy + TILE / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      const startPx = myPos.x * TILE + TILE / 2;
      const startPy = myPos.y * TILE + TILE / 2;
      ctx.moveTo(startPx, startPy);
      autoPath.forEach((pt) => {
        ctx.lineTo(pt.x * TILE + TILE / 2, pt.y * TILE + TILE / 2);
      });
      ctx.stroke();
      ctx.restore();
    }

    const updateAnim = (id: string, rx: number, ry: number) => {
      const cx = Math.round(rx);
      const cy = Math.round(ry);
      const prev = userAnimStateRef.current[id] || { lastX: cx, lastY: cy, facing: 'down', step: 0, isMoving: false };
      let facing = prev.facing;
      let isMoving = false;
      let step = prev.step;

      if (cx > prev.lastX + 2) { facing = 'right'; isMoving = true; step++; }
      else if (cx < prev.lastX - 2) { facing = 'left'; isMoving = true; step++; }
      else if (cy > prev.lastY + 2) { facing = 'down'; isMoving = true; step++; }
      else if (cy < prev.lastY - 2) { facing = 'up'; isMoving = true; step++; }

      userAnimStateRef.current[id] = { lastX: cx, lastY: cy, facing, step, isMoving };
      return userAnimStateRef.current[id];
    };

    const drawHumanCharacter = (
      x: number,
      y: number,
      userId: string,
      username: string,
      url?: string,
      isSitting: boolean = false,
      isMe: boolean = false
    ) => {
      const anim = updateAnim(userId, x, y);

      // If it's a real image (not a class prefix), draw it properly as a circle
      if (url && !url.startsWith('class:')) {
        let img = imageCacheRef.current[url];
        if (!img) {
          img = new Image();
          if (url.startsWith('http')) img.crossOrigin = 'anonymous';
          img.src = url;
          img.onload = () => setRenderTrigger(t => t + 1);
          imageCacheRef.current[url] = img;
        }
        if (img.complete && img.naturalWidth > 0) {
          const drawY = isSitting ? y + 4 : y - 4;
          const bobY = (anim.isMoving && !isSitting) ? (anim.step % 2 === 0 ? -2 : 0) : 0;
          const avSize = 28;
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, drawY + bobY, avSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, x - avSize / 2, drawY + bobY - avSize / 2, avSize, avSize);
          ctx.restore();

          const charHash = Math.abs((userId || username || 'user').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
          const shirtColors = ['#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444'];
          const shirtColor = isMe ? '#3b82f6' : shirtColors[charHash % shirtColors.length];

          ctx.strokeStyle = shirtColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(x, drawY + bobY, avSize / 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          return;
        }
      }

      // Draw dynamic class-based avatar
      drawDynamicAvatar(ctx, x, y, userId, username, url, isSitting, anim, isMe);
    };

    const isChair = (tx: number, ty: number) => visibleElements.some(el => {
      const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''}`.toLowerCase();
      const isSeat = text.includes('seating') || text.includes('chair') || text.includes('sofa') || text.includes('couch') || text.includes('bench') || text.includes('stool') || text.includes('seat');
      return isSeat && tx >= el.x && tx < el.x + el.element.width && ty >= el.y && ty < el.y + el.element.height;
    });

    // Other users
    otherUsers.forEach((u) => {
      const px = u.x * TILE + TILE / 2;
      const py = u.y * TILE + TILE / 2 - 4;
      const sitting = isChair(u.x, u.y);
      const name = u.username || u.userId.slice(0, 5);

      drawHumanCharacter(px, py, u.userId, name, u.avatarUrl, sitting, false);

      ctx.fillStyle = 'rgba(99,102,241,0.88)';
      const tagW = name.length * 6 + 8;
      ctx.beginPath();
      ctx.roundRect(px - tagW / 2, py - (sitting ? 22 : 30), tagW, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, px, py - (sitting ? 15 : 23));
    });

    const mx = myPos.x * TILE + TILE / 2;
    const my = myPos.y * TILE + TILE / 2 - 4;
    const mySitting = isChair(myPos.x, myPos.y);
    const myName = (window as any).__myStoredUsername || 'You';

    if (!mySitting) {
      const grd = ctx.createRadialGradient(mx, my, 0, mx, my, 18);
      grd.addColorStop(0, 'rgba(59,130,246,0.35)');
      grd.addColorStop(1, 'rgba(59,130,246,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(mx, my, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    drawHumanCharacter(mx, my, 'me', myName, myAvatarUrl ?? undefined, mySitting, true);

    // My name pill badge
    ctx.fillStyle = '#3b82f6';
    const tagW = myName.length * 6 + 12;
    ctx.beginPath();
    ctx.roundRect(mx - tagW / 2, my - (mySitting ? 22 : 30), tagW, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(myName, mx, my - (mySitting ? 15 : 23));
  }, [canvasRef, wrapperRef, myPos, otherUsers, elements, hiddenElementIds, privateZones, dimensions, myAvatarUrl, renderTrigger, autoPath, zoom, panOffset]);

  return (
    <>
      <div className="canvas-wrapper" style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }} ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasClick}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const elementId = e.dataTransfer.getData('elementId');
            if (!elementId || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const activeZoom = currentCamRef.current.zoom;
            const camX = currentCamRef.current.camX;
            const camY = currentCamRef.current.camY;
            const worldX = (mouseX / activeZoom) + camX;
            const worldY = (mouseY / activeZoom) + camY;
            const tileX = Math.max(0, Math.min(dimensions.w - 1, Math.floor(worldX / TILE)));
            const tileY = Math.max(0, Math.min(dimensions.h - 1, Math.floor(worldY / TILE)));
            onDropElement?.(elementId, tileX, tileY);
          }}
          onWheel={(e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.2 : 0.8;
            setZoom(z => Math.max(0.15, Math.min(3.0, z * factor)));
          }}
          style={{ display: 'block', width: '100%', height: '100%', cursor: isDragging ? 'grabbing' : addingElement ? 'crosshair' : autoPath.length > 0 ? 'crosshair' : 'grab' }}
        />
      </div>

      <div className="map-controls">
        <button className="map-ctrl-btn" onClick={() => setZoom(z => Math.min(z * 1.25, 3.0))} title="Zoom In">
          <PlusCircle size={20} />
        </button>
        <button className="map-ctrl-btn" onClick={() => setZoom(z => Math.max(z / 1.25, 0.15))} title="Zoom Out (Diagram View)">
          <MinusCircle size={20} />
        </button>
        <button className="map-ctrl-btn" onClick={() => setZoom(0.35)} title="Layout Overview (Gather View)">
          <MapIcon size={20} />
        </button>
        <button className="map-ctrl-btn" onClick={handleLocateUser} title="Locate Me">
          <Navigation size={20} />
        </button>
      </div>
    </>
  );
};
