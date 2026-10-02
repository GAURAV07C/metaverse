export interface MediaParticipant {
  id: string;
  name: string;
  stream?: MediaStream;
  avatarUrl?: string;
  isMe?: boolean;
}

export interface ScreenShareTile {
  id: string;
  name: string;
  stream: MediaStream;
}

export interface FullScreenTile {
  id: string;
  name: string;
  stream?: MediaStream;
  avatarUrl?: string;
  isScreen?: boolean;
}
