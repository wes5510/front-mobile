import { create } from 'zustand'

interface KeyboardStore {
  isKeyboardOpen: boolean
  setIsKeyboardOpen: (isKeyboardOpen: boolean) => void
}

export const useKeyboardStore = create<KeyboardStore>((set) => ({
  isKeyboardOpen: false,
  setIsKeyboardOpen: (isKeyboardOpen) => set({ isKeyboardOpen }),
}))
