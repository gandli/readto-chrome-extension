/**
 * Ambient module declarations for Vite raw imports.
 * Enables `?raw` suffix to import file contents as strings.
 * @see https://vitejs.dev/guide/assets.html#importing-asset-as-string
 */
declare module '*.css?raw' {
  const content: string;
  export default content;
}

declare module '*?raw' {
  const content: string;
  export default content;
}
