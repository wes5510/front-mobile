import { create } from 'zustand'
import { useInitialInnerHeightStore } from './initialInnerHeightStore'

interface AddressBarInnerHeightStore {
  // 주소창이 활성화/비활성화 되어있을 때의 innerHeight로 추정되는 값들.
  // 최대 2개까지만 모은다 (그 이상이면 서로 다른 상태가 있을 수 없으므로).
  innerHeights: number[]
  addInnerHeight: (innerHeight: number) => void
}

export const useAddressBarInnerHeightStore = create<AddressBarInnerHeightStore>((set, get) => ({
  // 앱이 시작된 시점의 innerHeight는 이미 주소창 활성화/비활성화 둘 중
  // 하나의 값이므로, 시작하자마자 첫 번째 후보로 확보해둔다.
  innerHeights: [useInitialInnerHeightStore.getState().initialInnerHeight],
  addInnerHeight: (innerHeight) => {
    const { innerHeights } = get()

    if (innerHeights.length >= 2 || innerHeights.includes(innerHeight)) {
      return
    }

    set({ innerHeights: [...innerHeights, innerHeight] })
  },
}))
