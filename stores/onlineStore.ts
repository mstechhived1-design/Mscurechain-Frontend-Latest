import { create } from 'zustand';

interface OnlineState {
  isOnline: boolean;
  showBackOnline: boolean;
  setOnline: (status: boolean) => void;
  setShowBackOnline: (status: boolean) => void;
}

/**
 * Online Store — Global Connectivity State
 * 
 * Manages the transition between online/offline and the temporary "Back Online" banner display.
 */
export const useOnlineStore = create<OnlineState>((set) => ({
  isOnline: true, // Optimistically assume we start online
  showBackOnline: false,

  setOnline: (status) => set({ isOnline: status }),
  setShowBackOnline: (status) => set({ showBackOnline: status }),
}));
