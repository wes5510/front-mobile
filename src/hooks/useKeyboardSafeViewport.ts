import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { useKeyboardStore } from '../store/keyboardStore'

// embed 모드가 아닐 때만 동작한다.
//
// 1) onPointerDown에서 기본 동작을 막고 직접 포커스를 주면, 브라우저가 focus 시
//    자동으로 하는 scroll-into-view가 일어나지 않는다. 뷰는 제자리에 있고
//    키보드만 올라온다.
// 2) 그 상태에서 키보드가 올라오면 html height를 보이는 영역
//    (visualViewport.height)으로 줄여서, 레이아웃이 키보드를 제외한 화면 영역에
//    딱 차게 만든다.
//
// 복구는 isKeyboardOpen이 false가 되길 기다리지 않고 blur 시점에 한다.
// isKeyboardOpen은 visualViewport resize 기반이라 키보드가 다 닫힌 뒤에야 꺼지는데,
// 그때까지 height가 줄어든 채로 있으면 닫히는 동안 키보드 자리가 하얗게 보인다.
export function useKeyboardSafeViewport(isEmbedded: boolean) {
  const isKeyboardOpen = useKeyboardStore((state) => state.isKeyboardOpen)
  const [isFocused, setIsFocused] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 키보드가 올라오기 직전(= onPointerDown 시점)의 스크롤 위치와 뷰포트 높이.
  const scrollYRef = useRef(0)
  const innerHeightRef = useRef(0)

  const shouldConstrain = !isEmbedded && isFocused && isKeyboardOpen

  useLayoutEffect(() => {
    if (!shouldConstrain) return

    const html = document.documentElement
    html.style.height = `${window.visualViewport?.height ?? window.innerHeight}px`

    return () => {
      html.style.height = ''
    }
  }, [shouldConstrain])

  // html이 줄면서 문서 대신 Root가 스크롤러가 된다. 키보드가 올라오기 전 화면
  // 아래쪽 끝(scrollY + innerHeight)이 줄어든 화면의 아래쪽 끝에 오도록 맞춰야
  // 보고 있던 메시지가 그대로 유지된다.
  // 위 effect보다 뒤에 있어야 한다 — Root가 스크롤 가능해진 뒤라야 scrollTop이
  // 0으로 잘리지 않는다.
  useLayoutEffect(() => {
    if (!shouldConstrain) return

    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    scrollContainer.scrollTop =
      scrollYRef.current + innerHeightRef.current - viewportHeight

    return () => {
      // cleanup도 선언 순서대로 돌기 때문에, 위 effect가 html height를 먼저
      // 되돌려서 문서가 다시 스크롤 가능해진 뒤에 실행된다.
      window.scrollTo(0, scrollYRef.current)
    }
  }, [shouldConstrain])

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLInputElement>) => {
      if (isEmbedded) return

      event.preventDefault()
      event.currentTarget.focus({ preventScroll: true })

      scrollYRef.current = window.scrollY
      innerHeightRef.current = window.innerHeight
      setIsFocused(true)
    },
    [isEmbedded],
  )

  const onBlur = useCallback(() => setIsFocused(false), [])

  return { scrollContainerRef, shouldConstrain, onPointerDown, onBlur }
}
