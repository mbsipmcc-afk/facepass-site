import type { NextConfig } from "next";

// Hosted on GitHub Pages at the BRAND.siteUrl path (see lib/brand.ts):
// static export under the /facepass-site basePath, trailing slash so every
// route resolves to a directory index on Pages. If hosting moves to a root
// domain (for example Cloudflare Pages with a custom domain), remove
// output, basePath, trailingSlash and images.unoptimized, and update
// BRAND.siteUrl.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/facepass-site",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
