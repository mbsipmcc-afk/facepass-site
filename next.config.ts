import type { NextConfig } from "next";

// Hosted on Vercel at the root domain (BRAND.siteUrl in lib/brand.ts), so
// the framework defaults apply: no basePath, no static export, next/image
// optimization on. If hosting ever moves to a sub-path host, add basePath
// and see the Next 16 metadataBase note in app/layout.tsx.
const nextConfig: NextConfig = {};

export default nextConfig;
