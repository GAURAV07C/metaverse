import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store';
import { useArenaStore } from '../stores/arenaStore';
import type { WsClient } from '../utils/ws';
import type { MediasoupClient } from '../utils/mediasoupClient';
import type { SpaceElement } from './arena/ElementsPanel';
import { PrejoinScreen } from './arena/PrejoinScreen';
import { ArenaChrome } from './arena/ArenaChrome';
import { ArenaStage } from './arena/ArenaStage';
import { MediaDiagnosticsPanel } from './arena/MediaDiagnosticsPanel';
import { useArenaRooms } from './arena/useArenaRooms';
import { useInviteLinks } from './arena/useInviteLinks';
import { useArenaToasts } from './arena/useArenaToasts';
import { useArenaMedia } from './arena/useArenaMedia';
import { useArenaSocket } from './arena/useArenaSocket';
import { useArenaMovement } from './arena/useArenaMovement';
import { useArenaComms } from './arena/useArenaComms';
import { useArenaNavigation } from './arena/useArenaNavigation';
import { useArenaBuilder } from './arena/useArenaBuilder';
import { useArenaNotificationState } from './arena/useArenaNotificationState';
import { useArenaSpaceState } from './arena/useArenaSpaceState';
import { useAvailableAssetsQuery, useInviteEventsQuery, useModerationAuditQuery, useNotificationPreferencesQuery } from './arena/queries';
import type { ChatScope, GroupLead, NotificationPrefs, OtherUser, PresenceStatus, RoomInvite, RoomSession } from './arena/types';
export type { InviteHistoryItem, ModerationHistoryItem, OtherUser } from './arena/types';
import { DEFAULT_NOTIFICATION_PREFS } from './arena/arenaStorage';
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
  const [roomSessions, setRoomSessions] = useState<RoomSession[]>([]);
  const [groupLead, setGroupLead] = useState<GroupLead>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [showMediaDiagnostics, setShowMediaDiagnostics] = useState(false);

  const [hasJoined, setHasJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [messages, setMessages] = useState<{ username: string; message: string; time: string; scope?: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatScope, setChatScope] = useState<ChatScope>('everyone');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [reactions, setReactions] = useState<Record<string, { emoji: string; expiresAt: number }>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [promptInteraction, setPromptInteraction] = useState<any>(null);
  const [activeInteraction, setActiveInteraction] = useState<any>(null);
  const activeTabRef = useRef(activeTab);
  const showUsersRef = useRef(showUsers);
  const notificationPrefsRef = useRef<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const presenceStatusRef = useRef<PresenceStatus>('available');
  const {
    elements,
    privateZones,
    dimensions,
    setDimensions,
    spaceName,
    canEditSpace,
    currentUserRole,
    presenceStatus,
    fetchSpace,
    handleStatusChange,
  } = useArenaSpaceState({ spaceId, myUserId, wsRef });
  const availableAssetsQuery = useAvailableAssetsQuery();
  const notificationPreferencesQuery = useNotificationPreferencesQuery(spaceId);
  const inviteEventsQuery = useInviteEventsQuery(spaceId);
  const moderationAuditQuery = useModerationAuditQuery(spaceId, canEditSpace);

  useEffect(() => {
    activeTabRef.current = activeTab;
    showUsersRef.current = showUsers;
  }, [activeTab, showUsers]);

  const { copied, copiedRoomId, buildRoomUrl, handleCopyInvite, handleCopyRoomLink } = useInviteLinks();

  const liveTileSize = 32;

  const {
    autoPath,
    setAutoPath,
    panOffset,
    setPanOffset,
    followingUserId,
    followedUser,
    stopFollowing,
    moveToTile,
    teleportToTile,
    handleLocateOtherUser,
    handleFollowOtherUser,
  } = useArenaMovement({
    spaceId,
    connected,
    myPos,
    dimensions,
    elements,
    otherUsers,
    wsRef,
    setMyPos,
    liveTileSize,
  });

  const selectedUser = selectedUserId ? otherUsers.find(u => u.userId === selectedUserId) : null;
  const { toasts, pushToast, dismissToast } = useArenaToasts(notificationPrefsRef, presenceStatusRef);
  const {
    notificationPrefs,
    isBrowserOnline,
    inviteHistory,
    moderationHistory,
    inviteTick,
    playInviteRing,
    recordInviteHistory,
    recordModerationHistory,
    handleNotificationPreferenceChange,
  } = useArenaNotificationState({
    spaceId,
    connected,
    presenceStatus,
    roomInvites,
    setRoomInvites,
    inviteEvents: inviteEventsQuery.data,
    moderationAudit: moderationAuditQuery.data,
    notificationPreferences: notificationPreferencesQuery.data,
    notificationPrefsRef,
    presenceStatusRef,
    pushToast,
  });
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
    getMediaDiagnostics,
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

  const {
    availableElements,
    roomPrefabs,
    addingElement,
    setAddingElement,
    builderMode,
    setBuilderMode,
    addX,
    setAddX,
    addY,
    setAddY,
    panelLoading,
    panelMsg,
    hiddenElementIds,
    toggleHideElement,
    closeBuild,
    toggleBuild,
    handleUpdateDimensions,
    handleAddElementAt,
    handleAddElement,
    handleStampPrefab,
    handleRemoveElement,
  } = useArenaBuilder({
    spaceId,
    showPanel,
    setShowPanel,
    setDimensions,
    fetchSpace,
    refetchAvailableAssets: availableAssetsQuery.refetch,
    setShowUsers,
  });

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
    notificationPrefsRef,
    presenceStatusRef,
    setConnected,
    setMediaReady,
    setMyPos,
    setOtherUsers,
    setMyAvatarUrl,
    setMessages,
    setSelectedUserId,
    setProximityUsers,
    setRoomSessions,
    setGroupLead,
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
    roomSessions,
  });
  const {
    usePortal,
    chooseSpot,
    leaveRoom,
    joinRoom,
  } = useArenaNavigation({
    connected,
    privateZones,
    otherUsers,
    myPos,
    dimensions,
    currentRoom,
    currentPortal,
    chatScope,
    setChatScope,
    setViewMode,
    getRoomSpots,
    isTileInZone,
    isSpotOccupied,
    findWalkableTileInZone,
    moveToTile,
    teleportToTile,
  });

  const {
    handleSendChat,
    inviteUserToCurrentRoom,
    acceptRoomInvite,
    declineRoomInvite,
    messageUser,
    requestModerationAction,
    requestModerationAll,
    handleReaction,
  } = useArenaComms({
    myStoredUsername,
    canEditSpace,
    chatInput,
    chatScope,
    currentRoom,
    otherUsers,
    proximityUsers,
    wsRef,
    setActiveTab,
    setShowUsers,
    setChatInput,
    setChatScope,
    setMessages,
    setRoomInvites,
    setUnreadChatCount,
    setReactions,
    pushToast,
    buildRoomUrl,
    joinRoom,
    closeBuild,
    recordInviteHistory,
    recordModerationHistory,
  });

  const toggleSidebar = (tab: 'users' | 'chat') => {
    toggleArenaSidebar(tab);
    if (tab === 'chat') setUnreadChatCount(0);
    closeBuild();
  };

  useEffect(() => {
    if (showUsers && activeTab === 'chat') setUnreadChatCount(0);
  }, [showUsers, activeTab]);

  // MapCanvas listens for window resize; panel layout changes also need a redraw.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [showUsers]);

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
        <ArenaChrome
          spaceRail={{
            spaceName,
            showUsers,
            activeTab,
            canEditSpace,
            unreadChatCount,
            onOpenOfficeMenu: () => setShowOfficeMenu(prev => !prev),
            onSearchPeople: () => {
              setActiveTab('users');
              setShowUsers(true);
              requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.people-search input')?.focus());
            },
            onToggleSidebar: toggleSidebar,
            onEditOffice: () => canEditSpace && navigate(`/studio/${spaceId}`),
            onLeaveSpace: () => navigate('/dashboard'),
            onOpenSettings: () => setIsSettingsOpen(true),
          }}
          officeMenu={{
            open: showOfficeMenu,
            spaceName,
            currentUserRole,
            canEditSpace,
            onCopyInvite: handleCopyInvite,
            onOpenSettings: () => { setIsSettingsOpen(true); setShowOfficeMenu(false); },
            onDecorateDesk: () => { if (!canEditSpace) return; toggleBuild(); setShowOfficeMenu(false); },
            onOpenDeskManager: () => navigate(`/desk-manager/${spaceId}`),
            onEditOffice: () => canEditSpace && navigate(`/studio/${spaceId}`),
            onGoToLobby: () => navigate('/dashboard'),
            onLeaveOffice: () => navigate('/dashboard'),
          }}
          sidebar={{
            spaceName,
            showUsers,
            onToggleSidebar: () => setShowUsers(prev => !prev),
            activeTab,
            setActiveTab,
            otherUsers,
            myStoredUsername,
            myAvatarUrl: myAvatarUrl || undefined,
            connected,
            handleLocateUser: handleLocateOtherUser,
            handleFollowUser: handleFollowOtherUser,
            followingUserId,
            handleCopyInvite,
            copied,
            messages,
            inviteHistory,
            chatInput,
            setChatInput,
            handleSendChat,
            chatScope,
            setChatScope,
            currentRoom: currentRoom || null,
            allRooms,
            activeRooms,
            onJoinRoom: joinRoom,
            onCopyRoomLink: handleCopyRoomLink,
            copiedRoomId,
            onOpenMeetingMode: () => setViewMode('grid'),
            myStatus: presenceStatus,
            unreadChatCount,
          }}
        />

        <ArenaStage
          topBar={{
            spaceName,
            connected,
            copied,
            canEditSpace,
            otherUsers,
            followedUser,
            currentMapZone,
            onOpenOfficeMenu: () => setShowOfficeMenu(prev => !prev),
            onCopyInvite: handleCopyInvite,
            onEditMap: () => navigate(`/studio/${spaceId}`),
            onOpenUsers: () => toggleSidebar('users'),
            onStopFollowing: stopFollowing,
            onOpenMeetingMode: () => setViewMode('grid'),
          }}
          overlays={{
            connectionBanner: {
              connected,
              isBrowserOnline,
              enabled: notificationPrefs.reconnecting,
            },
            selectedUserCard: {
              user: selectedUser || null,
              roomName: selectedUserRoom?.name || null,
              currentRoomAvailable: Boolean(currentRoom),
              followingUserId,
              onClose: () => setSelectedUserId(null),
              onMessage: messageUser,
              onFollow: handleFollowOtherUser,
              onLocate: handleLocateOtherUser,
              onInviteRoom: inviteUserToCurrentRoom,
              onRing: (user) => {
                wsRef.current?.sendChat('', { scope: 'dm', targetUserId: user.userId, isRing: true });
                pushToast({ title: `Ringing ${user.username}...`, kind: 'info', category: 'system' });
                setSelectedUserId(null);
              },
            },
            notifications: {
              roomInvites,
              inviteTick,
              toasts,
              onAcceptInvite: acceptRoomInvite,
              onDeclineInvite: declineRoomInvite,
              onDismissToast: dismissToast,
            },
            shortcuts: {
              open: showShortcuts,
              onClose: () => setShowShortcuts(false),
            },
            rightStack: {
              dimensions,
              myPos,
              otherUsers,
              elements,
              privateZones,
              currentRoom,
              currentSpotlight,
              roomSpots,
              onLocateUser: handleLocateUser,
              onOpenMeetingMode: () => setViewMode('grid'),
              onLeaveRoom: leaveRoom,
              isSpotOccupied,
              onChooseSpot: chooseSpot,
            },
            videoOverlay: {
              proximityUsers: mediaGroupUserIds,
              otherUsers,
              streams,
              screenStreams,
              myStoredUsername,
              myAvatarUrl: myAvatarUrl || undefined,
              micOn,
              camOn,
              viewMode,
              currentZone: currentRoom ? { id: currentRoom.id || 'zone1', name: currentRoom.name || 'Room' } : null,
              onLeaveZone: leaveRoom,
              onViewModeChange: setViewMode,
              canHost: canEditSpace,
              isScreenSharing,
              onMuteSelf: () => handleMicChange(false),
              onStopScreenShare: isScreenSharing ? handleScreenShare : undefined,
              onModerationAction: requestModerationAction,
              onModerationAll: requestModerationAll,
              moderationHistory,
            },
            interactionLayer: {
              promptInteraction,
              activeInteraction,
              setActiveInteraction,
            },
            portalPrompt: {
              currentPortal,
              activeInteraction,
              onUsePortal: usePortal,
            },
          }}
          mapCanvas={{
            canvasRef,
            wrapperRef,
            dimensions,
            myPos,
            cameraTarget: followedUser ? { x: followedUser.x, y: followedUser.y } : myPos,
            otherUsers,
            proximityUsers: mediaGroupUserIds,
            elements,
            hiddenElementIds,
            privateZones,
            zoom,
            setZoom,
            myAvatarUrl,
            myUsername: myStoredUsername,
            autoPath,
            setAutoPath,
            handleLocateUser,
            panOffset,
            setPanOffset,
            onDropElement: handleAddElementAt,
            addingElement,
            builderMode,
            onRemoveElement: handleRemoveElement,
            reactions,
            onSelectUser: setSelectedUserId,
            onManualControl: stopFollowing,
          }}
          actionToolbar={{
            myStoredUsername,
            onLeaveSpace: () => navigate('/dashboard'),
            micOn,
            setMicOn: handleMicChange,
            camOn,
            setCamOn: handleCamChange,
            isScreenSharing,
            handleScreenShare,
            canBuild: canEditSpace,
            showPanel,
            onToggleBuild: () => canEditSpace && toggleBuild(),
            onOpenSettings: () => setIsSettingsOpen(true),
            meetingMode: viewMode === 'grid',
            onToggleMeetingMode: () => setViewMode(prev => prev === 'grid' ? 'map' : 'grid'),
            onChooseEmoji: handleReaction,
            presenceStatus,
            onStatusChange: handleStatusChange,
            onOpenShortcuts: () => setShowShortcuts(true),
            onOpenDiagnostics: () => setShowMediaDiagnostics(true),
            groupLead,
            myUserId: myUserId || undefined,
            onToggleLead: () => {
              if (groupLead?.userId && groupLead.userId !== myUserId) {
                handleFollowOtherUser(groupLead.userId);
                return;
              }
              wsRef.current?.setGroupLead(groupLead?.userId === myUserId ? false : true);
            },
          }}
          panels={{
            elementsPanel: {
            showPanel,
            setShowPanel: open => { if (!open) closeBuild(); else setShowPanel(true); },
            panelMsg,
            addingElement,
            setAddingElement,
            builderMode,
            setBuilderMode,
            availableElements,
            roomPrefabs,
            elements,
            addX,
            setAddX,
            addY,
            setAddY,
            panelLoading,
            handleAddElement,
            handleRemoveElement,
            dimensions,
            hiddenElementIds,
            toggleHideElement,
            handleUpdateDimensions,
            handleStampPrefab,
            },
            settingsModal: {
            isOpen: isSettingsOpen,
            onClose: () => setIsSettingsOpen(false),
            myStoredUsername,
            myAvatarUrl: myAvatarUrl || undefined,
            micOn,
            setMicOn: handleMicChange,
            camOn,
            setCamOn: handleCamChange,
            onDevicePreferenceChange: handleDevicePreferenceChange,
            notificationPreferences: notificationPrefs,
            onNotificationPreferenceChange: handleNotificationPreferenceChange,
            spaceId,
            currentUserRole,
            canManageMembers: currentUserRole === 'Owner' || currentUserRole === 'Admin',
            },
          }}
        />
        <MediaDiagnosticsPanel
          open={showMediaDiagnostics}
          onClose={() => setShowMediaDiagnostics(false)}
          getDiagnostics={getMediaDiagnostics}
          storageKey={`metaverse_media_quality_${spaceId || 'space'}`}
        />
    </div>
  );
}
