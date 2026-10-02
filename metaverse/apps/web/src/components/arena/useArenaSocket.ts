import { useEffect } from 'react';
import type React from 'react';
import { MediasoupClient } from '../../utils/mediasoupClient';
import { WsClient } from '../../utils/ws';
import { normalizeAssetUrl } from './arenaHelpers';
import type { ArenaToast } from './useArenaToasts';
import type { InviteHistoryItem, ModerationHistoryItem, OtherUser, RoomInvite } from './types';

type PushToast = (toast: Omit<ArenaToast, 'id'> & { category?: 'joins' | 'chat' | 'roomInvites' | 'system' }) => void;

interface UseArenaSocketInput {
  spaceId?: string;
  token?: string | null;
  hasJoined: boolean;
  myUserId?: string | null;
  storedAvatarUrl?: string | null;
  wsRef: React.MutableRefObject<WsClient | null>;
  msRef: React.MutableRefObject<MediasoupClient | null>;
  activeTabRef: React.MutableRefObject<'users' | 'chat'>;
  showUsersRef: React.MutableRefObject<boolean>;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setMediaReady: (ready: boolean) => void;
  setMyPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setOtherUsers: React.Dispatch<React.SetStateAction<OtherUser[]>>;
  setMyAvatarUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setMessages: React.Dispatch<React.SetStateAction<{ username: string; message: string; time: string; scope?: string }[]>>;
  setSelectedUserId: React.Dispatch<React.SetStateAction<string | null>>;
  setProximityUsers: React.Dispatch<React.SetStateAction<string[]>>;
  setUnreadChatCount: React.Dispatch<React.SetStateAction<number>>;
  setRoomInvites: React.Dispatch<React.SetStateAction<RoomInvite[]>>;
  setReactions: React.Dispatch<React.SetStateAction<Record<string, { emoji: string; expiresAt: number }>>>;
  setStreams: React.Dispatch<React.SetStateAction<Record<string, MediaStream>>>;
  setScreenStreams: React.Dispatch<React.SetStateAction<Record<string, MediaStream>>>;
  pushToast: PushToast;
  playInviteRing: () => void;
  recordInviteHistory: (item: Omit<InviteHistoryItem, 'updatedAt'>) => void;
  recordModerationHistory: (item: Omit<ModerationHistoryItem, 'id' | 'createdAt'> & { id?: string }) => void;
  cleanupMedia: () => void;
  stopMicrophone: () => Promise<void>;
  stopCamera: () => Promise<void>;
  stopScreenShare: () => Promise<boolean>;
}

export function useArenaSocket({
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
}: UseArenaSocketInput) {
  useEffect(() => {
    if (!spaceId || !token || !hasJoined) return;

    const ws = new WsClient(spaceId, token);
    wsRef.current = ws;

    const ms = new MediasoupClient(ws);
    msRef.current = ms;
    setConnected(false);
    setMediaReady(false);

    ms.onNewConsumer = (consumer, userId, appData) => {
      const isScreenMedia = appData?.type === 'screen' || appData?.type === 'screen-audio';
      const setter = isScreenMedia ? setScreenStreams : setStreams;
      setter(prev => {
        const existing = prev[userId] || new MediaStream();
        existing.addTrack(consumer.track);
        return { ...prev, [userId]: existing };
      });
    };

    const unsubConnection = ws.onConnectionChange((isSocketOpen) => {
      if (!isSocketOpen) setConnected(false);
    });

    const unsub = ws.onMessage(async (msg: any) => {
      switch (msg.type) {
        case 'space-joined':
          setConnected(true);
          handleSpaceJoined(msg, ws, ms);
          break;
        case 'join-error':
          setConnected(false);
          pushToast({
            title: 'Realtime join failed',
            detail: msg.payload?.message || 'The realtime server rejected this session.',
            kind: 'warning',
            category: 'system',
          });
          break;
        case 'user-joined':
          handleUserJoined(msg);
          break;
        case 'user-left':
          handleUserLeft(msg);
          break;
        case 'proximity-entered':
          setProximityUsers(prev => prev.includes(msg.payload.userId) ? prev : [...prev, msg.payload.userId]);
          break;
        case 'proximity-left':
          setProximityUsers(prev => prev.filter(id => id !== msg.payload.userId));
          msRef.current?.closeConsumersByUserId(msg.payload.userId);
          removeUserMedia(msg.payload.userId);
          break;
        case 'chat-receive':
          handleChatReceive(msg);
          break;
        case 'room-invite-receive':
          handleRoomInviteReceive(msg);
          break;
        case 'room-invite-response':
          handleRoomInviteResponse(msg);
          break;
        case 'moderation-request':
          await handleModerationRequest(msg);
          break;
        case 'moderation-response':
          handleModerationResponse(msg);
          break;
        case 'reaction-receive':
          handleReactionReceive(msg);
          break;
        case 'status-update':
          setOtherUsers(prev => prev.map(user => user.userId === msg.payload.userId ? { ...user, status: msg.payload.status } : user));
          break;
        case 'movement':
          setOtherUsers(prev => prev.map(user => user.userId === msg.payload.userId ? { ...user, x: msg.payload.x, y: msg.payload.y } : user));
          break;
        case 'movement-rejected':
          setMyPos({ x: msg.payload.x, y: msg.payload.y });
          if (msg.payload.reason === 'room-full') {
            pushToast({ title: 'Room is full', detail: 'All spots in that room are already taken.', kind: 'warning', category: 'system' });
          } else if (msg.payload.reason === 'spot-occupied') {
            pushToast({ title: 'Spot is occupied', detail: 'Choose another available spot in this room.', kind: 'warning', category: 'system' });
          }
          break;
      }
    });

    ws.connect();
    return () => {
      unsub();
      unsubConnection();
      ws.disconnect();
      setConnected(false);
      cleanupMedia();
    };

    function handleSpaceJoined(msg: any, ws: WsClient, ms: MediasoupClient) {
      let targetX = msg.payload.spawn.x;
      let targetY = msg.payload.spawn.y;
      const savedPosStr = localStorage.getItem(`metaverse_pos_${spaceId}`);
      const urlParams = new URL(window.location.href).searchParams;
      const rawPortalX = urlParams.get('x');
      const rawPortalY = urlParams.get('y');
      const portalX = rawPortalX === null ? NaN : Number(rawPortalX);
      const portalY = rawPortalY === null ? NaN : Number(rawPortalY);

      if (Number.isInteger(portalX) && Number.isInteger(portalY)) {
        targetX = portalX;
        targetY = portalY;
        ws.send({ type: 'teleport', payload: { x: targetX, y: targetY } });
      } else if (savedPosStr) {
        try {
          const parsed = JSON.parse(savedPosStr);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            targetX = parsed.x;
            targetY = parsed.y;
            ws.send({ type: 'teleport', payload: { x: targetX, y: targetY } });
          }
        } catch (error) {
          console.error(error);
        }
      }

      setMyPos({ x: targetX, y: targetY });
      setOtherUsers((msg.payload.users ?? [])
        .filter((user: any) => (user.userId || user.id) !== msg.payload.userId)
        .map((user: any) => ({
          userId: user.userId || user.id || '',
          username: user.username || 'User',
          x: user.x,
          y: user.y,
          avatarUrl: normalizeAssetUrl(user.avatarUrl) || undefined,
          status: user.status || 'available',
        })));
      setMyAvatarUrl(normalizeAssetUrl(msg.payload.avatarUrl) || normalizeAssetUrl(storedAvatarUrl));

      if (msg.payload.chatHistory) {
        setMessages(msg.payload.chatHistory.map((chat: any) => ({
          username: chat.username || 'Unknown',
          message: chat.message,
          time: new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          scope: chat.scope || 'everyone',
        })));
      }

      ms.init()
        .then(() => setMediaReady(true))
        .catch((error) => {
          console.error('Mediasoup init failed', error);
          setMediaReady(false);
          pushToast({ title: 'Media is unavailable', detail: 'Audio, video, and screen share could not initialize.', kind: 'warning', category: 'system' });
        });
    }

    function handleUserJoined(msg: any) {
      if (!msg.payload.userId || msg.payload.userId === myUserId) return;

      const joinedName = msg.payload.username || 'User';
      setOtherUsers(prev => {
        if (prev.some(user => user.userId === msg.payload.userId)) return prev;
        return [...prev, {
          userId: msg.payload.userId || '',
          username: joinedName,
          x: msg.payload.x,
          y: msg.payload.y,
          avatarUrl: normalizeAssetUrl(msg.payload.avatarUrl) || undefined,
          status: msg.payload.status || 'available',
        }];
      });
      pushToast({ title: `${joinedName} joined`, detail: 'They are now in this office.', kind: 'success', category: 'joins' });
    }

    function handleUserLeft(msg: any) {
      setOtherUsers(prev => {
        const leavingUser = prev.find(user => user.userId === msg.payload.userId);
        if (leavingUser) pushToast({ title: `${leavingUser.username} left`, detail: 'They disconnected from the office.', category: 'joins' });
        return prev.filter(user => user.userId !== msg.payload.userId);
      });
      setSelectedUserId(prev => prev === msg.payload.userId ? null : prev);
      setProximityUsers(prev => prev.filter(id => id !== msg.payload.userId));
      removeUserMedia(msg.payload.userId);
    }

    function removeUserMedia(userId: string) {
      setStreams(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setScreenStreams(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }

    function handleChatReceive(msg: any) {
      if (msg.payload.isRing) {
        playInviteRing();
        pushToast({ title: 'Incoming Ring', detail: `${msg.payload.username || 'Someone'} is ringing you!`, kind: 'info', category: 'system' });
        return;
      }
      if (!(showUsersRef.current && activeTabRef.current === 'chat')) {
        setUnreadChatCount(count => count + 1);
      }
      pushToast({
        title: msg.payload.scope === 'dm' ? `DM from ${msg.payload.username}` : `${msg.payload.username} sent a message`,
        detail: msg.payload.message,
        kind: msg.payload.scope === 'dm' ? 'warning' : 'info',
        category: 'chat',
      });
      setMessages(prev => [...prev, {
        username: msg.payload.username,
        message: msg.payload.message,
        scope: msg.payload.scope,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }

    function handleRoomInviteReceive(msg: any) {
      const inviteId = `${msg.payload.roomId}-${msg.payload.fromUserId || msg.payload.fromUsername || 'user'}-${Date.now()}`;
      const invite: RoomInvite = {
        id: inviteId,
        inviteId: msg.payload.inviteId,
        fromUserId: msg.payload.fromUserId,
        fromUsername: msg.payload.fromUsername || 'Someone',
        roomId: msg.payload.roomId,
        roomName: msg.payload.roomName || 'their room',
        expiresAt: Date.now() + 30000,
      };

      recordInviteHistory({
        id: msg.payload.inviteId || inviteId,
        direction: 'incoming',
        status: 'received',
        fromUsername: invite.fromUsername,
        roomId: invite.roomId,
        roomName: invite.roomName,
        createdAt: Date.now(),
      });
      setRoomInvites(prev => [invite, ...prev.filter(item => item.roomId !== invite.roomId || item.fromUserId !== invite.fromUserId)].slice(0, 3));
      window.setTimeout(() => expireInvite(inviteId), 30000);
      playInviteRing();
      pushToast({
        title: `${invite.fromUsername} invited you`,
        detail: `Accept from the invite card to join ${invite.roomName}.`,
        kind: 'warning',
        category: 'roomInvites',
      });

      if (!(showUsersRef.current && activeTabRef.current === 'chat')) {
        setUnreadChatCount(count => count + 1);
      }
      setMessages(prev => [...prev, {
        username: msg.payload.fromUsername || 'Invite',
        message: `invited you to ${msg.payload.roomName || 'a room'}`,
        scope: 'dm',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }

    function expireInvite(inviteId: string) {
      setRoomInvites(prev => {
        const existing = prev.find(item => item.id === inviteId);
        if (existing) {
          recordInviteHistory({
            id: existing.inviteId || existing.id,
            direction: 'incoming',
            status: 'expired',
            fromUsername: existing.fromUsername,
            roomId: existing.roomId,
            roomName: existing.roomName,
            createdAt: Date.now(),
          });
        }
        return prev.filter(item => item.id !== inviteId);
      });
    }

    function handleRoomInviteResponse(msg: any) {
      recordInviteHistory({
        id: msg.payload.inviteId || `${msg.payload.roomId || 'room'}-${msg.payload.fromUserId || msg.payload.fromUsername || 'user'}-${Date.now()}`,
        direction: 'outgoing',
        status: msg.payload.response === 'accepted' ? 'accepted' : 'declined',
        toUsername: msg.payload.fromUsername || 'Someone',
        roomId: msg.payload.roomId || 'room',
        roomName: msg.payload.roomName || 'Room',
        createdAt: Date.now(),
      });
      pushToast({
        title: `${msg.payload.fromUsername || 'Someone'} ${msg.payload.response} your invite`,
        detail: `${msg.payload.roomName || 'Room'} invite ${msg.payload.response}.`,
        kind: msg.payload.response === 'accepted' ? 'success' : 'info',
        category: 'roomInvites',
      });
      setMessages(prev => [...prev, {
        username: msg.payload.fromUsername || 'Invite',
        message: `${msg.payload.response} your invite to ${msg.payload.roomName || 'a room'}`,
        scope: 'dm',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }

    async function handleModerationRequest(msg: any) {
      const action = msg.payload.action;
      const requester = msg.payload.fromUsername || 'Host';
      let accepted = true;

      if (action === 'mute-audio') {
        void stopMicrophone();
        pushToast({ title: `${requester} muted your mic`, detail: 'Host moderation turned your microphone off.', kind: 'warning', category: 'system' });
      } else if (action === 'stop-video') {
        void stopCamera();
        pushToast({ title: `${requester} stopped your camera`, detail: 'Host moderation turned your camera off.', kind: 'warning', category: 'system' });
      } else if (action === 'stop-screen') {
        accepted = await stopScreenShare();
        pushToast({ title: `${requester} stopped your screen share`, detail: accepted ? 'Host moderation stopped your presentation.' : 'No active screen share was running.', kind: 'warning', category: 'system' });
      }

      wsRef.current?.sendModerationResponse(action, accepted, msg.payload.fromUserId);
    }

    function handleModerationResponse(msg: any) {
      recordModerationHistory({
        id: `${msg.payload.action}-${msg.payload.targetUserId || msg.payload.targetUsername}-${msg.payload.timestamp}`,
        action: msg.payload.action,
        targetUserId: msg.payload.targetUserId,
        targetUsername: msg.payload.targetUsername || 'Participant',
        status: msg.payload.accepted ? 'applied' : 'failed',
      });
      pushToast({
        title: `${msg.payload.targetUsername || 'Participant'} ${msg.payload.accepted ? 'applied' : 'could not apply'} host action`,
        detail: msg.payload.action.replace('-', ' '),
        kind: msg.payload.accepted ? 'success' : 'warning',
        category: 'system',
      });
    }

    function handleReactionReceive(msg: any) {
      setReactions(prev => ({
        ...prev,
        [msg.payload.userId]: {
          emoji: msg.payload.emoji,
          expiresAt: Date.now() + 2400,
        },
      }));
      window.setTimeout(() => {
        setReactions(prev => {
          const existing = prev[msg.payload.userId];
          if (!existing || existing.expiresAt > Date.now()) return prev;
          const next = { ...prev };
          delete next[msg.payload.userId];
          return next;
        });
      }, 2600);
    }
  }, [
    activeTabRef,
    cleanupMedia,
    hasJoined,
    msRef,
    myUserId,
    playInviteRing,
    pushToast,
    recordInviteHistory,
    recordModerationHistory,
    setConnected,
    setMediaReady,
    setMessages,
    setMyAvatarUrl,
    setMyPos,
    setOtherUsers,
    setProximityUsers,
    setReactions,
    setRoomInvites,
    setScreenStreams,
    setSelectedUserId,
    setStreams,
    setUnreadChatCount,
    showUsersRef,
    spaceId,
    stopCamera,
    stopMicrophone,
    stopScreenShare,
    storedAvatarUrl,
    token,
    wsRef,
  ]);
}
