import extratorUna from '@una-ui/extractor-vue-script'
import presetUna from '@una-ui/preset'
import prefixes from '@una-ui/preset/prefixes'
import presetAnimations from 'unocss-preset-animations'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons({
      extraProperties: {
        display: 'inline-block',
        height: '1em',
        width: '1em',
        'vertical-align': 'middle',
      },
      collections: {
        ph: () => import('@iconify-json/ph/icons.json').then(mod => mod.default),
        tabler: () => import('@iconify-json/tabler/icons.json').then(mod => mod.default),
      },
    }),
    presetUna(),
    presetAnimations(),
  ],
  safelist: [
    'i-tabler-letter-t',
    'i-tabler-photo',
    'i-tabler-headphones',
    'i-tabler-video',
    'i-tabler-file-text',
    'i-tabler-braces',
    'i-tabler-vector',
    'i-tabler-help-circle',
  ],
  extractors: [extratorUna({ prefixes })],
  transformers: [transformerDirectives(), transformerVariantGroup()],
})
