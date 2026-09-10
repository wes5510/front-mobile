import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { buildChildFrameHtml } from '../lib/childFrameDocument'
import ViewportDebugPanel from '../components/ViewportDebugPanel'
import { colors } from '../colors'
import { ParentPageGlobalStyle } from '../globalStyles'

const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  background: ${colors.bg};
`

const ToggleButton = styled.button`
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid ${colors.border};
  background: ${colors.bg};
  color: ${colors.textStrong};
  font: inherit;
  cursor: pointer;

  &:hover {
    border-color: ${colors.accentBorder};
  }
`

const Page = styled.div`
  padding: 40px 24px;
  text-align: center;
  background: ${colors.bg};
  color: ${colors.text};
`

const Marker = styled.div`
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px dashed ${colors.border};
  color: ${colors.text};
`

const Fab = styled.button<{ $open: boolean }>`
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: ${({ $open }) => ($open ? colors.textStrong : colors.accent)};
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  box-shadow: ${colors.shadow};
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.2s ease,
    background 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`

const FrameOverlay = styled.iframe<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  border: none;
  z-index: 10000;
  background: ${colors.iframeBg};
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
`

interface ParentPageProps {
  onToggleToChild: () => void
}

function ParentPage({ onToggleToChild }: ParentPageProps) {
  const [isFrameOpen, setIsFrameOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // FrameOverlay는 처음부터 항상 떠 있으므로, 내용도 마운트 시점에 한 번만 주입한다.
    const doc = iframeRef.current?.contentDocument
    if (!doc) return

    doc.open()
    doc.write(buildChildFrameHtml())
    doc.close()
  }, [])

  return (
    <>
      <ParentPageGlobalStyle />
      <ViewportDebugPanel />

      <TopBar>
        <ToggleButton onClick={onToggleToChild}>ChildPage로 전환</ToggleButton>
      </TopBar>

      <Page>
        <h1>ParentPage</h1>
        <p>오른쪽 하단 버튼을 누르면 격리된 ChildPage가 iframe으로 열립니다.</p>
        {Array.from({ length: 9 }, (_, i) => (
          <Marker key={i}>{i * 200}px</Marker>
        ))}
      </Page>

      <FrameOverlay ref={iframeRef} title="child-page" $visible={isFrameOpen} />

      <Fab
        type="button"
        $open={isFrameOpen}
        onClick={() => setIsFrameOpen((open) => !open)}
        aria-label={isFrameOpen ? 'ChildPage 닫기' : 'ChildPage 열기'}
      >
        {isFrameOpen ? '✕' : '●'}
      </Fab>
    </>
  )
}

export default ParentPage
