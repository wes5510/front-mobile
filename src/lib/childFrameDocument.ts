export function buildChildFrameHtml(): string {
  // iframe 문서는 document.write로 만들어져 상대 경로 기준이 불안정하므로 절대 URL로 주입한다.
  // BASE_URL은 배포 시 상대 경로('./')라 현재 문서 기준으로 풀어야 실제 배포 경로가 나온다.
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href

  const devScripts = `
    <script type="module">
      import RefreshRuntime from "${base}@react-refresh"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="${base}@vite/client"></script>
    <script type="module" src="${base}src/child-entry.tsx"></script>
  `

  const prodScripts = `<script type="module" src="${base}child-entry.js"></script>`

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;background:#ffffff;">
    <div id="root"></div>
    ${import.meta.env.DEV ? devScripts : prodScripts}
  </body>
</html>`
}
