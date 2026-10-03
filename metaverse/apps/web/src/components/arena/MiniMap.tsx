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

    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const mapW = Math.max(1, dimensions.w);
    const mapH = Math.max(1, dimensions.h);
    const padding = 8;
    const scale = Math.min((width - padding * 2) / mapW, (height - padding * 2) / mapH);
    const offsetX = (width - mapW * scale) / 2;
    const offsetY = (height - mapH * scale) / 2;

    const tileX = (x: number) => offsetX + x * scale;
    const tileY = (y: number) => offsetY + y * scale;
    const mapPixelW = mapW * scale;
    const mapPixelH = mapH * scale;

    const roundedRect = (x: number, y: number, w: number, h: number, radius: number) => {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, width, height);

    roundedRect(tileX(0), tileY(0), mapPixelW, mapPixelH, 6);
    ctx.fillStyle = '#172033';
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const gridStep = Math.max(4, Math.ceil(Math.min(mapW, mapH) / 8));
    ctx.save();
    roundedRect(tileX(0), tileY(0), mapPixelW, mapPixelH, 6);
    ctx.clip();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= mapW; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(tileX(x), tileY(0));
      ctx.lineTo(tileX(x), tileY(mapH));
      ctx.stroke();
    }
    for (let y = 0; y <= mapH; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(tileX(0), tileY(y));
      ctx.lineTo(tileX(mapW), tileY(y));
      ctx.stroke();
    }
    ctx.restore();

    privateZones.forEach((zone) => {
      const x = tileX(zone.startX);
      const y = tileY(zone.startY);
      const w = Math.max(2, (zone.endX - zone.startX) * scale);
      const h = Math.max(2, (zone.endY - zone.startY) * scale);
      const isRoom = zone.type === 'room' || zone.type === 'private';

      ctx.fillStyle = zone.type === 'seat'
        ? 'rgba(251, 146, 60, 0.82)'
        : zone.type === 'spawn'
          ? 'rgba(56, 189, 248, 0.72)'
        : zone.type === 'portal'
          ? 'rgba(168, 85, 247, 0.74)'
        : zone.type === 'spotlight'
          ? 'rgba(250, 204, 21, 0.62)'
        : isRoom
          ? 'rgba(34, 197, 94, 0.22)'
          : 'rgba(148, 163, 184, 0.2)';
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
      ctx.lineWidth = isRoom ? 1.4 : 1;
      roundedRect(x, y, w, h, isRoom ? 3 : 2);
      ctx.fill();
      ctx.stroke();

      if (isRoom && w > 24 && h > 12 && zone.name) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.fillStyle = 'rgba(220, 252, 231, 0.72)';
        ctx.font = '700 9px Inter, sans-serif';
        ctx.fillText(String(zone.name).slice(0, 16), x + 4, y + Math.min(h - 3, 11));
        ctx.restore();
      }
    });

    elements.forEach((el) => {
      const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''}`.toLowerCase();
      const isFloor = el.element.category === 'Rooms' || text.includes('floor') || text.includes('rug') || text.includes('carpet');
      if (isFloor) return;

      const x = tileX(el.x);
      const y = tileY(el.y);
      const w = Math.max(1.8, el.element.width * scale);
      const h = Math.max(1.8, el.element.height * scale);
      ctx.fillStyle = text.includes('chair') || text.includes('seat') || text.includes('sofa')
        ? '#f59e0b'
        : '#475569';
      ctx.globalAlpha = 0.86;
      roundedRect(x, y, w, h, 1.5);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    const drawUser = (x: number, y: number, color: string, radius = 3, isMe = false) => {
      const px = tileX(x + 0.5);
      const py = tileY(y + 0.5);
      if (isMe) {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.26)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(px, py, radius + 3.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMe ? 1.6 : 1;
      ctx.stroke();
    };

    const audioRadius = Math.max(8, 5 * scale);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(tileX(myPos.x + 0.5), tileY(myPos.y + 0.5), audioRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    otherUsers.forEach((user) => drawUser(user.x, user.y, '#a78bfa', 2.7));
    drawUser(myPos.x, myPos.y, '#22c55e', 3.6, true);
  }, [dimensions, elements, myPos, otherUsers, privateZones]);

  return (
    <div className="minimap-canvas-wrap">
      <canvas ref={canvasRef} className="minimap-canvas" aria-label="Live mini map" />
      <div className="minimap-legend" aria-hidden="true">
        <span><i className="me" />You</span>
        <span><i className="room" />Room</span>
        <span><i className="portal" />Portal</span>
      </div>
    </div>
  );
};
