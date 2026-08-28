import { defineConfig } from 'vitepress'
import { monaco } from '@bithero/monaco-editor-vite-plugin'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Resolve the cljam TypeScript entry relative to this config file.
// Using an alias bypasses package.json `exports` resolution entirely,
// which avoids [commonjs--resolver] failures in CI where Rollup's CJS
// plugin can't match any condition before the file is built.
const cljamEntry = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../cljam/src/core/index.ts')

export default defineConfig({
  title: 'cljam',
  description: 'A Clojure interpreter for JavaScript environments',
  base: '/cljam/',

  head: [['link', { rel: 'icon', href: '/cljam/favicon.ico' }]],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'cljam',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/reference/clojure.core' },
      { text: 'Packages', link: '/packages/cljam-schema' },
      { text: 'Playground', link: '/playground' },
      { text: 'Blog', link: '/blog/building-cljam' },
      {
        text: 'npm',
        link: 'https://www.npmjs.com/package/@regibyte/cljam',
      },
    ],

    sidebar: {
      '/reference/': [
        {
          text: 'API Reference',
          items: [
            { text: 'clojure.core', link: '/reference/clojure.core' },
            { text: 'clojure.string', link: '/reference/clojure.string' },
            { text: 'clojure.math', link: '/reference/clojure.math' },
            { text: 'clojure.edn', link: '/reference/clojure.edn' },
            { text: 'clojure.set', link: '/reference/clojure.set' },
            { text: 'clojure.walk', link: '/reference/clojure.walk' },
            { text: 'clojure.test', link: '/reference/clojure.test' },
          ],
        },
      ],
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Embedding', link: '/guide/embedding' },
            { text: 'Vite Integration', link: '/guide/vite' },
            { text: 'Language Reference', link: '/guide/language' },
            { text: 'Conformance with JVM Clojure', link: '/guide/conformance' },
            { text: 'Protocols & Records', link: '/guide/protocols' },
            { text: 'Testing', link: '/guide/testing' },
            { text: 'Building Libraries', link: '/guide/libraries' },
            { text: 'LLM Integration (MCP)', link: '/guide/mcp' },
          ],
        },
      ],
      '/packages/': [
        {
          text: 'Packages',
          items: [
            { text: 'cljam-schema', link: '/packages/cljam-schema' },
            { text: 'cljam-date', link: '/packages/cljam-date' },
            { text: 'cljam-integrant', link: '/packages/cljam-integrant' },
            { text: 'cljam-mcp', link: '/packages/cljam-mcp' },
          ],
        },
      ],
      '/blog/': [
        {
          text: 'Blog',
          items: [{ text: 'Building cljam', link: '/blog/building-cljam' }],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/RegiByte/cljam' },
    ],

    footer: {
      message:
        'Built with ❤️ for Clojure and its ideas, by <a href="https://github.com/RegiByte" target="_blank" rel="noopener">RegiByte</a>.',
      copyright: 'MIT License · © 2026-present',
    },

    search: {
      provider: 'local',
    },
  },

  // ── Vite config ─────────────────────────────────────────────────────────────
  vite: {
    plugins: [
      // @ts-expect-error — plugin built against Vite 7; VitePress uses Vite 5.
      // The plugin API hooks (resolveId, transform, generateBundle) are
      // structurally compatible at runtime despite the TS type mismatch.
      monaco({
        features: 'all',
        languages: ['clojure'],
        globalAPI: false,
      }),
    ],
    resolve: {
      // Alias @regibyte/cljam to its TypeScript source directly.
      // This runs before any Rollup/Vite resolver plugin (including the
      // [commonjs--resolver] that was failing in CI), so package.json
      // exports and dist/ file existence are never consulted.
      alias: {
        '@regibyte/cljam': cljamEntry,
      },
    },
    ssr: {
      // Bundle the aliased source into the SSR bundle instead of
      // externalising it — the alias resolves to TypeScript which Vite
      // transforms, so no pre-built dist/ is needed here either.
      noExternal: ['@regibyte/cljam'],
    },
    optimizeDeps: {
      // Exclude Monaco from pre-bundling — it's only ever loaded dynamically
      // (inside onMounted) and the Monaco plugin handles its own chunking.
      exclude: ['monaco-editor'],
    },
  },
})
