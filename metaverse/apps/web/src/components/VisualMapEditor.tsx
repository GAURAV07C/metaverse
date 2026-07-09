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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const TILE = 20;

  const getTileFromEvent = useCallback((e: React.MouseEvent | React.DragEvent) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE);
    const y = Math.floor((e.clientY - rect.top) / TILE);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    return { x, y };
  }, [width, height, TILE]);

  const handleGridClick = (e: React.MouseEvent) => {
    if (!selectedElement) return;
    const pos = getTileFromEvent(e);
    if (!pos) return;

    const el = availableElements.find(el => el.id === selectedElement);
    if (!el) return;

    const maxX = width - el.width;
    const maxY = height - el.height;
    const clampedX = Math.min(pos.x, maxX);
    const clampedY = Math.min(pos.y, maxY);

    const exists = elements.find(
      item => item.elementId === selectedElement && item.x === clampedX && item.y === clampedY
    );
    if (exists) return;

    onChange([...elements, { elementId: selectedElement, x: clampedX, y: clampedY }]);
  };

  const handleDragStart = (e: React.DragEvent, elementId: string) => {
    setDraggingId(elementId);
    e.dataTransfer.setData("text/plain", elementId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const elementId = e.dataTransfer.getData("text/plain");
    if (!elementId) return;

    const pos = getTileFromEvent(e);
    if (!pos) return;

    const el = availableElements.find(el => el.id === elementId);
    if (!el) return;

    const maxX = width - el.width;
    const maxY = height - el.height;
    const clampedX = Math.min(pos.x, maxX);
    const clampedY = Math.min(pos.y, maxY);

    const exists = elements.find(
      item => item.elementId === elementId && item.x === clampedX && item.y === clampedY
    );
    if (exists) return;

    onChange([...elements, { elementId, x: clampedX, y: clampedY }]);
    setDraggingId(null);
  };

  const handleRemoveElement = (index: number) => {
    onChange(elements.filter((_, i) => i !== index));
  };

  const handleElementDrag = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const el = elements[index];
    const pos = getTileFromEvent(e);
    if (!pos) return;

    const elData = availableElements.find(el => el.id === el.elementId);
    if (!elData) return;

    const maxX = width - elData.width;
    const maxY = height - elData.height;
    const clampedX = Math.min(pos.x, maxX);
    const clampedY = Math.min(pos.y, maxY);

    onChange(elements.map((item, i) => i === index ? { ...item, x: clampedX, y: clampedY } : item));
  };

  const getElementById = (id: string) => availableElements.find(el => el.id === id);

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      {/* Elements Palette */}
      <div style={{ flex: "0 0 200px" }}>
        <p className="field-label" style={{ marginBottom: "0.5rem" }}>
          Drag elements to map
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "400px", overflowY: "auto" }}>
          {availableElements.map(el => (
            <div
              key={el.id}
              draggable
              onDragStart={(e) => handleDragStart(e, el.id)}
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
                  {el.width}×{el.height}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Grid */}
      <div style={{ flex: 1, minWidth: "300px" }}>
        <p className="field-label" style={{ marginBottom: "0.5rem" }}>
          {width}×{height} map (click grid to place selected element)
        </p>
        <div
          ref={gridRef}
          onClick={handleGridClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${width}, ${TILE}px)`,
            gridTemplateRows: `repeat(${height}, ${TILE}px)`,
            gap: "1px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--glass-border)",
            borderRadius: "8px",
            overflow: "auto",
            maxWidth: "100%",
            cursor: selectedElement ? "crosshair" : "default",
          }}
        >
          {Array.from({ length: height }).map((_, y) =>
            Array.from({ length: width }).map((_, x) => {
              const placedElement = elements.find(el => {
                const elData = getElementById(el.elementId);
                return elData && x >= el.x && x < el.x + elData.width && y >= el.y && y < el.y + elData.height;
              });

              return (
                <div
                  key={`${x}-${y}`}
                  style={{
                    width: TILE,
                    height: TILE,
                    background: placedElement
                      ? "rgba(59,130,246,0.3)"
                      : "rgba(15,23,42,0.4)",
                    border: "1px solid rgba(255,255,255,0.03)",
                  }}
                />
              );
            })
          )}

          {/* Placed Elements */}
          {elements.map((el, idx) => {
            const elData = getElementById(el.elementId);
            if (!elData) return null;
            return (
              <div
                key={idx}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(idx));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveElement(idx);
                }}
                onMouseDown={(e) => {
                  const handleMove = (moveEvent: MouseEvent) => handleElementDrag(e as unknown as React.MouseEvent, idx);
                  const handleUp = () => {
                    document.removeEventListener("mousemove", handleMove);
                    document.removeEventListener("mouseup", handleUp);
                  };
                  document.addEventListener("mousemove", handleMove);
                  document.addEventListener("mouseup", handleUp);
                }}
                title={`Click to remove | Drag to move`}
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
                  cursor: "pointer",
                  border: "2px solid var(--accent)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  zIndex: 10,
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(59,130,246,0.5)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
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
                      onClick={() => handleRemoveElement(idx)}
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
