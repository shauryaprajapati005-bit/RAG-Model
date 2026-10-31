import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const scopeScienceTailwind = () => ({
  postcssPlugin: 'scope-science-tailwind',

  Once(root) {
    const file =
      (root.source &&
        root.source.input &&
        root.source.input.file) ||
      ''

    // Only process the Science Tailwind stylesheet
    if (!/features[\\/]+science[\\/]+tailwind\.css$/.test(file)) {
      return
    }

    // Namespace keyframes so they don't conflict with the rest of the app
    const keyframes = new Set()

    root.walkAtRules(/keyframes$/, (atRule) => {
      keyframes.add(atRule.params)
      atRule.params = `sci-${atRule.params}`
    })

    if (keyframes.size) {
      const names = [...keyframes]
        .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|')

      const animationRegex = new RegExp(
        `(^|[\\s,(])(${names})(?=[\\s,;)]|$)`,
        'g'
      )

      root.walkDecls((decl) => {
        if (/^(--animate-|animation)/.test(decl.prop)) {
          decl.value = decl.value.replace(
            animationRegex,
            '$1sci-$2'
          )
        }
      })
    }

    // Scope normal selectors under .sci-scope
    root.walkRules((rule) => {
      if (!rule.parent || rule.parent.type === 'rule') {
        return
      }

      let parent = rule.parent

      while (parent && parent.type === 'atrule') {
        if (
          /keyframes$/.test(parent.name) ||
          parent.name === 'property' ||
          parent.name === 'font-face'
        ) {
          return
        }

        parent = parent.parent
      }

      rule.selectors = rule.selectors.map((selector) => {
        const trimmed = selector.trim()

        if (
          trimmed.startsWith(':root') ||
          trimmed.startsWith(':host') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('::') ||
          trimmed === 'html' ||
          trimmed === 'body'
        ) {
          return selector
        }

        return `:where(.sci-scope) ${trimmed}`
      })
    })
  },
})

scopeScienceTailwind.postcss = true

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  css: {
    postcss: {
      plugins: [
        scopeScienceTailwind(),
      ],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})