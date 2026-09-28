import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { ElementItem } from "./adminTypes";
import { RoomLabEditorModal } from "./lab/RoomLabEditorModal";

export interface MapData {
  id: string;
  name: string;
  dimensions: string;
  thumbnail?: string;
  elementCount: number;
  elements: { id?: string; x: number; y: number; element: ElementItem }[];
  areas?: any[];
}

interface MapsTabProps {
  maps: MapData[];
  elements: ElementItem[];
  roomTemplates?: any[];
  onCreateMap: (data: {
    name: string;
    dimensions: string;
    thumbnail: string;
    defaultElements: { elementId: string; x: number; y: number }[];
    areas?: { name: string; x: number; y: number; w: number; h: number; floor: string; color: string; texture: string }[];
  }) => Promise<void>;
  onUpdateMap: (
    id: string,
    data: {
      name: string;
      dimensions: string;
      thumbnail: string;
      defaultElements: { elementId: string; x: number; y: number }[];
      areas?: { name: string; x: number; y: number; w: number; h: number; floor: string; color: string; texture: string }[];
    }
  ) => Promise<void>;
  onDeleteMap: (id: string) => Promise<void>;
  isDeletingMapId?: string | null;
}

import { useNavigate, useLocation } from "react-router-dom";

export function MapsTab({
  maps,
  elements,
  roomTemplates,
  onCreateMap,
  onUpdateMap,
  onDeleteMap,
  isDeletingMapId,
}: MapsTabProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSaving, setIsSaving] = useState(false);

  // Extract mapId from URL (e.g. /admin/maps/123 or /admin/maps/new)
  const pathParts = location.pathname.split("/");
  const urlMapId = (pathParts[2] === "maps" && pathParts[3]) ? pathParts[3] : null;

  const isEditorOpen = !!urlMapId;
  const editingMap = urlMapId && urlMapId !== "new" ? maps.find((m) => m.id === urlMapId) || null : null;

  const handleOpenCreate = () => {
    navigate("/admin/maps/new");
  };

  const handleOpenEdit = (mapItem: MapData) => {
    navigate(`/admin/maps/${mapItem.id}`);
  };

  const handleSaveMap = async (data: {
    id?: string;
    name: string;
    dimensions: string;
    thumbnail: string;
    defaultElements: { elementId: string; x: number; y: number }[];
    areas?: { name: string; x: number; y: number; w: number; h: number; floor: string; color: string; texture: string }[];
  }) => {
    setIsSaving(true);
    try {
      if (data.id) {
        await onUpdateMap(data.id, {
          name: data.name,
          dimensions: data.dimensions,
          thumbnail: data.thumbnail,
          defaultElements: data.defaultElements,
          areas: data.areas,
        });
      } else {
        await onCreateMap({
          name: data.name,
          dimensions: data.dimensions,
          thumbnail: data.thumbnail,
          defaultElements: data.defaultElements,
          areas: data.areas,
        });
      }
      navigate("/admin/maps");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
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
            🗺️ Maps Studio
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 4 }}>
            Design main interactive arenas and large scale maps for your metaverse.
          </p>
        </div>
        <button
          className="btn"
          onClick={handleOpenCreate}
          style={{ boxShadow: "0 4px 14px var(--accent-glow)" }}
        >
          <Plus size={18} style={{ marginRight: 6 }} /> Create New Map
        </button>
      </div>

      <h3 style={{ margin: "1.5rem 0 1rem", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
        All Maps ({maps.length})
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
            <div
              style={{
                width: "100%",
                height: "140px",
                borderRadius: "10px",
                background: "#080e1a",
                backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0)",
                backgroundSize: "8px 8px",
                marginBottom: "0.75rem",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {m.thumbnail && !m.thumbnail.includes("placehold.co") ? (
                <img
                  src={m.thumbnail}
                  alt={m.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (() => {
                const [w, h] = (m.dimensions || "100x100").split("x").map(Number);
                if (!w || !h) return null;
                return (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {m.elements?.map((el, idx) => (
                      <img
                        key={el.id || idx}
                        src={el.element.imageUrl?.startsWith('/') ? el.element.imageUrl : `/${el.element.imageUrl}`}
                        alt="element"
                        style={{
                          position: "absolute",
                          left: `${(el.x / w) * 100}%`,
                          top: `${(el.y / h) * 100}%`,
                          width: `${((el.element.width || 1) / w) * 100}%`,
                          height: `${((el.element.height || 1) / h) * 100}%`,
                          objectFit: "contain",
                          filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.5))"
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f8fafc" }}>{m.name}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: 2 }}>
                Dimensions: <b>{m.dimensions}</b> • <b>{m.elementCount} elements</b>
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto" }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, padding: "0.45rem 0.6rem", fontSize: "0.8rem" }}
                onClick={() => handleOpenEdit(m)}
              >
                <Pencil size={14} style={{ marginRight: 4 }} color="var(--accent)" /> Open Editor
              </button>

              <button
                className="panel-del-btn"
                title="Delete map"
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
              No maps found. Create a new map to start building your world!
            </p>
          </div>
        )}
      </div>

      <RoomLabEditorModal
        isOpen={isEditorOpen}
        onClose={() => navigate("/admin/maps")}
        elements={elements}
        roomTemplates={roomTemplates}
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
                areas: editingMap.areas,
              }
            : urlMapId === "new" ? {
                name: "New Map",
                dimensions: "100x100"
              } : null
        }
        onSaveTemplate={handleSaveMap}
        isSaving={isSaving}
      />
    </div>
  );
}
