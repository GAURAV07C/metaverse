import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../store";
import { api } from "../utils/api";
import {
  LogOut,
  Plus,
  Layers,
  Map,
  User2,
  ChevronRight,
  Pencil,
  X,
  Trash2,
} from "lucide-react";
import { useToast } from "../utils/toast";

type Tab = "elements" | "maps" | "avatars";

interface Element {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
}
interface Avatar {
  id: string;
  imageUrl: string;
  name: string;
}

interface MapDefaultElement {
  elementId: string;
  x: number;
  y: number;
}

interface MapElementInfo {
  id: string;
  x: number;
  y: number;
  element: { id: string; imageUrl: string; width: number; height: number; static: boolean };
}

interface MapData {
  id: string;
  name: string;
  dimensions: string;
  thumbnail?: string;
  elementCount: number;
  elements: MapElementInfo[];
}

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("elements");
  const { logout } = useUserStore();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();

  // Elements state
  const [elements, setElements] = useState<Element[]>([]);
  const [elImageUrl, setElImageUrl] = useState("");
  const [elWidth, setElWidth] = useState("1");
  const [elHeight, setElHeight] = useState("1");
  const [elStatic, setElStatic] = useState(true);
  const [elLoading, setElLoading] = useState(false);
  const [elError, setElError] = useState("");
  const [deletingEl, setDeletingEl] = useState<string | null>(null);

  // Update element state
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  // Avatars state
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avImageUrl, setAvImageUrl] = useState("");
  const [avName, setAvName] = useState("");
  const [avLoading, setAvLoading] = useState(false);
  const [avError, setAvError] = useState("");
  const [deletingAv, setDeletingAv] = useState<string | null>(null);

  // Map state
  const [maps, setMaps] = useState<MapData[]>([]);
  const [mapName, setMapName] = useState("");
  const [mapDims, setMapDims] = useState("100x200");
  const [mapThumb, setMapThumb] = useState("https://thumbnail.com/a.png");
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapSuccess, setMapSuccess] = useState("");
  const [mapDefaultElements, setMapDefaultElements] = useState<
    MapDefaultElement[]
  >([]);
  const [addElId, setAddElId] = useState("");
  const [addElX, setAddElX] = useState("0");
  const [addElY, setAddElY] = useState("0");
  const [deletingMap, setDeletingMap] = useState<string | null>(null);

  const fetchElements = async () => {
    try {
      const res = await api.get("/elements");
      setElements(res.data.element ?? []);
    } catch {}
  };

  const fetchAvatars = async () => {
    try {
      const res = await api.get("/avatars");
      setAvatars(res.data.avatars ?? []);
    } catch {}
  };

  const fetchMaps = async () => {
    try {
      const res = await api.get("/maps");
      setMaps(res.data.maps ?? []);
    } catch {}
  };

  useEffect(() => {
    fetchElements();
    fetchAvatars();
    fetchMaps();
  }, []);

  // ── CREATE ELEMENT ────────────────────
  const createElement = async (e: React.FormEvent) => {
    e.preventDefault();
    setElError("");
    setElLoading(true);
    try {
      if (!elImageUrl) throw new Error("Image URL is required");
      await api.post("/admin/element", {
        imageUrl: elImageUrl,
        width: parseInt(elWidth),
        height: parseInt(elHeight),
        static: elStatic,
      });
      setElImageUrl("");
      setElWidth("1");
      setElHeight("1");
      setElStatic(true);
      await fetchElements();
    } catch (err: any) {
      setElError(err.response?.data?.message || err.message || "Failed");
    } finally {
      setElLoading(false);
    }
  };

  // ── UPDATE ELEMENT ────────────────────
  const handleUpdateElement = async () => {
    if (!editingElementId) return;
    setUpdateLoading(true);
    setUpdateMsg("");
    try {
      if (!editImageUrl) throw new Error("Image URL is required");
      await api.put(`/admin/element/${editingElementId}`, {
        imageUrl: editImageUrl,
      });
      setUpdateMsg("Updated!");
      setEditingElementId(null);
      await fetchElements();
    } catch (err: any) {
      setUpdateMsg(err.response?.data?.message || err.message || "Failed");
    } finally {
      setUpdateLoading(false);
    }
  };

  // ── DELETE ELEMENT ────────────────────
  const deleteElement = async (id: string) => {
    if (!await confirm("Are you sure you want to delete this element?")) return;
    setDeletingEl(id);
    try {
      await api.delete(`/admin/element/${id}`);
      await fetchElements();
    } catch (e: any) {
      toast(e.response?.data?.message || "Failed to delete element", 'error');
    } finally {
      setDeletingEl(null);
    }
  };

  // ── CREATE AVATAR ─────────────────────
  const createAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvError("");
    setAvLoading(true);
    try {
      if (!avImageUrl || !avName) throw new Error("All fields required");
      await api.post("/admin/avatar", { imageUrl: avImageUrl, name: avName });
      setAvImageUrl("");
      setAvName("");
      await fetchAvatars();
    } catch (err: any) {
      setAvError(err.response?.data?.message || err.message || "Failed");
    } finally {
      setAvLoading(false);
    }
  };

  // ── DELETE AVATAR ─────────────────────
  const deleteAvatar = async (id: string) => {
    if (!await confirm("Are you sure you want to delete this avatar?")) return;
    setDeletingAv(id);
    try {
      await api.delete(`/admin/avatar/${id}`);
      await fetchAvatars();
    } catch (e: any) {
      toast(e.response?.data?.message || "Failed to delete avatar", 'error');
    } finally {
      setDeletingAv(null);
    }
  };

  // ── CREATE MAP ────────────────────────
  const addMapElement = () => {
    if (!addElId) return;
    setMapDefaultElements((prev) => [
      ...prev,
      { elementId: addElId, x: parseInt(addElX), y: parseInt(addElY) },
    ]);
    setAddElX("0");
    setAddElY("0");
  };

  const removeMapElement = (idx: number) => {
    setMapDefaultElements((prev) => prev.filter((_, i) => i !== idx));
  };

  const addEditMapElement = () => {
    if (!editAddElId) return;
    setEditMapElements((prev) => [
      ...prev,
      { elementId: editAddElId, x: parseInt(editAddElX), y: parseInt(editAddElY) },
    ]);
    setEditAddElX("0");
    setEditAddElY("0");
  };

  const removeEditMapElement = (idx: number) => {
    setEditMapElements((prev) => prev.filter((_, i) => i !== idx));
  };

  const createMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapError("");
    setMapSuccess("");
    setMapLoading(true);
    try {
      if (!mapName) throw new Error("Map name is required");
      const res = await api.post("/admin/map", {
        name: mapName,
        dimensions: mapDims,
        thumbnail: mapThumb,
        defaultElements: mapDefaultElements,
      });
      setMapSuccess(`Map created! ID: ${res.data.id}`);
      setMapName("");
      setMapDefaultElements([]);
      await fetchMaps();
    } catch (err: any) {
      setMapError(err.response?.data?.message || err.message || "Failed");
    } finally {
      setMapLoading(false);
    }
  };

  // ── UPDATE MAP ────────────────────────
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editMapName, setEditMapName] = useState("");
  const [editMapThumb, setEditMapThumb] = useState("");
  const [editMapElements, setEditMapElements] = useState<MapDefaultElement[]>([]);
  const [editAddElId, setEditAddElId] = useState("");
  const [editAddElX, setEditAddElX] = useState("0");
  const [editAddElY, setEditAddElY] = useState("0");
  const [updateMapLoading, setUpdateMapLoading] = useState(false);

  const handleUpdateMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMapId || !editMapName) return;
    setUpdateMapLoading(true);
    try {
      await api.put(`/admin/map/${editingMapId}`, {
        name: editMapName,
        thumbnail: editMapThumb,
        defaultElements: editMapElements,
      });
      setEditingMapId(null);
      await fetchMaps();
      toast("Map updated successfully!", "success");
    } catch (err: any) {
      toast(err.response?.data?.message || "Failed to update map", 'error');
    } finally {
      setUpdateMapLoading(false);
    }
  };

  // ── DELETE MAP ────────────────────────
  const deleteMap = async (id: string) => {
    if (!await confirm("Are you sure you want to delete this map?")) return;
    setDeletingMap(id);
    try {
      await api.delete(`/admin/map/${id}`);
      await fetchMaps();
    } catch (e: any) {
      toast(e.response?.data?.message || "Failed to delete map", 'error');
    } finally {
      setDeletingMap(null);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "elements", label: "Elements", icon: <Layers size={16} /> },
    { key: "maps", label: "Maps", icon: <Map size={16} /> },
    { key: "avatars", label: "Avatars", icon: <User2 size={16} /> },
  ];

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="sidebar-logo">
          🛡️ <span>Admin Panel</span>
        </div>
        <nav className="sidebar-nav">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`nav-item ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon} {t.label}
              {tab === t.key && (
                <ChevronRight size={14} style={{ marginLeft: "auto" }} />
              )}
            </button>
          ))}
          <div
            style={{
              borderTop: "1px solid var(--glass-border)",
              margin: "1rem 0",
            }}
          />
          <button className="nav-item" onClick={() => navigate("/dashboard")}>
            👤 User View
          </button>
        </nav>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="sidebar-logout"
        >
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="dash-main">
        {/* ══ ELEMENTS TAB ══ */}
        {tab === "elements" && (
          <div className="animate-fade-in">
            <div className="dash-header">
              <h1>🪑 Elements</h1>
            </div>

            {/* Create form */}
            <div className="glass admin-form-card">
              <h3 style={{ marginBottom: "1.25rem", fontWeight: 600 }}>
                <Plus size={16} style={{ display: "inline", marginRight: 6 }} />{" "}
                Create Element
              </h3>
              <form onSubmit={createElement} className="admin-grid-form">
                {elError && (
                  <div className="error-banner" style={{ gridColumn: "1/-1" }}>
                    {elError}
                  </div>
                )}
                <div className="field">
                  <label className="field-label">Image URL</label>
                  <input
                    className="input"
                    value={elImageUrl}
                    onChange={(e) => setElImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="field">
                  <label className="field-label">Width (tiles)</label>
                  <input
                    className="input"
                    type="number"
                    value={elWidth}
                    onChange={(e) => setElWidth(e.target.value)}
                    min={1}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Height (tiles)</label>
                  <input
                    className="input"
                    type="number"
                    value={elHeight}
                    onChange={(e) => setElHeight(e.target.value)}
                    min={1}
                  />
                </div>
                <div className="field" style={{ justifyContent: "flex-end" }}>
                  <label className="field-label">Static?</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={elStatic}
                      onChange={(e) => setElStatic(e.target.checked)}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: "var(--accent)",
                        cursor: "pointer",
                      }}
                    />
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      Non-walkable
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn"
                  style={{ gridColumn: "1/-1" }}
                  disabled={elLoading}
                >
                  {elLoading ? (
                    <span className="spinner" />
                  ) : (
                    "Create Element →"
                  )}
                </button>
              </form>
            </div>

            {/* Elements list with edit & delete */}
            <h3
              style={{ margin: "2rem 0 1rem", color: "var(--text-secondary)" }}
            >
              All Elements ({elements.length})
            </h3>
            {updateMsg && (
              <div
                className={
                  updateMsg === "Updated!" ? "success-banner" : "error-banner"
                }
                style={{ marginBottom: "1rem" }}
              >
                {updateMsg}
              </div>
            )}
            <div className="admin-items-grid">
              {elements.map((el) => (
                <div key={el.id} className="glass admin-item-card">
                  <div className="admin-item-thumb">
                    <img
                      src={el.imageUrl}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/60x60/1e293b/94a3b8?text=?";
                      }}
                    />
                  </div>
                  <div className="admin-item-info" style={{ flex: 1 }}>
                    <p className="admin-item-id">{el.id.slice(0, 12)}…</p>
                    <p className="admin-item-meta">
                      {el.width}×{el.height} •{" "}
                      {el.static ? "🚫 Static" : "✅ Walkable"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      className="panel-del-btn"
                      title="Edit image"
                      onClick={() => {
                        setEditingElementId(el.id);
                        setEditImageUrl(el.imageUrl);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="panel-del-btn"
                      title="Delete element"
                      onClick={() => deleteElement(el.id)}
                      disabled={deletingEl === el.id}
                    >
                      {deletingEl === el.id ? (
                        <span className="spinner" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {elements.length === 0 && (
                <p
                  style={{ color: "var(--text-secondary)", padding: "1rem 0" }}
                >
                  No elements yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Edit Element Modal (must render outside the Elements tab so it can open reliably) */}
        {editingElementId && (
          <div
            className="modal-overlay"
            onClick={() => setEditingElementId(null)}
          >
            <div
              className="modal glass animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h2>Update Element Image</h2>
                <button
                  className="btn-icon"
                  onClick={() => setEditingElementId(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="field" style={{ marginBottom: "1rem" }}>
                <label className="field-label">New Image URL</label>
                <input
                  className="input"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn btn-ghost btn-full"
                  onClick={() => setEditingElementId(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-full"
                  onClick={handleUpdateElement}
                  disabled={updateLoading}
                >
                  {updateLoading ? <span className="spinner" /> : "Update →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MAPS TAB ══ */}
        {tab === "maps" && (
          <div className="animate-fade-in">
            <div className="dash-header">
              <h1>🗺️ Maps</h1>
            </div>
            <div className="glass admin-form-card">
              <h3 style={{ marginBottom: "1.25rem", fontWeight: 600 }}>
                <Plus size={16} style={{ display: "inline", marginRight: 6 }} />{" "}
                Create Map
              </h3>
              <form onSubmit={createMap} className="admin-grid-form">
                {mapError && (
                  <div className="error-banner" style={{ gridColumn: "1/-1" }}>
                    {mapError}
                  </div>
                )}
                {mapSuccess && (
                  <div
                    className="success-banner"
                    style={{ gridColumn: "1/-1" }}
                  >
                    {mapSuccess}
                  </div>
                )}
                <div className="field">
                  <label className="field-label">Map Name</label>
                  <input
                    className="input"
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                    placeholder="e.g. Office Room"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Dimensions (WxH)</label>
                  <input
                    className="input"
                    value={mapDims}
                    onChange={(e) => setMapDims(e.target.value)}
                    placeholder="100x200"
                  />
                </div>
                <div className="field" style={{ gridColumn: "1/-1" }}>
                  <label className="field-label">Thumbnail URL</label>
                  <input
                    className="input"
                    value={mapThumb}
                    onChange={(e) => setMapThumb(e.target.value)}
                    placeholder="https://thumbnail.com/a.png"
                  />
                </div>

                {/* Default Elements builder */}
                <div
                  style={{
                    gridColumn: "1/-1",
                    borderTop: "1px solid var(--glass-border)",
                    paddingTop: "1rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <p
                    className="field-label"
                    style={{ marginBottom: "0.75rem" }}
                  >
                    <Layers
                      size={13}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    Default Elements (placed when space is created from this
                    map)
                  </p>

                  {/* Element picker */}
                  {elements.length > 0 && (
                    <div className="map-el-builder">
                      <select
                        className="input"
                        value={addElId}
                        onChange={(e) => setAddElId(e.target.value)}
                        style={{ flex: 2 }}
                      >
                        <option value="">Select element…</option>
                        {elements.map((el) => (
                          <option key={el.id} value={el.id}>
                            {el.id.slice(0, 8)}… ({el.width}×{el.height},{" "}
                            {el.static ? "static" : "walkable"})
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        type="number"
                        placeholder="X"
                        value={addElX}
                        onChange={(e) => setAddElX(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <input
                        className="input"
                        type="number"
                        placeholder="Y"
                        value={addElY}
                        onChange={(e) => setAddElY(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "0.5rem 1rem" }}
                        onClick={addMapElement}
                        disabled={!addElId}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                  {elements.length === 0 && (
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.8rem",
                      }}
                    >
                      Create elements first (Elements tab)
                    </p>
                  )}

                  {/* Added elements list */}
                  {mapDefaultElements.length > 0 && (
                    <div className="map-el-list">
                      {mapDefaultElements.map((mel, i) => (
                        <div key={i} className="map-el-chip">
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontFamily: "monospace",
                            }}
                          >
                            {mel.elementId.slice(0, 6)}… @ ({mel.x},{mel.y})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeMapElement(i)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--danger)",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{ gridColumn: "1/-1" }}
                  disabled={mapLoading}
                >
                  {mapLoading ? (
                    <span className="spinner" />
                  ) : (
                    `Create Map with ${mapDefaultElements.length} element${mapDefaultElements.length !== 1 ? "s" : ""} →`
                  )}
                </button>
              </form>
            </div>

            {/* Maps list with edit & delete */}
            <h3
              style={{ margin: "2rem 0 1rem", color: "var(--text-secondary)" }}
            >
              All Maps ({maps.length})
            </h3>
            <div className="admin-items-grid">
              {maps.map((m) => (
                <div key={m.id} className="glass admin-item-card">
                  <div className="admin-item-thumb">
                    <span style={{ fontSize: "1.5rem" }}>🗺️</span>
                  </div>
                  <div className="admin-item-info" style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {m.name}
                    </p>
                    <p className="admin-item-meta">
                      {m.dimensions} • {m.elementCount} elements
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      className="panel-del-btn"
                      title="Edit map"
                      onClick={() => {
                        setEditingMapId(m.id);
                        setEditMapName(m.name);
                        setEditMapThumb(m.thumbnail || "");
                        setEditMapElements(m.elements.map(el => ({ elementId: el.element.id, x: el.x, y: el.y })));
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="panel-del-btn"
                      title="Delete map"
                      onClick={() => deleteMap(m.id)}
                      disabled={deletingMap === m.id}
                    >
                      {deletingMap === m.id ? (
                        <span className="spinner" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {maps.length === 0 && (
                <p
                  style={{ color: "var(--text-secondary)", padding: "1rem 0" }}
                >
                  No maps yet.
                </p>
              )}
            </div>

            {/* Edit Map Modal */}
            {editingMapId && (
              <div
                className="modal-overlay"
                onClick={() => setEditingMapId(null)}
              >
                <div
                  className="modal-large glass animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h2 style={{ fontWeight: 700 }}>Edit Map</h2>
                    <button
                      className="btn-icon"
                      onClick={() => setEditingMapId(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateMap}>
                    <div className="field" style={{ marginBottom: "1rem" }}>
                      <label className="field-label">Map Name</label>
                      <input
                        className="input"
                        value={editMapName}
                        onChange={(e) => setEditMapName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field" style={{ marginBottom: "1.5rem" }}>
                      <label className="field-label">Thumbnail URL</label>
                      <input
                        className="input"
                        value={editMapThumb}
                        onChange={(e) => setEditMapThumb(e.target.value)}
                        placeholder="https://thumbnail.com/a.png"
                      />
                    </div>

                    {/* Default Elements */}
                    <div
                      style={{
                        borderTop: "1px solid var(--glass-border)",
                        paddingTop: "1rem",
                        marginTop: "0.5rem",
                      }}
                    >
                      <p
                        className="field-label"
                        style={{ marginBottom: "0.75rem" }}
                      >
                        <Layers
                          size={13}
                          style={{ display: "inline", marginRight: 4 }}
                        />
                        Default Elements ({editMapElements.length})
                      </p>

                      {elements.length > 0 ? (
                        <div className="map-el-builder">
                          <select
                            className="input"
                            value={editAddElId}
                            onChange={(e) => setEditAddElId(e.target.value)}
                            style={{ flex: 2 }}
                          >
                            <option value="">Select element…</option>
                            {elements.map((el) => (
                              <option key={el.id} value={el.id}>
                                {el.id.slice(0, 8)}… ({el.width}×{el.height},{" "}
                                {el.static ? "static" : "walkable"})
                              </option>
                            ))}
                          </select>
                          <input
                            className="input"
                            type="number"
                            placeholder="X"
                            value={editAddElX}
                            onChange={(e) => setEditAddElX(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <input
                            className="input"
                            type="number"
                            placeholder="Y"
                            value={editAddElY}
                            onChange={(e) => setEditAddElY(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: "0.5rem 1rem" }}
                            onClick={addEditMapElement}
                            disabled={!editAddElId}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.8rem",
                          }}
                        >
                          Create elements first (Elements tab)
                        </p>
                      )}

                      {editMapElements.length > 0 && (
                        <div className="map-el-list">
                          {editMapElements.map((mel, i) => (
                            <div key={i} className="map-el-chip">
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontFamily: "monospace",
                                }}
                              >
                                {mel.elementId.slice(0, 6)}… @ ({mel.x},{mel.y})
                              </span>
                              <button
                                type="button"
                                onClick={() => removeEditMapElement(i)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--danger)",
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        marginTop: "1.5rem",
                        paddingTop: "1.5rem",
                        borderTop: "1px solid var(--glass-border)",
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-full"
                        onClick={() => setEditingMapId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-full"
                        disabled={updateMapLoading}
                      >
                        {updateMapLoading ? (
                          <span className="spinner" />
                        ) : (
                          "Save Changes →"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ AVATARS TAB ══ */}
        {tab === "avatars" && (
          <div className="animate-fade-in">
            <div className="dash-header">
              <h1>🧑‍🤝‍🧑 Avatars</h1>
            </div>
            <div className="glass admin-form-card">
              <h3 style={{ marginBottom: "1.25rem", fontWeight: 600 }}>
                <Plus size={16} style={{ display: "inline", marginRight: 6 }} />{" "}
                Create Avatar
              </h3>
              <form onSubmit={createAvatar} className="admin-grid-form">
                {avError && (
                  <div className="error-banner" style={{ gridColumn: "1/-1" }}>
                    {avError}
                  </div>
                )}
                <div className="field">
                  <label className="field-label">Avatar Name</label>
                  <input
                    className="input"
                    value={avName}
                    onChange={(e) => setAvName(e.target.value)}
                    placeholder="e.g. Timmy"
                  />
                </div>
                <div className="field" style={{ gridColumn: "1/-1" }}>
                  <label className="field-label">Image URL</label>
                  <input
                    className="input"
                    value={avImageUrl}
                    onChange={(e) => setAvImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <button
                  type="submit"
                  className="btn"
                  style={{ gridColumn: "1/-1" }}
                  disabled={avLoading}
                >
                  {avLoading ? <span className="spinner" /> : "Create Avatar →"}
                </button>
              </form>
            </div>

            <h3
              style={{ margin: "2rem 0 1rem", color: "var(--text-secondary)" }}
            >
              All Avatars ({avatars.length})
            </h3>
            <div className="admin-items-grid">
              {avatars.map((av) => (
                <div key={av.id} className="glass admin-item-card">
                  <div className="admin-item-thumb">
                    <img
                      src={av.imageUrl}
                      alt={av.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/60x60/1e293b/94a3b8?text=?";
                      }}
                    />
                  </div>
                  <div className="admin-item-info" style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {av.name}
                    </p>
                    <p className="admin-item-id">{av.id.slice(0, 12)}…</p>
                  </div>
                  <button
                    className="panel-del-btn"
                    title="Delete avatar"
                    onClick={() => deleteAvatar(av.id)}
                    disabled={deletingAv === av.id}
                  >
                    {deletingAv === av.id ? (
                      <span className="spinner" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              ))}
              {avatars.length === 0 && (
                <p
                  style={{ color: "var(--text-secondary)", padding: "1rem 0" }}
                >
                  No avatars yet.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
