import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'freshrescue',
  brand: {
    displayName: '신선구조대',
    primaryColor: '#0064FF',
    icon: 'https://fruit-rescue.app/icon.png',
  },
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'next dev',
      build: 'npm run build',
    },
  },
  permissions: [],
  outdir: 'dist',
  webViewProps: {
    type: 'partner',
  },
})
