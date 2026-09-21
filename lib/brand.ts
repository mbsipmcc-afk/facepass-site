// Single source of truth for the product brand - renaming the product is a one-line change.
export const BRAND = {
  name: "FacePass",
  tagline: "Attendance that recognizes you.",
  // Canonical production URL, no trailing slash and no sub-path. Every
  // absolute URL the site emits (canonical, og:url, og:image, sitemap, robots,
  // JSON-LD) is built from this. Currently the Vercel production domain; if
  // a custom domain is attached later, change it here only.
  siteUrl: "https://facepass-site-mbsipmcc-5235s-projects.vercel.app",
  email: "hello@facepass.example",
  disclaimer:
    "FacePass is a real, deployed system. Figures shown are illustrative performance highlights; personal data is excluded.",
} as const;
