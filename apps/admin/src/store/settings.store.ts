import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Auto-print a receipt after each completed sale / closed bill.
  autoPrint: boolean;
  setAutoPrint: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      autoPrint: false,
      setAutoPrint: (autoPrint) => set({ autoPrint }),
    }),
    { name: 'savdo-pos-settings' },
  ),
);
