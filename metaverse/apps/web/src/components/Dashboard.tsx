import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store';
import { api } from '../utils/api';
import { LogOut, Plus, Users, Maximize2, Map, Layers, X, Check, Trash2, User2, Pencil } from 'lucide-react';
import { z } from 'zod';
import { SpaceSchema, getZodMessage } from '../schemas';

interface Space {
  id: string;
  name: string;
  dimensions: string;
  thumbnail?: string;
}

interface MapElement {
  id: string;
  x: number;
  y: number;
  element: { id: string; imageUrl: string; width: number; height: number; static: boolean };
}

interface AvailableMap {
  id: string;
  name: string;
  dimensions: string;
  thumbnail?: string;
  elementCount: number;
  elements: MapElement[];
}

interface AvailableElement {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
}

interface AvatarInfo {
  id: string;
  imageUrl: string;
  name: string;
}

export function Dashboard() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDims, setNewDims] = useState('100x200');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Admin assets
  const [availableMaps, setAvailableMaps] = useState<AvailableMap[]>([]);
  const [availableElements, setAvailableElements] = useState<AvailableElement[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);

  // Avatar selection
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatars, setAvatars] = useState<AvatarInfo[]>([]);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');

  const { logout, type: userType } = useUserStore();
  const navigate = useNavigate();

  const fetchSpaces = async () => {
    try {
      const res = await api.get('/space/all');
      setSpaces(res.data.spaces ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchAdminAssets = async () => {
    setMapsLoading(true);
    try {
      const [mapsRes, elementsRes] = await Promise.all([
        api.get('/maps'),
        api.get('/elements'),
      ]);
      setAvailableMaps(mapsRes.data.maps ?? []);
      setAvailableElements(elementsRes.data.element ?? []);
    } catch (e) { console.error(e); }
    finally { setMapsLoading(false); }
  };

  const fetchAvatars = async () => {
    try {
      const res = await api.get('/avatars');
      setAvatars(res.data.avatars ?? []);
    } catch {}
  };

  useEffect(() => { fetchSpaces(); fetchAvatars(); }, []);

  // ── DELETE space ─────────────────────────
  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm('Are you sure you want to delete this space?')) return;
    setDeleting(spaceId);
    try {
      await api.delete(`/space/${spaceId}`);
      setSpaces(prev => prev.filter(s => s.id !== spaceId));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete space');
    } finally { setDeleting(null); }
  };

  // ── EDIT space ───────────────────────────
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editSpaceName, setEditSpaceName] = useState('');
  const [editSpaceLoading, setEditSpaceLoading] = useState(false);

  const handleEditSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpaceId || !editSpaceName) return;
    setEditSpaceLoading(true);
    try {
      await api.put(`/space/${editingSpaceId}`, { name: editSpaceName });
      setEditingSpaceId(null);
      await fetchSpaces();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to edit space');
    } finally { setEditSpaceLoading(false); }
  };

  // ── SET AVATAR (POST /user/metadata) ─────
  const handleSetAvatar = async (avatarId: string) => {
    setAvatarLoading(true);
    setAvatarMsg('');
    try {
      await api.post('/user/metadata', { avatarId });
      useUserStore.getState().setAvatar(avatarId);
      setAvatarMsg('Avatar updated!');
      setTimeout(() => setShowAvatarPicker(false), 800);
    } catch (e: any) {
      setAvatarMsg(e.response?.data?.error || 'Failed to update avatar');
    } finally { setAvatarLoading(false); }
  };

  const openCreate = () => {
    setShowCreate(true);
    setSelectedMapId(null);
    setNewName('');
    setNewDims('100x200');
    setCreateError('');
    fetchAdminAssets();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const dims = selectedMapId
        ? availableMaps.find(m => m.id === selectedMapId)?.dimensions ?? newDims
        : newDims;
      SpaceSchema.parse({ name: newName, dimensions: dims, mapId: selectedMapId ?? undefined });
      const body: Record<string, string> = { name: newName, dimensions: dims };
      if (selectedMapId) body.mapId = selectedMapId;
      await api.post('/space', body);
      setShowCreate(false);
      await fetchSpaces();
    } catch (err: unknown) {
      if (err instanceof z.ZodError) setCreateError(getZodMessage(err));
      else setCreateError('Failed to create space');
    } finally { setCreating(false); }
  };

  const selectedMap = availableMaps.find(m => m.id === selectedMapId);

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="sidebar-logo">🌐 <span>Metaverse</span></div>
        <nav className="sidebar-nav">
          <button className="nav-item active">
            <Users size={18} /> My Spaces
          </button>
          <button className="nav-item" onClick={() => { setShowAvatarPicker(true); fetchAvatars(); }}>
            <User2 size={18} /> Choose Avatar
          </button>
          {userType === 'admin' && (
            <button className="nav-item" onClick={() => navigate('/admin')}>
              🛡️ Admin Panel
            </button>
          )}
        </nav>
        <button onClick={() => { logout(); navigate('/login'); }} className="sidebar-logout">
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="dash-main">
        <header className="dash-header">
          <h1>My Spaces</h1>
          <button className="btn" onClick={openCreate}>
            <Plus size={18} style={{ marginRight: 6 }} /> New Space
          </button>
        </header>

        {loading ? (
          <div className="dash-empty"><div className="spinner large" /></div>
        ) : (
          <div className="spaces-grid">
            {spaces.map((space) => (
              <div key={space.id} className="space-card glass">
                <div className="space-card-thumb">
                  <span className="space-card-icon">🏙️</span>
                </div>
                <div className="space-card-body">
                  <h3 className="space-card-title">{space.name}</h3>
                  <p className="space-card-meta">
                    <Maximize2 size={14} /> {space.dimensions}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', margin: '0 1.25rem 1.25rem' }}>
                  <button
                    className="btn"
                    style={{ flex: 1 }}
                    onClick={() => navigate(`/space/${space.id}`)}
                  >
                    Enter →
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => { setEditingSpaceId(space.id); setEditSpaceName(space.name); }}
                    title="Edit space"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn-icon"
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                    onClick={() => handleDeleteSpace(space.id)}
                    disabled={deleting === space.id}
                    title="Delete space"
                  >
                    {deleting === space.id ? <span className="spinner" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
            {spaces.length === 0 && (
              <div className="dash-empty">
                <p style={{ color: 'var(--text-secondary)' }}>No spaces yet. Create one to get started!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Edit Space Modal ─── */}
      {editingSpaceId && (
        <div className="modal-overlay" onClick={() => setEditingSpaceId(null)}>
          <div className="modal glass animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2>Edit Space</h2>
              <button className="btn-icon" onClick={() => setEditingSpaceId(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSpace}>
              <div className="field" style={{ marginBottom: '1rem' }}>
                <label className="field-label">Space Name</label>
                <input className="input" value={editSpaceName} onChange={e => setEditSpaceName(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost btn-full" onClick={() => setEditingSpaceId(null)}>Cancel</button>
                <button type="submit" className="btn btn-full" disabled={editSpaceLoading}>
                  {editSpaceLoading ? <span className="spinner" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Avatar Picker Modal ─── */}
      {showAvatarPicker && (
        <div className="modal-overlay" onClick={() => setShowAvatarPicker(false)}>
          <div className="modal glass animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2>Choose Your Avatar</h2>
              <button className="btn-icon" onClick={() => setShowAvatarPicker(false)}><X size={18} /></button>
            </div>
            {avatarMsg && (
              <div className={avatarMsg.includes('updated') ? 'success-banner' : 'error-banner'} style={{ marginBottom: '1rem' }}>
                {avatarMsg}
              </div>
            )}
            {avatars.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                No avatars available.<br /><span style={{ fontSize: '0.8rem' }}>Ask an admin to create some!</span>
              </p>
            ) : (
              <div className="avatar-picker-grid">
                {avatars.map(av => (
                  <button
                    key={av.id}
                    className="avatar-pick-card glass"
                    onClick={() => handleSetAvatar(av.id)}
                    disabled={avatarLoading}
                  >
                    <img
                      src={av.imageUrl}
                      alt={av.name}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80/1e293b/94a3b8?text=?'; }}
                    />
                    <span>{av.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Create Space Modal ─── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-large glass animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700 }}>Create New Space</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>

            {createError && <div className="error-banner" style={{ marginBottom: '1rem' }}>{createError}</div>}

            <div className="create-space-layout">
              {/* Left */}
              <div className="create-left">
                <div className="field" style={{ marginBottom: '1rem' }}>
                  <label className="field-label">Space Name</label>
                  <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Office Hangout" />
                </div>

                {!selectedMapId && (
                  <div className="field" style={{ marginBottom: '1.5rem' }}>
                    <label className="field-label">Dimensions (WxH)</label>
                    <input className="input" value={newDims} onChange={e => setNewDims(e.target.value)} placeholder="100x200" />
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      Only needed if not using a map template.
                    </p>
                  </div>
                )}

                {/* Map Picker */}
                <label className="field-label" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Map size={14} /> Choose a Map Template (optional)
                </label>

                {mapsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
                ) : availableMaps.length === 0 ? (
                  <div className="no-maps-hint">
                    <span>🗺️</span>
                    <p>No maps available yet.<br /><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Ask an admin to create maps first.</span></p>
                  </div>
                ) : (
                  <div className="map-picker-grid">
                    <button type="button" className={`map-option ${!selectedMapId ? 'selected' : ''}`} onClick={() => setSelectedMapId(null)}>
                      <div className="map-option-thumb empty-thumb">✨</div>
                      <div className="map-option-info">
                        <span className="map-option-name">Empty Space</span>
                        <span className="map-option-meta">Custom dimensions</span>
                      </div>
                      {!selectedMapId && <Check size={14} className="map-option-check" />}
                    </button>
                    {availableMaps.map(m => (
                      <button key={m.id} type="button" className={`map-option ${selectedMapId === m.id ? 'selected' : ''}`} onClick={() => setSelectedMapId(m.id)}>
                        <div className="map-option-thumb">🗺️</div>
                        <div className="map-option-info">
                          <span className="map-option-name">{m.name}</span>
                          <span className="map-option-meta">
                            {m.dimensions} • <Layers size={11} style={{ display: 'inline' }} /> {m.elementCount} elements
                          </span>
                        </div>
                        {selectedMapId === m.id && <Check size={14} className="map-option-check" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Preview */}
              <div className="create-right">
                <label className="field-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Preview</label>
                {selectedMap ? (
                  <div className="map-preview glass">
                    <div className="map-preview-header">
                      <span style={{ fontWeight: 600 }}>{selectedMap.name}</span>
                      <span className="map-badge">{selectedMap.dimensions}</span>
                    </div>
                    <div className="map-preview-canvas">
                      {selectedMap.elements.slice(0, 12).map((el) => (
                        <div key={el.id} className="mini-element"
                          style={{ left: `${(el.x / parseInt(selectedMap.dimensions.split('x')[0])) * 100}%`, top: `${(el.y / parseInt(selectedMap.dimensions.split('x')[1])) * 100}%` }}
                        />
                      ))}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                      ✅ Pre-populated with <strong>{selectedMap.elementCount}</strong> element{selectedMap.elementCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                ) : (
                  <div className="map-preview glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>✨</span>
                    <p style={{ fontWeight: 600 }}>Custom Empty Space</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                      Dimensions: <strong>{newDims}</strong><br />Add elements later inside the space.
                    </p>
                  </div>
                )}

                {/* Elements gallery */}
                {availableElements.length > 0 && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <p className="field-label" style={{ marginBottom: '0.6rem' }}>
                      <Layers size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Available Elements ({availableElements.length})
                    </p>
                    <div className="elements-gallery">
                      {availableElements.map(el => (
                        <div key={el.id} className="element-gallery-item glass" title={`${el.width}×${el.height} — ${el.static ? 'Static' : 'Walkable'}`}>
                          <img src={el.imageUrl} alt="" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/40x40/1e293b/94a3b8?text=?'; }} />
                          <span className="element-gallery-badge">{el.static ? '🚫' : '✅'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
              <button className="btn btn-ghost btn-full" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-full" onClick={handleCreate} disabled={creating || !newName}>
                {creating ? <span className="spinner" /> : `Create Space${selectedMap ? ` from "${selectedMap.name}"` : ''} →`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
