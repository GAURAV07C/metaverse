import { useEffect, useRef, useState, useCallback } from 'react';
import { Map as MapIcon, MessageSquare, Search, Settings, LogOut, CircleDot, Hammer, MoreVertical, Users, Share2, Compass, Wifi, CalendarDays, Sparkles } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store';
import { WsClient } from '../utils/ws';
import { MediasoupClient } from '../utils/mediasoupClient';
import { api } from '../utils/api';
import { Sidebar } from './arena/Sidebar';
import { SettingsModal } from './arena/SettingsModal';
import { VideoOverlay } from './arena/VideoOverlay';
import { ElementsPanel, type SpaceElement, type AvailableElement, type RoomPrefab } from './arena/ElementsPanel';
import { MapCanvas } from './arena/MapCanvas';
import { ActionToolbar } from './arena/ActionToolbar';

export interface OtherUser {
  userId: string;
  username: string;
  x: number;
  y: number;
  avatarUrl?: string;
}

export function Arena() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WsClient | null>(null);
  const msRef = useRef<MediasoupClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const token = useUserStore((s) => s.token);
  const myStoredUsername = useUserStore((s) => s.username);

  const [myPos, setMyPos] = useState({ x: 5, y: 5 });
  const hasAutoFit = useRef(false);
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  const [proximityUsers, setProximityUsers] = useState<string[]>([]);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});

  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);

  const [elements, setElements] = useState<SpaceElement[]>([]);
  const [privateZones, setPrivateZones] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ w: 48, h: 27 });
  const [spaceName, setSpaceName] = useState('Office');
  const [connected, setConnected] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [autoPath, setAutoPath] = useState<{x: number, y: number}[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');
  const [messages, setMessages] = useState<{ username: string; message: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showOfficeMenu, setShowOfficeMenu] = useState(false);

  // Invite / copy state
  const [copied, setCopied] = useState(false);
  const handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => setCopied(false));
  };

  // Sidebar toggle state
  const [showUsers, setShowUsers] = useState(true);

  // Element panel state
  const [showPanel, setShowPanel] = useState(false);
  const [availableElements, setAvailableElements] = useState<AvailableElement[]>([]);
  const [roomPrefabs, setRoomPrefabs] = useState<RoomPrefab[]>([]);
  const [addingElement, setAddingElement] = useState<string | null>(null);
  const [builderMode, setBuilderMode] = useState<'pointer' | 'brush' | 'eraser'>('pointer');
  const [addX, setAddX] = useState('0');
  const [addY, setAddY] = useState('0');
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelMsg, setPanelMsg] = useState('');
  const [hiddenElementIds, setHiddenElementIds] = useState<string[]>([]);

  const toggleHideElement = (id: string) => {
    setHiddenElementIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleUpdateDimensions = async (w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    setDimensions({ w, h });
    setPanelMsg(`Map expanded to ${w}x${h}!`);
    try {
      await api.put(`/space/${spaceId}`, { dimensions: `${w}x${h}` });
    } catch (e) { console.error(e); }
  };

  // ── Fetch space data ───────────────────
  const fetchSpace = useCallback(async () => {
    if (!spaceId) return;
    try {
      const res = await api.get(`/space/${spaceId}`);
      const dimStr: string = res.data.dimensions ?? '48x27';
      const [w, h] = dimStr.split('x').map(Number);
      setDimensions({ w: w || 48, h: h || 27 });
      setSpaceName(res.data.name || 'Office');
      setElements(res.data.elements ?? []);
      setPrivateZones(res.data.privateZones ?? []);
    } catch (e) { console.error(e); }
  }, [spaceId]);

  useEffect(() => { fetchSpace(); }, [fetchSpace]);

  // ── Auto Fit: center & zoom to show all content when loaded ───
  useEffect(() => {
    if (hasAutoFit.current) return;
    if (elements.length === 0 && privateZones.length === 0) return;
    const TILE = 28; // Must match MapCanvas TILE

    // Calculate bounding box across all elements and areas
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      const w = el.element?.width || 1;
      const h = el.element?.height || 1;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + w);
      maxY = Math.max(maxY, el.y + h);
    });
    privateZones.forEach((z: any) => {
      minX = Math.min(minX, z.startX);
      minY = Math.min(minY, z.startY);
      maxX = Math.max(maxX, z.endX);
      maxY = Math.max(maxY, z.endY);
    });

    if (!isFinite(minX)) return;

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const contentW = (maxX - minX) * TILE;
    const contentH = (maxY - minY) * TILE;

    const viewW = wrapperRef.current?.clientWidth || window.innerWidth;
    const viewH = wrapperRef.current?.clientHeight || window.innerHeight;

    // Zoom to fit with 15% padding
    const fitZoom = Math.min(
      (viewW * 0.85) / Math.max(contentW, 1),
      (viewH * 0.85) / Math.max(contentH, 1),
      1.5  // max zoom cap
    );
    const clampedZoom = Math.max(0.7, Math.min(1.5, fitZoom));

    // panOffset to center content
    // Camera formula: camX = playerPx - viewW/(2*zoom) + panOffset.x
    // We want camera center = contentCenterPx
    // => contentCenterPx = playerPx + panOffset.x  (simplified at center)
    const playerPx = myPos.x * TILE + TILE / 2;
    const playerPy = myPos.y * TILE + TILE / 2;
    const contentCenterPx = contentCenterX * TILE;
    const contentCenterPy = contentCenterY * TILE;

    setPanOffset({
      x: contentCenterPx - playerPx,
      y: contentCenterPy - playerPy,
    });
    setZoom(clampedZoom);
    hasAutoFit.current = true;
  }, [elements, privateZones, myPos]);

  // ── Fetch available elements & room templates ───────────
  const fetchAvailableElements = async () => {
    try {
      const [elemRes, mapRes] = await Promise.all([
        api.get('/elements').catch(() => ({ data: { element: [] } })),
        api.get('/maps').catch(() => ({ data: { maps: [] } }))
      ]);
      setAvailableElements(elemRes.data.element ?? []);
      
      const prefabs: RoomPrefab[] = (mapRes.data.maps || [])
        .filter((m: any) => m.type === 'room')
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          category: 'Admin Room',
          description: `${m.elementCount} items`,
          items: m.elements.map((e: any) => ({
            elementId: e.element.id,
            offsetX: e.x,
            offsetY: e.y
          }))
        }));
      setRoomPrefabs(prefabs);
    } catch (e) { console.error(e); }
  };

  // ── WebSocket setup ─────────────────────
  useEffect(() => {
    if (!spaceId || !token) return;

    const ws = new WsClient(spaceId, token);
    wsRef.current = ws;

    const ms = new MediasoupClient(ws);
    msRef.current = ms;

    ms.onNewConsumer = (consumer, userId) => {
      setStreams(prev => {
        const existing = prev[userId] || new MediaStream();
        existing.addTrack(consumer.track);
        return { ...prev, [userId]: existing };
      });
    };

    const unsub = ws.onMessage((msg: any) => {
      switch (msg.type) {
        case 'space-joined':
          setConnected(true);
          
          let targetX = msg.payload.spawn.x;
          let targetY = msg.payload.spawn.y;
          const savedPosStr = localStorage.getItem(`metaverse_pos_${spaceId}`);
          
          if (savedPosStr) {
            try {
              const parsed = JSON.parse(savedPosStr);
              if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                targetX = parsed.x;
                targetY = parsed.y;
                // Tell the server we are actually at our saved location, not the default spawn
                ws.send({ type: 'move', payload: { x: targetX, y: targetY } });
              }
            } catch(e) {
              console.error(e);
            }
          }
          
          setMyPos({ x: targetX, y: targetY });
          const filteredJoined: OtherUser[] = (msg.payload.users ?? [])
            .filter((u: any) => (u.userId || u.id) !== msg.payload.userId && u.username !== myStoredUsername)
            .map((u: any) => ({
              userId: u.userId || u.id || '',
              username: u.username || 'User',
              x: u.x,
              y: u.y,
              avatarUrl: u.avatarUrl
            }));
          setOtherUsers(filteredJoined);
          if (msg.payload.avatarUrl) setMyAvatarUrl(msg.payload.avatarUrl);

          ms.init(); // Initialize mediasoup after joining
          break;
        case 'user-joined':
          if (msg.payload.userId && msg.payload.username !== myStoredUsername) {
            setOtherUsers((prev) => {
              if (prev.some((u) => u.userId === msg.payload.userId)) return prev;
              return [...prev, {
                userId: msg.payload.userId || '',
                username: msg.payload.username || 'User',
                x: msg.payload.x,
                y: msg.payload.y,
                avatarUrl: msg.payload.avatarUrl,
              }];
            });
          }
          break;
        case 'user-left':
          setOtherUsers((prev) => prev.filter((u) => u.userId !== msg.payload.userId));
          setProximityUsers(prev => prev.filter(id => id !== msg.payload.userId));
          setStreams(prev => {
            const next = { ...prev };
            delete next[msg.payload.userId];
            return next;
          });
          break;
        case 'proximity-entered':
          setProximityUsers(prev => {
            if (prev.includes(msg.payload.userId)) return prev;
            return [...prev, msg.payload.userId];
          });
          break;
        case 'proximity-left':
          setProximityUsers(prev => prev.filter(id => id !== msg.payload.userId));
          setStreams(prev => {
            const next = { ...prev };
            delete next[msg.payload.userId];
            return next;
          });
          break;
        case 'chat-receive':
          setMessages((prev) => [
            ...prev,
            {
              username: msg.payload.username,
              message: msg.payload.message,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          break;
        case 'movement':
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
  }, [spaceId, token, myStoredUsername]);

  // Save myPos to localStorage whenever it changes
  useEffect(() => {
    if (spaceId && myPos) {
      localStorage.setItem(`metaverse_pos_${spaceId}`, JSON.stringify(myPos));
    }
  }, [myPos, spaceId]);

  // ── Keyboard movement ─────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!connected) return;
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

    let nx = myPos.x, ny = myPos.y;
    let moved = false;
    if (e.key === 'ArrowUp' || e.key === 'w') { ny -= 1; moved = true; }
    else if (e.key === 'ArrowDown' || e.key === 's') { ny += 1; moved = true; }
    else if (e.key === 'ArrowLeft' || e.key === 'a') { nx -= 1; moved = true; }
    else if (e.key === 'ArrowRight' || e.key === 'd') { nx += 1; moved = true; }

    if (moved) {
      e.preventDefault();
      setPanOffset({ x: 0, y: 0 }); // Recenter camera on player keyboard move
      setAutoPath([]);
    } else {
      return;
    }

    if (nx < 0 || ny < 0 || nx >= dimensions.w || ny >= dimensions.h) return;

    // Static collision check
    const isCollidingWithElement = elements.some((el) => {
      // Room floors and logical rooms are WALKABLE so avatars can step inside rooms
      if (el.element.category === 'Rooms' || String(el.element.category).toLowerCase().includes('floor')) return false;

      // Seating elements (chairs, sofas, couches, benches) are WALKABLE so avatars can sit on them!
      const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''}`.toLowerCase();
      const isSeat = text.includes('seating') || text.includes('chair') || text.includes('sofa') || text.includes('couch') || text.includes('bench') || text.includes('stool') || text.includes('seat');
      if (isSeat) return false;

      if (!el.element.static) return false;
      return (
        nx >= el.x &&
        nx < el.x + el.element.width &&
        ny >= el.y &&
        ny < el.y + el.element.height
      );
    });
    if (isCollidingWithElement) return;

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

        const isCollidingWithUser = otherUsers.some((u) => u.x === nextStep.x && u.y === nextStep.y);
        if (isCollidingWithUser) return [];

        setMyPos({ x: nextStep.x, y: nextStep.y });
        wsRef.current?.move(nextStep.x, nextStep.y);
        return newPath;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [autoPath, otherUsers]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgObj = { username: myStoredUsername || 'You', message: chatInput, time };
    setMessages((prev) => [...prev, msgObj]);
    wsRef.current?.sendChat(chatInput);
    setChatInput('');
  };

  const handleAddElementAt = async (elementId: string, targetX: number, targetY: number) => {
    if (!spaceId) return;
    setPanelLoading(true);
    setPanelMsg('');
    try {
      await api.post('/space/element', {
        elementId,
        spaceId,
        x: targetX,
        y: targetY,
      });
      setPanelMsg('Element placed on map!');
      setAddingElement(null);
      await fetchSpace();
    } catch (e: any) {
      setPanelMsg(e.response?.data?.message || 'Failed to place element');
    } finally { setPanelLoading(false); }
  };

  const handleAddElement = async () => {
    if (!addingElement || !spaceId) return;
    await handleAddElementAt(addingElement, parseInt(addX) || 0, parseInt(addY) || 0);
  };

  const handleStampPrefab = async (prefab: any, startX: number, startY: number) => {
    if (!spaceId) return;
    setPanelLoading(true);
    setPanelMsg(`Importing ${prefab.name}...`);
    try {
      for (const item of prefab.items) {
        await api.post('/space/element', {
          elementId: item.elementId,
          spaceId,
          x: startX + item.offsetX,
          y: startY + item.offsetY,
        });
      }
      setPanelMsg(`${prefab.name} imported successfully!`);
      await fetchSpace();
    } catch (e: any) {
      setPanelMsg(e.response?.data?.message || 'Failed to import prefab');
    } finally { setPanelLoading(false); }
  };

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

  const closeBuild = () => {
    setShowPanel(false);
    setAddingElement(null);
    setBuilderMode('pointer');
  };

  const toggleSidebar = (tab: 'users' | 'chat') => {
    setShowUsers(!showUsers || activeTab !== tab);
    setActiveTab(tab);
    closeBuild();
  };

  const toggleBuild = () => {
    if (showPanel) closeBuild();
    else {
      setShowPanel(true);
      setShowUsers(false);
      fetchAvailableElements();
    }
  };

  // MapCanvas listens for window resize; panel layout changes also need a redraw.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [showUsers]);

  // ── Camera and Mic Controls ───────────
  useEffect(() => {
    async function toggleMic() {
      if (!msRef.current) return;
      if (micOn) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const track = stream.getAudioTracks()[0];
          await msRef.current.produce(track, 'You');
          if (!localStreamRef.current) localStreamRef.current = new MediaStream();
          localStreamRef.current.addTrack(track);
          setStreams(prev => ({ ...prev, me: localStreamRef.current! }));
        } catch (e) {
          console.error('Mic access denied', e);
          setMicOn(false);
        }
      } else {
        await msRef.current.stopProduce('audio');
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => {
            t.stop();
            localStreamRef.current?.removeTrack(t);
          });
          setStreams(prev => ({ ...prev, me: localStreamRef.current! }));
        }
      }
    }
    toggleMic();
  }, [micOn]);

  useEffect(() => {
    async function toggleCam() {
      if (!msRef.current) return;
      if (camOn) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const track = stream.getVideoTracks()[0];
          await msRef.current.produce(track, 'You');
          if (!localStreamRef.current) localStreamRef.current = new MediaStream();
          localStreamRef.current.addTrack(track);
          setStreams(prev => ({ ...prev, me: localStreamRef.current! }));
        } catch (e) {
          console.error('Cam access denied', e);
          setCamOn(false);
        }
      } else {
        await msRef.current.stopProduce('video');
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => {
            t.stop();
            localStreamRef.current?.removeTrack(t);
          });
          setStreams(prev => ({ ...prev, me: localStreamRef.current! }));
        }
      }
    }
    toggleCam();
  }, [camOn]);

  const handleLocateUser = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className={`arena ${showUsers ? 'with-sidebar' : ''}`}>
        <nav className="space-rail" aria-label="Office navigation">
          <button className="rail-brand" title={spaceName} aria-label="Office menu" onClick={() => setShowOfficeMenu(prev => !prev)}><CircleDot size={25} /></button>
          <button className="rail-button" title="Search people" aria-label="Search people" onClick={() => { setActiveTab('users'); setShowUsers(true); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.people-search input')?.focus()); }}><Search size={23} /></button>
          <span className="rail-divider" />
          <button className={`rail-button ${showUsers && activeTab === 'users' ? 'selected' : ''}`} title="People and map" aria-label="People and map" aria-expanded={showUsers && activeTab === 'users'} onClick={() => toggleSidebar('users')}><MapIcon size={23} /></button>
          <button className="rail-button" title="Edit the office" aria-label="Edit the office" onClick={() => navigate(`/studio/${spaceId}`)}><Hammer size={21} /></button>
          <button className={`rail-button ${showUsers && activeTab === 'chat' ? 'selected' : ''}`} title="Chat" aria-label="Chat" aria-expanded={showUsers && activeTab === 'chat'} onClick={() => toggleSidebar('chat')}><MessageSquare size={21} /></button>
          <button className="rail-button" title="More" aria-label="More" onClick={() => setShowOfficeMenu(prev => !prev)}><MoreVertical size={21} /></button>
          <div className="rail-bottom">
            <button className="rail-button rail-leave" title="Leave space" aria-label="Leave space" onClick={() => navigate('/dashboard')}><LogOut size={21} /></button>
            <button className="rail-button" title="Settings" aria-label="Settings" onClick={() => setIsSettingsOpen(true)}><Settings size={23} /></button>
          </div>
        </nav>


        {showOfficeMenu && (
          <div className="office-menu-popover">
            <strong>{spaceName}</strong>
            <button onClick={handleCopyInvite}>Invite to office</button>
            <button onClick={() => { setIsSettingsOpen(true); setShowOfficeMenu(false); }}>Settings</button>
            <button onClick={() => { toggleBuild(); setShowOfficeMenu(false); }}>Decorate desk</button>
            <button onClick={() => navigate(`/desk-manager/${spaceId}`)}>Desk manager</button>
            <button onClick={() => navigate(`/studio/${spaceId}`)}>Edit the office</button>
            <button onClick={() => navigate('/dashboard')}>Go to lobby</button>
            <button className="danger" onClick={() => navigate('/dashboard')}>Leave office</button>
          </div>
        )}

        {/* ── Left Sidebar Drawer + Dock ── */}
        <Sidebar
          spaceName={spaceName}
          showUsers={showUsers}
          onToggleSidebar={() => setShowUsers(prev => !prev)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          otherUsers={otherUsers}
          myStoredUsername={myStoredUsername}
          myAvatarUrl={myAvatarUrl || undefined}
          connected={connected}
          handleNavigateToUser={(x, y) => { setMyPos({ x, y }); setPanOffset({ x: 0, y: 0 }); }}
          handleCopyInvite={handleCopyInvite}
          copied={copied}
          messages={messages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          handleSendChat={handleSendChat}
        />

        {/* ── Main Viewport Canvas Area ── */}
        <main className="arena-main" aria-label="Space map">
          <section className="arena-top-left" aria-label="Space header">
            <button className="space-title-pill" onClick={() => setShowOfficeMenu(prev => !prev)} title="Open space menu">
              <span className="space-title-logo"><Sparkles size={16} /></span>
              <span><b>{spaceName}</b><small>{connected ? 'Live office' : 'Connecting...'}</small></span>
            </button>
            <button className="arena-mini-action" onClick={handleCopyInvite} title="Invite people"><Share2 size={16} />{copied ? 'Copied' : 'Invite'}</button>
            <button className="arena-mini-action" onClick={() => navigate(`/studio/${spaceId}`)} title="Open Studio"><Hammer size={16} />Edit map</button>
          </section>

          <section className="arena-top-right" aria-label="Presence and events">
            <button className="arena-status-chip" onClick={() => toggleSidebar('users')}><Users size={16} />{otherUsers.length + 1} online</button>
            <button className="arena-status-chip"><CalendarDays size={16} />No meetings</button>
            <button className={`arena-status-chip ${connected ? 'online' : ''}`}><Wifi size={16} />{connected ? 'Connected' : 'Reconnecting'}</button>
          </section>

          <aside className="arena-right-stack" aria-label="Map widgets">
            <div className="arena-minimap">
              <header><Compass size={15} />Mini map</header>
              <div className="minimap-surface">
                <span className="minimap-room r1" />
                <span className="minimap-room r2" />
                <span className="minimap-room r3" />
                <span className="minimap-you" style={{ left: `${Math.min(94, Math.max(5, (myPos.x / Math.max(1, dimensions.w)) * 100))}%`, top: `${Math.min(92, Math.max(8, (myPos.y / Math.max(1, dimensions.h)) * 100))}%` }} />
              </div>
              <button onClick={handleLocateUser}>Center me</button>
            </div>
            <div className="arena-help-card">
              <b>Move</b>
              <span>WASD / arrow keys or click any walkable tile.</span>
            </div>
          </aside>

          <VideoOverlay
            proximityUsers={proximityUsers}
            otherUsers={otherUsers}
            streams={streams}
            screenStreams={{}}
            myStoredUsername={myStoredUsername}
            myAvatarUrl={myAvatarUrl || undefined}
            micOn={micOn}
            camOn={camOn}
            currentZone={
              privateZones.find(z => myPos.x >= z.startX && myPos.x <= z.endX && myPos.y >= z.startY && myPos.y <= z.endY)
                ? {
                    id: privateZones.find(z => myPos.x >= z.startX && myPos.x <= z.endX && myPos.y >= z.startY && myPos.y <= z.endY)!.id || 'zone1',
                    name: privateZones.find(z => myPos.x >= z.startX && myPos.x <= z.endX && myPos.y >= z.startY && myPos.y <= z.endY)!.name || 'Private Room'
                  }
                : null
            }
            onLeaveZone={() => setMyPos(prev => ({ ...prev, y: 17 }))}
          />

          <MapCanvas
            canvasRef={canvasRef}
            wrapperRef={wrapperRef}
            dimensions={dimensions}
            myPos={myPos}
            otherUsers={otherUsers}
            elements={elements}
            hiddenElementIds={hiddenElementIds}
            privateZones={privateZones}
            zoom={zoom}
            setZoom={setZoom}
            myAvatarUrl={myAvatarUrl}
            autoPath={autoPath}
            setAutoPath={setAutoPath}
            handleLocateUser={handleLocateUser}
            panOffset={panOffset}
            setPanOffset={setPanOffset}
            onDropElement={handleAddElementAt}
            addingElement={addingElement}
            builderMode={builderMode}
            onRemoveElement={handleRemoveElement}
          />

          <ActionToolbar
            myStoredUsername={myStoredUsername}
            onLeaveSpace={() => navigate('/dashboard')}
            micOn={micOn}
            setMicOn={setMicOn}
            camOn={camOn}
            setCamOn={setCamOn}
            showPanel={showPanel}
            onToggleBuild={toggleBuild}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onChooseEmoji={emoji => {
              setChatInput(prev => prev + emoji);
              setActiveTab('chat');
              setShowUsers(true);
              closeBuild();
            }}
          />
        </main>

        {/* ── Elements Side Builder Panel ── */}
        <ElementsPanel
          showPanel={showPanel}
          setShowPanel={open => { if (!open) closeBuild(); else setShowPanel(true); }}
          panelMsg={panelMsg}
          addingElement={addingElement}
          setAddingElement={setAddingElement}
          builderMode={builderMode}
          setBuilderMode={setBuilderMode}
          availableElements={availableElements}
          roomPrefabs={roomPrefabs}
          elements={elements}
          addX={addX}
          setAddX={setAddX}
          addY={addY}
          setAddY={setAddY}
          panelLoading={panelLoading}
          handleAddElement={handleAddElement}
          handleRemoveElement={handleRemoveElement}
          dimensions={dimensions}
          hiddenElementIds={hiddenElementIds}
          toggleHideElement={toggleHideElement}
          handleUpdateDimensions={handleUpdateDimensions}
          handleStampPrefab={handleStampPrefab}
        />

        {/* ── Tabbed Gather Settings Modal ── */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          myStoredUsername={myStoredUsername}
          myAvatarUrl={myAvatarUrl || undefined}
          micOn={micOn}
          setMicOn={setMicOn}
          camOn={camOn}
          setCamOn={setCamOn}
        />
    </div>
  );
}
