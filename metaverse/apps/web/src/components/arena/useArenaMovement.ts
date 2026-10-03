import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import type { WsClient } from '../../utils/ws';
import { findPath } from '../../utils/pathfinding';
import type { SpaceElement } from './ElementsPanel';
import type { OtherUser } from './types';

type Tile = { x: number; y: number };

interface UseArenaMovementInput {
  spaceId?: string;
  connected: boolean;
  myPos: Tile;
  dimensions: { w: number; h: number };
  elements: SpaceElement[];
  hiddenElementIds?: string[];
  otherUsers: OtherUser[];
  wsRef: React.MutableRefObject<WsClient | null>;
  setMyPos: React.Dispatch<React.SetStateAction<Tile>>;
  liveTileSize: number;
}

function isElementWalkable(el: SpaceElement) {
  const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''}`.toLowerCase();
  const isWalkableSurface = [
    'room',
    'floor',
    'rug',
    'carpet',
    'tile',
    'wood',
    'grass',
    'ground',
    'path',
    'walkable',
    'area',
  ].some(keyword => text.includes(keyword));

  if (el.element.category === 'Rooms' || isWalkableSurface) {
    return true;
  }

  return (
    text.includes('seating') ||
    text.includes('chair') ||
    text.includes('sofa') ||
    text.includes('couch') ||
    text.includes('bench') ||
    text.includes('stool') ||
    text.includes('seat')
  );
}

export function useArenaMovement({
  spaceId,
  connected,
  myPos,
  dimensions,
  elements,
  hiddenElementIds = [],
  otherUsers,
  wsRef,
  setMyPos,
  liveTileSize,
}: UseArenaMovementInput) {
  const [autoPath, setAutoPath] = useState<Tile[]>([]);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);

  const followedUser = followingUserId ? otherUsers.find(u => u.userId === followingUserId) : null;

  const isWalkableTile = useCallback((x: number, y: number, options?: { allowFollowedUser?: boolean }) => {
    if (x < 0 || y < 0 || x >= dimensions.w || y >= dimensions.h) return false;
    if (options?.allowFollowedUser && followedUser && x === followedUser.x && y === followedUser.y) return true;

    const isCollidingWithElement = elements.some((el) => {
      if (hiddenElementIds.includes(el.id)) return false;
      if (isElementWalkable(el)) return false;
      if (!el.element.static) return false;
      return x >= el.x && x < el.x + el.element.width && y >= el.y && y < el.y + el.element.height;
    });
    if (isCollidingWithElement) return false;

    return !otherUsers.some((u) => u.x === x && u.y === y);
  }, [dimensions.h, dimensions.w, elements, followedUser, hiddenElementIds, otherUsers]);

  const stopFollowing = useCallback(() => {
    setFollowingUserId(null);
  }, []);

  const resetCamera = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const moveToTile = useCallback((x: number, y: number) => {
    setAutoPath([]);
    resetCamera();
    setMyPos({ x, y });
    wsRef.current?.move(x, y);
  }, [resetCamera, setMyPos, wsRef]);

  const teleportToTile = useCallback((x: number, y: number) => {
    setAutoPath([]);
    resetCamera();
    setMyPos({ x, y });
    wsRef.current?.teleport(x, y);
  }, [resetCamera, setMyPos, wsRef]);

  const panCameraToTile = useCallback((x: number, y: number) => {
    setPanOffset({
      x: (x - myPos.x) * liveTileSize,
      y: (y - myPos.y) * liveTileSize,
    });
  }, [liveTileSize, myPos.x, myPos.y]);

  const handleLocateOtherUser = useCallback((x: number, y: number) => {
    setFollowingUserId(null);
    panCameraToTile(x, y);
  }, [panCameraToTile]);

  const handleFollowOtherUser = useCallback((userId: string) => {
    setFollowingUserId(prev => prev === userId ? null : userId);
    resetCamera();
  }, [resetCamera]);

  useEffect(() => {
    if (spaceId) {
      localStorage.setItem(`metaverse_pos_${spaceId}`, JSON.stringify(myPos));
    }
  }, [myPos, spaceId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!connected) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      let nx = myPos.x;
      let ny = myPos.y;
      let moved = false;
      if (e.key === 'ArrowUp' || e.key === 'w') { ny -= 1; moved = true; }
      else if (e.key === 'ArrowDown' || e.key === 's') { ny += 1; moved = true; }
      else if (e.key === 'ArrowLeft' || e.key === 'a') { nx -= 1; moved = true; }
      else if (e.key === 'ArrowRight' || e.key === 'd') { nx += 1; moved = true; }

      if (!moved) return;
      e.preventDefault();
      stopFollowing();
      resetCamera();
      setAutoPath([]);

      if (!isWalkableTile(nx, ny)) return;
      setMyPos({ x: nx, y: ny });
      wsRef.current?.move(nx, ny);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connected, isWalkableTile, myPos.x, myPos.y, resetCamera, setMyPos, stopFollowing, wsRef]);

  useEffect(() => {
    if (autoPath.length === 0) return;

    const interval = window.setInterval(() => {
      setAutoPath(prevPath => {
        if (prevPath.length === 0) return [];
        const nextStep = prevPath[0];
        const newPath = prevPath.slice(1);
        const isCollidingWithUser = otherUsers.some((u) => u.x === nextStep.x && u.y === nextStep.y);
        if (isCollidingWithUser && !followingUserId) return [];

        setMyPos({ x: nextStep.x, y: nextStep.y });
        wsRef.current?.move(nextStep.x, nextStep.y);
        return newPath;
      });
    }, 120);

    return () => window.clearInterval(interval);
  }, [autoPath.length, followingUserId, otherUsers, setMyPos, wsRef]);

  useEffect(() => {
    if (!followingUserId || !connected || !followedUser) return;

    const dist = Math.abs(myPos.x - followedUser.x) + Math.abs(myPos.y - followedUser.y);
    if (dist <= 1) return;

    const path = findPath(
      myPos,
      { x: followedUser.x, y: followedUser.y },
      dimensions.w,
      dimensions.h,
      (x, y) => isWalkableTile(x, y, { allowFollowedUser: true }),
    );

    if (path.length > 2) {
      setAutoPath(path.slice(1, -1));
    } else if (path.length <= 2) {
      setAutoPath([]);
    }
  }, [
    connected,
    dimensions.h,
    dimensions.w,
    followedUser,
    followingUserId,
    isWalkableTile,
    myPos,
  ]);

  useEffect(() => {
    if (!followingUserId) return;
    const user = otherUsers.find(u => u.userId === followingUserId);
    if (!user) {
      setFollowingUserId(null);
      return;
    }
    resetCamera();
  }, [followingUserId, otherUsers, resetCamera]);

  return {
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
  };
}
