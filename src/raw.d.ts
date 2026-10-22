// CSS and other text files imported as strings (`?raw`), by Vite in tests and by the
// rollup `raw` plugin in the build
declare module "*?raw" {
  const content: string;
  export default content;
}
