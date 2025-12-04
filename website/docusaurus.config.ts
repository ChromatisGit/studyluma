import path from 'path';
import { themes as prismThemes } from 'prism-react-renderer';
import type { Config, PluginConfig } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import COURSES_JSON from './.generated/configs/courses.config.json';
import { Course } from '../src/builder/transformer/courses';
import aliasConfig from '../aliases.json';

const COURSES = COURSES_JSON as Course[];
const aliasPaths = aliasConfig.compilerOptions.paths;
const webpackAliases = Object.fromEntries(
  Object.entries(aliasPaths).map(([alias, targetPaths]) => {
    const resolvedAlias = alias.replace(/\/\*$/, '');
    const target = (Array.isArray(targetPaths) ? targetPaths[0] : targetPaths).replace(/\/\*$/, '');
    return [resolvedAlias, path.resolve(__dirname, '..', target)];
  }),
);
const docsPlugins: PluginConfig[] = COURSES.map(c => (
  [
    '@docusaurus/plugin-content-docs',
    {
      id: `${c.group}-${c.slug}`,
      path: `./.generated/docs/${c.group}/${c.slug}`,
      routeBasePath: `${c.group}/${c.slug}`,
      sidebarPath: require.resolve(`./.generated/sidebars/${c.group}/${c.slug}.ts`),
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

  url: 'https://studynodes.net',
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

  staticDirectories: ['static', '.generated/worksheets'],

  plugins: [
    ...docsPlugins,
    [
      '@docusaurus/plugin-content-pages',
      {
        path: './.generated/resources',
        routeBasePath: '/',
        id: 'additional-resources',
      },
    ],
    [require.resolve('@cmfcmf/docusaurus-search-local'), { language: ['de'] }],
    function aliasPlugin() {
      return {
        name: 'studynode-aliases',
        configureWebpack: () => ({
          resolve: {
            alias: webpackAliases,
          },
        }),
      };
    },
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
      additionalLanguages: ['typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
