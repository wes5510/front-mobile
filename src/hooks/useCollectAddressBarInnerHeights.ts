import { useEffect } from 'react'
import { useKeyboardStore } from '../store/keyboardStore'
import { useAddressBarInnerHeightStore } from '../store/addressBarInnerHeightStore'

// 이 시간(ms) 동안 innerHeight가 그대로 유지되면 "안정된" 값으로 본다.
// 아이폰 Safari가 순간적으로 이상한 값을 찍거나, 주소창이 접히고 펴지는
// 애니메이션 도중의 중간값을 찍는 것과 구분하기 위함.
const STABLE_DURATION_MS = 200

// window.parent에 스크롤이 일어날 때마다, innerHeight가 일정 시간 이상
// 그대로 유지되는 값을 주소창 활성화/비활성화 상태의 innerHeight 후보로
// 수집해서 store에 저장한다. 후보가 2개 모이면 더 볼 필요가 없으므로
// scroll 이벤트를 제거한다.
export function useCollectAddressBarInnerHeights() {
  const isKeyboardOpen = useKeyboardStore((state) => state.isKeyboardOpen)
  const addInnerHeight = useAddressBarInnerHeightStore((state) => state.addInnerHeight)

  useEffect(() => {
    // 키보드가 열려있으면 innerHeight가 키보드 때문에도 바뀌므로 계산하지 않는다.
    if (isKeyboardOpen) return
    if (useAddressBarInnerHeightStore.getState().innerHeights.length >= 2) return

    let frameId: number | null = null
    let lastValue = window.parent.innerHeight
    let lastChangeTime = performance.now()

    function checkStability() {
      const currentValue = window.parent.innerHeight
      const now = performance.now()

      if (currentValue !== lastValue) {
        lastValue = currentValue
        lastChangeTime = now
      } else if (now - lastChangeTime >= STABLE_DURATION_MS) {
        addInnerHeight(lastValue)

        if (useAddressBarInnerHeightStore.getState().innerHeights.length >= 2) {
          window.parent.removeEventListener('scroll', handleScroll)
          frameId = null
          return
        }
      }

      frameId = requestAnimationFrame(checkStability)
    }

    function handleScroll() {
      if (frameId !== null) return // 이미 관찰 중이면 그대로 둔다.

      lastValue = window.parent.innerHeight
      lastChangeTime = performance.now()
      frameId = requestAnimationFrame(checkStability)
    }

    window.parent.addEventListener('scroll', handleScroll)

    return () => {
      window.parent.removeEventListener('scroll', handleScroll)
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [isKeyboardOpen, addInnerHeight])
}
