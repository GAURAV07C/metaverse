import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserState {
  token: string | null;
  userId: string | null;
  username: string | null;
  avatarId: string | null;
  avatarUrl: string | null;
  type: 'admin' | 'user' | null;
  setAuth: (token: string, userId: string, type: 'admin' | 'user', username?: string) => void;
  setAvatar: (avatarId: string, avatarUrl?: string | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        token: null,
        userId: null,
        username: null,
        avatarId: null,
        avatarUrl: null,
        type: null,
        setAuth: (token, userId, type, username) => set({ token, userId, type, username: username ?? null }),
        setAvatar: (avatarId, avatarUrl) => set({ avatarId, avatarUrl: avatarUrl ?? null }),
        logout: () => set({ token: null, userId: null, avatarId: null, avatarUrl: null, type: null, username: null }),
      }),
      {
        name: 'metaverse-user-storage',
      }
    )
  )
);
