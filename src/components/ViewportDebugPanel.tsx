import type { CSSProperties } from 'react'
import styled from 'styled-components'
import { useViewportMetrics } from '../hooks/useViewportMetrics'

const Panel = styled.pre`
  position: fixed;
  top: 280px;
  left: 8px;
  margin: 0;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.4;
  font-family: ui-monospace, Consolas, monospace;
  background: rgba(0, 0, 0, 0.75);
  color: #0f0;
  border-radius: 6px;
  z-index: 9000;
  pointer-events: none;
  white-space: pre;
`

function ViewportDebugPanel({ style }: { style?: CSSProperties }) {
  const metrics = useViewportMetrics()

  const text = Object.entries(metrics)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')

  return <Panel style={style}>{text}</Panel>
}

export default ViewportDebugPanel
