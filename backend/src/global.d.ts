export {};

declare global {
  /** True when Nest booted in install-only mode (see main.ts). */
  var __AIKEFU_INSTALL_MODE__: boolean | undefined;
}
