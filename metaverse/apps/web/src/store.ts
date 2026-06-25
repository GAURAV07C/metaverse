import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserState {
  token: string | null;
  userId: string | null;
  avatarId: string | null;
  type: 'admin' | 'user' | null;
  setAuth: (token: string, userId: string, type: 'admin' | 'user') => void;
  setAvatar: (avatarId: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        token: null,
        userId: null,
        avatarId: null,
        type: null,
        setAuth: (token, userId, type) => set({ token, userId, type }),
        setAvatar: (avatarId) => set({ avatarId }),
        logout: () => set({ token: null, userId: null, avatarId: null, type: null }),
      }),
      {
        name: 'metaverse-user-storage',
      }
    )
  )
);
