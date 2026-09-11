import { fileURLToPath } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 빌드 결과물이 CDN의 임의 하위 경로에 올라가므로 자산 경로를 상대 경로로 emit한다.
  base: './',
  server: {
    host: true,
    port: 5174,
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  build: {
    rollupOptions: {
      // child-entry는 iframe에 주입되는 HTML의 <script src>로만 로드되는
      // 별도 진입점이라 index.html에서는 참조되지 않으므로 명시적으로 등록한다.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        'child-entry': fileURLToPath(new URL('./src/child-entry.tsx', import.meta.url)),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'child-entry' ? 'child-entry.js' : 'assets/[name]-[hash].js',
      },
    },
  },
})
