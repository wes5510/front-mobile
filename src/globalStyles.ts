import { createGlobalStyle } from 'styled-components'

// ParentPage가 떠 있는 문서(html, body)에 적용할 스타일.
export const ParentPageGlobalStyle = createGlobalStyle`
  html, body {
  }
`

// ChildPage가 iframe 없이 일반 화면으로 열렸을 때 문서(html, body)에 적용할 스타일.
// html의 높이는 (GlobalStyle이 아니라) ChildPage에서 JS로 직접 지정한다.
export const ChildPageGlobalStyle = createGlobalStyle`
  body {
    height: 100%;
  }
`

// ChildPage가 iframe 안에서 열렸을 때, iframe 자신의 문서(html, body)에 적용할 스타일.
export const ChildPageIframeGlobalStyle = createGlobalStyle`
  html, body {
  }
`
