import {themes as prismThemes} from 'prism-react-renderer';
import type {Config, PluginConfig} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {COURSES} from './.generated/courses.config';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const docsPlugins: PluginConfig[] = COURSES.flatMap(course =>
  course.subjects.map(subj => (
    [
      '@docusaurus/plugin-content-docs',
      {
        id: `${course.slug}-${subj.slug}`,
        path: `./.generated/courses/${course.slug}/${subj.slug}`,
        routeBasePath: `${course.slug}/${subj.slug}`,
        sidebarPath: require.resolve(`./.generated/sidebars/${course.slug}.${subj.slug}.ts`),
        remarkPlugins: [require('remark-math')],
        rehypePlugins: [require('rehype-katex')],
        showLastUpdateAuthor: true,
        showLastUpdateTime: true,
      },
    ] satisfies PluginConfig
  ))
);


const config: Config = {
  title: 'Learnspace',
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
    [require.resolve('@cmfcmf/docusaurus-search-local'), { language: ['de'] }],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: { title: 'Learnspace', items: [] },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['python','typescript','sql'],
    },
    customFields: {
      courseNavbars: Object.fromEntries(
        COURSES.map(c => [`/${c.slug}/`, c.navbar.items])
      ),
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
