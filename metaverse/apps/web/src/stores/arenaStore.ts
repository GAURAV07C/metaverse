import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type Updater<T> = T | ((prev: T) => T);

const resolveUpdater = <T,>(value: Updater<T>, previous: T) =>
  typeof value === 'function' ? (value as (prev: T) => T)(previous) : value;

interface ArenaUiState {
  showUsers: boolean;
  activeTab: 'users' | 'chat';
  isSettingsOpen: boolean;
  showOfficeMenu: boolean;
  viewMode: 'map' | 'grid';
  showShortcuts: boolean;
  showPanel: boolean;
  setShowUsers: (value: Updater<boolean>) => void;
  setActiveTab: (tab: 'users' | 'chat') => void;
  setIsSettingsOpen: (value: Updater<boolean>) => void;
  setShowOfficeMenu: (value: Updater<boolean>) => void;
  setViewMode: (value: Updater<'map' | 'grid'>) => void;
  setShowShortcuts: (value: Updater<boolean>) => void;
  setShowPanel: (value: Updater<boolean>) => void;
  toggleSidebar: (tab: 'users' | 'chat') => void;
}

export const useArenaStore = create<ArenaUiState>()(
  devtools((set) => ({
    showUsers: true,
    activeTab: 'users',
    isSettingsOpen: false,
    showOfficeMenu: false,
    viewMode: 'map',
    showShortcuts: false,
    showPanel: false,
    setShowUsers: (value) => set((state) => ({ showUsers: resolveUpdater(value, state.showUsers) }), false, 'arena/setShowUsers'),
    setActiveTab: (activeTab) => set({ activeTab }, false, 'arena/setActiveTab'),
    setIsSettingsOpen: (value) => set((state) => ({ isSettingsOpen: resolveUpdater(value, state.isSettingsOpen) }), false, 'arena/setIsSettingsOpen'),
    setShowOfficeMenu: (value) => set((state) => ({ showOfficeMenu: resolveUpdater(value, state.showOfficeMenu) }), false, 'arena/setShowOfficeMenu'),
    setViewMode: (value) => set((state) => ({ viewMode: resolveUpdater(value, state.viewMode) }), false, 'arena/setViewMode'),
    setShowShortcuts: (value) => set((state) => ({ showShortcuts: resolveUpdater(value, state.showShortcuts) }), false, 'arena/setShowShortcuts'),
    setShowPanel: (value) => set((state) => ({ showPanel: resolveUpdater(value, state.showPanel) }), false, 'arena/setShowPanel'),
    toggleSidebar: (tab) => set((state) => ({
      activeTab: tab,
      showUsers: state.activeTab === tab ? !state.showUsers : true,
    }), false, 'arena/toggleSidebar'),
  }), { name: 'Arena UI' })
);
