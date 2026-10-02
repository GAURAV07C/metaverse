import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store';
import { useArenaStore } from '../stores/arenaStore';
import type { WsClient } from '../utils/ws';
import type { MediasoupClient } from '../utils/mediasoupClient';
import { api } from '../utils/api';
import { Sidebar } from './arena/Sidebar';
import { SettingsModal } from './arena/SettingsModal';
import { VideoOverlay } from './arena/VideoOverlay';
import { ElementsPanel, type SpaceElement, type AvailableElement, type RoomPrefab } from './arena/ElementsPanel';
import { MapCanvas } from './arena/MapCanvas';
import { ActionToolbar } from './arena/ActionToolbar';
import { InteractionLayer } from './arena/InteractionLayer';
import { PrejoinScreen } from './arena/PrejoinScreen';
import { SpaceRail } from './arena/SpaceRail';
import { ArenaNotifications } from './arena/ArenaNotifications';
import { ShortcutsModal } from './arena/ShortcutsModal';
import { ArenaRightStack } from './arena/ArenaRightStack';
import { ArenaTopBar } from './arena/ArenaTopBar';
import { ConnectionBanner } from './arena/ConnectionBanner';
import { OfficeMenuPopover } from './arena/OfficeMenuPopover';
import { SelectedUserCard } from './arena/SelectedUserCard';
import { isAudioRoomZone, useArenaRooms } from './arena/useArenaRooms';
import { useInviteLinks } from './arena/useInviteLinks';
import { useArenaToasts } from './arena/useArenaToasts';
import { useArenaMedia } from './arena/useArenaMedia';
import { useArenaSocket } from './arena/useArenaSocket';
import { useAvailableAssetsQuery, useInviteEventsQuery, useModerationAuditQuery, useNotificationPreferencesQuery, useSpaceQuery } from './arena/queries';
import { findPath } from '../utils/pathfinding';
import type { ChatScope, InviteHistoryItem, ModerationHistoryItem, NotificationPrefs, OtherUser, RoomInvite } from './arena/types';
export type { InviteHistoryItem, ModerationHistoryItem, OtherUser } from './arena/types';
import { DEFAULT_NOTIFICATION_PREFS, NOTIFICATION_PREF_KEY, readInviteHistory, readModerationHistory, readNotificationPreferences } from './arena/arenaStorage';
import { getElementInteraction } from './arena/arenaHelpers';

export function Arena() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WsClient | null>(null);
  const msRef = useRef<MediasoupClient | null>(null);
  const token = useUserStore((s) => s.token);
  const myUserId = useUserStore((s) => s.userId);
  const myStoredUsername = useUserStore((s) => s.username);
  const storedAvatarUrl = useUserStore((s) => s.avatarUrl);
  const activeTab = useArenaStore((s) => s.activeTab);
  const setActiveTab = useArenaStore((s) => s.setActiveTab);
  const showUsers = useArenaStore((s) => s.showUsers);
  const setShowUsers = useArenaStore((s) => s.setShowUsers);
  const isSettingsOpen = useArenaStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useArenaStore((s) => s.setIsSettingsOpen);
  const showOfficeMenu = useArenaStore((s) => s.showOfficeMenu);
  const setShowOfficeMenu = useArenaStore((s) => s.setShowOfficeMenu);
  const viewMode = useArenaStore((s) => s.viewMode);
  const setViewMode = useArenaStore((s) => s.setViewMode);
  const showShortcuts = useArenaStore((s) => s.showShortcuts);
  const setShowShortcuts = useArenaStore((s) => s.setShowShortcuts);
  const showPanel = useArenaStore((s) => s.showPanel);
  const setShowPanel = useArenaStore((s) => s.setShowPanel);
  const toggleArenaSidebar = useArenaStore((s) => s.toggleSidebar);

  const [myPos, setMyPos] = useState({ x: 5, y: 5 });
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  const [proximityUsers, setProximityUsers] = useState<string[]>([]);
  const [mediaReady, setMediaReady] = useState(false);

  const [elements, setElements] = useState<SpaceElement[]>([]);
  const [privateZones, setPrivateZones] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ w: 48, h: 27 });
  const [spaceName, setSpaceName] = useState('Office');
  const [canEditSpace, setCanEditSpace] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('Guest');
  const [hasJoined, setHasJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<'available' | 'busy' | 'focus' | 'away'>('available');
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() => readNotificationPreferences());
  const [isBrowserOnline, setIsBrowserOnline] = useState(() => navigator.onLine);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [autoPath, setAutoPath] = useState<{x: number, y: number}[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<{ username: string; message: string; time: string; scope?: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatScope, setChatScope] = useState<ChatScope>('everyone');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [inviteHistory, setInviteHistory] = useState<InviteHistoryItem[]>(() => readInviteHistory(spaceId));
  const [moderationHistory, setModerationHistory] = useState<ModerationHistoryItem[]>(() => readModerationHistory(spaceId));
  const [inviteTick, setInviteTick] = useState(0);
  const [reactions, setReactions] = useState<Record<string, { emoji: string; expiresAt: number }>>({});
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [promptInteraction, setPromptInteraction] = useState<any>(null);
  const [activeInteraction, setActiveInteraction] = useState<any>(null);
  const activeTabRef = useRef(activeTab);
  const showUsersRef = useRef(showUsers);
  const notificationPrefsRef = useRef(notificationPrefs);
  const presenceStatusRef = useRef(presenceStatus);
  const wasConnectedRef = useRef(false);
  const spaceQuery = useSpaceQuery(spaceId);
  const availableAssetsQuery = useAvailableAssetsQuery();
  const notificationPreferencesQuery = useNotificationPreferencesQuery(spaceId);
  const inviteEventsQuery = useInviteEventsQuery(spaceId);
  const moderationAuditQuery = useModerationAuditQuery(spaceId, canEditSpace);

  useEffect(() => {
    activeTabRef.current = activeTab;
    showUsersRef.current = showUsers;
  }, [activeTab, showUsers]);

  useEffect(() => {
    setInviteHistory(readInviteHistory(spaceId));
    setModerationHistory(readModerationHistory(spaceId));
  }, [spaceId]);

  useEffect(() => {
    if (!inviteEventsQuery.data) return;
    setInviteHistory(inviteEventsQuery.data.map((event: any) => ({
      id: event.inviteId || event.id,
      direction: event.direction === 'incoming' ? 'incoming' : 'outgoing',
      status: event.status || 'sent',
      fromUsername: event.fromUsername || undefined,
      toUsername: event.toUsername || undefined,
      roomId: event.roomId,
      roomName: event.roomName,
      createdAt: new Date(event.createdAt).getTime(),
      updatedAt: new Date(event.createdAt).getTime(),
    })));
  }, [inviteEventsQuery.data]);

  useEffect(() => {
    if (!moderationAuditQuery.data) return;
    setModerationHistory(moderationAuditQuery.data.map((event: any) => ({
      id: event.id,
      action: event.action,
      targetUserId: event.targetUserId || undefined,
      targetUsername: event.targetUsername || 'Participant',
      status: event.status === 'applied' ? 'applied' : event.status === 'failed' ? 'failed' : 'sent',
      createdAt: new Date(event.createdAt).getTime(),
    })));
  }, [moderationAuditQuery.data]);

  useEffect(() => {
    if (!spaceId) return;
    localStorage.setItem(`metaverse_invite_history_${spaceId}`, JSON.stringify(inviteHistory.slice(0, 30)));
  }, [inviteHistory, spaceId]);

  useEffect(() => {
    if (!spaceId) return;
    localStorage.setItem(`metaverse_moderation_history_${spaceId}`, JSON.stringify(moderationHistory.slice(0, 40)));
  }, [moderationHistory, spaceId]);

  useEffect(() => {
    notificationPrefsRef.current = notificationPrefs;
  }, [notificationPrefs]);

  useEffect(() => {
    presenceStatusRef.current = presenceStatus;
  }, [presenceStatus]);

  useEffect(() => {
    const refreshPrefs = () => setNotificationPrefs(readNotificationPreferences());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === NOTIFICATION_PREF_KEY) refreshPrefs();
    };
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('storage', handleStorage);
    window.addEventListener('metaverse-notification-preferences-updated', refreshPrefs);
    window.addEventListener('focus', refreshPrefs);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('metaverse-notification-preferences-updated', refreshPrefs);
      window.removeEventListener('focus', refreshPrefs);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!notificationPreferencesQuery.data) return;
    const next = { ...DEFAULT_NOTIFICATION_PREFS, ...notificationPreferencesQuery.data };
    setNotificationPrefs(next);
    localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(next));
  }, [notificationPreferencesQuery.data]);

  const { copied, copiedRoomId, buildRoomUrl, handleCopyInvite, handleCopyRoomLink } = useInviteLinks();
  const autoJoinedRoomRef = useRef<string | null>(null);

  // Element panel state
  const [availableElements, setAvailableElements] = useState<AvailableElement[]>([]);
  const [roomPrefabs, setRoomPrefabs] = useState<RoomPrefab[]>([]);
  const [addingElement, setAddingElement] = useState<string | null>(null);
  const [builderMode, setBuilderMode] = useState<'pointer' | 'brush' | 'eraser'>('pointer');
  const [addX, setAddX] = useState('0');
  const [addY, setAddY] = useState('0');
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelMsg, setPanelMsg] = useState('');
  const [hiddenElementIds, setHiddenElementIds] = useState<string[]>([]);
  const liveTileSize = 32;

  const toggleHideElement = (id: string) => {
    setHiddenElementIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const panCameraToTile = (x: number, y: number) => {
    setPanOffset({
      x: (x - myPos.x) * liveTileSize,
      y: (y - myPos.y) * liveTileSize,
    });
  };
  const stopFollowing = useCallback(() => {
    setFollowingUserId(null);
  }, []);

  const followedUser = followingUserId ? otherUsers.find(u => u.userId === followingUserId) : null;
  const selectedUser = selectedUserId ? otherUsers.find(u => u.userId === selectedUserId) : null;
  const { toasts, pushToast, dismissToast } = useArenaToasts(notificationPrefsRef, presenceStatusRef);
  const {
    streams,
    setStreams,
    screenStreams,
    setScreenStreams,
    micOn,
    camOn,
    isScreenSharing,
    setPendingInitialMedia,
    handleMicChange,
    handleCamChange,
    handleScreenShare,
    handleDevicePreferenceChange,
    stopMicrophone,
    stopCamera,
    stopScreenShare,
    cleanupMedia,
  } = useArenaMedia({
    msRef,
    mediaReady,
    setMediaReady,
    myUserId,
    pushToast,
  });

  const playInviteRing = useCallback(() => {
    const prefs = notificationPrefsRef.current;
    const status = presenceStatusRef.current;
    if (!prefs.sounds || !prefs.roomInvites) return;
    if (prefs.respectFocus && (status === 'focus' || status === 'busy')) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
      gain.connect(ctx.destination);

      [0, 0.14].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(740, ctx.currentTime + offset);
        osc.connect(gain);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.11);
      });

      window.setTimeout(() => ctx.close().catch(() => {}), 600);
    } catch {
      // Browser autoplay policies can block notification sounds.
    }
  }, []);

  const recordInviteHistory = useCallback((item: Omit<InviteHistoryItem, 'updatedAt'>) => {
    setInviteHistory(prev => {
      const updated: InviteHistoryItem = { ...item, updatedAt: Date.now() };
      return [updated, ...prev.filter(existing => existing.id !== item.id)].slice(0, 30);
    });
  }, []);

  const recordModerationHistory = useCallback((item: Omit<ModerationHistoryItem, 'id' | 'createdAt'> & { id?: string }) => {
    setModerationHistory(prev => {
      const entry: ModerationHistoryItem = {
        id: item.id || `${item.action}-${item.targetUserId || item.targetUsername}-${Date.now()}`,
        action: item.action,
        targetUserId: item.targetUserId,
        targetUsername: item.targetUsername,
        status: item.status,
        createdAt: Date.now(),
      };
      return [entry, ...prev.filter(existing => existing.id !== entry.id)].slice(0, 40);
    });
  }, []);

  useEffect(() => {
    if (connected) {
      wasConnectedRef.current = true;
      return;
    }
    if (!wasConnectedRef.current || !notificationPrefs.reconnecting) return;
    pushToast({
      title: 'Reconnecting to office',
      detail: 'Trying to restore live movement, chat, and media.',
      kind: 'warning',
      category: 'system',
    });
  }, [connected, notificationPrefs.reconnecting, pushToast]);

  const handleNotificationPreferenceChange = useCallback(async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...notificationPrefsRef.current, [key]: value };
    notificationPrefsRef.current = next;
    setNotificationPrefs(next);
    localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(next));
    if (!spaceId) return;
    try {
      const res = await api.put(`/office/${spaceId}/notification-preferences`, next);
      if (res.data?.preferences) {
        const saved = { ...DEFAULT_NOTIFICATION_PREFS, ...res.data.preferences };
        notificationPrefsRef.current = saved;
        setNotificationPrefs(saved);
        localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(saved));
      }
    } catch {
      pushToast({
        title: 'Notification settings saved locally',
        detail: 'Server sync failed, but this browser will keep the preference.',
        kind: 'warning',
        category: 'system',
      });
    }
  }, [pushToast, spaceId]);

  useEffect(() => {
    if (roomInvites.length === 0) return;
    const interval = window.setInterval(() => {
      setInviteTick(tick => tick + 1);
      setRoomInvites(prev => prev.filter(invite => invite.expiresAt > Date.now()));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [roomInvites.length]);

  const handleUpdateDimensions = async (w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    setDimensions({ w, h });
    setPanelMsg(`Map expanded to ${w}x${h}!`);
    try {
      await api.put(`/space/${spaceId}`, { dimensions: `${w}x${h}` });
    } catch (e) { console.error(e); }
  };

  // ── Fetch space data ───────────────────
  const applySpaceData = useCallback((spaceData: any) => {
    if (!spaceData) return;
    const dimStr: string = spaceData.dimensions ?? '48x27';
    const [w, h] = dimStr.split('x').map(Number);
    setDimensions({ w: w || 48, h: h || 27 });
    setSpaceName(spaceData.name || 'Office');
    setCanEditSpace(Boolean(spaceData.canEdit ?? (myUserId && spaceData.ownerId === myUserId)));
    setCurrentUserRole(spaceData.currentUserRole || (myUserId && spaceData.ownerId === myUserId ? 'Owner' : 'Guest'));
    setElements(spaceData.elements ?? []);
    setPrivateZones(spaceData.privateZones ?? []);
  }, [myUserId]);

  useEffect(() => { applySpaceData(spaceQuery.data); }, [applySpaceData, spaceQuery.data]);

  const fetchSpace = useCallback(async () => {
    const result = await spaceQuery.refetch();
    applySpaceData(result.data);
  }, [applySpaceData, spaceQuery.refetch]);

  // ── Fetch available elements & room templates ───────────
  const fetchAvailableElements = async () => {
    const result = await availableAssetsQuery.refetch();
    if (!result.data) return;
    setAvailableElements(result.data.elements ?? []);
    setRoomPrefabs(result.data.roomPrefabs ?? []);
  };

  useArenaSocket({
    spaceId,
    token,
    hasJoined,
    myUserId,
    storedAvatarUrl,
    wsRef,
    msRef,
    activeTabRef,
    showUsersRef,
    setConnected,
    setMediaReady,
    setMyPos,
    setOtherUsers,
    setMyAvatarUrl,
    setMessages,
    setSelectedUserId,
    setProximityUsers,
    setUnreadChatCount,
    setRoomInvites,
    setReactions,
    setStreams,
    setScreenStreams,
    pushToast,
    playInviteRing,
    recordInviteHistory,
    recordModerationHistory,
    cleanupMedia,
    stopMicrophone,
    stopCamera,
    stopScreenShare,
  });

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
      stopFollowing();
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
  }, [connected, myPos, dimensions, elements, otherUsers, stopFollowing]);

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
        if (isCollidingWithUser && !followingUserId) return []; // Stop if colliding, UNLESS we are following (leader might move)

        setMyPos({ x: nextStep.x, y: nextStep.y });
        wsRef.current?.move(nextStep.x, nextStep.y);
        return newPath;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [autoPath, otherUsers, followingUserId]);

  // ── Follow leader movement ────────────
  useEffect(() => {
    if (!followingUserId || !connected || !followedUser) return;
    
    const dist = Math.abs(myPos.x - followedUser.x) + Math.abs(myPos.y - followedUser.y);
    if (dist > 1) {
        const isWalkableForPath = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= dimensions.w || y >= dimensions.h) return false;
          if (x === followedUser.x && y === followedUser.y) return true;
          
          const isCollidingWithElement = elements.some((el) => {
            if (el.element.category === 'Rooms' || String(el.element.category).toLowerCase().includes('floor')) return false;
            const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''}`.toLowerCase();
            const isSeat = text.includes('seating') || text.includes('chair') || text.includes('sofa') || text.includes('couch') || text.includes('bench') || text.includes('stool') || text.includes('seat');
            if (isSeat) return false;
            if (!el.element.static) return false;
            return x >= el.x && x < el.x + el.element.width && y >= el.y && y < el.y + el.element.height;
          });
          if (isCollidingWithElement) return false;

          const isCollidingWithUser = otherUsers.some((u) => u.x === x && u.y === y);
          if (isCollidingWithUser) return false;
          
          return true;
        };

        const path = findPath(myPos, { x: followedUser.x, y: followedUser.y }, dimensions.w, dimensions.h, isWalkableForPath);
        if (path.length > 2) {
          setAutoPath(path.slice(1, -1)); // Walk up to them, stopping 1 tile away
        } else if (path.length <= 2) {
          setAutoPath([]);
        }
    }
  }, [followingUserId, connected, followedUser, myPos, dimensions.w, dimensions.h, elements, otherUsers]);

  const handleSendChat = (e: React.FormEvent, requestedScope?: Exclude<ChatScope, 'invites'>) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const scope = requestedScope || (chatScope === 'invites' ? 'everyone' : chatScope);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetMatch = chatInput.match(/^@([^\s]+)\s+/);
    const targetUsername = scope === 'dm' ? targetMatch?.[1] : undefined;
    const targetUserId = targetUsername
      ? otherUsers.find(u => u.username.toLowerCase() === targetUsername.toLowerCase())?.userId
      : undefined;
    const msgObj = { username: myStoredUsername || 'You', message: chatInput, time, scope };
    setMessages((prev) => [...prev, msgObj]);
    wsRef.current?.sendChat(chatInput, { scope, targetUsername, targetUserId });
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

  const {
    currentRoom,
    roomSpots,
    activeRooms,
    allRooms,
    selectedUserRoom,
    mediaGroupUserIds,
    currentPortal,
    currentSpotlight,
    currentMapZone,
    getRoomSpots,
    isTileInZone,
    isSpotOccupied,
    findWalkableTileInZone,
  } = useArenaRooms({
    privateZones,
    elements,
    otherUsers,
    myPos,
    dimensions,
    selectedUser,
    proximityUsers,
  });
  const moveToTile = (x: number, y: number) => {
    setAutoPath([]);
    setPanOffset({ x: 0, y: 0 });
    setMyPos({ x, y });
    wsRef.current?.move(x, y);
  };
  const teleportToTile = (x: number, y: number) => {
    setAutoPath([]);
    setPanOffset({ x: 0, y: 0 });
    setMyPos({ x, y });
    wsRef.current?.teleport(x, y);
  };
  const buildPortalUrl = (portal: any) => {
    if (portal.targetUrl) return portal.targetUrl;
    if (!portal.targetSpaceId) return '';
    const url = new URL(`/space/${portal.targetSpaceId}`, window.location.origin);
    if (portal.targetRoomId) url.searchParams.set('room', portal.targetRoomId);
    if (Number.isInteger(portal.targetX) && Number.isInteger(portal.targetY)) {
      url.searchParams.set('x', String(portal.targetX));
      url.searchParams.set('y', String(portal.targetY));
    }
    return url.toString();
  };
  const usePortal = () => {
    if (!currentPortal) return;
    const targetUrl = buildPortalUrl(currentPortal);
    if (targetUrl) {
      window.location.href = targetUrl;
      return;
    }
    if (Number.isInteger(currentPortal.targetX) && Number.isInteger(currentPortal.targetY)) {
      const x = Math.max(0, Math.min(dimensions.w - 1, currentPortal.targetX));
      const y = Math.max(0, Math.min(dimensions.h - 1, currentPortal.targetY));
      const targetZone = privateZones.find(z =>
        z.id !== currentPortal.id &&
        (z.type === 'portal' || z.type === 'spawn' || isAudioRoomZone(z)) &&
        isTileInZone(x, y, z)
      );
      const availableTarget = targetZone ? findWalkableTileInZone(targetZone) : null;
      teleportToTile(availableTarget?.x ?? x, availableTarget?.y ?? y);
      return;
    }
    const portals = privateZones.filter(z => z.type === 'portal');
    const nextPortal = portals.length > 1
      ? portals[(Math.max(0, portals.findIndex(z => z.id === currentPortal.id)) + 1) % portals.length]
      : null;
    const target = nextPortal || privateZones.find(z => z.type === 'spawn');
    if (!target) return;

    const availableTarget = findWalkableTileInZone(target);
    const x = availableTarget?.x ?? Math.max(target.startX, Math.min(target.endX - 1, Math.floor((target.startX + target.endX) / 2)));
    const y = availableTarget?.y ?? Math.max(target.startY, Math.min(target.endY - 1, Math.floor((target.startY + target.endY) / 2)));
    teleportToTile(x, y);
  };
  const chooseSpot = (spot: any) => {
    if (isSpotOccupied(spot)) return;
    const x = Math.max(spot.startX, Math.min(spot.endX - 1, Math.floor((spot.startX + spot.endX) / 2)));
    const y = Math.max(spot.startY, Math.min(spot.endY - 1, Math.floor((spot.startY + spot.endY) / 2)));
    moveToTile(x, y);
  };
  const leaveRoom = () => {
    if (!currentRoom) return;
    const x = Math.max(0, Math.min(dimensions.w - 1, myPos.x));
    const y = Math.max(0, Math.min(dimensions.h - 1, currentRoom.endY));
    moveToTile(x, y);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState(null, '', url.toString());
  };
  const joinRoom = (roomId: string) => {
    const room = privateZones.find(z => z.id === roomId && isAudioRoomZone(z));
    if (!room) return;
    const spotTarget = getRoomSpots(room)
      .filter(spot => !isSpotOccupied(spot))
      .map(findWalkableTileInZone)
      .find(Boolean);
    const fallbackTarget = spotTarget || findWalkableTileInZone(room) || {
      x: Math.max(room.startX, Math.min(room.endX - 1, Math.floor((room.startX + room.endX) / 2))),
      y: Math.max(room.startY, Math.min(room.endY - 1, Math.floor((room.startY + room.endY) / 2))),
    };
    const { x, y } = fallbackTarget;
    setAutoPath([]);
    setPanOffset({ x: 0, y: 0 });
    setMyPos({ x, y });
    wsRef.current?.teleport(x, y);
    setViewMode('map');
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.replaceState(null, '', url.toString());
  };

  useEffect(() => {
    const onJoinRoomEvent = (event: Event) => {
      const roomId = (event as CustomEvent<{ roomId?: string }>).detail?.roomId;
      if (roomId) joinRoom(roomId);
    };
    window.addEventListener('arena-join-room', onJoinRoomEvent);
    return () => window.removeEventListener('arena-join-room', onJoinRoomEvent);
  }, [privateZones, otherUsers, myPos]);

  const inviteUserToCurrentRoom = (user: OtherUser) => {
    if (!currentRoom) {
      pushToast({ title: 'Join a room first', detail: 'Room invite is available after you enter a room.', kind: 'warning', category: 'system' });
      return;
    }
    const roomName = currentRoom.name || 'this room';
    wsRef.current?.sendRoomInvite(user.userId, { id: currentRoom.id, name: roomName, url: buildRoomUrl(currentRoom.id) });
    recordInviteHistory({
      id: `${currentRoom.id}-${user.userId}-${Date.now()}`,
      direction: 'outgoing',
      status: 'sent',
      toUsername: user.username,
      roomId: currentRoom.id,
      roomName,
      createdAt: Date.now(),
    });
    setUnreadChatCount(0);
    pushToast({ title: 'Room invite sent', detail: `${user.username} can join ${roomName} from the invite toast.`, kind: 'success', category: 'roomInvites' });
  };

  const acceptRoomInvite = (invite: RoomInvite) => {
    setRoomInvites(prev => prev.filter(item => item.id !== invite.id));
    if (invite.fromUserId) {
      wsRef.current?.respondToRoomInvite({
        inviteId: invite.inviteId,
        targetUserId: invite.fromUserId,
        roomId: invite.roomId,
        roomName: invite.roomName,
        response: 'accepted',
      });
    }
    recordInviteHistory({
      id: invite.inviteId || invite.id,
      direction: 'incoming',
      status: 'accepted',
      fromUsername: invite.fromUsername,
      roomId: invite.roomId,
      roomName: invite.roomName,
      createdAt: Date.now(),
    });
    joinRoom(invite.roomId);
    pushToast({ title: `Joining ${invite.roomName}`, detail: `Invite from ${invite.fromUsername} accepted.`, kind: 'success', category: 'roomInvites' });
  };

  const declineRoomInvite = (invite: RoomInvite) => {
    setRoomInvites(prev => prev.filter(item => item.id !== invite.id));
    if (invite.fromUserId) {
      wsRef.current?.respondToRoomInvite({
        inviteId: invite.inviteId,
        targetUserId: invite.fromUserId,
        roomId: invite.roomId,
        roomName: invite.roomName,
        response: 'declined',
      });
    }
    recordInviteHistory({
      id: invite.inviteId || invite.id,
      direction: 'incoming',
      status: 'declined',
      fromUsername: invite.fromUsername,
      roomId: invite.roomId,
      roomName: invite.roomName,
      createdAt: Date.now(),
    });
    pushToast({ title: 'Invite declined', detail: `${invite.roomName} invite dismissed.`, category: 'roomInvites' });
  };

  const handleLocateOtherUser = (x: number, y: number) => {
    setFollowingUserId(null);
    panCameraToTile(x, y);
  };

  const handleFollowOtherUser = (userId: string) => {
    setFollowingUserId(prev => prev === userId ? null : userId);
    setPanOffset({ x: 0, y: 0 });
  };

  const messageUser = (username: string) => {
    setActiveTab('chat');
    setShowUsers(true);
    setChatScope('dm');
    setChatInput(`@${username} `);
    closeBuild();
  };

  const requestModerationAction = (targetUserId: string, action: 'mute-audio' | 'stop-video' | 'stop-screen') => {
    if (!canEditSpace || targetUserId === 'me') return;
    wsRef.current?.sendModerationRequest(targetUserId, action);
    const targetName = otherUsers.find(user => user.userId === targetUserId)?.username || 'participant';
    recordModerationHistory({
      action,
      targetUserId,
      targetUsername: targetName,
      status: 'sent',
    });
    pushToast({
      title: 'Host action sent',
      detail: `${action.replace('-', ' ')} requested for ${targetName}.`,
      kind: 'info',
      category: 'system',
    });
  };

  const requestModerationAll = (action: 'mute-audio' | 'stop-video' | 'stop-screen') => {
    if (!canEditSpace) return;
    const targets = otherUsers.filter(user => proximityUsers.includes(user.userId));
    if (targets.length === 0) {
      pushToast({ title: 'No meeting participants', detail: 'There are no remote users in your current audio/video group.', kind: 'warning', category: 'system' });
      return;
    }
    targets.forEach(user => {
      wsRef.current?.sendModerationRequest(user.userId, action);
      recordModerationHistory({
        action,
        targetUserId: user.userId,
        targetUsername: user.username,
        status: 'sent',
      });
    });
    pushToast({
      title: 'Bulk host action sent',
      detail: `${action.replace('-', ' ')} requested for ${targets.length} participant${targets.length === 1 ? '' : 's'}.`,
      kind: 'info',
      category: 'system',
    });
  };

  const handleReaction = (emoji: string) => {
    setReactions(prev => ({
      ...prev,
      me: { emoji, expiresAt: Date.now() + 2400 },
    }));
    window.setTimeout(() => {
      setReactions(prev => {
        const existing = prev.me;
        if (!existing || existing.expiresAt > Date.now()) return prev;
        const next = { ...prev };
        delete next.me;
        return next;
      });
    }, 2600);
    wsRef.current?.sendReaction(emoji);
  };

  const handleStatusChange = (status: 'available' | 'busy' | 'focus' | 'away') => {
    setPresenceStatus(status);
    wsRef.current?.setStatus(status);
  };

  const closeBuild = () => {
    setShowPanel(false);
    setAddingElement(null);
    setBuilderMode('pointer');
  };

  const toggleSidebar = (tab: 'users' | 'chat') => {
    toggleArenaSidebar(tab);
    if (tab === 'chat') setUnreadChatCount(0);
    closeBuild();
  };

  useEffect(() => {
    if (showUsers && activeTab === 'chat') setUnreadChatCount(0);
  }, [showUsers, activeTab]);

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

  useEffect(() => {
    if (!followingUserId) return;
    const user = otherUsers.find(u => u.userId === followingUserId);
    if (!user) {
      setFollowingUserId(null);
      return;
    }
    setPanOffset({ x: 0, y: 0 });
  }, [followingUserId, otherUsers]);

  useEffect(() => {
    if (currentRoom && chatScope === 'everyone') {
      setChatScope('room');
    } else if (!currentRoom && chatScope === 'room') {
      setChatScope('everyone');
    }
  }, [currentRoom?.id, chatScope]);

  useEffect(() => {
    const onRoomJoinClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('.room-join-button');
      const roomId = button?.dataset.roomId;
      if (!roomId || button.disabled) return;
      event.preventDefault();
      joinRoom(roomId);
    };
    document.addEventListener('click', onRoomJoinClick, true);
    return () => document.removeEventListener('click', onRoomJoinClick, true);
  }, [privateZones, otherUsers, myPos]);

  useEffect(() => {
    if (!connected || privateZones.length === 0) return;
    const roomId = new URL(window.location.href).searchParams.get('room');
    if (!roomId || autoJoinedRoomRef.current === roomId) return;
    if (!privateZones.some(z => z.id === roomId && isAudioRoomZone(z))) return;
    autoJoinedRoomRef.current = roomId;
    joinRoom(roomId);
  }, [connected, privateZones.length]);

  const handleLocateUser = () => {
    stopFollowing();
    setPanOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const nearby = elements
      .map((el) => ({ el, interaction: getElementInteraction(el) }))
      .filter((item): item is { el: SpaceElement; interaction: any } => Boolean(item.interaction))
      .find(({ el }) => {
        const centerX = el.x + (el.element.width || 1) / 2;
        const centerY = el.y + (el.element.height || 1) / 2;
        return Math.hypot(centerX - myPos.x, centerY - myPos.y) <= 2.25;
      });

    setPromptInteraction(nearby?.interaction || null);
  }, [elements, myPos]);

  useEffect(() => {
    const onInteract = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        const target = e.target as HTMLElement | null;
        if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          return;
        }
      }
      if (e.key === 'Escape' && showShortcuts) {
        e.preventDefault();
        setShowShortcuts(false);
        return;
      }
      if (e.key.toLowerCase() !== 'x') return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (currentPortal) {
        e.preventDefault();
        usePortal();
        return;
      }
      if (!promptInteraction || activeInteraction) return;
      e.preventDefault();
      setActiveInteraction(promptInteraction);
    };

    window.addEventListener('keydown', onInteract);
    return () => window.removeEventListener('keydown', onInteract);
  }, [activeInteraction, currentPortal, promptInteraction, showShortcuts]);

  if (!hasJoined) {
    return (
      <PrejoinScreen
        spaceName={spaceName}
        onJoin={(startMic, startCam) => {
          setPendingInitialMedia({ mic: startMic, cam: startCam });
          setHasJoined(true);
        }}
      />
    );
  }

  return (
    <div className={`arena ${showUsers ? 'with-sidebar' : ''}`}>
        <SpaceRail
          spaceName={spaceName}
          showUsers={showUsers}
          activeTab={activeTab}
          canEditSpace={canEditSpace}
          unreadChatCount={unreadChatCount}
          onOpenOfficeMenu={() => setShowOfficeMenu(prev => !prev)}
          onSearchPeople={() => {
            setActiveTab('users');
            setShowUsers(true);
            requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.people-search input')?.focus());
          }}
          onToggleSidebar={toggleSidebar}
          onEditOffice={() => canEditSpace && navigate(`/studio/${spaceId}`)}
          onLeaveSpace={() => navigate('/dashboard')}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />


        {showOfficeMenu && (
          <OfficeMenuPopover
            spaceName={spaceName}
            currentUserRole={currentUserRole}
            canEditSpace={canEditSpace}
            onCopyInvite={handleCopyInvite}
            onOpenSettings={() => { setIsSettingsOpen(true); setShowOfficeMenu(false); }}
            onDecorateDesk={() => { if (!canEditSpace) return; toggleBuild(); setShowOfficeMenu(false); }}
            onOpenDeskManager={() => navigate(`/desk-manager/${spaceId}`)}
            onEditOffice={() => canEditSpace && navigate(`/studio/${spaceId}`)}
            onGoToLobby={() => navigate('/dashboard')}
            onLeaveOffice={() => navigate('/dashboard')}
          />
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
          handleLocateUser={handleLocateOtherUser}
          handleFollowUser={handleFollowOtherUser}
          followingUserId={followingUserId}
          handleCopyInvite={handleCopyInvite}
          copied={copied}
          messages={messages}
          inviteHistory={inviteHistory}
          chatInput={chatInput}
          setChatInput={setChatInput}
          handleSendChat={handleSendChat}
          chatScope={chatScope}
          setChatScope={setChatScope}
          currentRoom={currentRoom || null}
          allRooms={allRooms}
          activeRooms={activeRooms}
          onJoinRoom={joinRoom}
          onCopyRoomLink={handleCopyRoomLink}
          copiedRoomId={copiedRoomId}
          onOpenMeetingMode={() => setViewMode('grid')}
            myStatus={presenceStatus}
          unreadChatCount={unreadChatCount}
        />

        {/* ── Main Viewport Canvas Area ── */}
        <main className="arena-main" aria-label="Space map">
          <ArenaTopBar
            spaceName={spaceName}
            connected={connected}
            copied={copied}
            canEditSpace={canEditSpace}
            otherUsers={otherUsers}
            followedUser={followedUser}
            currentMapZone={currentMapZone}
            onOpenOfficeMenu={() => setShowOfficeMenu(prev => !prev)}
            onCopyInvite={handleCopyInvite}
            onEditMap={() => navigate(`/studio/${spaceId}`)}
            onOpenUsers={() => toggleSidebar('users')}
            onStopFollowing={() => setFollowingUserId(null)}
            onOpenMeetingMode={() => setViewMode('grid')}
          />

          <ConnectionBanner
            connected={connected}
            isBrowserOnline={isBrowserOnline}
            enabled={notificationPrefs.reconnecting}
          />

          <SelectedUserCard
            user={selectedUser || null}
            roomName={selectedUserRoom?.name || null}
            currentRoomAvailable={Boolean(currentRoom)}
            followingUserId={followingUserId}
            onClose={() => setSelectedUserId(null)}
            onMessage={messageUser}
            onFollow={handleFollowOtherUser}
            onLocate={handleLocateOtherUser}
            onInviteRoom={inviteUserToCurrentRoom}
            onRing={(user) => {
              wsRef.current?.sendChat('', { scope: 'dm', targetUserId: user.userId, isRing: true });
              pushToast({ title: `Ringing ${user.username}...`, kind: 'info', category: 'system' });
              setSelectedUserId(null);
            }}
          />

          <ArenaNotifications
            roomInvites={roomInvites}
            inviteTick={inviteTick}
            toasts={toasts}
            onAcceptInvite={acceptRoomInvite}
            onDeclineInvite={declineRoomInvite}
            onDismissToast={dismissToast}
          />

          <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

          <ArenaRightStack
            dimensions={dimensions}
            myPos={myPos}
            otherUsers={otherUsers}
            elements={elements}
            privateZones={privateZones}
            currentRoom={currentRoom}
            currentSpotlight={currentSpotlight}
            roomSpots={roomSpots}
            onLocateUser={handleLocateUser}
            onOpenMeetingMode={() => setViewMode('grid')}
            onLeaveRoom={leaveRoom}
            isSpotOccupied={isSpotOccupied}
            onChooseSpot={chooseSpot}
          />

          <VideoOverlay
            proximityUsers={mediaGroupUserIds}
            otherUsers={otherUsers}
            streams={streams}
            screenStreams={screenStreams}
            myStoredUsername={myStoredUsername}
            myAvatarUrl={myAvatarUrl || undefined}
            micOn={micOn}
            camOn={camOn}
            viewMode={viewMode}
            currentZone={currentRoom ? { id: currentRoom.id || 'zone1', name: currentRoom.name || 'Room' } : null}
            onLeaveZone={leaveRoom}
            onViewModeChange={setViewMode}
            canHost={canEditSpace}
            isScreenSharing={isScreenSharing}
            onMuteSelf={() => handleMicChange(false)}
            onStopScreenShare={isScreenSharing ? handleScreenShare : undefined}
            onModerationAction={requestModerationAction}
            onModerationAll={requestModerationAll}
            moderationHistory={moderationHistory}
          />

          <InteractionLayer
            promptInteraction={promptInteraction}
            activeInteraction={activeInteraction}
            setActiveInteraction={setActiveInteraction}
          />

          {currentPortal && !activeInteraction && (
            <div className="interaction-prompt portal-prompt">
              <span>Press <kbd>X</kbd> to use {currentPortal.name || 'portal'}{currentPortal.targetRoomId ? ` → ${currentPortal.targetRoomId}` : ''}</span>
              <button type="button" onClick={usePortal}>Use</button>
            </div>
          )}

          <MapCanvas
            canvasRef={canvasRef}
            wrapperRef={wrapperRef}
            dimensions={dimensions}
            myPos={myPos}
            cameraTarget={followedUser ? { x: followedUser.x, y: followedUser.y } : myPos}
            otherUsers={otherUsers}
            proximityUsers={mediaGroupUserIds}
            elements={elements}
            hiddenElementIds={hiddenElementIds}
            privateZones={privateZones}
            zoom={zoom}
            setZoom={setZoom}
            myAvatarUrl={myAvatarUrl}
            myUsername={myStoredUsername}
            autoPath={autoPath}
            setAutoPath={setAutoPath}
            handleLocateUser={handleLocateUser}
            panOffset={panOffset}
            setPanOffset={setPanOffset}
            onDropElement={handleAddElementAt}
            addingElement={addingElement}
            builderMode={builderMode}
            onRemoveElement={handleRemoveElement}
            reactions={reactions}
            onSelectUser={setSelectedUserId}
            onManualControl={stopFollowing}
          />

          <ActionToolbar
            myStoredUsername={myStoredUsername}
            onLeaveSpace={() => navigate('/dashboard')}
            micOn={micOn}
            setMicOn={handleMicChange}
            camOn={camOn}
            setCamOn={handleCamChange}
            isScreenSharing={isScreenSharing}
            handleScreenShare={handleScreenShare}
            canBuild={canEditSpace}
            showPanel={showPanel}
            onToggleBuild={() => canEditSpace && toggleBuild()}
            onOpenSettings={() => setIsSettingsOpen(true)}
            meetingMode={viewMode === 'grid'}
            onToggleMeetingMode={() => setViewMode(prev => prev === 'grid' ? 'map' : 'grid')}
            onChooseEmoji={handleReaction}
            presenceStatus={presenceStatus}
            onStatusChange={handleStatusChange}
            onOpenShortcuts={() => setShowShortcuts(true)}
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
          setMicOn={handleMicChange}
          camOn={camOn}
          setCamOn={handleCamChange}
          onDevicePreferenceChange={handleDevicePreferenceChange}
          notificationPreferences={notificationPrefs}
          onNotificationPreferenceChange={handleNotificationPreferenceChange}
          spaceId={spaceId}
          currentUserRole={currentUserRole}
          canManageMembers={currentUserRole === 'Owner' || currentUserRole === 'Admin'}
        />
    </div>
  );
}
