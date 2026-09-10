import { useMemo, useState } from 'react'
import styled from 'styled-components'
import ViewportDebugPanel from '../components/ViewportDebugPanel'
import { colors } from '../colors'
import { ChildPageGlobalStyle, ChildPageIframeGlobalStyle } from '../globalStyles'
import { useKeepParentScrollPosition } from '../hooks/useKeepParentScrollPosition'
import { useIsKeyboardOpen } from '../hooks/useIsKeyboardOpen'
import { useCollectAddressBarInnerHeights } from '../hooks/useCollectAddressBarInnerHeights'

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

const Root = styled.div`
  min-height: 100vh;
  background: ${colors.bg};
`

const Header = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: ${HEADER_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: ${colors.bg};
  border-bottom: 1px solid ${colors.border};
  z-index: 10;
`

const Footer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${FOOTER_HEIGHT}px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: ${colors.bg};
  border-top: 1px solid ${colors.border};
  z-index: 10;

  input {
    width: 100%;
    padding: 10px;
    font-size: 16px;
    box-sizing: border-box;
  }
`

const Content = styled.div`
  padding: ${HEADER_HEIGHT + 8}px 0 ${FOOTER_HEIGHT + 8}px;
  background: ${colors.bg};
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
  const { onFocus, onBlur } = useKeepParentScrollPosition()
  useIsKeyboardOpen()
  useCollectAddressBarInnerHeights()

  const items = isLong ? LONG_ITEMS : SHORT_ITEMS

  return (
    <Root>
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

      <Content>
        {items.map((item, i) =>
          item.type === 'form' ? (
            <FormBlock key={i}>
              <label>
                연락처를 남겨주세요
                <input
                  placeholder="이메일 또는 전화번호"
                  onFocus={() => onFocus(false)}
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

      <Footer>
        <input
          placeholder="메시지를 입력하세요"
          onFocus={() => onFocus(!isEmbedded)}
          onBlur={onBlur}
        />
      </Footer>
    </Root>
  )
}

export default ChildPage
