import { useEffect, useRef, useState, useCallback } from "react";
import { X, UserCheck, ShieldAlert, Sparkles, SlidersHorizontal, ZoomIn, ZoomOut, RotateCcw, Move, ArrowLeft, Layers } from "lucide-react";
import { getElementCategory } from "./admin/adminTypes";

interface ElementCanvasTesterModalProps {
  element: {
    id: string;
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
    name?: string;
    category?: string;
  };
  onClose: () => void;
}

export function ElementCanvasTesterModal({ element, onClose }: ElementCanvasTesterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live editable dimensions and static status in simulator
  const [testWidth, setTestWidth] = useState(element.width || 1);
  const [testHeight, setTestHeight] = useState(element.height || 1);
  const [testStatic, setTestStatic] = useState(element.static);

  // Position & Viewport
  const [elementPos, setElementPos] = useState({ x: 5, y: 3 });
  const [avatarPos, setAvatarPos] = useState({ x: 2, y: 4 });
  const [avatarFacing, setAvatarFacing] = useState<"down" | "up" | "left" | "right">("down");
  const [isSeated, setIsSeated] = useState(false);
  const [collisionMsg, setCollisionMsg] = useState<string | null>(null);

  // Zoom & Pan state matching StudioCanvas
  const [zoom, setZoom] = useState(1.2);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const TILE_SIZE = 36; // 36px tile size matching studio
  const GRID_COLS = 16;
  const GRID_ROWS = 12;

  const category = getElementCategory(element);

  // Check if avatar is within element footprint
  const isInsideElement = (x: number, y: number, elX: number, elY: number, w: number, h: number) => {
    return x >= elX && x < elX + w && y >= elY && y < elY + h;
  };

  // Keyboard controls for moving avatar
  useEffect(() => {
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

      const nextX = Math.max(0, Math.min(GRID_COLS - 1, avatarPos.x + dx));
      const nextY = Math.max(0, Math.min(GRID_ROWS - 1, avatarPos.y + dy));

      // Check collision with live test width, height & static status
      const hitsElement = isInsideElement(nextX, nextY, elementPos.x, elementPos.y, testWidth, testHeight);

      if (hitsElement && testStatic) {
        setCollisionMsg("🚫 Blocked! Element is Static (Obstacle preventing avatar walking).");
        setTimeout(() => setCollisionMsg(null), 2500);
        return;
      }

      setAvatarPos({ x: nextX, y: nextY });

      // Check sitting condition (if non-static/seating item)
      if (hitsElement && !testStatic) {
        setIsSeated(true);
        setCollisionMsg("🪑 Avatar is sitting / standing comfortably on the element!");
      } else {
        setIsSeated(false);
        setCollisionMsg(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [avatarPos, elementPos, avatarFacing, testWidth, testHeight, testStatic]);

  // Pan & Mouse drag handler
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.shiftKey) { // Middle click or Shift + drag for panning
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

      // Draw grid floor tiles (studio wood parquet pattern)
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

      // Draw Element footprint highlight box
      ctx.fillStyle = testStatic ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)";
      ctx.fillRect(
        elementPos.x * TILE_SIZE,
        elementPos.y * TILE_SIZE,
        testWidth * TILE_SIZE,
        testHeight * TILE_SIZE
      );

      ctx.strokeStyle = testStatic ? "#ef4444" : "#10b981";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.strokeRect(
        elementPos.x * TILE_SIZE,
        elementPos.y * TILE_SIZE,
        testWidth * TILE_SIZE,
        testHeight * TILE_SIZE
      );
      ctx.setLineDash([]);

      // Draw Element Image if loaded, else fallback preview rectangle
      if (img && img.complete && img.naturalWidth !== 0) {
        try {
          ctx.drawImage(
            img,
            elementPos.x * TILE_SIZE,
            elementPos.y * TILE_SIZE,
            testWidth * TILE_SIZE,
            testHeight * TILE_SIZE
          );
        } catch {
          drawFallbackBox(ctx);
        }
      } else {
        drawFallbackBox(ctx);
      }

      // Dimension label tag on element footprint
      ctx.fillStyle = testStatic ? "#fca5a5" : "#6ee7b7";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(
        `${testWidth}×${testHeight} tiles`,
        elementPos.x * TILE_SIZE + 6,
        elementPos.y * TILE_SIZE + 16
      );

      // Draw Avatar
      drawAvatar(ctx);

      ctx.restore();
    };

    function drawFallbackBox(context: CanvasRenderingContext2D) {
      context.fillStyle = testStatic ? "rgba(239, 68, 68, 0.35)" : "rgba(16, 185, 129, 0.35)";
      context.fillRect(
        elementPos.x * TILE_SIZE + 2,
        elementPos.y * TILE_SIZE + 2,
        testWidth * TILE_SIZE - 4,
        testHeight * TILE_SIZE - 4
      );
      context.fillStyle = "#ffffff";
      context.font = "bold 12px sans-serif";
      context.textAlign = "center";
      context.fillText(
        "📦 Element",
        (elementPos.x + testWidth / 2) * TILE_SIZE,
        (elementPos.y + testHeight / 2) * TILE_SIZE
      );
      context.textAlign = "left";
    }

    function drawAvatar(context: CanvasRenderingContext2D) {
      const ax = avatarPos.x * TILE_SIZE + TILE_SIZE / 2;
      const ay = avatarPos.y * TILE_SIZE + TILE_SIZE / 2;

      context.save();

      // Shadow
      context.beginPath();
      context.ellipse(ax, ay + (isSeated ? 10 : 14), 12, 5, 0, 0, Math.PI * 2);
      context.fillStyle = "rgba(0,0,0,0.4)";
      context.fill();

      // Avatar Legs (Standing vs Sitting Pose)
      context.fillStyle = "#334155";
      if (isSeated) {
        context.fillRect(ax - 8, ay + 2, 6, 4);
        context.fillRect(ax + 2, ay + 2, 6, 4);
      } else {
        context.fillRect(ax - 6, ay + 4, 4, 10);
        context.fillRect(ax + 2, ay + 4, 4, 10);
      }

      // Torso / Shirt
      context.fillStyle = isSeated ? "#10b981" : "#3b82f6";
      context.beginPath();
      if (typeof context.roundRect === "function") {
        context.roundRect(ax - 8, ay - (isSeated ? 4 : 6), 16, 12, 4);
      } else {
        context.rect(ax - 8, ay - (isSeated ? 4 : 6), 16, 12);
      }
      context.fill();

      // Head
      context.fillStyle = "#fcd34d";
      context.beginPath();
      context.arc(ax, ay - (isSeated ? 10 : 12), 8, 0, Math.PI * 2);
      context.fill();

      // Eyes based on direction
      context.fillStyle = "#1e293b";
      const eyeY = ay - (isSeated ? 12 : 14);
      if (avatarFacing === "down") {
        context.fillRect(ax - 4, eyeY, 2, 3);
        context.fillRect(ax + 2, eyeY, 2, 3);
      } else if (avatarFacing === "left") {
        context.fillRect(ax - 5, eyeY, 2, 3);
      } else if (avatarFacing === "right") {
        context.fillRect(ax + 3, eyeY, 2, 3);
      }

      // Seated speech bubble badge above head
      if (isSeated) {
        context.fillStyle = "rgba(16, 185, 129, 0.9)";
        context.beginPath();
        if (typeof context.roundRect === "function") {
          context.roundRect(ax - 28, ay - 32, 56, 16, 8);
        } else {
          context.rect(ax - 28, ay - 32, 56, 16);
        }
        context.fill();

        context.fillStyle = "#fff";
        context.font = "bold 9px sans-serif";
        context.textAlign = "center";
        context.fillText("🪑 Sitting!", ax, ay - 21);
      }

      context.restore();
    }

    render();

    // Async Image Loader
    if (element.imageUrl) {
      const img = new Image();
      if (element.imageUrl.startsWith("http")) {
        img.crossOrigin = "anonymous";
      }
      img.src = element.imageUrl;
      img.onload = () => render(img);
      img.onerror = () => render();
    }
  }, [avatarPos, elementPos, element, avatarFacing, isSeated, testWidth, testHeight, testStatic, zoom, pan]);

  // Click grid to relocate element
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.floor((e.clientX - rect.left - pan.x) / (TILE_SIZE * zoom));
    const clickY = Math.floor((e.clientY - rect.top - pan.y) / (TILE_SIZE * zoom));

    const maxX = Math.max(0, GRID_COLS - testWidth);
    const maxY = Math.max(0, GRID_ROWS - testHeight);

    setElementPos({
      x: Math.min(Math.max(0, clickX), maxX),
      y: Math.min(Math.max(0, clickY), maxY),
    });
  };

  return (
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
        {/* Studio Top Header */}
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
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {element.name || "Element Tester"}
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: "rgba(99, 102, 241, 0.2)",
                    color: "#a5b4fc",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    textTransform: "uppercase",
                  }}
                >
                  {category}
                </span>
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: 0, marginTop: 2 }}>
                Walk avatar with <b>W / A / S / D</b> or <b>Arrow Keys</b> to test collisions & sitting
              </p>
            </div>
          </div>

          {/* Zoom & Viewport Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              style={{ padding: "6px 10px", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, cursor: "pointer" }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              style={{ padding: "6px 10px", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, cursor: "pointer" }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => { setZoom(1.2); setPan({ x: 0, y: 0 }); }}
              style={{ padding: "6px 10px", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, cursor: "pointer" }}
              title="Reset View"
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

        {/* Real-time Status / Collision Banner */}
        {collisionMsg && (
          <div
            style={{
              padding: "0.6rem 1.25rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: testStatic ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)",
              borderBottom: `1px solid ${testStatic ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
              color: testStatic ? "#fca5a5" : "#6ee7b7",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {testStatic ? <ShieldAlert size={16} /> : <UserCheck size={16} />}
            {collisionMsg}
          </div>
        )}

        {/* Main Simulator Workspace (Sidebar Toolbar + Interactive Canvas) */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Studio Sidebar Controls */}
          <div
            style={{
              width: "240px",
              background: "#1e293b",
              borderRight: "1px solid rgba(255,255,255,0.1)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              overflowY: "auto",
            }}
          >
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}>
                <SlidersHorizontal size={14} color="#60a5fa" /> Grid Dimensions
              </p>
              
              {/* Width Editor */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", background: "rgba(15,23,42,0.6)", padding: "6px 10px", borderRadius: 8 }}>
                <span style={{ fontSize: "0.85rem" }}>Width:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => setTestWidth((w) => Math.max(1, w - 1))}
                    style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    -
                  </button>
                  <b style={{ color: "#60a5fa", minWidth: 20, textAlign: "center", fontSize: "0.9rem" }}>{testWidth}</b>
                  <button
                    type="button"
                    onClick={() => setTestWidth((w) => Math.min(GRID_COLS, w + 1))}
                    style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Height Editor */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(15,23,42,0.6)", padding: "6px 10px", borderRadius: 8 }}>
                <span style={{ fontSize: "0.85rem" }}>Height:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => setTestHeight((h) => Math.max(1, h - 1))}
                    style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    -
                  </button>
                  <b style={{ color: "#60a5fa", minWidth: 20, textAlign: "center", fontSize: "0.9rem" }}>{testHeight}</b>
                  <button
                    type="button"
                    onClick={() => setTestHeight((h) => Math.min(GRID_ROWS, h + 1))}
                    style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}>
                <Layers size={14} color="#60a5fa" /> Collision Behavior
              </p>
              <button
                type="button"
                onClick={() => setTestStatic((s) => !s)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderRadius: 10,
                  cursor: "pointer",
                  background: testStatic ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)",
                  color: testStatic ? "#fca5a5" : "#6ee7b7",
                  border: `1px solid ${testStatic ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {testStatic ? "🚫 Static Obstacle" : "✅ Walkable / Seating"}
              </button>
            </div>

            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.75rem" }}>
                🎮 Controls Guide
              </p>
              <div style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: 6, background: "rgba(15,23,42,0.6)", padding: "10px", borderRadius: 8 }}>
                <div><b>W / A / S / D:</b> Move Avatar</div>
                <div><b>Arrow Keys:</b> Move Avatar</div>
                <div><b>Click Canvas:</b> Move Element</div>
                <div><b>Shift + Drag:</b> Pan Grid</div>
              </div>
            </div>

            <div style={{ marginTop: "auto" }}>
              <button
                type="button"
                onClick={() => setAvatarPos({ x: 2, y: 4 })}
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
                📍 Reset Avatar
              </button>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
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
              onClick={handleCanvasClick}
              style={{
                cursor: "crosshair",
                borderRadius: "12px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
