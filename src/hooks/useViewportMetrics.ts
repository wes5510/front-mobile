import { useEffect, useState } from 'react'

function readMetrics() {
  const vv = window.visualViewport

  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    docScrollTop: document.documentElement.scrollTop,
    docScrollHeight: document.documentElement.scrollHeight,
    docClientHeight: document.documentElement.clientHeight,
    bodyScrollHeight: document.body.scrollHeight,
    vvWidth: vv?.width ?? null,
    vvHeight: vv?.height ?? null,
    vvOffsetTop: vv?.offsetTop ?? null,
    vvOffsetLeft: vv?.offsetLeft ?? null,
    vvPageTop: vv?.pageTop ?? null,
    vvPageLeft: vv?.pageLeft ?? null,
    vvScale: vv?.scale ?? null,
    devicePixelRatio: window.devicePixelRatio,
  }
}

export function useViewportMetrics() {
  const [metrics, setMetrics] = useState(readMetrics)

  useEffect(() => {
    // scroll/resize 이벤트만으로는 페이지 전환이나 콘텐츠 길이 변경 같은
    // 케이스를 놓치므로, 값을 항상 최신으로 반영하기 위해 단순히 주기적으로 갱신한다.
    const id = setInterval(() => setMetrics(readMetrics()), 100)
    return () => clearInterval(id)
  }, [])

  return metrics
}
