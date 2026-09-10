import { create } from 'zustand'

interface InitialInnerHeightStore {
  // 모듈이 처음 로드될 때의 window.parent.innerHeight.
  // 이후 innerHeight 값이 튀는지 판단하는 기준값으로 쓰인다.
  initialInnerHeight: number
}

export const useInitialInnerHeightStore = create<InitialInnerHeightStore>(() => ({
  initialInnerHeight: window.parent.innerHeight,
}))
