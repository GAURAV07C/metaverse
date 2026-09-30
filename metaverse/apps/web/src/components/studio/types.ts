export interface Prefab {
  title: string;
  kind: string;
  area: string;
  size: string;
  color: string;
  thumb?: string;
  items?: { kind: string; dx: number; dy: number }[];
  variants?: any;
  templateElements?: { elementId: string; x: number; y: number }[];
  templateAreas?: AreaType[];
}

export interface AreaType {
  id: string;
  name: string;
  type?: 'public' | 'room' | 'seat' | 'private' | 'spawn' | 'portal' | 'spotlight';
  floor: string; // hex color or texture id
  color: string; // border/fill color
  texture?: 'solid' | 'grid' | 'checker' | 'stripes' | 'dots' | 'planks' | 'hex' | 'zigzag' | 'tiles'; // type of floor pattern
  targetUrl?: string;
  targetSpaceId?: string;
  targetRoomId?: string;
  targetX?: number;
  targetY?: number;
  x: number;
  y: number;
  w: number;
  h: number;
}
