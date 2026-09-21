// Single source of truth for the product brand - renaming the product is a one-line change.
export const BRAND = {
  name: "FacePass",
  tagline: "Attendance that recognizes you.",
  // Canonical production URL, no trailing slash. Every absolute URL the site
  // emits (canonical, og:url, og:image, sitemap, robots, JSON-LD) is built
  // from this. Currently the GitHub Pages URL; if hosting moves (for example
  // to Cloudflare Pages with a custom domain), change it here and remove
  // basePath/output from next.config.ts.
  siteUrl: "https://mbsipmcc-afk.github.io/facepass-site",
  // Sub-path the site is served under on GitHub Pages; must match basePath
  // in next.config.ts. Internal <a> hrefs are built from it because Next
  // only auto-prefixes its own router links, not plain anchors.
  basePath: "/facepass-site",
  email: "hello@facepass.example",
  disclaimer:
    "FacePass is a real, deployed system. Figures shown are illustrative performance highlights; personal data is excluded.",
} as const;
