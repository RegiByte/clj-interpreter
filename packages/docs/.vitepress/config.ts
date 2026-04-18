import { defineConfig } from 'vitepress'
import { monaco } from '@bithero/monaco-editor-vite-plugin'

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
      { text: 'Packages', link: '/packages/cljam-schema' },
      { text: 'Playground', link: '/playground' },
      { text: 'Blog', link: '/blog/building-cljam' },
      {
        text: 'npm',
        link: 'https://www.npmjs.com/package/@regibyte/cljam',
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Embedding', link: '/guide/embedding' },
            { text: 'Vite Integration', link: '/guide/vite' },
            { text: 'Language Reference', link: '/guide/language' },
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
    ssr: {
      // Bundle @regibyte/cljam in SSR rather than externalising it — the
      // workspace package may not be resolvable via Node require() in SSR mode.
      noExternal: ['@regibyte/cljam'],
    },
    optimizeDeps: {
      // Exclude Monaco from pre-bundling — it's only ever loaded dynamically
      // (inside onMounted) and the Monaco plugin handles its own chunking.
      exclude: ['monaco-editor'],
    },
  },
})
