import { useCallback } from 'react'
import { useParentScrollStore } from '../store/parentScrollStore'

// 키보드를 내린 뒤 ParentPage 스크롤 위치를 되돌리는 데 걸리는 시간.
// iOS Safari에서 키보드가 내려가며 스크롤이 조금씩 밀리는 현상이
// 한 프레임으로는 끝나지 않아서, 일정 시간 동안 매 프레임 다시 맞춰준다.
const RESTORE_DURATION_MS = 300

function holdScrollY(scrollY: number) {
  const startTime = performance.now()

  function restore() {
    window.parent.scrollTo(0, scrollY)

    if (performance.now() - startTime < RESTORE_DURATION_MS) {
      requestAnimationFrame(restore)
    }
  }

  requestAnimationFrame(restore)
}

// iframe(embed) 모드에서만 동작한다. ChildPage가 독립 페이지로 열렸을 때는
// 조정할 ParentPage 자체가 없다.
export function useKeepParentScrollPosition(isEmbedded: boolean) {
  const setScrollY = useParentScrollStore((state) => state.setScrollY)

  const onFocus = useCallback(() => {
    if (!isEmbedded) return

    setScrollY(window.parent.scrollY)
  }, [isEmbedded, setScrollY])

  const onBlur = useCallback(() => {
    if (!isEmbedded) return

    holdScrollY(useParentScrollStore.getState().scrollY)
  }, [isEmbedded])

  return { onFocus, onBlur }
}
