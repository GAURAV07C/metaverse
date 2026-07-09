export const WS_URL = (import.meta as any).env?.VITE_APP_WS_URL ?? 'ws://localhost:3001';

export type WsIncomingMessage =
  | { type: 'space-joined'; payload: { spawn: { x: number; y: number }; userId: string; username?: string; avatarUrl?: string; users: { id: string; userId?: string; username?: string; avatarUrl?: string; x: number; y: number }[] } }
  | { type: 'user-joined'; payload: { userId: string; username?: string; avatarUrl?: string; x: number; y: number } }
  | { type: 'user-left'; payload: { userId: string } }
  | { type: 'movement'; payload: { userId: string; x: number; y: number } }
  | { type: 'movement-rejected'; payload: { x: number; y: number } };

export class WsClient {
  private ws: WebSocket | null = null;
  private listeners: ((msg: WsIncomingMessage) => void)[] = [];
  private token: string;
  private spaceId: string;

  constructor(spaceId: string, token: string) {
    this.spaceId = spaceId;
    this.token = token;
  }

  connect() {
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.send({ type: 'join', payload: { spaceId: this.spaceId, token: this.token } });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsIncomingMessage;
        this.listeners.forEach((cb) => cb(msg));
      } catch {}
    };

    this.ws.onerror = (err) => console.error('WS error', err);
    this.ws.onclose = () => console.log('WS disconnected');
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  move(x: number, y: number) {
    this.send({ type: 'move', payload: { x, y } });
  }

  onMessage(cb: (msg: WsIncomingMessage) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
