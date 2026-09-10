import { create } from 'zustand'

interface KeyboardStore {
  isKeyboardOpen: boolean
  // 키보드가 닫혀도 0으로 돌아가지 않고, 마지막으로 열렸을 때의 높이를 유지한다.
  // (키보드를 한 번도 연 적 없는 초기 상태에서만 0)
  keyboardHeight: number
  setIsKeyboardOpen: (isKeyboardOpen: boolean) => void
  setKeyboardHeight: (keyboardHeight: number) => void
}

export const useKeyboardStore = create<KeyboardStore>((set) => ({
  isKeyboardOpen: false,
  keyboardHeight: 300,
  setIsKeyboardOpen: (isKeyboardOpen) => set({ isKeyboardOpen }),
  setKeyboardHeight: (keyboardHeight) => set({ keyboardHeight }),
}))
