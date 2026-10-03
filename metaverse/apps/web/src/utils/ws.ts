const getDefaultWsUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalHost) return 'ws://localhost:3001';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};

const configuredWsUrl = ((import.meta as any).env?.VITE_APP_WS_URL as string | undefined)?.trim();
export const WS_URL = configuredWsUrl || getDefaultWsUrl();

const buildSpaceWsUrl = (baseUrl: string, spaceId: string) => {
  const url = new URL(baseUrl);
  url.searchParams.set('spaceId', spaceId);
  return url.toString();
};

export type WsIncomingMessage =
  | { type: 'space-joined'; payload: { spawn: { x: number; y: number }; userId: string; username?: string; avatarUrl?: string; users: { id: string; userId?: string; username?: string; avatarUrl?: string; status?: 'available' | 'busy' | 'focus' | 'away'; x: number; y: number }[]; chatHistory?: any[] } }
  | { type: 'user-joined'; payload: { userId: string; username?: string; avatarUrl?: string; status?: 'available' | 'busy' | 'focus' | 'away'; x: number; y: number } }
  | { type: 'user-left'; payload: { userId: string } }
  | { type: 'movement'; payload: { userId: string; x: number; y: number } }
  | { type: 'movement-rejected'; payload: { x: number; y: number; reason?: 'blocked' | 'spot-occupied' | 'room-full' | 'too-far' | 'not-in-space' } }
  | { type: 'chat-receive'; payload: { userId?: string; username?: string; message: string; timestamp: string; scope?: 'everyone' | 'nearby' | 'dm' | 'room'; targetUserId?: string; targetUsername?: string; isRing?: boolean } }
  | { type: 'room-invite-receive'; payload: { inviteId?: string; fromUserId?: string; fromUsername?: string; roomId: string; roomName?: string; roomUrl?: string; timestamp: string } }
  | { type: 'room-invite-response'; payload: { inviteId?: string; fromUserId?: string; fromUsername?: string; roomId: string; roomName?: string; response: 'accepted' | 'declined'; timestamp: string } }
  | { type: 'moderation-request'; payload: { action: 'mute-audio' | 'stop-video' | 'stop-screen'; fromUserId?: string; fromUsername?: string; timestamp: string } }
  | { type: 'moderation-response'; payload: { action: 'mute-audio' | 'stop-video' | 'stop-screen'; targetUserId?: string; targetUsername?: string; accepted: boolean; timestamp: string } }
  | { type: 'reaction-receive'; payload: { userId: string; username?: string; emoji: string; timestamp: string } }
  | { type: 'status-update'; payload: { userId: string; username?: string; status: 'available' | 'busy' | 'focus' | 'away'; timestamp: string } }
  | { type: 'proximity-entered'; payload: { userId: string } }
  | { type: 'proximity-left'; payload: { userId: string } }
  | { type: 'webrtc-router-rtp-capabilities'; payload: { rtpCapabilities: any } }
  | { type: 'webrtc-transport-created'; payload: { id: string; iceParameters: any; iceCandidates: any; dtlsParameters: any } }
  | { type: 'webrtc-transport-connected' }
  | { type: 'webrtc-produced'; payload: { id: string } }
  | { type: 'new-producer'; payload: { producerId: string; userId: string; appData: any } }
  | { type: 'producer-closed'; payload: { producerId: string; userId?: string; appData?: any } }
  | { type: 'webrtc-consumed'; payload: { id: string; producerId: string; kind: string; rtpParameters: any } }
  | { type: 'webrtc-consumer-resumed'; payload: { consumerId: string; requestId?: string } }
  | { type: 'join-error'; payload: { reason: string; message: string; redirectUrl?: string; ownerInstanceId?: string } }
  | { type: 'webrtc-error'; payload: { message: string; requestId?: string } };

export class WsClient {
  private ws: WebSocket | null = null;
  private listeners: ((msg: WsIncomingMessage) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private token: string;
  private spaceId: string;
  private shouldReconnect = true;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private redirectUrl: string | null = null;

  constructor(spaceId: string, token: string) {
    this.spaceId = spaceId;
    this.token = token;
  }

  connect() {
    this.shouldReconnect = true;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const url = buildSpaceWsUrl(this.redirectUrl || WS_URL, this.spaceId);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.connectionListeners.forEach((cb) => cb(true));
      this.send({ type: 'join', payload: { spaceId: this.spaceId, token: this.token } });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsIncomingMessage;
        if (msg.type === 'join-error') {
          console.error('WS join failed', { url, reason: msg.payload.reason, message: msg.payload.message });
          if (msg.payload.reason === 'sfu-owned-by-other-instance' && msg.payload.redirectUrl) {
            this.redirectUrl = msg.payload.redirectUrl;
          }
        }
        this.listeners.forEach((cb) => cb(msg));
      } catch {}
    };

    this.ws.onerror = (err) => {
      if (this.shouldReconnect) console.error('WS error', { url, error: err });
    };
    this.ws.onclose = (event) => {
      console.log('WS disconnected', { url, code: event.code, reason: event.reason });
      this.ws = null;
      this.connectionListeners.forEach((cb) => cb(false));
      if (!this.shouldReconnect) return;
      const delay = Math.min(5000, 500 * Math.pow(1.6, this.reconnectAttempts));
      this.reconnectAttempts += 1;
      this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
    };
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  move(x: number, y: number) {
    this.send({ type: 'move', payload: { x, y } });
  }

  teleport(x: number, y: number) {
    this.send({ type: 'teleport', payload: { x, y } });
  }

  sendChat(message: string, meta?: { scope?: 'everyone' | 'nearby' | 'dm' | 'room'; targetUserId?: string; targetUsername?: string; isRing?: boolean }) {
    this.send({ type: 'chat-message', payload: { message, ...meta } });
  }

  sendRoomInvite(targetUserId: string, room: { id: string; name?: string; url?: string }) {
    this.send({ type: 'room-invite-send', payload: { targetUserId, roomId: room.id, roomName: room.name, roomUrl: room.url } });
  }

  respondToRoomInvite(invite: { inviteId?: string; targetUserId?: string; roomId: string; roomName?: string; response: 'accepted' | 'declined' }) {
    this.send({ type: 'room-invite-respond', payload: invite });
  }

  sendModerationRequest(targetUserId: string, action: 'mute-audio' | 'stop-video' | 'stop-screen') {
    this.send({ type: 'moderation-request', payload: { targetUserId, action } });
  }

  sendModerationResponse(action: 'mute-audio' | 'stop-video' | 'stop-screen', accepted: boolean, requesterId?: string) {
    this.send({ type: 'moderation-response', payload: { action, accepted, requesterId } });
  }

  sendReaction(emoji: string) {
    this.send({ type: 'reaction-send', payload: { emoji } });
  }

  setStatus(status: 'available' | 'busy' | 'focus' | 'away') {
    this.send({ type: 'status-set', payload: { status } });
  }

  onMessage(cb: (msg: WsIncomingMessage) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  onConnectionChange(cb: (connected: boolean) => void) {
    this.connectionListeners.push(cb);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((listener) => listener !== cb);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const socket = this.ws;
      socket.onerror = null;
      socket.onmessage = null;
      socket.onclose = null;
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.onopen = () => socket.close();
      } else {
        socket.close();
      }
    }
    this.ws = null;
  }
}
