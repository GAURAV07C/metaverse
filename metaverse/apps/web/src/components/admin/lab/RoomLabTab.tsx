import { useState } from "react";
import { Plus, Pencil, Trash2, Sparkles, MapPin } from "lucide-react";
import type { ElementItem } from "../adminTypes";
import { RoomLabEditorModal } from "./RoomLabEditorModal";

export interface MapLabItem {
  id: string;
  name: string;
  dimensions: string;
  thumbnail?: string;
  elementCount: number;
  elements: { id: string; x: number; y: number; element: ElementItem }[];
}

interface RoomLabTabProps {
  maps: MapLabItem[];
  elements: ElementItem[];
  onCreateMap: (data: {
    name: string;
    dimensions: string;
    thumbnail: string;
    defaultElements: { elementId: string; x: number; y: number }[];
  }) => Promise<void>;
  onUpdateMap: (
    id: string,
    data: {
      name: string;
      dimensions: string;
      thumbnail: string;
      defaultElements: { elementId: string; x: number; y: number }[];
    }
  ) => Promise<void>;
  onDeleteMap: (id: string) => Promise<void>;
  isDeletingMapId?: string | null;
}

export function RoomLabTab({
  maps,
  elements,
  onCreateMap,
  onUpdateMap,
  onDeleteMap,
  isDeletingMapId,
}: RoomLabTabProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapLabItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenCreate = () => {
    setEditingMap(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (mapItem: MapLabItem) => {
    setEditingMap(mapItem);
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async (data: {
    id?: string;
    name: string;
    dimensions: string;
    thumbnail: string;
    defaultElements: { elementId: string; x: number; y: number }[];
  }) => {
    setIsSaving(true);
    try {
      if (data.id) {
        await onUpdateMap(data.id, {
          name: data.name,
          dimensions: data.dimensions,
          thumbnail: data.thumbnail,
          defaultElements: data.defaultElements,
        });
      } else {
        await onCreateMap({
          name: data.name,
          dimensions: data.dimensions,
          thumbnail: data.thumbnail,
          defaultElements: data.defaultElements,
        });
      }
      setIsEditorOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div
        className="dash-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🧪 Room & Map Template Lab
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 4 }}>
            Build custom room layouts with walls, floors, desks & seating. Templates published here will be available to all users when creating spaces!
          </p>
        </div>
        <button
          className="btn"
          onClick={handleOpenCreate}
          style={{ boxShadow: "0 4px 14px var(--accent-glow)" }}
        >
          <Plus size={18} style={{ marginRight: 6 }} /> Open Room Lab Studio
        </button>
      </div>

      {/* Published Room Templates Grid */}
      <h3 style={{ margin: "1.5rem 0 1rem", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
        Published Room Templates ({maps.length})
      </h3>

      <div className="admin-items-grid">
        {maps.map((m) => (
          <div
            key={m.id}
            className="glass admin-item-card"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              padding: "1rem",
              position: "relative",
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                width: "100%",
                height: "125px",
                borderRadius: "10px",
                background: "#080e1a",
                backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 0)",
                backgroundSize: "8px 8px",
                marginBottom: "0.75rem",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {m.thumbnail ? (
                <img
                  src={m.thumbnail}
                  alt={m.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span style={{ fontSize: "2.5rem" }}>🗺️</span>
              )}
            </div>

            {/* Info */}
            <div style={{ marginBottom: "0.75rem" }}>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f8fafc" }}>{m.name}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: 2 }}>
                Size: <b>{m.dimensions} tiles</b> • <b>{m.elementCount} elements placed</b>
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto" }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, padding: "0.45rem 0.6rem", fontSize: "0.8rem" }}
                onClick={() => handleOpenEdit(m)}
              >
                <Pencil size={14} style={{ marginRight: 4 }} color="var(--accent)" /> Edit in Lab
              </button>

              <button
                className="panel-del-btn"
                title="Delete template"
                onClick={() => onDeleteMap(m.id)}
                disabled={isDeletingMapId === m.id}
              >
                {isDeletingMapId === m.id ? <span className="spinner" /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        ))}

        {maps.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "3rem 1rem",
              background: "rgba(15,23,42,0.4)",
              borderRadius: "16px",
            }}
          >
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
              No room templates published yet. Click "Open Room Lab Studio" to design your first room template!
            </p>
          </div>
        )}
      </div>

      {/* Room Lab Editor Modal */}
      <RoomLabEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        elements={elements}
        maps={maps}
        initialMapData={
          editingMap
            ? {
                id: editingMap.id,
                name: editingMap.name,
                dimensions: editingMap.dimensions,
                thumbnail: editingMap.thumbnail,
                defaultElements: editingMap.elements.map((el) => ({
                  elementId: el.element.id,
                  x: el.x,
                  y: el.y,
                })),
              }
            : null
        }
        onSaveTemplate={handleSaveTemplate}
        isSaving={isSaving}
      />
    </div>
  );
}
