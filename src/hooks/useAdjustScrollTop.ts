import { useEffect, useRef } from 'react'
import { useIsKeyboardOpen } from './useIsKeyboardOpen'
import { useKeyboardStore } from '../store/keyboardStore'

export function useAdjustScrollTop() {
  useIsKeyboardOpen()
  const isKeyboardOpen = useKeyboardStore((state) => state.isKeyboardOpen)
  const prevScrollTop = useRef(window.parent.scrollY)

  useEffect(() => {
    if (isKeyboardOpen) {
      return
    }

    // iOS Safari에서 iframe 내 키보드를 열었다 닫으면 ParentPage 스크롤이
    // 조금씩 밀리는 문제가 있어, 닫히는 시점에 기억해둔 위치로 되돌린다.
    window.parent.scrollTo(0, prevScrollTop.current)
  }, [isKeyboardOpen])

  useEffect(() => {
    const handleScroll = () => {
      if (Math.abs(window.parent.scrollY - prevScrollTop.current) < 100) {
        // 키보드가 열리는 시점의 ParentPage 스크롤 위치를 알기 위해 매 스크롤마다 위치를 기억해둔다.
        prevScrollTop.current = window.parent.scrollY
      }
    }

    window.parent.addEventListener('scroll', handleScroll)
    return () => window.parent.removeEventListener('scroll', handleScroll)
  }, [])
}
