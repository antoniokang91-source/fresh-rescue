import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'fruit-rescue',
  brand: {
    displayName: 'Fruit Rescue',
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
})
