import { useMemo, useState } from 'react'
import styled from 'styled-components'
import ViewportDebugPanel from '../components/ViewportDebugPanel'
import { colors } from '../colors'
import { ChildPageGlobalStyle, ChildPageIframeGlobalStyle } from '../globalStyles'
import { useKeepParentScrollPosition } from '../hooks/useKeepParentScrollPosition'
import { useIsKeyboardOpen } from '../hooks/useIsKeyboardOpen'
import { useKeyboardSafeViewport } from '../hooks/useKeyboardSafeViewport'

function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

type ChatItem =
  | { type: 'message'; from: 'agent' | 'user'; text: string }
  | { type: 'form' }

const LONG_ITEMS: ChatItem[] = Array.from({ length: 26 }, (_, i): ChatItem => ({
  type: 'message',
  from: i % 2 === 0 ? 'agent' : 'user',
  text: i % 2 === 0 ? `상담원 메시지 ${i + 1}` : `유저 메시지 ${i + 1}`,
}))
LONG_ITEMS.splice(12, 0, { type: 'form' })

const SHORT_ITEMS: ChatItem[] = [
  { type: 'message', from: 'agent', text: '안녕하세요! 무엇을 도와드릴까요?' },
  { type: 'message', from: 'user', text: '네, 문의드릴 게 있어요.' },
]

const HEADER_HEIGHT = 56
const FOOTER_HEIGHT = 56
// Header/Footer 는 content-box 라 아래 테두리가 높이 바깥에 더 붙는다.
// 메시지 영역의 남는 자리를 계산할 때 이 굵기까지 빼야 한다.
const BAR_BORDER_WIDTH = 1

const Root = styled.div<{ $constrained: boolean }>`
  height: 100%;
  background: ${colors.bg};
  // html height가 줄어든 동안에는 문서 대신 Root가 스크롤을 담당한다.
  overflow-y: ${({ $constrained }) => ($constrained ? 'auto' : 'visible')};
  // 스크롤러가 된 동안 끝까지 당기면 제스처가 문서로 넘어가 화면이 밀린다.
  // contain이 그 체이닝만 끊고 요소 안의 스크롤은 그대로 둔다.
  // 축을 y로 좁힌 이유 — 줄임 표기는 x축에도 걸려서, 나중에 가로 스크롤 요소가
  // 생기면 그 요소의 체이닝까지 같이 막는다.
  ${({ $constrained }) => ($constrained ? 'overscroll-behavior-y: contain;' : '')}
`

const Header = styled.div`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  height: ${HEADER_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: ${colors.bg};
  border-bottom: ${BAR_BORDER_WIDTH}px solid ${colors.border};
  z-index: 10;
`

const Footer = styled.div`
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${FOOTER_HEIGHT}px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: ${colors.bg};
  border-top: ${BAR_BORDER_WIDTH}px solid ${colors.border};
  z-index: 10;

  input {
    width: 100%;
    padding: 10px;
    font-size: 16px;
    box-sizing: border-box;
  }
`

const BARS_HEIGHT = HEADER_HEIGHT + FOOTER_HEIGHT + BAR_BORDER_WIDTH * 2

const Content = styled.div<{ $constrained: boolean; $embedded: boolean }>`
  padding: 8px 0;
  background: ${colors.bg};
  box-sizing: border-box;
  // 메시지가 적어도 입력창이 화면 맨 아래에 오도록 남는 자리를 채운다.
  // 잠긴 동안 더하는 1px 은 스크롤 여유다 — iOS Safari 는 넘칠 내용이 없는
  // 스크롤러에서 overscroll-behavior 를 무시하므로(webkit.org/b/243452),
  // 이 1px 이 있어야 Root 의 contain 이 실제로 동작한다.
  //
  // 기준을 둘로 나눈 이유: 평소에는 Root 가 확정 높이를 갖지 않아 100% 가 풀리지
  // 않으므로 100dvh 로 재야 한다. 키보드가 뜨면 useKeyboardSafeViewport 가 html 에
  // 픽셀 높이를 넣어 사슬이 풀리고, 그때는 100% 로 재야 넘침이 1px 로 남는다
  // (100dvh 로 재면 줄어든 화면보다 커져 스크롤이 크게 밀린다).
  //
  // 평소에 html 을 건드리지 않는 것도 중요하다 — html 에 height 를 주면 Root 가
  // 확정 높이를 갖게 되고, WebKit 은 sticky 를 가둘 때 높이가 고정된 조상 박스까지
  // 보므로 문서를 스크롤할 때 Header 가 Root 박스째 화면 밖으로 나간다.
  //
  // embed 모드에는 걸지 않는다. 이 규칙이 노리는 둘(입력창을 화면 아래로,
  // 잠긴 동안 1px 넘침)은 embed 에서 어느 쪽도 성립하지 않는데 — shouldConstrain 이
  // isEmbedded 때문에 항상 거짓이라 1px 분기를 안 타고, 100dvh 는 iframe 자신의
  // 높이라 메시지 영역이 iframe 을 꽉 채워 입력창만 iframe 바닥으로 내려간다 —
  // 얻는 것 없이 embed 레이아웃만 바뀐다.
  min-height: ${({ $constrained, $embedded }) =>
    $embedded
      ? 'auto'
      : $constrained
        ? `calc(100% - ${BARS_HEIGHT}px + 1px)`
        : `calc(100dvh - ${BARS_HEIGHT}px)`};
`

const ToggleButton = styled.button`
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid ${colors.border};
  background: ${colors.bg};
  color: ${colors.textStrong};
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: ${colors.accentBorder};
  }
`

const Message = styled.div<{ $from: 'agent' | 'user' }>`
  max-width: 70%;
  margin: 8px 16px;
  padding: 10px 14px;
  border-radius: 12px;
  background: ${({ $from }) => ($from === 'user' ? colors.accent : colors.codeBg)};
  color: ${({ $from }) => ($from === 'user' ? '#fff' : colors.textStrong)};
  margin-left: ${({ $from }) => ($from === 'user' ? 'auto' : '16px')};
`

const FormBlock = styled.div`
  margin: 16px;
  padding: 16px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.bg};

  input {
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    font-size: 16px;
    box-sizing: border-box;
  }
`

interface ChildPageProps {
  onToggleToParent?: () => void
}

function ChildPage({ onToggleToParent }: ChildPageProps) {
  const isEmbedded = useMemo(isRunningInIframe, [])
  const [isLong, setIsLong] = useState(true)
  const { onFocus, onBlur } = useKeepParentScrollPosition(isEmbedded)
  const {
    scrollContainerRef,
    footerRef,
    shouldConstrain,
    onPointerDown,
    onBlur: onKeyboardBlur,
  } = useKeyboardSafeViewport(isEmbedded)
  useIsKeyboardOpen()

  const items = isLong ? LONG_ITEMS : SHORT_ITEMS

  return (
    <Root ref={scrollContainerRef} $constrained={shouldConstrain}>
      {isEmbedded ? <ChildPageIframeGlobalStyle /> : <ChildPageGlobalStyle />}
      <ViewportDebugPanel />

      <Header>
        <strong>ChildPage 채팅</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToggleButton onClick={() => setIsLong((v) => !v)}>
            메시지 {isLong ? '짧게' : '길게'}
          </ToggleButton>
          {!isEmbedded && onToggleToParent && (
            <ToggleButton onClick={onToggleToParent}>
              ParentPage로 전환
            </ToggleButton>
          )}
        </div>
      </Header>

      <Content $constrained={shouldConstrain} $embedded={isEmbedded}>
        {items.map((item, i) =>
          item.type === 'form' ? (
            <FormBlock key={i}>
              <label>
                연락처를 남겨주세요
                <input
                  placeholder="이메일 또는 전화번호"
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </label>
            </FormBlock>
          ) : (
            <Message key={i} $from={item.from}>
              {item.text}
            </Message>
          ),
        )}
      </Content>

      <Footer ref={footerRef}>
        <input
          placeholder="메시지를 입력하세요"
          onPointerDown={onPointerDown}
          onFocus={onFocus}
          onBlur={() => {
            onBlur()
            onKeyboardBlur()
          }}
        />
      </Footer>
    </Root>
  )
}

export default ChildPage
