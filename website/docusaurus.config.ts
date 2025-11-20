import { themes as prismThemes } from 'prism-react-renderer';
import type { Config, PluginConfig } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import COURSES from './.generated/courses.config.json';

const docsPlugins: PluginConfig[] = COURSES.map(c => (
  [
    '@docusaurus/plugin-content-docs',
    {
      id: `${c.group}-${c.course_variant}`,
      path: `./.generated/courses/${c.group}/${c.course_variant}`,
      routeBasePath: `${c.group}/${c.course_variant}`,
      sidebarPath: require.resolve(`./.generated/sidebars/${c.group}/${c.course_variant}.ts`),
      remarkPlugins: [require('remark-math')],
      rehypePlugins: [require('rehype-katex')],
    },
  ] satisfies PluginConfig
)
);

const config: Config = {
  title: 'StudyNode',
  tagline: 'Learning is great',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://herr-holst.de',
  baseUrl: '/',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'de',
    locales: ['de'],
  },

  presets: [
    ['classic', { docs: false, blog: false, theme: { customCss: './src/css/custom.css' } }],
  ],

  stylesheets: [
    { href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css', type: 'text/css' },
  ],

  plugins: [
    ...docsPlugins,
    [
      '@docusaurus/plugin-content-pages',
      {
        path: './.generated/courses/shared',
        routeBasePath: '/',
        id: 'generated-pages',
      },
    ],
    [require.resolve('@cmfcmf/docusaurus-search-local'), { language: ['de'] }],
  ],

  themeConfig: {
    tableOfContents: {
      // Workaround to disable tableOfContents
      minHeadingLevel: 6,
      maxHeadingLevel: 6
    },
    colorMode: {
      respectPrefersColorScheme: true,
    },
    sidebar: {
      hideable: true,
    },
    navbar: {
      title: 'StudyNode',
      items: [{ type: 'custom-navbar', position: 'left' }],
      hideOnScroll: false
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['python', 'typescript', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
