import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'freshrescue',
  brand: {
    displayName: '신선구조대',
    primaryColor: '#FF5733',
    icon: 'https://www.toss.im/static/images/icon.png',
  },
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'next dev',
      build: 'next build',
    },
  },
  permissions: [],
  outdir: 'out',
  webViewProps: {
    type: 'partner',
  },
})
