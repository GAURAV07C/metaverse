import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, UserCheck, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { drawDynamicAvatar } from "../utils/drawAvatar";
import { CanvasAvatarPreview } from "./CanvasAvatarPreview";

interface AvatarCanvasTesterModalProps {
  avatar: {
    id: string;
    imageUrl: string;
    name: string;
  };
  onClose: () => void;
}

export function AvatarCanvasTesterModal({ avatar, onClose }: AvatarCanvasTesterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Position & Viewport
  const [avatarPos, setAvatarPos] = useState({ x: 8, y: 6 });
  const [avatarFacing, setAvatarFacing] = useState<"down" | "up" | "left" | "right">("down");
  const [isMoving, setIsMoving] = useState(false);
  const [step, setStep] = useState(0);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const currentImageUrl = avatar.imageUrl;

  const TILE_SIZE = 36;
  const GRID_COLS = 16;
  const GRID_ROWS = 12;

  // Keyboard controls for moving avatar
  useEffect(() => {
    let moveInterval: any;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      let dx = 0;
      let dy = 0;
      let newFacing = avatarFacing;

      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") { dy = -1; newFacing = "up"; }
      else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") { dy = 1; newFacing = "down"; }
      else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") { dx = -1; newFacing = "left"; }
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") { dx = 1; newFacing = "right"; }
      else return;

      e.preventDefault();
      setAvatarFacing(newFacing);
      setIsMoving(true);
      setStep(s => s + 1);

      const nextX = Math.max(0, Math.min(GRID_COLS - 1, avatarPos.x + dx));
      const nextY = Math.max(0, Math.min(GRID_ROWS - 1, avatarPos.y + dy));

      setAvatarPos({ x: nextX, y: nextY });
      
      clearTimeout(moveInterval);
      moveInterval = setTimeout(() => {
        setIsMoving(false);
      }, 150);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(moveInterval);
    };
  }, [avatarPos, avatarFacing]);

  // Pan & Mouse drag handler
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.shiftKey || e.button === 0) { // Click and drag to pan
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Render Canvas synchronously & handle image overlay safely
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw grid floor tiles
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const isEven = (r + c) % 2 === 0;
          ctx.fillStyle = isEven ? "#1e293b" : "#0f172a";
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
          ctx.lineWidth = 1;
          ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }

      // Draw Avatar
      drawAvatar(ctx, img);

      ctx.restore();
    };

    function drawAvatar(context: CanvasRenderingContext2D, img?: HTMLImageElement) {
      const ax = avatarPos.x * TILE_SIZE + TILE_SIZE / 2;
      const ay = avatarPos.y * TILE_SIZE + TILE_SIZE / 2;

      context.save();

      // Shadow
      context.beginPath();
      context.ellipse(ax, ay + 14, 12, 5, 0, 0, Math.PI * 2);
      context.fillStyle = "rgba(0,0,0,0.4)";
      context.fill();

      if (img && img.complete && img.naturalWidth !== 0 && !avatar.imageUrl.startsWith('class:')) {
        // Draw the image avatar just like in Arena.tsx
        const drawY = ay - 4;
        const bobY = isMoving ? (step % 2 === 0 ? -2 : 0) : 0;
        const avSize = 28;
        
        context.save();
        context.beginPath();
        context.arc(ax, drawY + bobY, avSize / 2, 0, Math.PI * 2);
        context.clip();
        context.drawImage(img, ax - avSize / 2, drawY + bobY - avSize / 2, avSize, avSize);
        context.restore();

        context.strokeStyle = "#3b82f6"; // Blue rim
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(ax, drawY + bobY, avSize / 2, 0, Math.PI * 2);
        context.stroke();
      } else {
        // Fallback default avatar or class-based avatar
        drawDynamicAvatar(
          context,
          ax,
          ay,
          avatar.id,
          avatar.name,
          avatar.imageUrl,
          false,
          { isMoving, step, facing: avatarFacing },
          true
        );
      }

      // Name tag
      context.fillStyle = 'rgba(99,102,241,0.88)';
      const tagW = avatar.name.length * 6 + 8;
      context.beginPath();
      if (typeof context.roundRect === "function") {
          context.roundRect(ax - tagW / 2, ay - 30, tagW, 14, 4);
      } else {
          context.rect(ax - tagW / 2, ay - 30, tagW, 14);
      }
      context.fill();
      context.fillStyle = '#fff';
      context.font = 'bold 9px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(avatar.name, ax, ay - 23);

      context.restore();
    }

    // Async Image Loader
    if (currentImageUrl) {
      const img = new Image();
      if (currentImageUrl.startsWith("http")) {
        img.crossOrigin = "anonymous";
      }
      if (currentImageUrl.startsWith("class:")) {
        // Don't try to load class identifiers as images
        render();
      } else {
        img.src = currentImageUrl.startsWith('http') || currentImageUrl.startsWith('/') ? currentImageUrl : `/${currentImageUrl}`;
        img.onload = () => render(img);
        img.onerror = () => render();
      }
    } else {
      render();
    }
  }, [avatarPos, avatarFacing, zoom, pan, currentImageUrl, isMoving, step, avatar.name]);


  const modalContent = (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 6, 23, 0.88)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "1rem",
      }}
    >
      <div
        className="glass animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "95vw",
          maxWidth: "880px",
          height: "85vh",
          background: "#0f172a",
          color: "#f8fafc",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.25rem",
            background: "#1e293b",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <UserCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {avatar.name} (Avatar Preview)
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: 0, marginTop: 2 }}>
                Walk around with <b>W / A / S / D</b> or <b>Arrow Keys</b> to test in canvas
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setZoom((z) => Math.min(3.5, z + 0.15))}
              style={{ padding: "6px 10px", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, cursor: "pointer" }}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              style={{ padding: "6px 10px", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, cursor: "pointer" }}
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => { setZoom(1.8); setPan({ x: 0, y: 0 }); }}
              style={{ padding: "6px 10px", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, cursor: "pointer" }}
            >
              <RotateCcw size={16} />
            </button>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
            <button
              className="btn-icon"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#f8fafc",
                width: 34,
                height: 34,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div
            style={{
              width: "220px",
              background: "#1e293b",
              borderRight: "1px solid rgba(255,255,255,0.1)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              overflowY: "auto",
            }}
          >
            <div style={{ background: "#0f172a", borderRadius: 8, padding: "10px 0" }}>
              <CanvasAvatarPreview imageUrl={avatar.imageUrl} name={avatar.name} size={140} />
              <p style={{ marginTop: 8, fontSize: "0.85rem", color: "#cbd5e1", textAlign: "center" }}>
                <b>{avatar.name}</b>
              </p>
            </div>

            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.75rem" }}>
                🎮 Controls Guide
              </p>
              <div style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: 6, background: "rgba(15,23,42,0.6)", padding: "10px", borderRadius: 8 }}>
                <div><b>W / A / S / D:</b> Walk</div>
                <div><b>Click & Drag:</b> Pan Grid</div>
              </div>
            </div>

            <div style={{ marginTop: "auto" }}>
              <button
                type="button"
                onClick={() => { setAvatarPos({ x: 8, y: 6 }); setZoom(1.8); setPan({x:0, y:0}); }}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "0.8rem",
                  background: "rgba(255,255,255,0.08)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                📍 Reset Position
              </button>
            </div>
          </div>

          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              flex: 1,
              background: "#020617",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isPanning ? "grabbing" : "default",
            }}
          >
            <canvas
              ref={canvasRef}
              width={GRID_COLS * TILE_SIZE}
              height={GRID_ROWS * TILE_SIZE}
              style={{
                borderRadius: "12px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
