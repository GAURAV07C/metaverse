import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store';
import { WsClient } from '../utils/ws';
import { api } from '../utils/api';
import { Sidebar } from './arena/Sidebar';
import { SettingsModal } from './arena/SettingsModal';
import { VideoOverlay } from './arena/VideoOverlay';
import { ArenaHeader } from './arena/ArenaHeader';
import { ElementsPanel, type SpaceElement, type AvailableElement } from './arena/ElementsPanel';
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
  const token = useUserStore((s) => s.token);
  const myStoredUsername = useUserStore((s) => s.username);
  
  const [myPos, setMyPos] = useState({ x: 5, y: 5 });
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  const [elements, setElements] = useState<SpaceElement[]>([]);
  const [dimensions, setDimensions] = useState({ w: 48, h: 27 });
  const [mapThumbnail, setMapThumbnail] = useState<string | null>('/virtual_office.jpg');
  const [connected, setConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [autoPath, setAutoPath] = useState<{x: number, y: number}[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');
  const [messages, setMessages] = useState<{ username: string; message: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Invite / copy state
  const [copied, setCopied] = useState(false);
  const handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sidebar toggle state
  const [showUsers, setShowUsers] = useState(true);

  // Element panel state
  const [showPanel, setShowPanel] = useState(false);
  const [availableElements, setAvailableElements] = useState<AvailableElement[]>([]);
  const [addingElement, setAddingElement] = useState<string | null>(null);
  const [addX, setAddX] = useState('0');
  const [addY, setAddY] = useState('0');
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelMsg, setPanelMsg] = useState('');

  // ── Fetch space data ───────────────────
  const fetchSpace = useCallback(async () => {
    if (!spaceId) return;
    try {
      const res = await api.get(`/space/${spaceId}`);
      const dimStr: string = res.data.dimensions ?? '48x27';
      const [w, h] = dimStr.split('x').map(Number);
      setDimensions({ w: w || 48, h: h || 27 });
      setElements(res.data.elements ?? []);
      setMapThumbnail(res.data.thumbnail || '/virtual_office.jpg');
    } catch (e) { console.error(e); }
  }, [spaceId]);

  useEffect(() => { fetchSpace(); }, [fetchSpace]);

  // ── Fetch available elements ───────────
  const fetchAvailableElements = async () => {
    try {
      const res = await api.get('/elements');
      setAvailableElements(res.data.element ?? []);
    } catch (e) { console.error(e); }
  };

  // ── WebSocket setup ─────────────────────
  useEffect(() => {
    if (!spaceId || !token) return;
    setWsStatus('connecting');

    const ws = new WsClient(token, spaceId);
    wsRef.current = ws;

    const unsub = ws.onMessage((msg) => {
      switch (msg.type) {
        case 'space-joined':
          setWsStatus('connected');
          setConnected(true);
          setMyPos({ x: msg.payload.spawn.x, y: msg.payload.spawn.y });
          const filteredJoined = (msg.payload.users ?? []).filter(
            (u) => u.userId !== msg.payload.userId && u.username !== myStoredUsername
          );
          setOtherUsers(filteredJoined);
          if (msg.payload.avatarUrl) setMyAvatarUrl(msg.payload.avatarUrl);
          break;
        case 'user-joined':
          if (msg.payload.userId && msg.payload.username !== myStoredUsername) {
            setOtherUsers((prev) => {
              if (prev.some((u) => u.userId === msg.payload.userId)) return prev;
              return [...prev, {
                userId: msg.payload.userId,
                username: msg.payload.username,
                x: msg.payload.x,
                y: msg.payload.y,
                avatarUrl: msg.payload.avatarUrl,
              }];
            });
          }
          break;
        case 'user-left':
          setOtherUsers((prev) => prev.filter((u) => u.userId !== msg.payload.userId));
          break;
        case 'chat':
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
    wsRef.current?.send({ type: 'chat', message: chatInput });
    setChatInput('');
  };

  // ── Element Management API ─────────────
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

  const handleLocateUser = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="arena">
      {/* ── Top Header Pill ── */}
      <ArenaHeader 
        spaceId={spaceId}
        wsStatus={wsStatus}
        showUsers={showUsers}
        setShowUsers={setShowUsers}
        otherUsersCount={otherUsers.length}
        copied={copied}
        handleCopyInvite={handleCopyInvite}
        showPanel={showPanel}
        setShowPanel={setShowPanel}
        fetchAvailableElements={fetchAvailableElements}
        onNavigateBack={() => navigate('/dashboard')}
      />

      <div className="arena-body">
        {/* ── Left Sidebar Drawer + Dock ── */}
        <Sidebar 
          showUsers={showUsers}
          onToggleSidebar={() => setShowUsers(prev => !prev)}
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          otherUsers={otherUsers}
          myStoredUsername={myStoredUsername}
          myAvatarUrl={myAvatarUrl || undefined}
          myPos={myPos}
          handleNavigateToUser={(x, y) => { setMyPos({ x, y }); setPanOffset({ x: 0, y: 0 }); }}
          handleCopyInvite={handleCopyInvite}
          copied={copied}
          messages={messages}
          chatInput={chatInput} 
          setChatInput={setChatInput}
          handleSendChat={handleSendChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* ── Main Viewport Canvas Area ── */}
        <main className="arena-main" style={{ position: 'relative' }}>
          <VideoOverlay 
            proximityUsers={[]}
            otherUsers={otherUsers}
            streams={{}}
            screenStreams={{}}
            myStoredUsername={myStoredUsername}
            myAvatarUrl={myAvatarUrl || undefined}
            micOn={false}
            camOn={false}
            currentZone={
              (myPos.x >= 15 && myPos.x <= 23 && myPos.y >= 6 && myPos.y <= 16)
                ? { id: 'zone1', name: 'Meeting Room A' }
                : (myPos.x >= 24 && myPos.x <= 32 && myPos.y >= 6 && myPos.y <= 16)
                ? { id: 'zone2', name: 'Meeting Room B' }
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
            mapThumbnail={mapThumbnail}
            zoom={zoom}
            setZoom={setZoom}
            myAvatarUrl={myAvatarUrl}
            autoPath={autoPath}
            setAutoPath={setAutoPath}
            handleLocateUser={handleLocateUser}
            panOffset={panOffset}
            setPanOffset={setPanOffset}
          />

          <ActionToolbar 
            myStoredUsername={myStoredUsername}
            onLeaveSpace={() => navigate('/dashboard')}
          />
        </main>

        {/* ── Elements Side Builder Panel ── */}
        <ElementsPanel 
          showPanel={showPanel}
          setShowPanel={setShowPanel}
          panelMsg={panelMsg}
          addingElement={addingElement}
          setAddingElement={setAddingElement}
          availableElements={availableElements}
          elements={elements}
          addX={addX}
          setAddX={setAddX}
          addY={addY}
          setAddY={setAddY}
          panelLoading={panelLoading}
          handleAddElement={handleAddElement}
          handleRemoveElement={handleRemoveElement}
          dimensions={dimensions}
        />

        {/* ── Tabbed Gather Settings Modal ── */}
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          myStoredUsername={myStoredUsername}
          myAvatarUrl={myAvatarUrl || undefined}
          micOn={false} 
          setMicOn={() => {}}
          camOn={false} 
          setCamOn={() => {}}
        />
      </div>
    </div>
  );
}
