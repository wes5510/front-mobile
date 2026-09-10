// 시스템 다크모드와 무관하게 항상 동일하게 보이도록 고정된 색상값.
// (모바일 Safari가 다크모드일 때 var(--xxx) 토큰이 바뀌어 요소 구분이 안 되는 문제 방지)
export const colors = {
  bg: '#ffffff',
  text: '#6b6375',
  textStrong: '#08060d',
  border: '#e5e4e7',
  codeBg: '#f4f3ec',
  accent: '#aa3bff',
  accentBorder: 'rgba(170, 59, 255, 0.5)',
  shadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
  // iframe 영역 자체를 눈에 띄게 구분하기 위한 색 (다른 곳에는 쓰지 않음)
  iframeBg: '#ffe066',
}
