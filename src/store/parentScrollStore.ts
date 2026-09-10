import { create } from 'zustand'

interface ParentScrollStore {
  scrollY: number
  setScrollY: (scrollY: number) => void
}

export const useParentScrollStore = create<ParentScrollStore>((set) => ({
  scrollY: 0,
  setScrollY: (scrollY) => set({ scrollY }),
}))
