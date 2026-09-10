import { useEffect, useRef } from 'react'
import { useKeyboardStore } from '../store/keyboardStore'

// resize가 하단 브라우저 메뉴바 때문인지 가상 키보드 때문인지 구분하기 위한 임계값.
// 메뉴바 height보다는 크고 키보드 height보다는 작은 값.
const KEYBOARD_ACTIVE_THRESHOLD = 180

function getViewportHeight() {
  return window.parent.visualViewport?.height ?? window.parent.innerHeight
}

export function useIsKeyboardOpen() {
  const setIsKeyboardOpen = useKeyboardStore((state) => state.setIsKeyboardOpen)
  const previousHeight = useRef(getViewportHeight())

  useEffect(() => {
    const vv = window.parent.visualViewport
    if (!vv) return

    const handleResize = () => {
      const currentHeight = getViewportHeight()

      if (Math.abs(currentHeight - previousHeight.current) > KEYBOARD_ACTIVE_THRESHOLD) {
        setIsKeyboardOpen(currentHeight < previousHeight.current)
      }

      previousHeight.current = currentHeight
    }

    vv.addEventListener('resize', handleResize)
    return () => vv.removeEventListener('resize', handleResize)
  }, [setIsKeyboardOpen])
}
