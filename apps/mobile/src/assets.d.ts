// Static image assets are resolved by Metro to an opaque numeric asset id,
// which React Native's Image `source` accepts. Declare the module shape so
// TypeScript understands ES imports of bundled images (no `require`).
declare module "*.png" {
  const asset: number;
  export default asset;
}
declare module "*.jpg" {
  const asset: number;
  export default asset;
}
// Bundled videos (the website's two landing clips), played with expo-video from the app bundle.
declare module "*.mp4" {
  const asset: number;
  export default asset;
}
