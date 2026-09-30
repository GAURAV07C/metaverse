import React, { useEffect, useRef } from 'react';
import type { OtherUser } from '../Arena';
import type { PrivateZone } from './MapCanvas';
import type { SpaceElement } from './ElementsPanel';

interface MiniMapProps {
  dimensions: { w: number; h: number };
  myPos: { x: number; y: number };
  otherUsers: OtherUser[];
  elements: SpaceElement[];
  privateZones: PrivateZone[];
}

export const MiniMap: React.FC<MiniMapProps> = ({
  dimensions,
  myPos,
  otherUsers,
  elements,
  privateZones,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const mapW = Math.max(1, dimensions.w);
    const mapH = Math.max(1, dimensions.h);
    const scale = Math.min(width / mapW, height / mapH);
    const offsetX = (width - mapW * scale) / 2;
    const offsetY = (height - mapH * scale) / 2;

    const tileX = (x: number) => offsetX + x * scale;
    const tileY = (y: number) => offsetY + y * scale;

    ctx.fillStyle = '#10141f';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#243021';
    ctx.fillRect(tileX(0), tileY(0), mapW * scale, mapH * scale);

    privateZones.forEach((zone) => {
      const x = tileX(zone.startX);
      const y = tileY(zone.startY);
      const w = Math.max(1, (zone.endX - zone.startX) * scale);
      const h = Math.max(1, (zone.endY - zone.startY) * scale);
      const isRoom = zone.type === 'room' || zone.type === 'private';

      ctx.fillStyle = zone.type === 'seat'
        ? 'rgba(249, 115, 22, 0.75)'
        : zone.type === 'spawn'
          ? 'rgba(56, 189, 248, 0.65)'
        : zone.type === 'portal'
          ? 'rgba(168, 85, 247, 0.65)'
        : zone.type === 'spotlight'
          ? 'rgba(250, 204, 21, 0.55)'
        : isRoom
          ? 'rgba(34, 197, 94, 0.2)'
          : 'rgba(226, 232, 240, 0.22)';
      ctx.strokeStyle = zone.type === 'seat'
        ? '#f97316'
        : zone.type === 'spawn'
          ? '#38bdf8'
        : zone.type === 'portal'
          ? '#a855f7'
        : zone.type === 'spotlight'
          ? '#facc15'
        : isRoom
          ? '#22c55e'
          : '#93c5fd';
      ctx.lineWidth = isRoom ? 1.5 : 1;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    });

    elements.forEach((el) => {
      const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''}`.toLowerCase();
      const isFloor = el.element.category === 'Rooms' || text.includes('floor') || text.includes('rug') || text.includes('carpet');
      if (isFloor) return;

      const x = tileX(el.x);
      const y = tileY(el.y);
      const w = Math.max(1.5, el.element.width * scale);
      const h = Math.max(1.5, el.element.height * scale);
      ctx.fillStyle = text.includes('chair') || text.includes('seat') || text.includes('sofa')
        ? '#f59e0b'
        : '#64748b';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    });

    const drawUser = (x: number, y: number, color: string, radius = 3) => {
      const px = tileX(x + 0.5);
      const py = tileY(y + 0.5);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const audioRadius = 5 * scale;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(tileX(myPos.x + 0.5), tileY(myPos.y + 0.5), audioRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    otherUsers.forEach((user) => drawUser(user.x, user.y, '#a78bfa', 2.6));
    drawUser(myPos.x, myPos.y, '#22c55e', 3.3);
  }, [dimensions, elements, myPos, otherUsers, privateZones]);

  return <canvas ref={canvasRef} className="minimap-canvas" aria-label="Live mini map" />;
};
