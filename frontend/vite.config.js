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
  let outputDirectory

  return {
    name: 'spa-fallback-pages',
    apply: 'build',

    configResolved(config) {
      outputDirectory = path.resolve(config.root, config.build.outDir)
    },

    writeBundle(outputOptions, bundle) {
      // Only copy a successfully generated HTML entry. A failed build
      // should report its original error without a second plugin error.
      if (!bundle['index.html']) return

      const distDir = outputOptions.dir
        ? path.resolve(outputOptions.dir)
        : outputDirectory
      const indexFile = path.join(distDir, 'index.html')
      const indexHtml = fs.readFileSync(indexFile, 'utf8')

      for (const route of spaRoutes) {
        const routeDirectory = path.join(distDir, route)
        fs.mkdirSync(routeDirectory, { recursive: true })
        fs.writeFileSync(path.join(routeDirectory, 'index.html'), indexHtml, 'utf8')
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallbackPages()],
})
