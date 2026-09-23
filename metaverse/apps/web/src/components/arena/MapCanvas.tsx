import React, { useEffect, useRef, useState } from 'react';
import { PlusCircle, MinusCircle, Navigation } from 'lucide-react';
import type { OtherUser } from '../Arena';
import type { SpaceElement } from './ElementsPanel';
import { findPath } from '../../utils/pathfinding';

const TILE = 28;

interface MapCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  wrapperRef: React.RefObject<HTMLDivElement>;
  dimensions: { w: number; h: number };
  myPos: { x: number; y: number };
  otherUsers: OtherUser[];
  elements: SpaceElement[];
  mapThumbnail: string | null;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  myAvatarUrl: string | null;
  autoPath: { x: number; y: number }[];
  setAutoPath: (path: { x: number; y: number }[]) => void;
  handleLocateUser: () => void;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  canvasRef,
  wrapperRef,
  dimensions,
  myPos,
  otherUsers,
  elements,
  mapThumbnail,
  zoom,
  setZoom,
  myAvatarUrl,
  autoPath,
  setAutoPath,
  handleLocateUser,
  panOffset,
  setPanOffset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentCamRef = useRef<{ camX: number; camY: number; zoom: number }>({ camX: 0, camY: 0, zoom: 1 });
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
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
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current) return;
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

    const path = findPath(
      myPos,
      { x: gridX, y: gridY },
      dimensions.w,
      dimensions.h,
      (x, y) => {
        const isStaticEl = elements.some(el => el.element.static && x >= el.x && x < el.x + el.element.width && y >= el.y && y < el.y + el.element.height);
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

    // Active zoom factor
    const fitScaleX = viewW / worldW;
    const fitScaleY = viewH / worldH;
    const activeZoom = Math.max(fitScaleX, fitScaleY, zoom);

    // Camera follows player (centered) + mouse drag panOffset
    const playerPx = myPos.x * TILE + TILE / 2;
    const playerPy = myPos.y * TILE + TILE / 2;

    let camX = playerPx - (viewW / activeZoom) / 2 + panOffset.x;
    let camY = playerPy - (viewH / activeZoom) / 2 + panOffset.y;

    // Clamp camera to map boundaries so user NEVER sees outside the map graphic
    const maxCamX = Math.max(0, worldW - viewW / activeZoom);
    const maxCamY = Math.max(0, worldH - viewH / activeZoom);
    camX = Math.max(0, Math.min(camX, maxCamX));
    camY = Math.max(0, Math.min(camY, maxCamY));

    // Save current camera transform parameters for mouse click calculations
    currentCamRef.current = { camX, camY, zoom: activeZoom };

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.scale(activeZoom, activeZoom);
    ctx.translate(-camX, -camY);

    // Floor background map thumbnail or checkerboard tile pattern
    if (mapThumbnail) {
      let img = imageCacheRef.current[mapThumbnail];
      if (!img) {
        img = new Image();
        img.src = mapThumbnail;
        img.onload = () => setRenderTrigger(t => t + 1);
        imageCacheRef.current[mapThumbnail] = img;
      }
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, worldW, worldH);
      }
    } else {
      // Tile floor (checkerboard pattern fallback)
      for (let gx = 0; gx < dimensions.w; gx++) {
        for (let gy = 0; gy < dimensions.h; gy++) {
          const px = gx * TILE;
          const py = gy * TILE;
          const isLight = (gx + gy) % 2 === 0;
          ctx.fillStyle = isLight ? '#1e2140' : '#1a1d38';
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(59,130,246,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= worldW; x += TILE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, worldH); ctx.stroke();
    }
    for (let y = 0; y <= worldH; y += TILE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(worldW, y); ctx.stroke();
    }

    // Private Zones (Meeting Rooms)
    const privateZones = [
      { id: 'zone1', startX: 15, startY: 6, endX: 23, endY: 16, name: 'Meeting Room A' },
      { id: 'zone2', startX: 24, startY: 6, endX: 32, endY: 16, name: 'Meeting Room B' }
    ];

    privateZones.forEach((z) => {
      const zx = z.startX * TILE;
      const zy = z.startY * TILE;
      const zw = (z.endX - z.startX + 1) * TILE;
      const zh = (z.endY - z.startY + 1) * TILE;
      const isInside = myPos.x >= z.startX && myPos.x <= z.endX && myPos.y >= z.startY && myPos.y <= z.endY;

      ctx.fillStyle = isInside ? 'rgba(45, 206, 137, 0.15)' : 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(zx, zy, zw, zh);

      ctx.strokeStyle = isInside ? '#2dce89' : 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = isInside ? 2.5 : 1.5;
      ctx.strokeRect(zx, zy, zw, zh);

      ctx.fillStyle = isInside ? '#2dce89' : '#60a5fa';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(z.name, zx + zw / 2, zy + 14);
    });

    // Elements
    elements.forEach((el) => {
      const px = el.x * TILE;
      const py = el.y * TILE;
      const w = el.element.width * TILE;
      const h = el.element.height * TILE;

      if (el.element.imageUrl) {
        let img = imageCacheRef.current[el.element.imageUrl];
        if (!img) {
          img = new Image();
          img.src = el.element.imageUrl;
          img.onload = () => setRenderTrigger(t => t + 1);
          imageCacheRef.current[el.element.imageUrl] = img;
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.ellipse(px + w / 2, py + h - 4, w / 2 - 4, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(img, px, py, w, h);
          return;
        }
      }

      ctx.fillStyle = el.element.static ? 'rgba(100,116,139,0.5)' : 'rgba(16,185,129,0.3)';
      ctx.strokeStyle = el.element.static ? '#475569' : '#10b981';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px + 4, py + 4, w - 8, h - 8, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.min(w, h) * 0.45}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.element.static ? '🪑' : '🟢', px + w / 2, py + h / 2);
    });

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

    const drawAvatar = (x: number, y: number, url?: string, fallback: string = '👤', color: string = '#6366f1') => {
      const userTileX = Math.floor(x / TILE);
      const userTileY = Math.floor(y / TILE);
      const inZone = (userTileX >= 15 && userTileX <= 32 && userTileY >= 6 && userTileY <= 16);

      if (inZone) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = '#2dce89';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.shadowColor = '#2dce89';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y + TILE / 2, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (url) {
        let img = imageCacheRef.current[url];
        if (!img) {
          img = new Image();
          img.src = url;
          img.onload = () => setRenderTrigger(t => t + 1);
          imageCacheRef.current[url] = img;
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, x - 12, y - 12, 24, 24);
          ctx.restore();

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.stroke();
          return;
        }
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallback, x, y);
    };

    // Other users
    otherUsers.forEach((u) => {
      const px = u.x * TILE + TILE / 2;
      const py = u.y * TILE + TILE / 2 - 4;

      drawAvatar(px, py, u.avatarUrl, '👤', '#6366f1');
      ctx.fillStyle = 'rgba(99,102,241,0.85)';
      const name = u.username || u.userId.slice(0, 5);
      const tagW = name.length * 6 + 6;
      ctx.beginPath();
      ctx.roundRect(px - tagW / 2, py - 20, tagW, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, px, py - 14);
    });

    const mx = myPos.x * TILE + TILE / 2;
    const my = myPos.y * TILE + TILE / 2 - 4;

    const grd = ctx.createRadialGradient(mx, my, 0, mx, my, 18);
    grd.addColorStop(0, 'rgba(59,130,246,0.4)');
    grd.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, Math.PI * 2);
    ctx.fill();

    drawAvatar(mx, my, myAvatarUrl ?? undefined, '🧑', '#3b82f6');
  }, [myPos, otherUsers, elements, dimensions, myAvatarUrl, renderTrigger, autoPath, zoom, panOffset]);

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
          onWheel={(e) => {
            if (e.deltaY < 0) setZoom(z => Math.min(z + 0.1, 2.5));
            else setZoom(z => Math.max(z - 0.1, 0.6));
          }}
          style={{ display: 'block', width: '100%', height: '100%', cursor: isDragging ? 'grabbing' : autoPath.length > 0 ? 'crosshair' : 'grab' }} 
        />
      </div>

      <div className="map-controls">
        <button className="map-ctrl-btn" onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))} title="Zoom In">
          <PlusCircle size={20} />
        </button>
        <button className="map-ctrl-btn" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} title="Zoom Out">
          <MinusCircle size={20} />
        </button>
        <button className="map-ctrl-btn" onClick={handleLocateUser} title="Locate Me">
          <Navigation size={20} />
        </button>
      </div>
    </>
  );
};
