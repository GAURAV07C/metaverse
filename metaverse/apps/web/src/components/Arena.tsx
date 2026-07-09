import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store';
import { WsClient } from '../utils/ws';
import { api } from '../utils/api';
import { findPath } from '../utils/pathfinding';
import { ArrowLeft, Users, Plus, Trash2, Layers, X, Check, Link2, PlusCircle, MinusCircle, Navigation } from 'lucide-react';

const TILE = 28;

interface OtherUser {
  userId: string;
  username: string;
  x: number;
  y: number;
  avatarUrl?: string;
}

interface SpaceElement {
  id: string;
  x: number;
  y: number;
  element: { id: string; imageUrl: string; width: number; height: number; static: boolean };
}

interface AvailableElement {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
}

export function Arena() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WsClient | null>(null);
  const token = useUserStore((s) => s.token);
  const myStoredUsername = useUserStore((s) => s.username);
  const [myPos, setMyPos] = useState({ x: 5, y: 5 });
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  const [elements, setElements] = useState<SpaceElement[]>([]);
  const [dimensions, setDimensions] = useState({ w: 20, h: 20 });
  const [connected, setConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [autoPath, setAutoPath] = useState<{x: number, y: number}[]>([]);
  const [zoom, setZoom] = useState(1);

  // Image cache for avatars
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Invite / copy
  const [copied, setCopied] = useState(false);
  const handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Online users panel — always visible sidebar, no toggle needed
  // (showUsers kept for narrower screens as toggle)
  const [showUsers, setShowUsers] = useState(true);

  // Element panel
  const [showPanel, setShowPanel] = useState(false);
  const [availableElements, setAvailableElements] = useState<AvailableElement[]>([]);
  const [addingElement, setAddingElement] = useState<string | null>(null); // elementId being placed
  const [addX, setAddX] = useState('0');
  const [addY, setAddY] = useState('0');
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelMsg, setPanelMsg] = useState('');

  // ── Fetch space data ───────────────────
  const fetchSpace = useCallback(async () => {
    if (!spaceId) return;
    try {
      const res = await api.get(`/space/${spaceId}`);
      const dimStr: string = res.data.dimensions ?? '20x20';
      const [w, h] = dimStr.split('x').map(Number);
      setDimensions({ w, h });
      setElements(res.data.elements ?? []);
    } catch (e) { console.error(e); }
  }, [spaceId]);

  useEffect(() => { fetchSpace(); }, [fetchSpace]);

  // ── Fetch available elements (GET /elements) ──
  const fetchAvailableElements = async () => {
    try {
      const res = await api.get('/elements');
      setAvailableElements(res.data.element ?? []);
    } catch { }
  };

  // ── WebSocket ──────────────────────────
  useEffect(() => {
    if (!spaceId || !token) return;
    const ws = new WsClient(spaceId, token);
    wsRef.current = ws;

    const unsub = ws.onMessage((msg) => {
      switch (msg.type) {
        case 'space-joined':
          setMyPos(msg.payload.spawn);
          setMyAvatarUrl(msg.payload.avatarUrl ?? null);
          setOtherUsers(
            msg.payload.users.map((u) => ({
              userId: u.userId ?? u.id,
              username: u.username ?? 'Unknown',
              avatarUrl: u.avatarUrl,
              x: u.x ?? 0,
              y: u.y ?? 0,
            }))
          );
          setConnected(true);
          setWsStatus('connected');
          break;
        case 'user-joined':
          setOtherUsers((prev) => [
            ...prev.filter((u) => u.userId !== msg.payload.userId),
            { userId: msg.payload.userId, username: msg.payload.username ?? 'Unknown', avatarUrl: msg.payload.avatarUrl, x: msg.payload.x, y: msg.payload.y },
          ]);
          break;
        case 'user-left':
          setOtherUsers((prev) => prev.filter((u) => u.userId !== msg.payload.userId));
          break;
        case 'movement':
          // Update the specific user who moved
          setOtherUsers((prev) =>
            prev.map((u) =>
              u.userId === msg.payload.userId
                ? { ...u, x: msg.payload.x, y: msg.payload.y }
                : u
            )
          );
          break;
        case 'movement-rejected':
          setMyPos({ x: msg.payload.x, y: msg.payload.y });
          break;
      }
    });

    ws.connect();
    return () => { unsub(); ws.disconnect(); };
  }, [spaceId, token]);

  // ── Keyboard movement ─────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!connected) return;
    // Don't move when typing in inputs
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    
    let nx = myPos.x, ny = myPos.y;
    let moved = false;
    if (e.key === 'ArrowUp' || e.key === 'w') { ny -= 1; moved = true; }
    else if (e.key === 'ArrowDown' || e.key === 's') { ny += 1; moved = true; }
    else if (e.key === 'ArrowLeft' || e.key === 'a') { nx -= 1; moved = true; }
    else if (e.key === 'ArrowRight' || e.key === 'd') { nx += 1; moved = true; }
    
    if (moved) {
      e.preventDefault();
      setAutoPath([]); // Cancel auto-path on manual move
    } else {
      return;
    }
    
    if (nx < 0 || ny < 0 || nx >= dimensions.w || ny >= dimensions.h) return;

    // Check collision with static elements
    const isCollidingWithElement = elements.some((el) => {
      if (!el.element.static) return false;
      return (
        nx >= el.x &&
        nx < el.x + el.element.width &&
        ny >= el.y &&
        ny < el.y + el.element.height
      );
    });
    if (isCollidingWithElement) return;

    // Check collision with other users
    const isCollidingWithUser = otherUsers.some((u) => u.x === nx && u.y === ny);
    if (isCollidingWithUser) return;

    setMyPos({ x: nx, y: ny });
    wsRef.current?.move(nx, ny);
  }, [connected, myPos, dimensions, elements, otherUsers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Auto path stepping ─────────────────
  useEffect(() => {
    if (autoPath.length === 0) return;
    
    const interval = setInterval(() => {
      setAutoPath(prevPath => {
        if (prevPath.length === 0) return [];
        const nextStep = prevPath[0];
        const newPath = prevPath.slice(1);
        
        // Validate collision again just in case someone moved into our path
        const isCollidingWithUser = otherUsers.some((u) => u.x === nextStep.x && u.y === nextStep.y);
        if (isCollidingWithUser) {
          // Recalculate path from current pos to target pos if blocked by user
          // For simplicity, just stop if a user blocks the path
          return [];
        }

        setMyPos({ x: nextStep.x, y: nextStep.y });
        wsRef.current?.move(nextStep.x, nextStep.y);
        return newPath;
      });
    }, 120); // Move every 120ms
    
    return () => clearInterval(interval);
  }, [autoPath, otherUsers]);

  // ── Click-to-move ──────────────────────
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Mouse relative to canvas element (account for zoom)
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    // Convert to world coordinates (no camera offset)
    const worldX = mouseX;
    const worldY = mouseY;

    const gridX = Math.floor(worldX / TILE);
    const gridY = Math.floor(worldY / TILE);

    if (gridX < 0 || gridY < 0 || gridX >= dimensions.w || gridY >= dimensions.h) return;

    // A* Pathfinding
    const path = findPath(
      myPos,
      { x: gridX, y: gridY },
      dimensions.w,
      dimensions.h,
      (x, y) => {
        // Walkable check
        const isStaticEl = elements.some(el => el.element.static && x >= el.x && x < el.x + el.element.width && y >= el.y && y < el.y + el.element.height);
        if (isStaticEl) return false;
        // Don't walk through other users (except if it's the final target, then A* handles it, but let's avoid walking through)
        // Wait, if target has a user, we can't step ON them.
        return true;
      }
    );

    if (path.length > 0) {
      setAutoPath(path);
    }
  };

  // ── Add element to space (POST /space/element) ──
  const handleAddElement = async () => {
    if (!addingElement || !spaceId) return;
    setPanelLoading(true);
    setPanelMsg('');
    try {
      await api.post('/space/element', {
        elementId: addingElement,
        spaceId,
        x: parseInt(addX),
        y: parseInt(addY),
      });
      setPanelMsg('Element added!');
      setAddingElement(null);
      await fetchSpace();
    } catch (e: any) {
      setPanelMsg(e.response?.data?.message || 'Failed to add element');
    } finally { setPanelLoading(false); }
  };

  // ── Remove element from space (DELETE /space/element) ──
  const handleRemoveElement = async (elementInstanceId: string) => {
    setPanelLoading(true);
    setPanelMsg('');
    try {
      await api.delete('/space/element', { data: { id: elementInstanceId } });
      setPanelMsg('Element removed!');
      await fetchSpace();
    } catch (e: any) {
      setPanelMsg(e.response?.data?.message || 'Failed to remove element');
    } finally { setPanelLoading(false); }
  };

  // ── Canvas render ─────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = dimensions.w * TILE;
    const H = dimensions.h * TILE;
    canvas.width = W * zoom;
    canvas.height = H * zoom;

    ctx.scale(zoom, zoom);
    ctx.clearRect(0, 0, W, H);

    // Floor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(59,130,246,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += TILE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += TILE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }


    // Elements (static objects)
    elements.forEach((el) => {
      const w = el.element.width * TILE;
      const h = el.element.height * TILE;
      const px = el.x * TILE;
      const py = el.y * TILE;

      if (el.element.imageUrl) {
        let img = imageCacheRef.current[el.element.imageUrl];
        if (!img) {
          img = new Image();
          img.src = el.element.imageUrl;
          img.onload = () => setRenderTrigger(t => t + 1);
          imageCacheRef.current[el.element.imageUrl] = img;
        }
        if (img.complete && img.naturalWidth > 0) {
          // Draw shadow underneath to ground it
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.ellipse(px + w / 2, py + h - 4, w / 2 - 4, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(img, px, py, w, h);
          return;
        }
      }

      // Fallback if no image or not loaded
      ctx.fillStyle = el.element.static ? 'rgba(100,116,139,0.5)' : 'rgba(16,185,129,0.3)';
      ctx.strokeStyle = el.element.static ? '#475569' : '#10b981';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px + 4, py + 4, w - 8, h - 8, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.min(w, h) * 0.45}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.element.static ? '🪑' : '🟢', px + w / 2, py + h / 2);
    });

    const drawAvatar = (x: number, y: number, url?: string, fallback: string = '👤', color: string = '#6366f1') => {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y + TILE / 2, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (url) {
        let img = imageCacheRef.current[url];
        if (!img) {
          img = new Image();
          img.src = url;
          img.onload = () => setRenderTrigger(t => t + 1);
          imageCacheRef.current[url] = img;
        }
        if (img.complete && img.naturalWidth > 0) {
          // Draw image
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, x - 12, y - 12, 24, 24);
          ctx.restore();
          // Border
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.stroke();
          return;
        }
      }
      // Fallback
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallback, x, y);
    };

    // Other users
    otherUsers.forEach((u) => {
      const px = u.x * TILE + TILE / 2;
      const py = u.y * TILE + TILE / 2 - 4;

      drawAvatar(px, py, u.avatarUrl, '👤', '#6366f1');
      // Name tag
      ctx.fillStyle = 'rgba(99,102,241,0.85)';
      const name = u.username || u.userId.slice(0, 5);
      const tagW = name.length * 6 + 6;
      ctx.beginPath();
      ctx.roundRect(px - tagW / 2, py - 20, tagW, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, px, py - 14);
    });

    const mx = myPos.x * TILE + TILE / 2;
    const my = myPos.y * TILE + TILE / 2 - 4;

    const grd = ctx.createRadialGradient(mx, my, 0, mx, my, 18);
    grd.addColorStop(0, 'rgba(59,130,246,0.4)');
    grd.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, Math.PI * 2);
    ctx.fill();

    drawAvatar(mx, my, myAvatarUrl ?? undefined, '🧑', '#3b82f6');
  }, [myPos, otherUsers, elements, dimensions, myAvatarUrl, renderTrigger, autoPath, zoom]);

  // Handle window resize for canvas scaling
  useEffect(() => {
    const handleResize = () => setRenderTrigger(t => t + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Locate User ──
  const handleLocateUser = () => {
    if (!wrapperRef.current) return;
    const wrapper = wrapperRef.current;
    
    // Calculate user's pixel position in the scaled canvas
    const px = (myPos.x * TILE + TILE / 2) * zoom;
    const py = (myPos.y * TILE + TILE / 2) * zoom;

    // Center the scroll view on the user
    wrapper.scrollTo({
      left: px - wrapper.clientWidth / 2,
      top: py - wrapper.clientHeight / 2,
      behavior: 'smooth'
    });
  };

  return (
    <div className="arena">
      <header className="arena-header glass">
        <button className="btn-icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <div className="arena-title">
          <span className="arena-dot" style={{ background: wsStatus === 'connected' ? 'var(--success)' : wsStatus === 'error' ? 'var(--danger)' : '#f59e0b' }} />
          Space: <strong>{spaceId?.slice(0, 8)}…</strong>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', alignItems: 'center' }}>
          {/* Invite button */}
          <button
            className="btn"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', background: copied ? 'rgba(16,185,129,0.2)' : undefined, borderColor: copied ? 'var(--success)' : undefined }}
            onClick={handleCopyInvite}
            title="Copy invite link"
          >
            {copied ? <><Check size={14} style={{ marginRight: 4 }} />Copied!</> : <><Link2 size={14} style={{ marginRight: 4 }} />Invite</>}
          </button>

          {/* Online users toggle */}
          <button
            className="btn"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
            onClick={() => setShowUsers(!showUsers)}
          >
            <Users size={14} style={{ marginRight: 4 }} /> {otherUsers.length + 1} Online
          </button>

          {/* Elements panel toggle */}
          <button
            className="btn"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            onClick={() => { setShowPanel(!showPanel); fetchAvailableElements(); }}
          >
            <Layers size={16} style={{ marginRight: 4 }} />
            {showPanel ? 'Hide' : 'Elements'}
          </button>
        </div>
      </header>

      <div className="arena-body">
        {/* Canvas */}
        <main className="arena-main">
          <div className="canvas-wrapper glass" style={{ overflow: 'auto' }} ref={wrapperRef}>
            <canvas 
              ref={canvasRef} 
              onDoubleClick={handleDoubleClick}
              style={{ display: 'block', borderRadius: '8px', cursor: 'crosshair', transformOrigin: 'top left' }} 
            />
          </div>
          
          <div className="map-controls">
            <button className="map-ctrl-btn" onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))} title="Zoom In">
              <PlusCircle size={20} />
            </button>
            <button className="map-ctrl-btn" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} title="Zoom Out">
              <MinusCircle size={20} />
            </button>
            <button className="map-ctrl-btn" onClick={handleLocateUser} title="Locate Me">
              <Navigation size={20} />
            </button>
          </div>
          <div className="action-toolbar glass">
            <div className="action-profile-btn" title={myStoredUsername || 'Profile'}>
              {myStoredUsername ? myStoredUsername.charAt(0).toUpperCase() : 'U'}
            </div>
            <button className="action-icon-btn" title="React with Emoji">
              😀
            </button>
            <button className="action-leave-btn" onClick={() => navigate('/dashboard')} title="Leave Space">
              Leave
            </button>
          </div>
        </main>

        {/* ── Permanent Players Sidebar ── */}
        <aside className="players-sidebar glass">
          <div className="players-sidebar-header">
            <Users size={15} />
            <span>Players</span>
            <span className="players-count-badge">{otherUsers.length + 1}</span>
          </div>

          <div className="players-list">
            {/* Me */}
            <div className="player-entry player-me">
              {myAvatarUrl ? (
                <img src={myAvatarUrl} alt="" className="player-avatar-img" />
              ) : (
                <div className="player-avatar-dot" style={{ background: '#3b82f6' }}>🧑</div>
              )}
              <div className="player-info">
                <p className="player-name">{myStoredUsername ?? 'You'} <span className="player-you-tag">YOU</span></p>
                <p className="player-pos">({myPos.x}, {myPos.y})</p>
              </div>
              <span className="online-dot" />
            </div>

            {/* Other users */}
            {otherUsers.map((u, i) => {
              const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
              const color = colors[i % colors.length];
              return (
                <div key={u.userId} className="player-entry animate-fade-in">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="player-avatar-img" style={{ borderColor: color }} />
                  ) : (
                    <div className="player-avatar-dot" style={{ background: color }}>👤</div>
                  )}
                  <div className="player-info">
                    <p className="player-name">{u.username}</p>
                    <p className="player-pos">({u.x}, {u.y})</p>
                  </div>
                  <span className="online-dot" />
                </div>
              );
            })}

            {otherUsers.length === 0 && (
              <div className="players-empty">
                <span style={{ fontSize: '1.5rem' }}>🏜️</span>
                <p>You're alone!</p>
                <button
                  className="btn"
                  style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem', marginTop: '0.4rem' }}
                  onClick={handleCopyInvite}
                >
                  {copied ? '✓ Copied!' : '🔗 Copy Invite'}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Elements Side Panel */}
        {showPanel && (
          <aside className="elements-panel glass animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Elements</h3>
              <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => setShowPanel(false)}>
                <X size={14} />
              </button>
            </div>

            {panelMsg && (
              <div className={panelMsg.includes('!') && !panelMsg.includes('Failed') ? 'success-banner' : 'error-banner'}
                style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                {panelMsg}
              </div>
            )}

            {/* Add Element */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p className="field-label" style={{ marginBottom: '0.5rem' }}>
                <Plus size={12} style={{ display: 'inline' }} /> Add Element
              </p>
              {!addingElement ? (
                <div className="panel-element-grid">
                  {availableElements.map(el => (
                    <button key={el.id} className="panel-el-btn" onClick={() => setAddingElement(el.id)}
                      title={`${el.width}×${el.height} — ${el.static ? 'Static' : 'Walkable'}`}>
                      <img src={el.imageUrl} alt="" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/32x32/1e293b/94a3b8?text=?'; }} />
                    </button>
                  ))}
                  {availableElements.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No elements available</p>
                  )}
                </div>
              ) : (
                <div className="panel-add-form">
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Place at coordinates:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="input" style={{ flex: 1 }} type="number" placeholder="X" value={addX} onChange={e => setAddX(e.target.value)} min={0} max={dimensions.w - 1} />
                    <input className="input" style={{ flex: 1 }} type="number" placeholder="Y" value={addY} onChange={e => setAddY(e.target.value)} min={0} max={dimensions.h - 1} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }} onClick={() => setAddingElement(null)}>Cancel</button>
                    <button className="btn" style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }} onClick={handleAddElement} disabled={panelLoading}>
                      {panelLoading ? <span className="spinner" /> : 'Place'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Existing Elements in space */}
            <div>
              <p className="field-label" style={{ marginBottom: '0.5rem' }}>
                In This Space ({elements.length})
              </p>
              <div className="panel-space-elements">
                {elements.map(el => (
                  <div key={el.id} className="panel-space-el">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img
                        src={el.element.imageUrl}
                        alt=""
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        ({el.x},{el.y})
                      </span>
                    </div>
                    <button
                      className="panel-del-btn"
                      onClick={() => handleRemoveElement(el.id)}
                      title="Remove element"
                      disabled={panelLoading}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {elements.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Empty space</p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
