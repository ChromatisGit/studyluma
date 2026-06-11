/// <reference types="bun-types" />

declare module "*.module.css" {
  const styles: Record<string, string>;
  export default styles;
}

// Replaced at build time by vite.config.ts `define`. False in all normal builds.
declare const __DEMO_MODE__: boolean;
