import { Sparkles, Pencil, Trash2 } from "lucide-react";
import type { ElementItem } from "./adminTypes";
import { getElementCategory } from "./adminTypes";

interface ElementCardProps {
  element: ElementItem;
  onCanvasTest: (el: ElementItem) => void;
  onEdit: (el: ElementItem) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function ElementCard({
  element,
  onCanvasTest,
  onEdit,
  onDelete,
  isDeleting,
}: ElementCardProps) {
  const category = getElementCategory(element);

  return (
    <div
      className="glass admin-item-card"
      style={{
        flexDirection: "column",
        padding: "1rem",
        alignItems: "stretch",
        position: "relative",
      }}
    >
      {/* Checkerboard Image Container */}
      <div
        className="admin-item-thumb"
        style={{
          width: "100%",
          height: "115px",
          borderRadius: "10px",
          background: "#090d16",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0)",
          backgroundSize: "10px 10px",
          marginBottom: "0.75rem",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={element.imageUrl}
          alt={element.name || ""}
          style={{ maxHeight: "95px", maxWidth: "90%", objectFit: "contain" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/80x80/1e293b/94a3b8?text=?";
          }}
        />

        {/* Static/Walkable Badge Overlay */}
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: "0.7rem",
            fontWeight: 600,
            background: element.static
              ? "rgba(239, 68, 68, 0.85)"
              : "rgba(16, 185, 129, 0.85)",
            color: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          {element.static ? "🚫 Static" : "✅ Walkable / Sitting"}
        </span>

        {/* Color Mask Pill */}
        {element.colorMaskUrl && (
          <span
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "0.68rem",
              fontWeight: 600,
              background: "rgba(147, 51, 234, 0.85)",
              color: "#fff",
            }}
          >
            🎨 Color Mask
          </span>
        )}
      </div>

      {/* Info Details */}
      <div className="admin-item-info" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="admin-item-id" style={{ fontSize: "0.85rem", color: "#f1f5f9", fontWeight: 600 }}>
            {element.name || `Element ${element.id.slice(0, 8)}`}
          </p>
          <span
            style={{
              fontSize: "0.72rem",
              background: "rgba(255,255,255,0.08)",
              padding: "2px 6px",
              borderRadius: "4px",
              textTransform: "capitalize",
              color: "var(--text-secondary)",
            }}
          >
            {category}
          </span>
        </div>
        <p className="admin-item-meta" style={{ marginTop: 4, fontSize: "0.75rem" }}>
          Size: <b>{element.width}×{element.height} tiles</b> • ID:{" "}
          <span style={{ fontFamily: "monospace" }}>{element.id.slice(0, 8)}</span>
        </p>
      </div>

      {/* Actions Toolbar */}
      <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto" }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}
          onClick={() => onCanvasTest(element)}
          title="Test on canvas"
        >
          <Sparkles size={13} style={{ marginRight: 4 }} color="#3b82f6" /> Canvas Test
        </button>
        <button
          className="panel-del-btn"
          title="Edit element attributes"
          onClick={() => onEdit(element)}
        >
          <Pencil size={13} />
        </button>
        <button
          className="panel-del-btn"
          title="Delete element"
          onClick={() => onDelete(element.id)}
          disabled={isDeleting}
        >
          {isDeleting ? <span className="spinner" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}
