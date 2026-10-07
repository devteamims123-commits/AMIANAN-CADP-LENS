import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const spaRoutes = [
  'login',
  'register',
  'forgot-password',
  'dashboard',
  'cadp-sites',
  'programs-projects',
  'user-management',
  'maintenance-logs',
]

function spaFallbackPages() {
  return {
    name: 'spa-fallback-pages',

    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist')
      const indexFile = path.join(distDir, 'index.html')

      if (!fs.existsSync(indexFile)) {
        throw new Error('dist/index.html was not generated.')
      }

      const indexHtml = fs.readFileSync(indexFile, 'utf8')

      for (const route of spaRoutes) {
        const routeDirectory = path.join(distDir, route)

        fs.mkdirSync(routeDirectory, {
          recursive: true,
        })

        fs.writeFileSync(
          path.join(routeDirectory, 'index.html'),
          indexHtml,
          'utf8'
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    spaFallbackPages(),
  ],
})