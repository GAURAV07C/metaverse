import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Paintbrush, Eraser } from "lucide-react";
import type { ElementItem } from "../adminTypes";

export interface PlacedLabElement {
  instanceId: string;
  elementId: string;
  x: number;
  y: number;
  element: ElementItem;
}

interface RoomLabCanvasProps {
  width: number; // grid cols e.g. 30
  height: number; // grid rows e.g. 30
  selectedElement: ElementItem | null;
  placedElements: PlacedLabElement[];
  onPlaceElement: (x: number, y: number) => void;
  onRemoveElement: (instanceId: string) => void;
  activeTool: "place" | "erase" | "select";
  setActiveTool: (tool: "place" | "erase" | "select") => void;
}

export function RoomLabCanvas({
  width,
  height,
  selectedElement,
  placedElements,
  onPlaceElement,
  onRemoveElement,
  activeTool,
  setActiveTool,
}: RoomLabCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hoverGrid, setHoverGrid] = useState<{ x: number; y: number } | null>(null);

  const TILE_SIZE = 36; // Base tile size in px

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderWidth = width * TILE_SIZE * zoom;
    const renderHeight = height * TILE_SIZE * zoom;
    canvas.width = renderWidth;
    canvas.height = renderHeight;

    ctx.save();
    ctx.scale(zoom, zoom);

    // 1. Draw Checkerboard Floor
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const isEven = (r + c) % 2 === 0;
        ctx.fillStyle = isEven ? "#1e293b" : "#0f172a";
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // 2. Draw Placed Elements
    placedElements.forEach((pe) => {
      const el = pe.element;
      const xPx = pe.x * TILE_SIZE;
      const yPx = pe.y * TILE_SIZE;
      const wPx = el.width * TILE_SIZE;
      const hPx = el.height * TILE_SIZE;

      // Footprint highlight
      ctx.fillStyle = el.static ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)";
      ctx.fillRect(xPx, yPx, wPx, hPx);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = el.imageUrl;
      if (img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, xPx, yPx, wPx, hPx);
      } else {
        img.onload = () => {
          ctx.drawImage(img, xPx, yPx, wPx, hPx);
        };
      }
    });

    // 3. Draw Hover Placement Ghost Box
    if (hoverGrid && activeTool === "place" && selectedElement) {
      const ghostX = hoverGrid.x * TILE_SIZE;
      const ghostY = hoverGrid.y * TILE_SIZE;
      const ghostW = selectedElement.width * TILE_SIZE;
      const ghostH = selectedElement.height * TILE_SIZE;

      ctx.fillStyle = selectedElement.static ? "rgba(239, 68, 68, 0.25)" : "rgba(59, 130, 246, 0.25)";
      ctx.fillRect(ghostX, ghostY, ghostW, ghostH);

      ctx.strokeStyle = selectedElement.static ? "#ef4444" : "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(ghostX, ghostY, ghostW, ghostH);
      ctx.setLineDash([]);
    }

    // 4. Draw Hover Eraser Box
    if (hoverGrid && activeTool === "erase") {
      const ghostX = hoverGrid.x * TILE_SIZE;
      const ghostY = hoverGrid.y * TILE_SIZE;

      ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
      ctx.fillRect(ghostX, ghostY, TILE_SIZE, TILE_SIZE);

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.strokeRect(ghostX, ghostY, TILE_SIZE, TILE_SIZE);
    }

    ctx.restore();
  }, [width, height, placedElements, selectedElement, hoverGrid, activeTool, zoom]);

  // Handle Canvas Click for placing or erasing
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.floor((e.clientX - rect.left) / (TILE_SIZE * zoom));
    const clickY = Math.floor((e.clientY - rect.top) / (TILE_SIZE * zoom));

    if (clickX < 0 || clickX >= width || clickY < 0 || clickY >= height) return;

    if (activeTool === "place") {
      if (!selectedElement) return;
      onPlaceElement(clickX, clickY);
    } else if (activeTool === "erase") {
      // Find element placed at this tile coordinate
      const found = [...placedElements].reverse().find(
        (pe) =>
          clickX >= pe.x &&
          clickX < pe.x + pe.element.width &&
          clickY >= pe.y &&
          clickY < pe.y + pe.element.height
      );
      if (found) {
        onRemoveElement(found.instanceId);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - rect.left) / (TILE_SIZE * zoom));
    const gy = Math.floor((e.clientY - rect.top) / (TILE_SIZE * zoom));

    if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
      setHoverGrid({ x: gx, y: gy });
    } else {
      setHoverGrid(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#060b18",
        borderRadius: "14px",
        border: "1px solid var(--glass-border)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Canvas Controls Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.6rem 1rem",
          background: "rgba(15, 23, 42, 0.9)",
          borderBottom: "1px solid var(--glass-border)",
          fontSize: "0.85rem",
        }}
      >
        {/* Tool selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            className={`btn btn-ghost ${activeTool === "place" ? "active" : ""}`}
            onClick={() => setActiveTool("place")}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
              background: activeTool === "place" ? "var(--accent)" : "rgba(255,255,255,0.06)",
            }}
          >
            <Paintbrush size={14} style={{ marginRight: 4 }} /> Place
          </button>
          <button
            className={`btn btn-ghost ${activeTool === "erase" ? "active" : ""}`}
            onClick={() => setActiveTool("erase")}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
              background: activeTool === "erase" ? "rgba(239, 68, 68, 0.25)" : "rgba(255,255,255,0.06)",
              color: activeTool === "erase" ? "#fca5a5" : "inherit",
            }}
          >
            <Eraser size={14} style={{ marginRight: 4 }} /> Erase
          </button>
        </div>

        {/* Selected info & Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
            Grid: <b>{width}×{height} tiles</b> • Placed: <b>{placedElements.length} items</b>
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <button
              className="btn btn-ghost"
              style={{ width: 28, height: 28, padding: 0 }}
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: "0.78rem", minWidth: 38, textAlign: "center", color: "#e2e8f0" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="btn btn-ghost"
              style={{ width: 28, height: 28, padding: 0 }}
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: 28, height: 28, padding: 0 }}
              onClick={() => setZoom(1)}
              title="Reset Zoom"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#080e1a",
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverGrid(null)}
          style={{ cursor: activeTool === "erase" ? "crosshair" : "pointer", borderRadius: "8px", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
        />
      </div>
    </div>
  );
}
