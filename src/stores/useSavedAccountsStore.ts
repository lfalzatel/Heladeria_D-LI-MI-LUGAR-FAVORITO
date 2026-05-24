import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedAccount {
  uid: string;
  email: string;
  name: string;
  imageUrl: string;
  role: string;
}

interface SavedAccountsState {
  accounts: SavedAccount[];
  addAccount: (account: SavedAccount) => void;
  removeAccount: (uid: string) => void;
}

export const useSavedAccountsStore = create<SavedAccountsState>()(
  persist(
    (set) => ({
      accounts: [],
      addAccount: (account) => set((state) => {
        const filtered = state.accounts.filter(a => a.uid !== account.uid);
        return { accounts: [...filtered, account] };
      }),
      removeAccount: (uid) => set((state) => ({
        accounts: state.accounts.filter(a => a.uid !== uid)
      }))
    }),
    {
      name: 'dli-saved-accounts'
    }
  )
);
