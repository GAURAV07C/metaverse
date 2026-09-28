import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../store";
import { api } from "../utils/api";
import {
  LogOut,
  Plus,
  Layers,
  Map,
  User2,
  ChevronRight,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useToast } from "../utils/toast";
import { ElementsTab } from "./admin/ElementsTab";
import { RoomLabTab } from "./admin/lab/RoomLabTab";
import { MapsTab } from "./admin/MapsTab";
import { CanvasAvatarPreview } from "./CanvasAvatarPreview";
import type { ElementItem } from "./admin/adminTypes";
import { AvatarCanvasTesterModal } from "./AvatarCanvasTesterModal";

type Tab = "elements" | "lab" | "maps" | "avatars";

interface Avatar {
  id: string;
  imageUrl: string;
  name: string;
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
  const navigate = useNavigate();
  const location = useLocation();

  // Sync active tab with route URL (/admin/elements, /admin/lab, /admin/maps, /admin/avatars)
  const getTabFromPath = (): Tab => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/admin/lab")) return "lab";
    if (path.includes("/admin/maps")) return "maps";
    if (path.includes("/admin/avatars")) return "avatars";
    return "elements";
  };

  const tab = getTabFromPath();
  const { logout } = useUserStore();
  const { toast, confirm } = useToast();

  // Elements state
  const [elements, setElements] = useState<ElementItem[]>([]);
  const [elLoading, setElLoading] = useState(false);
  const [elError, setElError] = useState("");
  const [deletingEl, setDeletingEl] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  // Avatars state
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avImageUrl, setAvImageUrl] = useState("");
  const [avName, setAvName] = useState("");
  const [avLoading, setAvLoading] = useState(false);
  const [avError, setAvError] = useState("");
  const [deletingAv, setDeletingAv] = useState<string | null>(null);
  const [testingAvatar, setTestingAvatar] = useState<Avatar | null>(null);

  // Map state
  const [maps, setMaps] = useState<MapData[]>([]);
  const [deletingMap, setDeletingMap] = useState<string | null>(null);

  // Map edit state

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
  const handleCreateElement = async (data: {
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
    name?: string;
    category?: string;
    colorMaskUrl?: string;
    variants?: any;
  }) => {
    setElError("");
    setElLoading(true);
    try {
      await api.post("/admin/element", data);
      toast("Element created successfully!", "success");
      await fetchElements();
    } catch (err: any) {
      setElError(err.response?.data?.message || err.message || "Failed to create element");
      throw err;
    } finally {
      setElLoading(false);
    }
  };

  // ── UPDATE ELEMENT ────────────────────
  const handleUpdateElement = async (
    id: string,
    data: {
      imageUrl: string;
      width: number;
      height: number;
      static: boolean;
      name?: string;
      category?: string;
      colorMaskUrl?: string;
      variants?: any;
    }
  ) => {
    setUpdateLoading(true);
    setUpdateMsg("");
    try {
      await api.put(`/admin/element/${id}`, data);
      toast("Element updated successfully!", "success");
      await fetchElements();
    } catch (err: any) {
      setUpdateMsg(err.response?.data?.message || err.message || "Failed to update element");
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  };

  // ── DELETE ELEMENT ────────────────────
  const deleteElement = async (id: string) => {
    if (!(await confirm("Are you sure you want to delete this element?"))) return;
    setDeletingEl(id);
    try {
      await api.delete(`/admin/element/${id}`);
      await fetchElements();
      toast("Element deleted successfully!", "success");
    } catch (e: any) {
      toast(e.response?.data?.message || "Failed to delete element", "error");
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
      toast("Avatar created successfully!", "success");
    } catch (err: any) {
      setAvError(err.response?.data?.message || err.message || "Failed");
    } finally {
      setAvLoading(false);
    }
  };

  // ── DELETE AVATAR ─────────────────────
  const deleteAvatar = async (id: string) => {
    if (!(await confirm("Are you sure you want to delete this avatar?"))) return;
    setDeletingAv(id);
    try {
      await api.delete(`/admin/avatar/${id}`);
      await fetchAvatars();
      toast("Avatar deleted successfully!", "success");
    } catch (e: any) {
      toast(e.response?.data?.message || "Failed to delete avatar", "error");
    } finally {
      setDeletingAv(null);
    }
  };


  const deleteMap = async (id: string) => {
    if (!(await confirm("Are you sure you want to delete this map?"))) return;
    setDeletingMap(id);
    try {
      await api.delete(`/admin/map/${id}`);
      await fetchMaps();
      toast("Map deleted successfully!", "success");
    } catch (e: any) {
      toast(e.response?.data?.message || "Failed to delete map", "error");
    } finally {
      setDeletingMap(null);
    }
  };

  // ── ROOM LAB MAP HANDLERS ────────────────
  const handleCreateMapData = async (data: {
    name: string;
    dimensions: string;
    thumbnail: string;
    defaultElements: { elementId: string; x: number; y: number }[];
    areas?: { name: string; x: number; y: number; w: number; h: number; floor: string; color: string; texture: string }[];
  }) => {
    await api.post("/admin/map", { ...data, type: "room" });
    await fetchMaps();
    toast("Room template published successfully!", "success");
  };

  const handleUpdateMapData = async (
    id: string,
    data: {
      name: string;
      thumbnail?: string;
      defaultElements: { elementId: string; x: number; y: number }[];
      areas?: { name: string; x: number; y: number; w: number; h: number; floor: string; color: string; texture: string }[];
    }
  ) => {
    await api.put(`/admin/map/${id}`, data);
    await fetchMaps();
    toast("Room template updated successfully!", "success");
  };

  const handleDeleteMapData = async (id: string) => {
    if (!(await confirm("Are you sure you want to delete this room template?"))) return;
    await api.delete(`/admin/map/${id}`);
    await fetchMaps();
    toast("Room template deleted successfully!", "success");
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "elements", label: "Elements", icon: <Layers size={16} /> },
    { key: "lab", label: "🧪 Room Lab Studio", icon: <Sparkles size={16} /> },
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
              onClick={() => navigate(`/admin/${t.key}`)}
            >
              {t.icon} {t.label}
              {tab === t.key && <ChevronRight size={14} style={{ marginLeft: "auto" }} />}
            </button>
          ))}
          <div style={{ borderTop: "1px solid var(--glass-border)", margin: "1rem 0" }} />
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

      {/* Main Content */}
      <main className="dash-main">
        {/* ══ ELEMENTS TAB ══ */}
        {tab === "elements" && (
          <ElementsTab
            elements={elements}
            onCreateElement={handleCreateElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={deleteElement}
            isCreating={elLoading}
            createError={elError}
            isUpdating={updateLoading}
            updateMsg={updateMsg}
            deletingElId={deletingEl}
          />
        )}

        {/* ══ ROOM LAB TAB ══ */}
        {tab === "lab" && (
          <RoomLabTab
            maps={maps.filter((m: any) => m.type === "room")}
            elements={elements}
            onCreateMap={handleCreateMapData}
            onUpdateMap={handleUpdateMapData}
            onDeleteMap={handleDeleteMapData}
            isDeletingMapId={deletingMap}
          />
        )}

        {/* ══ MAPS TAB ══ */}
        {tab === "maps" && (
          <MapsTab
            maps={maps.filter((m: any) => m.type !== "room")}
            elements={elements}
            roomTemplates={maps.filter((m: any) => m.type === "room")}
            onCreateMap={async (data) => {
              await api.post("/admin/map", data);
              await fetchMaps();
              toast("Map created successfully!", "success");
            }}
            onUpdateMap={async (id, data) => {
              await api.put(`/admin/map/${id}`, data);
              await fetchMaps();
              toast("Map updated successfully!", "success");
            }}
            onDeleteMap={deleteMap}
            isDeletingMapId={deletingMap}
          />
        )}

        {/* ══ AVATARS TAB ══ */}
        {tab === "avatars" && (
          <div className="animate-fade-in">
            <div className="dash-header">
              <h1>🧑‍🤝‍🧑 Avatars</h1>
            </div>
            <div className="glass admin-form-card">
              <h3 style={{ marginBottom: "1.25rem", fontWeight: 600 }}>
                <Plus size={16} style={{ display: "inline", marginRight: 6 }} /> Create Avatar
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

            <h3 style={{ margin: "2rem 0 1rem", color: "var(--text-secondary)" }}>
              All Avatars ({avatars.length})
            </h3>
            <div className="admin-items-grid">
              {avatars.map((av) => (
                <div key={av.id} className="glass admin-item-card">
                  <div className="admin-item-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CanvasAvatarPreview imageUrl={av.imageUrl} name={av.name} size={48} />
                  </div>
                  <div className="admin-item-info" style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{av.name}</p>
                    <p className="admin-item-id">{av.id.slice(0, 12)}…</p>
                  </div>
                  <button
                    className="panel-del-btn"
                    title="Test on canvas"
                    onClick={() => setTestingAvatar(av)}
                    style={{ background: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", marginRight: 8 }}
                  >
                    <Sparkles size={13} />
                  </button>
                  <button
                    className="panel-del-btn"
                    title="Delete avatar"
                    onClick={() => deleteAvatar(av.id)}
                    disabled={deletingAv === av.id}
                  >
                    {deletingAv === av.id ? <span className="spinner" /> : <Trash2 size={13} />}
                  </button>
                </div>
              ))}
              {avatars.length === 0 && (
                <p style={{ color: "var(--text-secondary)", padding: "1rem 0" }}>No avatars yet.</p>
              )}
            </div>

            {testingAvatar && (
              <AvatarCanvasTesterModal
                avatar={testingAvatar}
                onClose={() => setTestingAvatar(null)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
