export function buildChildFrameHtml(): string {
  const origin = window.location.origin

  const devScripts = `
    <script type="module">
      import RefreshRuntime from "${origin}/@react-refresh"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="${origin}/@vite/client"></script>
    <script type="module" src="${origin}/src/child-entry.tsx"></script>
  `

  const prodScripts = `<script type="module" src="${origin}/child-entry.js"></script>`

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
