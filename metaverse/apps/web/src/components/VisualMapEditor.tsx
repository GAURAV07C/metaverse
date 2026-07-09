import { useState, useRef, useCallback } from "react";

interface VisualMapEditorProps {
  width: number;
  height: number;
  elements: Array<{ elementId: string; x: number; y: number }>;
  availableElements: Array<{ id: string; imageUrl: string; width: number; height: number; static: boolean }>;
  onChange: (elements: Array<{ elementId: string; x: number; y: number }>) => void;
}

export function VisualMapEditor({ width, height, elements, availableElements, onChange }: VisualMapEditorProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const TILE = 24;

  const getTileFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / TILE);
    const y = Math.floor((clientY - rect.top) / TILE);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    return { x, y };
  }, [width, height, TILE]);

  const handleGridClick = (e: React.MouseEvent) => {
    if (!selectedElement) return;
    if (dragIdx !== null) return;
    const pos = getTileFromEvent(e.clientX, e.clientY);
    if (!pos) return;

    const el = availableElements.find(el => el.id === selectedElement);
    if (!el) return;

    const maxX = width - el.width;
    const maxY = height - el.height;
    const clampedX = Math.min(pos.x, Math.max(0, maxX));
    const clampedY = Math.min(pos.y, Math.max(0, maxY));

    const exists = elements.find(
      item => item.elementId === selectedElement && item.x === clampedX && item.y === clampedY
    );
    if (exists) return;

    onChange([...elements, { elementId: selectedElement, x: clampedX, y: clampedY }]);
  };

  const handlePaletteDragStart = (e: React.DragEvent, elementId: string) => {
    e.dataTransfer.setData("text/plain", `palette:${elementId}`);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleGridDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleGridDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw?.startsWith("palette:")) return;
    const elementId = raw.replace("palette:", "");
    const pos = getTileFromEvent(e.clientX, e.clientY);
    if (!pos) return;

    const el = availableElements.find(el => el.id === elementId);
    if (!el) return;

    const maxX = width - el.width;
    const maxY = height - el.height;
    const clampedX = Math.min(pos.x, Math.max(0, maxX));
    const clampedY = Math.min(pos.y, Math.max(0, maxY));

    const exists = elements.find(
      item => item.elementId === elementId && item.x === clampedX && item.y === clampedY
    );
    if (exists) return;

    onChange([...elements, { elementId, x: clampedX, y: clampedY }]);
  };

  const handlePlacedMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elements[index];
    const elData = availableElements.find(el => el.id === el.elementId);
    if (!elData) return;

    const gridRect = gridRef.current!.getBoundingClientRect();
    const offsetX = e.clientX - (gridRect.left + el.x * TILE);
    const offsetY = e.clientY - (gridRect.top + el.y * TILE);

    setDragIdx(index);
    setDragOffset({ x: offsetX, y: offsetY });

    const handleMove = (moveEvent: MouseEvent) => {
      const gridRectNow = gridRef.current!.getBoundingClientRect();
      const newX = Math.floor((moveEvent.clientX - gridRectNow.left - offsetX) / TILE);
      const newY = Math.floor((moveEvent.clientY - gridRectNow.top - offsetY) / TILE);

      const maxX = width - elData.width;
      const maxY = height - elData.height;
      const clampedX = Math.min(Math.max(0, newX), maxX);
      const clampedY = Math.min(Math.max(0, newY), maxY);

      onChange(prev => prev.map((item, i) => i === index ? { ...item, x: clampedX, y: clampedY } : item));
    };

    const handleUp = () => {
      setDragIdx(null);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handlePlacedClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (dragIdx !== null) return;
    onChange(elements.filter((_, i) => i !== index));
  };

  const getElementById = (id: string) => availableElements.find(el => el.id === id);

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${width}, ${TILE}px)`,
    gridTemplateRows: `repeat(${height}, ${TILE}px)`,
    border: "1px solid var(--glass-border)",
    borderRadius: "8px",
    overflow: "auto",
    maxWidth: "100%",
    cursor: selectedElement ? "crosshair" : "default",
    position: "relative",
    background: "rgba(255,255,255,0.03)",
  };

  const cellStyle: React.CSSProperties = {
    width: TILE,
    height: TILE,
    borderRight: "1px solid rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  };

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      {/* Elements Palette */}
      <div style={{ flex: "0 0 220px" }}>
        <p className="field-label" style={{ marginBottom: "0.5rem" }}>
          Elements
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          Click to select, then click grid to place
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "420px", overflowY: "auto" }}>
          {availableElements.map(el => (
            <div
              key={el.id}
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, el.id)}
              onClick={() => setSelectedElement(el.id === selectedElement ? null : el.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                borderRadius: "8px",
                border: selectedElement === el.id ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                background: selectedElement === el.id ? "rgba(59,130,246,0.1)" : "transparent",
                cursor: "grab",
                transition: "all 0.15s",
                userSelect: "none",
              }}
            >
              <img
                src={el.imageUrl}
                alt=""
                style={{ width: 28, height: 28, objectFit: "contain", borderRadius: "4px" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {el.id.slice(0, 8)}
                </p>
                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                  {el.width}×{el.height} • {el.static ? "Static" : "Walkable"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Grid */}
      <div style={{ flex: 1, minWidth: "320px" }}>
        <p className="field-label" style={{ marginBottom: "0.5rem" }}>
          {width}×{height} map
          {selectedElement && <span style={{ color: "var(--accent)", marginLeft: "0.5rem" }}>• Click grid to place</span>}
        </p>
        <div
          ref={gridRef}
          style={gridStyle}
          onClick={handleGridClick}
          onDragOver={handleGridDragOver}
          onDrop={handleGridDrop}
        >
          {Array.from({ length: height }).map((_, y) =>
            Array.from({ length: width }).map((_, x) => (
              <div key={`${x}-${y}`} style={cellStyle} />
            ))
          )}

          {elements.map((el, idx) => {
            const elData = getElementById(el.elementId);
            if (!elData) return null;
            const isDragging = dragIdx === idx;
            return (
              <div
                key={`placed-${idx}`}
                onMouseDown={(e) => handlePlacedMouseDown(e, idx)}
                onClick={(e) => handlePlacedClick(e, idx)}
                title="Drag to move • Click to remove"
                style={{
                  position: "absolute",
                  left: el.x * TILE,
                  top: el.y * TILE,
                  width: elData.width * TILE,
                  height: elData.height * TILE,
                  backgroundImage: `url(${elData.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: "4px",
                  cursor: isDragging ? "grabbing" : "grab",
                  border: "2px solid var(--accent)",
                  boxShadow: isDragging ? "0 8px 24px rgba(59,130,246,0.6)" : "0 2px 8px rgba(0,0,0,0.4)",
                  zIndex: 20,
                  transition: isDragging ? "none" : "box-shadow 0.15s, transform 0.15s",
                  transform: isDragging ? "scale(1.05)" : "scale(1)",
                  userSelect: "none",
                }}
              />
            );
          })}
        </div>

        {/* Elements List */}
        {elements.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <p className="field-label" style={{ marginBottom: "0.5rem" }}>
              Placed Elements ({elements.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "200px", overflowY: "auto" }}>
              {elements.map((el, idx) => {
                const elData = getElementById(el.elementId);
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      borderRadius: "8px",
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <img
                      src={elData?.imageUrl}
                      alt=""
                      style={{ width: 24, height: 24, objectFit: "contain" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span style={{ flex: 1, fontSize: "0.8rem", fontFamily: "monospace" }}>
                      {el.elementId.slice(0, 8)}… @ ({el.x}, {el.y})
                    </span>
                    <button
                      type="button"
                      onClick={() => onChange(elements.filter((_, i) => i !== idx))}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
