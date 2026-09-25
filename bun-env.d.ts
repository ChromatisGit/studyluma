/// <reference types="bun-types" />

declare module "*.module.css" {
  const styles: Record<string, string>;
  export default styles;
}

declare module "*.toml?raw" {
  const source: string;
  export default source;
}

// Replaced at build time by vite.config.ts `define`. False in all normal builds.
declare const __DEMO_MODE__: boolean;
