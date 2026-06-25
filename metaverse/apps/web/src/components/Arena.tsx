import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store';
import { WsClient } from '../utils/ws';
import { api } from '../utils/api';
import { ArrowLeft, Users, Plus, Trash2, Layers, X } from 'lucide-react';

const TILE = 40;

interface OtherUser {
  id: string;
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
  const wsRef = useRef<WsClient | null>(null);
  const token = useUserStore((s) => s.token);

  const [myPos, setMyPos] = useState({ x: 5, y: 5 });
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  const [elements, setElements] = useState<SpaceElement[]>([]);
  const [dimensions, setDimensions] = useState({ w: 20, h: 20 });
  const [connected, setConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

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
    } catch {}
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
          setOtherUsers(msg.payload.users.map((u) => ({ id: u.id, x: 0, y: 0 })));
          setConnected(true);
          setWsStatus('connected');
          break;
        case 'user-joined':
          setOtherUsers((prev) => [
            ...prev.filter((u) => u.id !== msg.payload.userId),
            { id: msg.payload.userId, x: msg.payload.x, y: msg.payload.y },
          ]);
          break;
        case 'user-left':
          setOtherUsers((prev) => prev.filter((u) => u.id !== msg.payload.userId));
          break;
        case 'movement':
          // movement broadcast from another user
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
    const { x, y } = myPos;
    let nx = x, ny = y;
    if (e.key === 'ArrowUp' || e.key === 'w') ny -= 1;
    else if (e.key === 'ArrowDown' || e.key === 's') ny += 1;
    else if (e.key === 'ArrowLeft' || e.key === 'a') nx -= 1;
    else if (e.key === 'ArrowRight' || e.key === 'd') nx += 1;
    else return;
    e.preventDefault();
    if (nx < 0 || ny < 0 || nx >= dimensions.w || ny >= dimensions.h) return;
    setMyPos({ x: nx, y: ny });
    wsRef.current?.move(nx, ny);
  }, [connected, myPos, dimensions]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
    canvas.width = W;
    canvas.height = H;

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
      ctx.fillStyle = el.element.static ? 'rgba(100,116,139,0.5)' : 'rgba(16,185,129,0.3)';
      ctx.strokeStyle = el.element.static ? '#475569' : '#10b981';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(el.x * TILE + 4, el.y * TILE + 4, TILE - 8, TILE - 8, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${TILE * 0.45}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.element.static ? '🪑' : '🟢', el.x * TILE + TILE / 2, el.y * TILE + TILE / 2);
    });

    // Other users
    otherUsers.forEach((u) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(u.x * TILE + TILE / 2, u.y * TILE + TILE - 4, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(u.x * TILE + TILE / 2, u.y * TILE + TILE / 2 - 4, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', u.x * TILE + TILE / 2, u.y * TILE + TILE / 2 - 4);
    });

    // My avatar
    const mx = myPos.x * TILE + TILE / 2;
    const my = myPos.y * TILE + TILE / 2 - 4;
    const grd = ctx.createRadialGradient(mx, my, 0, mx, my, 22);
    grd.addColorStop(0, 'rgba(59,130,246,0.4)');
    grd.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(mx, my, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(mx, myPos.y * TILE + TILE - 4, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(mx, my, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧑', mx, my);
  }, [myPos, otherUsers, elements, dimensions]);

  return (
    <div className="arena">
      {/* Header */}
      <header className="arena-header glass">
        <button className="btn-icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <div className="arena-title">
          <span className="arena-dot" style={{ background: wsStatus === 'connected' ? 'var(--success)' : wsStatus === 'error' ? 'var(--danger)' : '#f59e0b' }} />
          Space: <strong>{spaceId?.slice(0, 8)}…</strong>
        </div>
        <div className="arena-players">
          <Users size={16} /> {otherUsers.length + 1} online
        </div>
        <button
          className="btn"
          style={{ marginLeft: 'auto', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          onClick={() => { setShowPanel(!showPanel); fetchAvailableElements(); }}
        >
          <Layers size={16} style={{ marginRight: 4 }} />
          {showPanel ? 'Hide' : 'Elements'}
        </button>
      </header>

      <div className="arena-body">
        {/* Canvas */}
        <main className="arena-main">
          <div className="canvas-wrapper glass">
            <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '8px' }} />
          </div>
          <div className="controls-hint glass">
            <span>Move: <kbd>WASD</kbd> or <kbd>↑↓←→</kbd></span>
            <span style={{ color: 'var(--text-secondary)' }}>{dimensions.w}×{dimensions.h} grid</span>
            <span style={{ color: 'var(--text-secondary)' }}>{elements.length} elements</span>
            {!connected && <span style={{ color: '#f59e0b' }}>⏳ Connecting…</span>}
          </div>
        </main>

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
                    <div>
                      <span style={{ fontSize: '0.85rem' }}>{el.element.static ? '🪑' : '🟢'}</span>
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
