import { create } from 'zustand';
import React from 'react';

interface HeaderState {
  title: string;
  subtitle: string;
  leftExtra: React.ReactNode | null;
  rightExtra: React.ReactNode | null;
  actions: React.ReactNode | null;
  showBell: boolean;
  setHeader: (data: { 
    title?: string; 
    subtitle?: string; 
    leftExtra?: React.ReactNode | null;
    rightExtra?: React.ReactNode | null;
    actions?: React.ReactNode | null;
    showBell?: boolean;
  }) => void;
  clearHeader: () => void;
}

export const useHeaderStore = create<HeaderState>((set) => ({
  title: '',
  subtitle: '',
  leftExtra: null,
  rightExtra: null,
  actions: null,
  showBell: true,
  setHeader: (data) => set((state) => ({ ...state, ...data })),
  clearHeader: () => set({ title: '', subtitle: '', leftExtra: null, rightExtra: null, actions: null, showBell: true }),
}));
