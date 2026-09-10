import { useCallback } from 'react'
import { useParentScrollStore } from '../store/parentScrollStore'
import { useAddressBarInnerHeightStore } from '../store/addressBarInnerHeightStore'

// 키보드를 내린 뒤 ParentPage 스크롤 위치를 되돌리는 데 걸리는 시간.
// iOS Safari에서 키보드가 내려가며 스크롤이 조금씩 밀리는 현상이
// 한 프레임으로는 끝나지 않아서, 일정 시간 동안 매 프레임 다시 맞춰준다.
const RESTORE_DURATION_MS = 300

// 주소창 활성화/비활성화 상태의 innerHeight로 확인된 값들과 일치하지 않으면
// 아이폰 Safari가 순간적으로 잘못 보고한 값으로 보고 신뢰하지 않는다.
function getReliableInnerHeight(): number | null {
  const currentInnerHeight = window.parent.innerHeight
  const knownInnerHeights = useAddressBarInnerHeightStore.getState().innerHeights

  if (!knownInnerHeights.includes(currentInnerHeight)) {
    return null
  }

  return currentInnerHeight
}

function holdScrollY(getTargetScrollY: () => number | null) {
  const startTime = performance.now()

  function restore() {
    const targetScrollY = getTargetScrollY()

    if (targetScrollY !== null) {
      window.parent.scrollTo(0, targetScrollY)
    }

    if (performance.now() - startTime < RESTORE_DURATION_MS) {
      requestAnimationFrame(restore)
    }
  }

  requestAnimationFrame(restore)
}

export function useKeepParentScrollPosition() {
  const setScrollY = useParentScrollStore((state) => state.setScrollY)

  const onFocus = useCallback(
    (shouldHoldScroll: boolean) => {
      const scrollY = window.parent.scrollY
      setScrollY(scrollY)

      if (shouldHoldScroll) {
        holdScrollY(() => {
          const innerHeight = getReliableInnerHeight()
          if (innerHeight === null) return null

          const viewportHeight = window.parent.visualViewport?.height ?? innerHeight
          const offset = innerHeight - viewportHeight

          return scrollY + offset
        })
      }
    },
    [setScrollY],
  )

  const onBlur = useCallback(() => {
    const scrollY = useParentScrollStore.getState().scrollY
    holdScrollY(() => scrollY)
  }, [])

  return { onFocus, onBlur }
}
