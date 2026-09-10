import { useCallback } from 'react'
import { useParentScrollStore } from '../store/parentScrollStore'
import { useAddressBarInnerHeightStore } from '../store/addressBarInnerHeightStore'

// 키보드를 내린 뒤 ParentPage 스크롤 위치를 되돌리는 데 걸리는 시간.
// iOS Safari에서 키보드가 내려가며 스크롤이 조금씩 밀리는 현상이
// 한 프레임으로는 끝나지 않아서, 일정 시간 동안 매 프레임 다시 맞춰준다.
const RESTORE_DURATION_MS = 300

// window.parent.innerHeight는 아이폰 Safari에서 순간적으로 잘못된 값을 찍을 수
// 있으므로, 주소창 활성화/비활성화 상태로 확인된 값들 중 가장 가까운 값으로
// 보정한다 (후보가 1개뿐이면 그 값).
function getClosestKnownInnerHeight(target: number): number {
  const knownInnerHeights = useAddressBarInnerHeightStore.getState().innerHeights

  if (knownInnerHeights.length === 0) {
    return target
  }

  return knownInnerHeights.reduce((closest, candidate) =>
    Math.abs(candidate - target) < Math.abs(closest - target) ? candidate : closest,
  )
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
        // innerHeight는 onFocus가 호출된 시점에 한 번만 구해서 그 값을 계속
        // 쓴다 (매 프레임 다시 계산하지 않음).
        const innerHeight = getClosestKnownInnerHeight(window.parent.innerHeight)

        holdScrollY(() => {
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
